import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { contractService } from './contractService';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    PvPPlayer,
    GameStartData,
    PlayerInput,
} from '@repo/shared/multiplayer';

import * as RoomManager from './roomManager';
import * as GameStateManager from './gameStateManager';
import * as Redis from './redis';
import { verifyTransaction } from './utils/transaction.js';

const GAME_VAULT_ADDRESS = process.env.NEXT_PUBLIC_GAME_VAULT_ADDRESS;

// Grace period for pending payment disconnect (10 seconds for wallet app switching)
const PENDING_PAYMENT_GRACE_PERIOD_MS = 10000;

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Payment timeout tracking
const paymentTimeouts = new Map<string, NodeJS.Timeout>();

// Pending Payment Graceful Disconnect Tracking - local timeout refs (Redis stores state)
const pendingPaymentDisconnectTimeouts = new Map<string, NodeJS.Timeout>();

// Tournament Lobby Graceful Disconnect Tracking
const lobbyDisconnectTimeouts = new Map<string, NodeJS.Timeout>();

// ============================================
// SERVER INITIALIZATION
// ============================================

export function initializeSocketServer(httpServer: HTTPServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || true, // 'true' means reflect origin (very flexible for dev)
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on('connection', handleConnection);

    // Initialize game state manager with socket.io instance
    GameStateManager.initGameStateManager(io);

    console.log('[SocketServer] Initialized');
    return io;
}

// ============================================
// CONNECTION HANDLER
// ============================================

function handleConnection(socket: GameSocket) {
    const playerId = socket.id;
    const playerName = `Player_${playerId.substring(0, 6)}`;

    socket.data.playerId = playerId;
    socket.data.playerName = playerName;
    socket.data.walletAddress = undefined; // Initialize

    console.log(`[SocketServer] Client connected: ${playerId}`);
    socket.emit('connected', playerId);

    // Send connection confirmation
    socket.emit('connected', playerId);

    // Register event handlers
    socket.on('join_queue', (walletAddress?: string) => handleJoinQueue(socket, walletAddress));
    socket.on('leave_queue', () => handleLeaveQueue(socket));
    socket.on('player_ready', () => handlePlayerReady(socket));
    socket.on('player_input', (input: Parameters<ClientToServerEvents['player_input']>[0]) => handlePlayerInput(socket, input));
    socket.on('create_room', (name: string) => handleCreateRoom(socket, name));
    socket.on('join_room', (roomId: string) => handleJoinRoom(socket, roomId));
    socket.on('rejoin_game', (roomId: string, walletAddress?: string) => handleRejoinGame(socket, roomId, walletAddress));
    socket.on('leave_room', () => handleLeaveRoom(socket));
    socket.on('disconnect', () => handleDisconnect(socket));

    // Payment events
    socket.on('payment_confirmed', (data) => handlePaymentConfirmed(socket, data));
    socket.on('cancel_payment', () => handleCancelPayment(socket));

    // Tournament Lobby Events
    socket.on('join_tournament_lobby', (data: { week: number; roomId: string; walletAddress: string }) => handleJoinTournamentLobby(socket, data));
    socket.on('challenge_player', (data: { targetWallet: string; tournamentRoomId: string }) => handleChallengePlayer(socket, data));
    socket.on('challenge_player', (data: { targetWallet: string; tournamentRoomId: string }) => handleChallengePlayer(socket, data));
    socket.on('accept_challenge', (data: { challengerWallet: string; tournamentRoomId: string; week: number }) => handleAcceptChallenge(socket, data));
    socket.on('lobby_heartbeat', (data: { week: number; roomId: string }) => handleLobbyHeartbeat(socket, data));

    // Global Leaderboard Events
    socket.on('get_global_leaderboard', (data: { category: 'points' | 'wins' | 'earnings'; limit?: number }) => 
        handleGetGlobalLeaderboard(socket, data.category, data.limit));
    socket.on('get_player_global_stats', (walletAddress: string) => 
        handleGetPlayerGlobalStats(socket, walletAddress));
    socket.on('check_tournament_status', (data: { walletAddress: string; week: number }) => 
        handleCheckTournamentStatus(socket, data.walletAddress, data.week));

}

// Helper to get the ID used in Redis queue (wallet address preferred for deduplication)
function getQueueId(socket: GameSocket, walletAddress?: string): string {
    return walletAddress || socket.id;
}

