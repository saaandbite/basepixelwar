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

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Payment timeout tracking
const paymentTimeouts = new Map<string, NodeJS.Timeout>();

// ============================================
// SERVER INITIALIZATION
// ============================================

export function initializeSocketServer(httpServer: HTTPServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:3000', '*'],
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

    console.log(`[SocketServer] Client connected: ${playerId}`);

    // Send connection confirmation
    socket.emit('connected', playerId);

    // Register event handlers
    socket.on('join_queue', (walletAddress?: string) => handleJoinQueue(socket, walletAddress));
    socket.on('leave_queue', () => handleLeaveQueue(socket));
    socket.on('player_ready', () => handlePlayerReady(socket));
    socket.on('player_input', (input: Parameters<ClientToServerEvents['player_input']>[0]) => handlePlayerInput(socket, input));
    socket.on('create_room', (name: string) => handleCreateRoom(socket, name));
    socket.on('join_room', (roomId: string) => handleJoinRoom(socket, roomId));
    socket.on('rejoin_game', (roomId: string) => handleRejoinGame(socket, roomId));
    socket.on('leave_room', () => handleLeaveRoom(socket));
    socket.on('disconnect', () => handleDisconnect(socket));

    // Payment events
    socket.on('payment_confirmed', (data) => handlePaymentConfirmed(socket, data));
    socket.on('cancel_payment', () => handleCancelPayment(socket));
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleJoinQueue(socket: GameSocket, walletAddress?: string) {
    const player: PvPPlayer = {
        id: socket.data.playerId!,
        name: socket.data.playerName!,
        team: 'blue', // Will be assigned when matched
        ready: false,
        walletAddress,
    };

    const position = RoomManager.joinQueue(player);
    const queueSize = RoomManager.getQueueSize();

    socket.emit('queue_status', { position, totalInQueue: queueSize });

    // Try to match players
    const match = RoomManager.tryMatchPlayers();
    if (match) {
        const { player1, player2, room } = match;

        // Notify both players
        const socket1 = io.sockets.sockets.get(player1.id);
        const socket2 = io.sockets.sockets.get(player2.id);

        if (socket1 && socket2) {
            // Join socket.io room
            socket1.join(room.id);
            socket2.join(room.id);

            socket1.data.roomId = room.id;
            socket2.data.roomId = room.id;

            const deadline = room.paymentDeadline || Date.now() + 60000;

            // Notify pending payment (not match_found yet)
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
    }
}

function handleLeaveQueue(socket: GameSocket) {
    RoomManager.leaveQueue(socket.data.playerId!);
    socket.emit('queue_status', { position: 0, totalInQueue: RoomManager.getQueueSize() });
}

function handlePlayerReady(socket: GameSocket) {
    const room = RoomManager.setPlayerReady(socket.data.playerId!, true);

    if (room && RoomManager.areAllPlayersReady(room)) {
        // Only start countdown if room is waiting (not pending_payment)
        // If it's already playing or counting down, ignore this trigger
        if (room.status === 'waiting') {
            startGameCountdown(room.id);
        }
    }
}

function handlePlayerInput(socket: GameSocket, input: PlayerInput) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = RoomManager.getRoom(roomId);
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

function handleCreateRoom(socket: GameSocket, name: string) {
    const player: PvPPlayer = {
        id: socket.data.playerId!,
        name: name || socket.data.playerName!,
        team: 'blue',
        ready: false,
    };

    const room = RoomManager.createRoom(player);
    socket.join(room.id);
    socket.data.roomId = room.id;

    socket.emit('room_created', room);
}

function handleJoinRoom(socket: GameSocket, roomId: string) {
    const player: PvPPlayer = {
        id: socket.data.playerId!,
        name: socket.data.playerName!,
        team: 'red',
        ready: false,
    };

    const room = RoomManager.joinRoom(roomId, player);

    if (!room) {
        socket.emit('room_error', 'Room not found or full');
        return;
    }

    socket.join(room.id);
    socket.data.roomId = room.id;

    socket.emit('room_joined', room);
    socket.to(room.id).emit('player_joined', player);
}

function handleLeaveRoom(socket: GameSocket) {
    const { room } = RoomManager.leaveRoom(socket.data.playerId!);

    if (socket.data.roomId) {
        socket.leave(socket.data.roomId);

        if (room) {
            io.to(room.id).emit('player_left', socket.data.playerId!);
        }

        socket.data.roomId = undefined;
    }
}

function handleDisconnect(socket: GameSocket) {
    console.log(`[SocketServer] Client disconnected: ${socket.data.playerId}`);

    // Leave queue if in queue (always safe)
    RoomManager.leaveQueue(socket.data.playerId!);

    // Check availability for grace period
    if (socket.data.roomId) {
        const room = RoomManager.getRoom(socket.data.roomId);
        // If room has 2 players, keep session alive for reconnect
        if (room && room.players.length === 2 && (room.status === 'playing' || room.status === 'countdown' || room.status === 'waiting' || room.status === 'finished')) {
            console.log(`[SocketServer] Player ${socket.data.playerId} disconnected from active/finished room ${room.id}. Keeping session alive.`);
            return;
        }

        // If in pending_payment and player disconnects, cancel the match
        if (room && room.status === 'pending_payment') {
            console.log(`[SocketServer] Player ${socket.data.playerId} disconnected during pending_payment. Cancelling match.`);
            cancelPaymentAndRefund(room.id, 'Opponent disconnected');
            return;
        }
    }

    // Leave room if in room (normal cleanup)
    handleLeaveRoom(socket);
}

function handleRejoinGame(socket: GameSocket, roomId: string) {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
        socket.emit('rejoin_failed');
        return;
    }

    // Find disconnected player slot
    let oldPlayerId: string | null = null;

    for (const p of room.players) {
        const s = io.sockets.sockets.get(p.id);
        if (!s) {
            oldPlayerId = p.id;
            break;
        }
    }

    if (oldPlayerId) {
        const success = RoomManager.reconnectPlayer(roomId, oldPlayerId, socket.data.playerId!);
        if (success) {
            socket.join(roomId);
            socket.data.roomId = roomId;

            // Retrieve player details
            const player = room.players.find(p => p.id === socket.data.playerId!)!;
            const opponent = room.players.find(p => p.id !== player.id)!;

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
                gridCols: 35,
                gridRows: 54,
                canvasWidth: 420,
                canvasHeight: 640,
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
    }
}

// ============================================
// PAYMENT HANDLERS
// ============================================

function handlePaymentConfirmed(
    socket: GameSocket,
    data: { txHash: string; onChainGameId: number }
) {
    const roomId = socket.data.roomId;
    if (!roomId) {
        console.log('[Payment] No roomId for payment confirmation');
        return;
    }

    const room = RoomManager.confirmPayment(
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
        RoomManager.updateRoomStatus(roomId, 'waiting');

        // Set both players as ready and start countdown
        room.players.forEach(p => {
            RoomManager.setPlayerReady(p.id, true);
        });

        // Start game countdown immediately
        startGameCountdown(roomId);
    }
}

function handleCancelPayment(socket: GameSocket) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = RoomManager.getRoom(roomId);
    if (!room || room.status !== 'pending_payment') return;

    // Cancel and refund
    cancelPaymentAndRefund(roomId, 'Player cancelled');
}

// ============================================
// PAYMENT TIMEOUT
// ============================================

function startPaymentTimeout(roomId: string) {
    // Clear any existing timeout
    clearPaymentTimeout(roomId);

    const timeout = setTimeout(() => {
        const room = RoomManager.getRoom(roomId);
        if (room && room.status === 'pending_payment') {
            console.log(`[Payment] Timeout for room ${roomId}`);
            cancelPaymentAndRefund(roomId, 'Payment timeout');
        }
    }, 60000); // 60 seconds

    paymentTimeouts.set(roomId, timeout);
    console.log(`[Payment] Started 60s timeout for room ${roomId}`);
}

function clearPaymentTimeout(roomId: string) {
    const timeout = paymentTimeouts.get(roomId);
    if (timeout) {
        clearTimeout(timeout);
        paymentTimeouts.delete(roomId);
        console.log(`[Payment] Cleared timeout for room ${roomId}`);
    }
}

function cancelPaymentAndRefund(roomId: string, reason: string) {
    clearPaymentTimeout(roomId);

    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    console.log(`[Payment] Cancelling room ${roomId}: ${reason}`);

    // Check if any player paid - if so, trigger on-chain refund
    if (RoomManager.hasAnyPlayerPaid(room) && room.onChainGameId) {
        console.log(`[Payment] Triggering on-chain refund for game ${room.onChainGameId}`);

        // Call smart contract cancelGame to refund all players who paid
        contractService.cancelGame(room.onChainGameId)
            .then(txHash => {
                if (txHash) {
                    console.log(`[Payment] ✅ Refund successful for game ${room.onChainGameId}. Tx: ${txHash}`);
                } else {
                    console.error(`[Payment] ❌ Refund failed for game ${room.onChainGameId} - cancelGame returned null`);
                }
            })
            .catch(err => {
                console.error(`[Payment] ❌ Refund error for game ${room.onChainGameId}:`, err);
            });
    }

    // Notify players
    io.to(roomId).emit('payment_cancelled', reason);

    // Return players to queue
    room.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
            playerSocket.leave(roomId);
            playerSocket.data.roomId = undefined;

            // Re-add to queue
            RoomManager.joinQueue(player);
            playerSocket.emit('queue_status', {
                position: RoomManager.getQueuePosition(player.id),
                totalInQueue: RoomManager.getQueueSize()
            });
        }
    });

    // Delete room
    RoomManager.deleteRoom(roomId);
}

// ============================================
// GAME FLOW
// ============================================

function startGameCountdown(roomId: string) {
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    RoomManager.updateRoomStatus(roomId, 'countdown');

    let countdown = 3;

    const countdownInterval = setInterval(() => {
        io.to(roomId).emit('game_countdown', countdown);

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            startGame(roomId);
        }

        countdown--;
    }, 1000);
}

function startGame(roomId: string) {
    const room = RoomManager.getRoom(roomId);
    if (!room || room.players.length !== 2) return;

    RoomManager.updateRoomStatus(roomId, 'playing');

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
        gridCols: 35,
        gridRows: 54,
        canvasWidth: 420,
        canvasHeight: 640,
    };

    // Send game start to each player with their team info
    room.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.id);
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
    GameStateManager.createGameState(roomId);
    GameStateManager.startGameLoop(roomId);
}

export function getIO() {
    return io;
}
