// apps/server/src/roomManager.ts
// Room management untuk PvP matchmaking - REDIS BACKED

import type { GameRoom, PvPPlayer, PaymentStatus } from '@repo/shared/multiplayer';
import * as Redis from './redis';

// Payment timeout duration (90 seconds)
const PAYMENT_TIMEOUT_MS = 90000;

// Utility untuk generate room ID
function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================
// ROOM MANAGEMENT
// ============================================

export async function createRoom(creator: PvPPlayer): Promise<GameRoom> {
    const roomId = generateRoomId();
    const deadline = Date.now() + PAYMENT_TIMEOUT_MS;

    const room: GameRoom = {
        id: roomId,
        players: [{ ...creator, team: 'blue', ready: false }],
        status: 'pending_payment',
        createdAt: Date.now(),
        paymentDeadline: deadline,
        paymentStatus: {
            player1Paid: false,
            player2Paid: false,
            deadline,
        },
    };

    await Redis.setRoom(roomId, room);
    await Redis.setPlayerRoom(creator.id, roomId);

    console.log(`[RoomManager] Room ${roomId} created by ${creator.name} (Stored in Redis)`);
    return room;
}

export async function createTournamentMatch(p1: PvPPlayer, p2: PvPPlayer, tournamentRoomId: string, week: number): Promise<GameRoom> {
    const roomId = generateRoomId();

    const room: GameRoom = {
        id: roomId,
        players: [
            { ...p1, team: 'blue', ready: true },
            { ...p2, team: 'red', ready: true }
        ],
        status: 'playing', // Start immediately
        createdAt: Date.now(),
        gameStartedAt: Date.now(),
        // Tournament metadata (using any typed field or augmenting if possible, 
        // for now we trust the caller to track the relation or we can piggyback on generic fields if they exist)
        // Ideally GameRoom interface should have 'metadata' or 'tournamentId'
    };

    // We will store tournament info in a separate Redis key mapping if GameRoom type is strict
    // Or we rely on the fact that we can cast or extend at runtime if it's just JSON in Redis.
    // For safety, let's keep it simple.

    // Create room in Redis
    await Redis.setRoom(roomId, room);
    await Redis.setPlayerRoom(p1.id, roomId);
    await Redis.setPlayerRoom(p2.id, roomId);

    // Map this game room to the tournament room for lookup later
    const r = Redis.getRedis();
    await r.set(`game_to_tournament:${roomId}`, JSON.stringify({ week, tournamentRoomId }));

    console.log(`[RoomManager] Tournament Match ${roomId} created: ${p1.name} vs ${p2.name} (Ref: ${tournamentRoomId})`);
    return room;
}


export async function joinRoom(roomId: string, player: PvPPlayer): Promise<GameRoom | null> {
    const room = await Redis.getRoom<GameRoom>(roomId);

    if (!room) {
        console.log(`[RoomManager] Room ${roomId} not found`);
        return null;
    }

    if (room.players.length >= 2) {
        console.log(`[RoomManager] Room ${roomId} is full`);
        return null;
    }

    if (room.status !== 'waiting' && room.status !== 'pending_payment') {
        console.log(`[RoomManager] Room ${roomId} is not accepting players (status: ${room.status})`);
        return null;
    }

    // Add player as red team
    room.players.push({ ...player, team: 'red', ready: false });

    await Redis.setRoom(roomId, room);
    await Redis.setPlayerRoom(player.id, roomId);

    console.log(`[RoomManager] ${player.name} joined room ${roomId}`);
    return room;
}

export async function leaveRoom(playerId: string): Promise<{ room: GameRoom | null; wasHost: boolean }> {
    const roomId = await Redis.getPlayerRoom(playerId);

    if (!roomId) {
        return { room: null, wasHost: false };
    }

    const room = await Redis.getRoom<GameRoom>(roomId);
    if (!room) {
        await Redis.deletePlayerRoom(playerId);
        return { room: null, wasHost: false };
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    const wasHost = playerIndex === 0;

    if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
    }

    await Redis.deletePlayerRoom(playerId);

    // If room is empty, delete it
    if (room.players.length === 0) {
        await Redis.deleteRoom(roomId);
        console.log(`[RoomManager] Room ${roomId} deleted from Redis (empty)`);
        return { room: null, wasHost };
    }

    // If host left, the remaining player becomes new host (blue team)
    if (wasHost && room.players.length > 0) {
        room.players[0].team = 'blue';
    }

    // Update room in Redis
    await Redis.setRoom(roomId, room);

    console.log(`[RoomManager] Player left room ${roomId}`);
    return { room, wasHost };
}

export async function getRoom(roomId: string): Promise<GameRoom | null> {
    return Redis.getRoom<GameRoom>(roomId);
}

export async function deleteRoom(roomId: string): Promise<void> {
    const room = await Redis.getRoom<GameRoom>(roomId);
    if (room) {
        const deleteOps = room.players.map(p => Redis.deletePlayerRoom(p.id));
        await Promise.all([
            ...deleteOps,
            Redis.deleteRoom(roomId)
        ]);
        console.log(`[RoomManager] Room ${roomId} deleted from Redis`);
    }
}

export async function getPlayerRoom(playerId: string): Promise<GameRoom | null> {
    const roomId = await Redis.getPlayerRoom(playerId);
    if (!roomId) return null;
    return Redis.getRoom<GameRoom>(roomId);
}