// Helper to find the most recent active socket by our custom playerId (identity)
function getSocketByPlayerId(playerId: string): GameSocket | undefined {
    let bestSocket: GameSocket | undefined = undefined;

    for (const [_, socket] of io.sockets.sockets) {
        if (socket.data.playerId === playerId && socket.connected) {
            // If we find a connected socket, prefer it.
            // If we have multiple, the one with the "largest" id (or most recent) is usually the right one,
            // but simply being 'connected' is the most important check.
            if (!bestSocket) {
                bestSocket = socket;
            } else {
                // If we already found one, maybe check which one is newer?
                // For now, just having any connected one is better than a dead one.
            }
        }
    }
    return bestSocket;
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleJoinQueue(socket: GameSocket, walletAddress?: string) {
    const identityId = getQueueId(socket, walletAddress);

    // Update socket data to use this identity consistently
    socket.data.playerId = identityId;
    socket.data.walletAddress = walletAddress;

    // Get or generate username if wallet connected
    if (walletAddress) {
        const { getUsername, setUsername, generateUsername } = await import('./redis.js');
        let username = await getUsername(walletAddress);

        if (!username) {
            username = generateUsername();
            await setUsername(walletAddress, username);
        }

        socket.data.playerName = username;
    }

    const player: PvPPlayer = {
        id: identityId,
        socketId: socket.id,  // Store actual socket.id for direct lookup
        name: socket.data.playerName!,
        team: 'blue',
        ready: false,
        walletAddress,
    };

    await RoomManager.joinQueue(player);
    const position = await RoomManager.getQueuePosition(identityId);
    const queueSize = await RoomManager.getQueueSize();

    socket.emit('queue_status', { position, totalInQueue: queueSize });

    // Try to match players
    const match = await RoomManager.tryMatchPlayers();
    if (!match) return; // No match yet, wait in queue

    const { player1, player2, room } = match;

    // Use socketId directly for reliable socket lookup
    let socket1 = player1.socketId ? io.sockets.sockets.get(player1.socketId) : undefined;
    let socket2 = player2.socketId ? io.sockets.sockets.get(player2.socketId) : undefined;

    // Fallback: If direct lookup failed (stale redis data?), try identity lookup
    if (!socket1) socket1 = getSocketByPlayerId(player1.id);
    if (!socket2) socket2 = getSocketByPlayerId(player2.id);

    console.log(`[SocketServer] Match: P1 socketId=${player1.socketId}, P2 socketId=${player2.socketId}`);
    console.log(`[SocketServer] Match: socket1=${!!socket1?.connected}, socket2=${!!socket2?.connected}`);

    // CHECK: Are both players actually connected?
    if (!socket1 || !socket2 || !socket1.connected || !socket2.connected) {
        console.error(`[SocketServer] Match found but socket(s) missing/disconnected! P1: ${!!socket1?.connected}, P2: ${!!socket2?.connected}`);

        // CLEANUP & RECOVERY
        await RoomManager.deleteRoom(room.id);

        // Return valid players to the FRONT of the queue
        if (socket1 && socket1.connected) {
            console.log(`[SocketServer] Returning ${player1.name} to queue front`);
            await RoomManager.joinQueue(player1);
            socket1.emit('match_status', { status: 'requeuing', message: 'Opponent connection failed. Searching again...' });
        }
        if (socket2 && socket2.connected) {
            console.log(`[SocketServer] Returning ${player2.name} to queue front`);
            await RoomManager.joinQueue(player2);
            socket2.emit('match_status', { status: 'requeuing', message: 'Opponent connection failed. Searching again...' });
        }
        return;
    }

    // SUCCESS: Both players connected -> Join Room
    socket1.join(room.id);
    socket2.join(room.id);

    socket1.data.roomId = room.id;
    socket2.data.roomId = room.id;

    const deadline = room.paymentDeadline || Date.now() + 90000;

    // Notify pending payment
    socket1.emit('pending_payment', {
        roomId: room.id,
        opponent: room.players.find(p => p.id !== player1.id)!,
        deadline,
        isFirstPlayer: true,
    });
    socket2.emit('pending_payment', {
        roomId: room.id,
        opponent: room.players.find(p => p.id !== player2.id)!,
        deadline,
        isFirstPlayer: false,
    });

    // Start payment timeout
    startPaymentTimeout(room.id);

    console.log(`[SocketServer] Match made (pending_payment): ${player1.name} vs ${player2.name}`);
}

async function handleLeaveQueue(socket: GameSocket) {
    const queueId = getQueueId(socket); // Note: If they had a wallet, they should leave via same ID
    // Since we don't have walletAddress cached in socket.data here easily, 
    // we should probably store it in socket.data during join_queue.
    await RoomManager.leaveQueue(socket.data.walletAddress || socket.id);
    const queueSize = await RoomManager.getQueueSize();
    socket.emit('queue_status', { position: 0, totalInQueue: queueSize });
}

async function handlePlayerReady(socket: GameSocket) {
    const room = await RoomManager.setPlayerReady(socket.data.playerId!, true);

    if (room && RoomManager.areAllPlayersReady(room)) {
        // Only start countdown if room is waiting (not pending_payment)
        // If it's already playing or counting down, ignore this trigger
        if (room.status === 'waiting') {
            startGameCountdown(room.id);
        }
    }
}

async function handlePlayerInput(socket: GameSocket, input: PlayerInput) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = await RoomManager.getRoom(roomId);
    if (!room || room.status !== 'playing') return;

    // Find what team this player is
    const player = room.players.find(p => p.id === socket.data.playerId);
    if (!player) return;

    // Update game state with player input
    GameStateManager.updatePlayerInput(roomId, player.team, input);

    // Also relay input to opponent for immediate visual feedback
    socket.to(roomId).emit('opponent_input', {
        ...input,
        team: player.team,
    });
}

