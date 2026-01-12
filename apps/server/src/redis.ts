// apps/server/src/redis.ts
// Redis client & services for wallet mapping and queue management

import Redis from 'ioredis';

// Redis client instance
let redis: Redis | null = null;

// Redis Key Prefixes
const KEYS = {
    WALLET_TO_ACCOUNT: 'wallet:', // wallet:0x... -> TigerBeetle account ID
    ACCOUNT_TO_WALLET: 'account:', // account:123... -> wallet address
    MATCHMAKING_QUEUE: 'queue:matchmaking', // Sorted set for matchmaking
    ROOM: 'room:', // room:ABCDEF -> GameRoom JSON
    PLAYER_ROOM: 'player_room:', // player_room:socketId -> roomId
} as const;

// Configuration
const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
        if (times > 10) {
            console.error('[Redis] Max retries reached, giving up');
            return null;
        }
        const delay = Math.min(times * 100, 3000);
        console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
        return delay;
    },
};

// ============================================
// CONNECTION MANAGEMENT
// ============================================

export async function initRedis(): Promise<void> {
    if (redis) {
        console.log('[Redis] Already connected');
        return;
    }

    return new Promise((resolve, reject) => {
        redis = new Redis(REDIS_CONFIG);

        redis.on('connect', () => {
            console.log('[Redis] ✅ Connected to Redis');
            resolve();
        });

        redis.on('error', (err) => {
            console.error('[Redis] ❌ Connection error:', err.message);
            // Don't reject on error events after connection
            if (!redis?.status || redis.status === 'connecting') {
                reject(err);
            }
        });

        redis.on('close', () => {
            console.log('[Redis] Connection closed');
        });

        // Timeout for initial connection
        setTimeout(() => {
            if (!redis?.status || redis.status === 'connecting') {
                reject(new Error('Redis connection timeout'));
            }
        }, 10000);
    });
}

export function getRedis(): Redis {
    if (!redis) {
        throw new Error('Redis not initialized. Call initRedis() first.');
    }
    return redis;
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
        console.log('[Redis] Disconnected');
    }
}

export function isRedisConnected(): boolean {
    return redis?.status === 'ready';
}

// ============================================
// WALLET MAPPING (0x... <-> TigerBeetle Account ID)
// ============================================

/**
 * Store wallet address to TigerBeetle account ID mapping
 */
export async function setWalletMapping(
    walletAddress: string,
    tbAccountId: bigint
): Promise<void> {
    const r = getRedis();
    const normalizedAddress = walletAddress.toLowerCase();
    const accountIdStr = tbAccountId.toString();

    // Bi-directional mapping
    await Promise.all([
        r.set(`${KEYS.WALLET_TO_ACCOUNT}${normalizedAddress}`, accountIdStr),
        r.set(`${KEYS.ACCOUNT_TO_WALLET}${accountIdStr}`, normalizedAddress),
    ]);

    console.log(`[Redis] Mapped ${normalizedAddress} <-> ${accountIdStr}`);
}

/**
 * Get TigerBeetle account ID by wallet address
 */
export async function getAccountIdByWallet(
    walletAddress: string
): Promise<bigint | null> {
    const r = getRedis();
    const normalizedAddress = walletAddress.toLowerCase();
    const result = await r.get(`${KEYS.WALLET_TO_ACCOUNT}${normalizedAddress}`);

    if (result) {
        return BigInt(result);
    }
    return null;
}

/**
 * Get wallet address by TigerBeetle account ID
 */
export async function getWalletByAccountId(
    tbAccountId: bigint
): Promise<string | null> {
    const r = getRedis();
    const result = await r.get(`${KEYS.ACCOUNT_TO_WALLET}${tbAccountId.toString()}`);
    return result;
}

// ============================================
// MATCHMAKING QUEUE (Using Sorted Set)
// ============================================

interface QueuePlayer {
    id: string;
    name: string;
    walletAddress?: string;
    joinedAt: number;
}

/**
 * Add player to matchmaking queue
 */
export async function addToQueue(player: QueuePlayer): Promise<number> {
    const r = getRedis();
    const score = player.joinedAt || Date.now();

    await r.zadd(
        KEYS.MATCHMAKING_QUEUE,
        score,
        JSON.stringify(player)
    );

    const position = await r.zrank(KEYS.MATCHMAKING_QUEUE, JSON.stringify(player));
    console.log(`[Redis] ${player.name} added to queue at position ${(position ?? 0) + 1}`);
    return (position ?? 0) + 1;
}

