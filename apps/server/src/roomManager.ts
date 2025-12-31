// apps/server/src/roomManager.ts
// Room management untuk PvP matchmaking

import type { GameRoom, PvPPlayer } from '@repo/shared/multiplayer';

// In-memory room storage (akan diganti dengan Redis untuk production)
const rooms: Map<string, GameRoom> = new Map();
const playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId
const matchmakingQueue: PvPPlayer[] = [];

// Utility untuk generate room ID
function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================
// ROOM MANAGEMENT
// ============================================

export function createRoom(creator: PvPPlayer): GameRoom {
    const roomId = generateRoomId();

    const room: GameRoom = {
        id: roomId,
        players: [{ ...creator, team: 'blue', ready: false }],
        status: 'waiting',
        createdAt: Date.now(),
    };

    rooms.set(roomId, room);
    playerRoomMap.set(creator.id, roomId);

    console.log(`[RoomManager] Room ${roomId} created by ${creator.name}`);
    return room;
}

export function joinRoom(roomId: string, player: PvPPlayer): GameRoom | null {
    const room = rooms.get(roomId);

    if (!room) {
        console.log(`[RoomManager] Room ${roomId} not found`);
        return null;
    }

    if (room.players.length >= 2) {
        console.log(`[RoomManager] Room ${roomId} is full`);
        return null;
    }

    if (room.status !== 'waiting') {
        console.log(`[RoomManager] Room ${roomId} is not accepting players (status: ${room.status})`);
        return null;
    }

    // Add player as red team
    room.players.push({ ...player, team: 'red', ready: false });
    playerRoomMap.set(player.id, roomId);

    console.log(`[RoomManager] ${player.name} joined room ${roomId}`);
    return room;
}

export function leaveRoom(playerId: string): { room: GameRoom | null; wasHost: boolean } {
    const roomId = playerRoomMap.get(playerId);

    if (!roomId) {
        return { room: null, wasHost: false };
    }

    const room = rooms.get(roomId);
    if (!room) {
        playerRoomMap.delete(playerId);
        return { room: null, wasHost: false };
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    const wasHost = playerIndex === 0;

    if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
    }

    playerRoomMap.delete(playerId);

    // If room is empty, delete it
    if (room.players.length === 0) {
        rooms.delete(roomId);
        console.log(`[RoomManager] Room ${roomId} deleted (empty)`);
        return { room: null, wasHost };
    }

    // If host left, the remaining player becomes new host (blue team)
    if (wasHost && room.players.length > 0) {
        room.players[0].team = 'blue';
    }

    console.log(`[RoomManager] Player left room ${roomId}`);
    return { room, wasHost };
}

export function getRoom(roomId: string): GameRoom | null {
    return rooms.get(roomId) || null;
}

export function getPlayerRoom(playerId: string): GameRoom | null {
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return null;
    return rooms.get(roomId) || null;
}

export function setPlayerReady(playerId: string, ready: boolean): GameRoom | null {
    const room = getPlayerRoom(playerId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
        player.ready = ready;
    }

    return room;
}

export function areAllPlayersReady(room: GameRoom): boolean {
    return room.players.length === 2 && room.players.every(p => p.ready);
}

export function updateRoomStatus(roomId: string, status: GameRoom['status']): GameRoom | null {
    const room = rooms.get(roomId);
    if (!room) return null;

    room.status = status;
    if (status === 'playing') {
        room.gameStartedAt = Date.now();
    }

    return room;
}

// ============================================
// MATCHMAKING QUEUE
// ============================================

export function joinQueue(player: PvPPlayer): number {
    // Check if player is already in queue
    const existingIndex = matchmakingQueue.findIndex(p => p.id === player.id);
    if (existingIndex !== -1) {
        return existingIndex + 1;
    }

    matchmakingQueue.push(player);
    console.log(`[Matchmaking] ${player.name} joined queue. Queue size: ${matchmakingQueue.length}`);
    return matchmakingQueue.length;
}

export function leaveQueue(playerId: string): boolean {
    const index = matchmakingQueue.findIndex(p => p.id === playerId);
    if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        console.log(`[Matchmaking] Player ${playerId} left queue. Queue size: ${matchmakingQueue.length}`);
        return true;
    }
    return false;
}

export function getQueuePosition(playerId: string): number {
    const index = matchmakingQueue.findIndex(p => p.id === playerId);
    return index + 1; // 1-indexed position, 0 means not in queue
}

export function getQueueSize(): number {
    return matchmakingQueue.length;
}

export function tryMatchPlayers(): { player1: PvPPlayer; player2: PvPPlayer; room: GameRoom } | null {
    if (matchmakingQueue.length < 2) {
        return null;
    }

    // Simple FIFO matching - take first two players
    const player1 = matchmakingQueue.shift()!;
    const player2 = matchmakingQueue.shift()!;

    // Create room with these players
    const room = createRoom(player1);
    joinRoom(room.id, player2);

    console.log(`[Matchmaking] Matched ${player1.name} vs ${player2.name} in room ${room.id}`);

    return { player1, player2, room };
}

// ============================================

export function reconnectPlayer(roomId: string, oldPlayerId: string, newPlayerId: string): boolean {
    const room = rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === oldPlayerId);
    if (!player) return false;

    // Update player ID
    player.id = newPlayerId;

    // Update map
    playerRoomMap.delete(oldPlayerId);
    playerRoomMap.set(newPlayerId, roomId);

    console.log(`[RoomManager] Reconnected player ${oldPlayerId} -> ${newPlayerId} in room ${roomId}`);
    return true;
}

// ============================================
// DEBUG / STATS
// ============================================

export function getStats() {
    return {
        totalRooms: rooms.size,
        queueSize: matchmakingQueue.length,
        activeGames: Array.from(rooms.values()).filter(r => r.status === 'playing').length,
    };
}