async function handleCreateRoom(socket: GameSocket, name: string) {
    const player: PvPPlayer = {
        id: socket.data.playerId!,
        name: name || socket.data.playerName!,
        team: 'blue',
        ready: false,
    };

    const room = await RoomManager.createRoom(player);
    socket.join(room.id);
    socket.data.roomId = room.id;

    socket.emit('room_created', room);
}

async function handleJoinRoom(socket: GameSocket, roomId: string) {
    const player: PvPPlayer = {
        id: socket.data.playerId!,
        name: socket.data.playerName!,
        team: 'red',
        ready: false,
    };

    const room = await RoomManager.joinRoom(roomId, player);

    if (!room) {
        socket.emit('room_error', 'Room not found or full');
        return;
    }

    socket.join(room.id);
    socket.data.roomId = room.id;

    socket.emit('room_joined', room);
    socket.to(room.id).emit('player_joined', player);
}

async function handleLeaveRoom(socket: GameSocket) {
    const { room } = await RoomManager.leaveRoom(socket.data.playerId!);

    if (socket.data.roomId) {
        socket.leave(socket.data.roomId);

        if (room) {
            io.to(room.id).emit('player_left', socket.data.playerId!);
        }

        socket.data.roomId = undefined;
    }
}

async function handleDisconnect(socket: GameSocket) {
    const playerId = socket.id;
    const roomId = socket.data.roomId;
    const walletAddress = socket.data.walletAddress;
    const queueId = getQueueId(socket, walletAddress);

    console.log(`[SocketServer] Client disconnected: ${playerId}`);

    // SAFETY CHECK: If Redis is down/closed (e.g. during shutdown), skip cleanup
    // This prevents "Connection is closed" crash
    const { isRedisConnected } = await import('./redis.js');
    if (!isRedisConnected()) {
        console.warn(`[SocketServer] Redis closed. Skipping cleanup for disconnected player ${playerId}`);
        return;
    }

    // Remove from queue if they were in it
    await RoomManager.leaveQueue(queueId);

    // [New] Handle Tournament Lobby Disconnect logic (Multi-Tab Support)
    if (socket.data.tournamentRoomId && socket.data.walletAddress && socket.data.week) {
        const { week, tournamentRoomId: tRoomId, walletAddress: wAddress } = socket.data;

        // Check if user has other sockets open
        let remainingSockets = 0;
        for (const [_, s] of io.sockets.sockets) {
            if (s.id !== socket.id && s.data.walletAddress === wAddress && s.connected) {
                remainingSockets++;
            }
        }

        if (remainingSockets === 0) {
            // GRACEFUL DISCONNECT: Wait 2s before marking offline (Enough for reload, fast enough for UX)
            console.log(`[SocketServer] Player ${wAddress} disconnected from Lobby. Starting grace period (2s).`);

            // Clear existing if any (shouldn't happen if we clear on join, but safe)
            if (lobbyDisconnectTimeouts.has(wAddress)) {
                clearTimeout(lobbyDisconnectTimeouts.get(wAddress));
            }

            const timeout = setTimeout(() => {
                import('./redis.js').then(({ setTournamentLobbyPresence }) => {
                    console.log(`[SocketServer] Grace period expired for ${wAddress}. Marking offline.`);
                    setTournamentLobbyPresence(week, tRoomId, wAddress, false);
                    // Notify others
                    io.to(`tournament_lobby_${tRoomId}`).emit('lobby_player_update', {
                        walletAddress: wAddress,
                        isOnline: false
                    });
                    lobbyDisconnectTimeouts.delete(wAddress);
                });
            }, 2000); // 2 seconds

            lobbyDisconnectTimeouts.set(wAddress, timeout);
        }
    }

    socket.data.walletAddress = undefined; // Clear wallet address from socket data

    // Check availability for grace period
    if (roomId) {
        const room = await RoomManager.getRoom(roomId);
        // If room has 2 players, keep session alive for reconnect
        if (room && room.players.length === 2 && (room.status === 'playing' || room.status === 'countdown' || room.status === 'waiting' || room.status === 'finished')) {
            console.log(`[SocketServer] Player ${socket.data.playerId} disconnected from active/finished room ${room.id}. Keeping session alive.`);
            return;
        }

        // If in pending_payment and player disconnects, use GRACE PERIOD (Redis-backed)
        // This handles mobile browser wallet switching (Chrome/Firefox <-> MetaMask app)
        if (room && room.status === 'pending_payment') {
            const playerId = socket.data.playerId!;
            const gracePeriodKey = `${roomId}:${playerId}`;
            
            // Check if player has other active sockets (multi-tab)
            let hasOtherSockets = false;
            for (const [_, s] of io.sockets.sockets) {
                if (s.id !== socket.id && s.data.playerId === playerId && s.connected) {
                    hasOtherSockets = true;
                    break;
                }
            }

            if (hasOtherSockets) {
                console.log(`[SocketServer] Player ${playerId} has other active sockets. Not cancelling pending_payment.`);
                return;
            }

            // Clear existing local timeout if any
            if (pendingPaymentDisconnectTimeouts.has(gracePeriodKey)) {
                clearTimeout(pendingPaymentDisconnectTimeouts.get(gracePeriodKey));
                pendingPaymentDisconnectTimeouts.delete(gracePeriodKey);
            }

            console.log(`[SocketServer] Player ${playerId} disconnected during pending_payment. Starting ${PENDING_PAYMENT_GRACE_PERIOD_MS / 1000}s grace period (Redis-backed).`);

            // Store disconnect state in Redis (with TTL auto-expiry)
            await Redis.setPendingPaymentDisconnect(roomId, playerId, PENDING_PAYMENT_GRACE_PERIOD_MS / 1000);

            // GRACE PERIOD: Local timeout as backup, but Redis is source of truth
            const timeout = setTimeout(async () => {
                pendingPaymentDisconnectTimeouts.delete(gracePeriodKey);
                
                // Check Redis if still marked as disconnected
                const stillDisconnected = await Redis.isPendingPaymentDisconnected(roomId, playerId);
                if (!stillDisconnected) {
                    console.log(`[SocketServer] Grace period: Redis says ${playerId} already cleared. Skipping cancel.`);
                    return;
                }
                
                // Re-check room status (might have changed during grace period)
                const currentRoom = await RoomManager.getRoom(roomId);
                if (!currentRoom) {
                    console.log(`[SocketServer] Grace period expired but room ${roomId} no longer exists.`);
                    await Redis.clearPendingPaymentDisconnect(roomId, playerId);
                    return;
                }

                // If room is no longer pending_payment (game started), don't cancel
                if (currentRoom.status !== 'pending_payment') {
                    console.log(`[SocketServer] Grace period expired but room ${roomId} is now ${currentRoom.status}. Not cancelling.`);
                    await Redis.clearPendingPaymentDisconnect(roomId, playerId);
                    return;
                }

                // Check if player reconnected during grace period
                const reconnectedSocket = getSocketByPlayerId(playerId);
                if (reconnectedSocket && reconnectedSocket.connected) {
                    console.log(`[SocketServer] Player ${playerId} reconnected during grace period. Not cancelling.`);
                    // Re-join the room
                    reconnectedSocket.join(roomId);
                    reconnectedSocket.data.roomId = roomId;
                    await Redis.clearPendingPaymentDisconnect(roomId, playerId);
                    return;
                }

                // Player did not reconnect, cancel the match
                console.log(`[SocketServer] Grace period expired. Player ${playerId} did not reconnect. Cancelling match.`);
                await Redis.clearAllPendingPaymentDisconnects(roomId);
                await cancelPaymentAndRefund(roomId, 'Opponent disconnected');
            }, PENDING_PAYMENT_GRACE_PERIOD_MS);

            pendingPaymentDisconnectTimeouts.set(gracePeriodKey, timeout);
            return;
        }
    }

    // Leave room if in room (normal cleanup)
    await handleLeaveRoom(socket);
}