/**
 * Remove player from matchmaking queue
 */
export async function removeFromQueue(playerId: string): Promise<boolean> {
    const r = getRedis();
    const members = await r.zrange(KEYS.MATCHMAKING_QUEUE, 0, -1);

    for (const member of members) {
        const player = JSON.parse(member) as QueuePlayer;
        if (player.id === playerId) {
            await r.zrem(KEYS.MATCHMAKING_QUEUE, member);
            console.log(`[Redis] Player ${playerId} removed from queue`);
            return true;
        }
    }
    return false;
}

/**
 * Get current queue size
 */
export async function getQueueSize(): Promise<number> {
    const r = getRedis();
    return r.zcard(KEYS.MATCHMAKING_QUEUE);
}

/**
 * Pop two players from queue for matching
 */
export async function popTwoPlayers(): Promise<[QueuePlayer, QueuePlayer] | null> {
    const r = getRedis();
    const count = await r.zcard(KEYS.MATCHMAKING_QUEUE);

    if (count < 2) {
        return null;
    }

    // Get first two players (oldest in queue)
    const members = await r.zrange(KEYS.MATCHMAKING_QUEUE, 0, 1);

    if (members.length < 2) {
        return null;
    }

    // Remove them from queue
    await r.zrem(KEYS.MATCHMAKING_QUEUE, members[0], members[1]);

    const player1 = JSON.parse(members[0]) as QueuePlayer;
    const player2 = JSON.parse(members[1]) as QueuePlayer;

    console.log(`[Redis] Matched ${player1.name} vs ${player2.name}`);
    return [player1, player2];
}

/**
 * Get player's position in queue
 */
export async function getQueuePosition(playerId: string): Promise<number> {
    const r = getRedis();
    const members = await r.zrange(KEYS.MATCHMAKING_QUEUE, 0, -1);

    for (let i = 0; i < members.length; i++) {
        const player = JSON.parse(members[i]) as QueuePlayer;
        if (player.id === playerId) {
            return i + 1; // 1-indexed
        }
    }
    return 0; // Not in queue
}

// ============================================
// ROOM STORAGE
// ============================================

/**
 * Store room data
 */
export async function setRoom(roomId: string, roomData: object): Promise<void> {
    const r = getRedis();
    await r.set(`${KEYS.ROOM}${roomId}`, JSON.stringify(roomData));
}

/**
 * Get room data
 */
export async function getRoom<T>(roomId: string): Promise<T | null> {
    const r = getRedis();
    const result = await r.get(`${KEYS.ROOM}${roomId}`);
    if (result) {
        return JSON.parse(result) as T;
    }
    return null;
}

/**
 * Delete room
 */
export async function deleteRoom(roomId: string): Promise<void> {
    const r = getRedis();
    await r.del(`${KEYS.ROOM}${roomId}`);
}

/**
 * Set player's current room
 */
export async function setPlayerRoom(
    playerId: string,
    roomId: string
): Promise<void> {
    const r = getRedis();
    await r.set(`${KEYS.PLAYER_ROOM}${playerId}`, roomId);
}

/**
 * Get player's current room
 */
export async function getPlayerRoom(playerId: string): Promise<string | null> {
    const r = getRedis();
    return r.get(`${KEYS.PLAYER_ROOM}${playerId}`);
}

/**
 * Remove player's room mapping
 */
export async function deletePlayerRoom(playerId: string): Promise<void> {
    const r = getRedis();
    await r.del(`${KEYS.PLAYER_ROOM}${playerId}`);
}

// ============================================
// UTILITY
// ============================================

/**
 * Clear all game-related data (for testing/reset)
 */
export async function clearAllGameData(): Promise<void> {
    const r = getRedis();

    // Clear matchmaking queue
    await r.del(KEYS.MATCHMAKING_QUEUE);

    // Clear all rooms and player mappings
    const roomKeys = await r.keys(`${KEYS.ROOM}*`);
    const playerRoomKeys = await r.keys(`${KEYS.PLAYER_ROOM}*`);

    if (roomKeys.length > 0) {
        await r.del(...roomKeys);
    }
    if (playerRoomKeys.length > 0) {
        await r.del(...playerRoomKeys);
    }

    console.log('[Redis] Cleared all game data');
}