// Find room by wallet address (useful for reconnection scenarios)
export async function findRoomByWalletAddress(walletAddress: string): Promise<GameRoom | null> {
    // Wallet addresses are stored lowercase as player IDs
    const normalizedWallet = walletAddress.toLowerCase();

    // First try direct lookup (wallet is player ID)
    const roomId = await Redis.getPlayerRoom(normalizedWallet);
    if (roomId) {
        const room = await Redis.getRoom<GameRoom>(roomId);
        if (room) {
            console.log(`[RoomManager] Found room ${roomId} for wallet ${normalizedWallet}`);
            return room;
        }
    }

    // Wallet not found as direct player ID
    console.log(`[RoomManager] No room found for wallet ${normalizedWallet}`);
    return null;
}

export async function setPlayerReady(playerId: string, ready: boolean): Promise<GameRoom | null> {
    const room = await getPlayerRoom(playerId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
        player.ready = ready;
        await Redis.setRoom(room.id, room);
    }

    return room;
}

export function areAllPlayersReady(room: GameRoom): boolean {
    return room.players.length === 2 && room.players.every(p => p.ready);
}

export async function updateRoomStatus(roomId: string, status: GameRoom['status']): Promise<GameRoom | null> {
    const room = await Redis.getRoom<GameRoom>(roomId);
    if (!room) return null;

    room.status = status;
    if (status === 'playing') {
        room.gameStartedAt = Date.now();
    }

    await Redis.setRoom(roomId, room);
    return room;
}

// ============================================
// PAYMENT MANAGEMENT
// ============================================

export async function confirmPayment(
    roomId: string,
    playerId: string,
    txHash: string,
    onChainGameId: number
): Promise<GameRoom | null> {
    const room = await Redis.getRoom<GameRoom>(roomId);
    if (!room || !room.paymentStatus) return null;

    const playerIndex = room.players.findIndex(p => p.id === playerId);

    if (playerIndex === 0) {
        room.paymentStatus.player1Paid = true;
        room.paymentStatus.player1TxHash = txHash;
        room.onChainGameId = onChainGameId;
    } else if (playerIndex === 1) {
        room.paymentStatus.player2Paid = true;
        room.paymentStatus.player2TxHash = txHash;
        if (!room.onChainGameId) {
            room.onChainGameId = onChainGameId;
        }
    }

    await Redis.setRoom(roomId, room);
    console.log(`[RoomManager] Payment confirmed in Redis for player ${playerIndex + 1} in room ${roomId}`);
    return room;
}

export function areBothPlayersPaid(room: GameRoom): boolean {
    if (!room.paymentStatus) return false;
    return room.paymentStatus.player1Paid && room.paymentStatus.player2Paid;
}

export function getPaymentStatus(room: GameRoom): PaymentStatus {
    const status = room.paymentStatus || {
        player1Paid: false,
        player2Paid: false,
        deadline: room.paymentDeadline || 0,
    };

    return {
        ...status,
        onChainGameId: room.onChainGameId,
    };
}

export function hasAnyPlayerPaid(room: GameRoom): boolean {
    if (!room.paymentStatus) return false;
    return room.paymentStatus.player1Paid || room.paymentStatus.player2Paid;
}

// ============================================
// MATCHMAKING QUEUE (Redis Backed)
// ============================================

export async function joinQueue(player: PvPPlayer): Promise<number> {
    const redisPlayer = {
        id: player.id,
        socketId: player.socketId || player.id, // Store the original socket.id
        name: player.name,
        walletAddress: player.walletAddress,
        joinedAt: Date.now()
    };

    return Redis.addToQueue(redisPlayer);
}

export async function leaveQueue(playerId: string): Promise<boolean> {
    return Redis.removeFromQueue(playerId);
}

export async function getQueuePosition(playerId: string): Promise<number> {
    return Redis.getQueuePosition(playerId);
}

export async function getQueueSize(): Promise<number> {
    return Redis.getQueueSize();
}

export async function tryMatchPlayers(): Promise<{ player1: PvPPlayer; player2: PvPPlayer; room: GameRoom } | null> {
    const matchedPlayers = await Redis.popTwoPlayers();

    if (!matchedPlayers) {
        return null;
    }

    const [p1, p2] = matchedPlayers;

    // Include socketId for direct socket lookup in socketServer
    const player1: PvPPlayer = {
        id: p1.id,
        socketId: p1.socketId,
        name: p1.name,
        walletAddress: p1.walletAddress,
        team: 'blue',
        ready: false
    };
    const player2: PvPPlayer = {
        id: p2.id,
        socketId: p2.socketId,
        name: p2.name,
        walletAddress: p2.walletAddress,
        team: 'red',
        ready: false
    };

    // Create room and join second player
    const room = await createRoom(player1);
    await joinRoom(room.id, player2);

    // CRITICAL FIX: Update the local room object to include player2
    // joinRoom updates Redis but does not mutate the local 'room' variable
    room.players.push(player2);

    console.log(`[Matchmaking] Matched ${player1.name} vs ${player2.name} in room ${room.id} (Redis Queue)`);

    return { player1, player2, room };
}

// ============================================

export async function reconnectPlayer(roomId: string, oldPlayerId: string, newPlayerId: string): Promise<boolean> {
    const room = await Redis.getRoom<GameRoom>(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === oldPlayerId);
    if (!player) return false;

    // Update player ID
    player.id = newPlayerId;

    // Update Redis mappings
    await Redis.deletePlayerRoom(oldPlayerId);
    await Redis.setPlayerRoom(newPlayerId, roomId);
    await Redis.setRoom(roomId, room);

    console.log(`[RoomManager] Reconnected player ${oldPlayerId} -> ${newPlayerId} in room ${roomId} (Redis)`);
    return true;
}

// ============================================
// DEBUG / STATS
// ============================================

export async function getStats() {
    // Note: This becomes async and might need more work to be useful
    const queueSize = await Redis.getQueueSize();
    // We can't easily count all rooms in Redis without SCAN, but for stats we can try
    return {
        queueSize,
        msg: "Stats from Redis need SCAN implementation for full detail"
    };
}