async function handleRejoinGame(socket: GameSocket, roomId: string, walletAddress?: string) {
    const room = await RoomManager.getRoom(roomId);
    if (!room) {
        socket.emit('rejoin_failed');
        return;
    }

    // Authenticate: If wallet provided, bind this socket to the wallet identity
    if (walletAddress) {
        // Normalize wallet address
        const normalizedWallet = walletAddress.toLowerCase();
        socket.data.playerId = normalizedWallet;
        socket.data.walletAddress = normalizedWallet;
    }

    // Check if this player belongs to the room
    // Robust check: Match by ID OR by Wallet Address
    let player = room.players.find(p => p.id === socket.data.playerId);

    if (!player && socket.data.walletAddress) {
        // Fallback: Check if any player has this wallet address
        player = room.players.find(p =>
            p.walletAddress && p.walletAddress.toLowerCase() === socket.data.walletAddress
        );

        // If found by wallet, update socket.data.playerId to match the room record
        // This handles the case where room record uses Socket ID but we rejoining with Wallet
        if (player) {
            console.log(`[SocketServer] Recovered identity via wallet: ${player.id}`);
            socket.data.playerId = player.id;
        }
    }

    if (!player) {
        // Player not found in room
        console.warn(`[SocketServer] Rejoin failed: Player ${socket.data.playerId} not found in room ${roomId}`);
        socket.emit('rejoin_failed');
        return;
    }

    // Clear pending payment disconnect grace period if player reconnected (Redis-backed)
    const gracePeriodKey = `${roomId}:${player.id}`;
    if (pendingPaymentDisconnectTimeouts.has(gracePeriodKey)) {
        clearTimeout(pendingPaymentDisconnectTimeouts.get(gracePeriodKey));
        pendingPaymentDisconnectTimeouts.delete(gracePeriodKey);
        console.log(`[SocketServer] Cleared local grace period timeout for ${player.id}`);
    }
    await Redis.clearPendingPaymentDisconnect(roomId, player.id);

    // Update the room's socket mapping (implicitly handled by socket.join)
    socket.join(roomId);
    socket.data.roomId = roomId;

    const opponent = room.players.find(p => p.id !== player!.id)!;

    // Special handling for PENDING_PAYMENT rooms (Reconnecting during payment phase)
    if (room.status === 'pending_payment') {
        const deadline = room.paymentDeadline || Date.now() + 90000;
        const isFirstPlayer = room.players[0].id === player.id;
        
        // Re-send pending_payment event so client can continue payment flow
        socket.emit('pending_payment', {
            roomId: room.id,
            opponent,
            deadline,
            isFirstPlayer,
        });
        
        // Also send current payment status
        const status = RoomManager.getPaymentStatus(room);
        socket.emit('payment_status', status);
        
        console.log(`[SocketServer] Player ${player.id} reconnected to pending_payment room ${roomId}`);
        return;
    }

    // Special handling for FINISHED rooms (Rejoining Result Screen)
    if (room.status === 'finished') {
        const state = GameStateManager.getGameState(roomId);
        if (state) {
            const winner = state.scores.blue > state.scores.red ? 'blue' :
                state.scores.red > state.scores.blue ? 'red' : 'draw';

            // RESTRICTION: Only the winner can rejoin a finished game (to claim rewards)
            // Losers are redirected to room
            if (player.team !== winner) {
                socket.emit('rejoin_failed');
                return;
            }

            socket.emit('game_over', {
                winner,
                finalScore: state.scores,
                stats: {
                    totalShots: { blue: 0, red: 0 },
                    powerupsCollected: { blue: 0, red: 0 },
                    goldenPixelsCaptured: { blue: 0, red: 0 }
                }
            });
            console.log(`[SocketServer] Player reconnected to FINISHED room ${roomId} for results`);
            return; // Stop here, do not restart game
        }
    }

    // Standard Rejoin (Active Game)
    const gameConfig: GameStartData['config'] = {
        duration: 90,
        gridCols: 26,
        gridRows: 44,
        canvasWidth: 390,
        canvasHeight: 660,
    };

    const startData: GameStartData = {
        roomId: room.id,
        yourTeam: player.team,
        opponent,
        config: gameConfig,
        startTime: room.gameStartedAt || Date.now(),
    };

    socket.emit('game_start', startData);
    console.log(`[SocketServer] Player rejoined room ${roomId}`);
}

