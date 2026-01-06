// apps/server/src/socketServer.ts
// WebSocket server untuk PvP multiplayer

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
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
    socket.on('join_queue', () => handleJoinQueue(socket));
    socket.on('leave_queue', () => handleLeaveQueue(socket));
    socket.on('player_ready', () => handlePlayerReady(socket));
    socket.on('player_input', (input: Parameters<ClientToServerEvents['player_input']>[0]) => handlePlayerInput(socket, input));
    socket.on('create_room', (name: string) => handleCreateRoom(socket, name));
    socket.on('join_room', (roomId: string) => handleJoinRoom(socket, roomId));
    socket.on('rejoin_game', (roomId: string) => handleRejoinGame(socket, roomId));
    socket.on('leave_room', () => handleLeaveRoom(socket));
    socket.on('disconnect', () => handleDisconnect(socket));
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleJoinQueue(socket: GameSocket) {
    const player: PvPPlayer = {
        id: socket.data.playerId!,
        name: socket.data.playerName!,
        team: 'blue', // Will be assigned when matched
        ready: false,
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

            // Notify match found
            socket1.emit('match_found', {
                roomId: room.id,
                opponent: room.players.find(p => p.id !== player1.id)!
            });
            socket2.emit('match_found', {
                roomId: room.id,
                opponent: room.players.find(p => p.id !== player2.id)!
            });

            console.log(`[SocketServer] Match made: ${player1.name} vs ${player2.name}`);
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
        // Only start countdown if room is waiting
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