// ============================================
// PAYMENT HANDLERS
// ============================================

async function handlePaymentConfirmed(
    socket: GameSocket,
    data: { txHash: string; onChainGameId: number }
) {
    const roomId = socket.data.roomId;
    if (!roomId) {
        console.log('[Payment] No roomId for payment confirmation');
        return;
    }

    // SECURITY: Verify Transaction On-Chain
    const isValid = await verifyTransaction({
        txHash: data.txHash,
        sender: socket.data.walletAddress || '', // Ensure wallet is known
        amount: '0.0001', // Standard game fee (Must match contract)
        toAddress: GAME_VAULT_ADDRESS
    });

    if (!isValid) {
        console.error(`[Payment] Security Check Failed for ${socket.data.playerId} (Tx: ${data.txHash})`);
        return;
    }

    const room = await RoomManager.confirmPayment(
        roomId,
        socket.data.playerId!,
        data.txHash,
        data.onChainGameId
    );

    if (!room) {
        console.log('[Payment] Failed to confirm payment - room not found');
        return;
    }

    // Broadcast payment status to both players
    const status = RoomManager.getPaymentStatus(room);
    io.to(roomId).emit('payment_status', status);

    // Check if both paid
    if (RoomManager.areBothPlayersPaid(room)) {
        console.log(`[Payment] Both players paid in room ${roomId}`);
        clearPaymentTimeout(roomId);

        // Update room status to waiting (ready for game)
        await RoomManager.updateRoomStatus(roomId, 'waiting');

        // Set both players as ready and start countdown
        const readyOps = room.players.map(p => RoomManager.setPlayerReady(p.id, true));
        await Promise.all(readyOps);

        // Start game countdown immediately
        startGameCountdown(roomId);
    }
}

async function handleCancelPayment(socket: GameSocket) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = await RoomManager.getRoom(roomId);
    if (!room || room.status !== 'pending_payment') return;

    // Cancel and refund
    await cancelPaymentAndRefund(roomId, 'Player cancelled');
}

// ============================================
// PAYMENT TIMEOUT
// ============================================

function startPaymentTimeout(roomId: string) {
    // Clear any existing timeout
    clearPaymentTimeout(roomId);

    const timeout = setTimeout(async () => {
        const room = await RoomManager.getRoom(roomId);
        if (room && room.status === 'pending_payment') {
            console.log(`[Payment] Timeout for room ${roomId}`);
            await cancelPaymentAndRefund(roomId, 'Payment timeout');
        }
    }, 90000); // 90 seconds

    paymentTimeouts.set(roomId, timeout);
    console.log(`[Payment] Started 90s timeout for room ${roomId}`);
}

function clearPaymentTimeout(roomId: string) {
    const timeout = paymentTimeouts.get(roomId);
    if (timeout) {
        clearTimeout(timeout);
        paymentTimeouts.delete(roomId);
        console.log(`[Payment] Cleared timeout for room ${roomId}`);
    }
}

async function cancelPaymentAndRefund(roomId: string, reason: string) {
    clearPaymentTimeout(roomId);

    // Clear all pending payment disconnect grace periods for this room (Redis)
    await Redis.clearAllPendingPaymentDisconnects(roomId);

    // Also clear any local timeout references
    for (const [key, timeout] of pendingPaymentDisconnectTimeouts) {
        if (key.startsWith(roomId + ':')) {
            clearTimeout(timeout);
            pendingPaymentDisconnectTimeouts.delete(key);
        }
    }

    const room = await RoomManager.getRoom(roomId);
    if (!room) return;

    console.log(`[Payment] Cancelling room ${roomId}: ${reason}`);

    // Check if any player paid - if so, trigger on-chain refund
    if (RoomManager.hasAnyPlayerPaid(room) && room.onChainGameId) {
        console.log(`[Payment] Triggering on-chain refund for game ${room.onChainGameId}`);

        // Call smart contract cancelGame to refund all players who paid
        contractService.cancelGame(room.onChainGameId)
            .then(txHash => {
                if (txHash) {
                    console.log(`[Payment]  Refund successful for game ${room.onChainGameId}. Tx: ${txHash}`);
                } else {
                    console.error(`[Payment]  Refund failed for game ${room.onChainGameId} - cancelGame returned null`);
                }
            })
            .catch(err => {
                console.error(`[Payment]  Refund error for game ${room.onChainGameId}:`, err);
            });
    }

    // Notify players
    io.to(roomId).emit('payment_cancelled', reason);

    // Return players to queue - this needs to be done carefully with async
    for (const player of room.players) {
        const playerSocket = getSocketByPlayerId(player.id);
        if (playerSocket) {
            playerSocket.leave(roomId);
            playerSocket.data.roomId = undefined;

            // Re-add to queue
            await RoomManager.joinQueue(player);
            // Send back position
            const queueId = player.walletAddress || playerSocket.id; // Use player's walletAddress if available, otherwise socket.id
            const position = await RoomManager.getQueuePosition(queueId);
            playerSocket.emit('queue_status', {
                position,
                totalInQueue: await RoomManager.getQueueSize()
            });
        }
    }

    // Delete room
    await RoomManager.deleteRoom(roomId);
}

// ============================================
// GAME FLOW
// ============================================

async function startGameCountdown(roomId: string) {
    const room = await RoomManager.getRoom(roomId);
    if (!room) return;

    await RoomManager.updateRoomStatus(roomId, 'countdown');

    let countdown = 3;

    const countdownInterval = setInterval(() => {
        io.to(roomId).emit('game_countdown', countdown);

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            startGame(roomId); // startGame doesn't need to be awaited here as it initiates a loop
        }

        countdown--;
    }, 1000);
}

async function startGame(roomId: string) {
    const room = await RoomManager.getRoom(roomId);
    if (!room || room.players.length !== 2) return;

    await RoomManager.updateRoomStatus(roomId, 'playing');

    // START ON-CHAIN GAME
    if (room.onChainGameId) {
        console.log(`\n==================================================`);
        console.log(`[SocketServer] Starting game on-chain: ${room.onChainGameId}`);
        console.log(`==================================================`);

        contractService.startGame(room.onChainGameId)
            .then(tx => {
                if (tx) console.log(`[SocketServer] Game ${room.onChainGameId} started! Tx: ${tx}`);
                else console.error(`[SocketServer] Failed to start game ${room.onChainGameId} on-chain`);
            })
            .catch(err => {
                console.error(`[SocketServer] Error starting game on-chain:`, err);
            });
    }

    const gameConfig: GameStartData['config'] = {
        duration: 90,
        gridCols: 26,
        gridRows: 44,
        canvasWidth: 390,
        canvasHeight: 660,
    };

    // Send game start to each player with their team info
    room.players.forEach(player => {
        const playerSocket = getSocketByPlayerId(player.id);
        if (playerSocket) {
            const opponent = room.players.find(p => p.id !== player.id)!;

            const startData: GameStartData = {
                roomId: room.id,
                yourTeam: player.team,
                opponent,
                config: gameConfig,
                startTime: Date.now(),
            };

            playerSocket.emit('game_start', startData);
        }
    });

    console.log(`[SocketServer] Game started in room ${roomId}`);

    // Create and start server-side game state
    // Create and start server-side game state
    GameStateManager.createGameState(roomId, 'standard');
    GameStateManager.startGameLoop(roomId);
}


// ============================================
// TOURNAMENT LOBBY HANDLERS
// ============================================

async function handleJoinTournamentLobby(socket: GameSocket, data: { week: number; roomId: string; walletAddress: string }) {
    const { week, roomId, walletAddress } = data;
    const normalizedWallet = walletAddress.toLowerCase();

    console.log(`[SocketServer] Player ${normalizedWallet} attempting to join Tournament Lobby ${roomId} (Week ${week})`);

    // PAYMENT VALIDATION: Verify wallet is registered via payment
    const { getPlayerRoom } = await import('./tournamentManager.js');
    const playerRoom = await getPlayerRoom(normalizedWallet);

    if (!playerRoom) {
        console.warn(`[SocketServer] REJECTED: Wallet ${normalizedWallet} NOT registered in tournament (no payment found)`);
        socket.emit('lobby_join_failed', { reason: 'NOT_REGISTERED' });
        return;
    }

    if (playerRoom.roomId.toString() !== roomId || playerRoom.week !== week) {
        console.warn(`[SocketServer] REJECTED: Wallet ${normalizedWallet} room mismatch. Registered: Room ${playerRoom.roomId} Week ${playerRoom.week}, Requested: Room ${roomId} Week ${week}`);
        socket.emit('lobby_join_failed', { reason: 'ROOM_MISMATCH' });
        return;
    }

    console.log(`[SocketServer] VERIFIED: Wallet ${normalizedWallet} confirmed for Room ${roomId} Week ${week}`);

    // GRACEFUL DISCONNECT: Clear any pending timeout for this wallet
    if (lobbyDisconnectTimeouts.has(normalizedWallet)) {
        console.log(`[SocketServer] Player ${normalizedWallet} reconnected within grace period. Cancelling offline status.`);
        clearTimeout(lobbyDisconnectTimeouts.get(normalizedWallet));
        lobbyDisconnectTimeouts.delete(normalizedWallet);
    }

    socket.join(`tournament_lobby_${roomId}`);
    socket.data.walletAddress = normalizedWallet;
    // Store tournament context in socket data to handle disconnects
    socket.data.tournamentRoomId = roomId;
    socket.data.week = week;

    // Mark as online in Redis
    const { setTournamentLobbyPresence, getTournamentLobbyOnlinePlayers, getTournamentLeaderboard } = await import('./redis.js');
    await setTournamentLobbyPresence(week, roomId, normalizedWallet, true);

    // Fetch initial state
    const onlinePlayers = await getTournamentLobbyOnlinePlayers(week, roomId);
    const leaderboard = await getTournamentLeaderboard(week, roomId);

    // Emit state to THIS player
    socket.emit('lobby_state', {
        roomId,
        onlinePlayers,
        leaderboard
    });

    // Notify OTHERS that I joined
    socket.to(`tournament_lobby_${roomId}`).emit('lobby_player_update', {
        walletAddress: normalizedWallet,
        isOnline: true
    });
}

// This should be part of the socket.on('disconnect') handler
// For the purpose of this edit, it's placed here as per instruction's context.
// In a real application, this would be inside the io.on('connection', (socket) => { ... socket.on('disconnect', () => { ... }) }) block.
// Floating block removed

function getSocketByWallet(walletAddress: string): GameSocket | undefined {
    let bestSocket: GameSocket | undefined = undefined;
    const target = walletAddress.toLowerCase();

    for (const [_, socket] of io.sockets.sockets) {
        if (socket.data.walletAddress?.toLowerCase() === target && socket.connected) {
            bestSocket = socket;
            break;
        }
    }
    return bestSocket;
}

async function handleChallengePlayer(socket: GameSocket, data: { targetWallet: string; tournamentRoomId: string }) {
    const { targetWallet, tournamentRoomId } = data;
    const challengerWallet = socket.data.walletAddress;

    if (!challengerWallet) return;

    console.log(`[SocketServer] Challenge: ${challengerWallet} -> ${targetWallet} in Room ${tournamentRoomId}`);

    const targetSocket = getSocketByWallet(targetWallet);
    if (targetSocket) {
        targetSocket.emit('challenge_received', {
            challengerWallet,
            tournamentRoomId
        });
    } else {
        socket.emit('challenge_failed', { reason: 'Player offline' });
    }
}

async function handleAcceptChallenge(socket: GameSocket, data: { challengerWallet: string; tournamentRoomId: string; week: number }) {
    // 1. Validate
    const acceptorWallet = socket.data.walletAddress;
    if (!acceptorWallet) return;

    const challengerWallet = data.challengerWallet;
    const challengerSocket = getSocketByWallet(challengerWallet);

    if (!challengerSocket) {
        socket.emit('challenge_failed', { reason: 'Challenger no longer available' });
        return;
    }

    // 2. Create Match
    // We need to construct PvPPlayer objects
    const p1: PvPPlayer = {
        id: challengerWallet, // Use wallet as ID for tournament games
        name: `Player ${challengerWallet.slice(0, 4)}`,
        walletAddress: challengerWallet,
        team: 'blue',
        ready: true
    };

    const p2: PvPPlayer = {
        id: acceptorWallet,
        name: `Player ${acceptorWallet.slice(0, 4)}`,
        walletAddress: acceptorWallet,
        team: 'red',
        ready: true
    };

    const room = await RoomManager.createTournamentMatch(p1, p2, data.tournamentRoomId, data.week);

    // 3. Move players to game
    challengerSocket.join(room.id);
    socket.join(room.id);

    challengerSocket.data.roomId = room.id;
    socket.data.roomId = room.id;

    // 4. Start Game Immediately (Skip payment)
    const gameConfig: GameStartData['config'] = {
        duration: 90,
        gridCols: 26,
        gridRows: 44,
        canvasWidth: 390,
        canvasHeight: 660,
    };

    // Emit game_start to P1
    challengerSocket.emit('game_start', {
        roomId: room.id,
        yourTeam: 'blue',
        opponent: p2,
        config: gameConfig,
        startTime: Date.now()
    });

    // Emit game_start to P2 (Acceptor)
    socket.emit('game_start', {
        roomId: room.id,
        yourTeam: 'red',
        opponent: p1,
        config: gameConfig,
        startTime: Date.now()
    });

    // Start Engine
    // Start Engine
    GameStateManager.createGameState(room.id, 'tournament');
    GameStateManager.startGameLoop(room.id);

    console.log(`[SocketServer] Tournament Match Started: ${room.id}`);
}

async function handleLobbyHeartbeat(socket: GameSocket, data: { week: number; roomId: string }) {
    const { week, roomId } = data;
    const walletAddress = socket.data.walletAddress;

    if (!walletAddress) return;

    // Update presence timestamp
    const { setTournamentLobbyPresence } = await import('./redis.js');
    await setTournamentLobbyPresence(week, roomId, walletAddress, true);
}

// ============================================
// GLOBAL LEADERBOARD HANDLERS
// ============================================

async function handleGetGlobalLeaderboard(socket: GameSocket, category: 'points' | 'wins' | 'earnings', limit: number = 10) {
    const GlobalLeaderboard = await import('./services/globalLeaderboardService.js');
    
    try {
        const leaderboard = await GlobalLeaderboard.getLeaderboard(category, limit);
        socket.emit('global_leaderboard', {
            category,
            entries: leaderboard,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error(`[SocketServer] Error fetching global leaderboard:`, error);
        socket.emit('error', { message: 'Failed to fetch leaderboard' });
    }
}

async function handleGetPlayerGlobalStats(socket: GameSocket, walletAddress: string) {
    const GlobalLeaderboard = await import('./services/globalLeaderboardService.js');
    
    try {
        const [stats, ranks] = await Promise.all([
            GlobalLeaderboard.getPlayerGlobalStats(walletAddress),
            GlobalLeaderboard.getPlayerRanks(walletAddress)
        ]);

        socket.emit('player_global_stats', {
            walletAddress,
            stats,
            ranks,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error(`[SocketServer] Error fetching player stats:`, error);
        socket.emit('error', { message: 'Failed to fetch player stats' });
    }
}

async function handleCheckTournamentStatus(socket: GameSocket, walletAddress: string, week: number) {
    const GlobalLeaderboard = await import('./services/globalLeaderboardService.js');
    
    try {
        const isInTournament = await GlobalLeaderboard.isInTournament(walletAddress, week);
        socket.emit('tournament_status', {
            walletAddress,
            week,
            isRegistered: isInTournament
        });
    } catch (error) {
        console.error(`[SocketServer] Error checking tournament status:`, error);
        socket.emit('error', { message: 'Failed to check tournament status' });
    }
}


export function getIO() {
    return io;
}
