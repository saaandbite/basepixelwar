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
    GRID: 'grid:', // grid:roomId -> JSON grid
    LEADERBOARD: 'leaderboard:', // leaderboard:category -> ZSET
    TOURNAMENT_LEADERBOARD: (week: string | number, roomId: string | number) => `tournament:${week}:room:${roomId}:leaderboard`,
    TOURNAMENT_LOBBY_PLAYERS: (week: string | number, roomId: string | number) => `tournament:${week}:room:${roomId}:online`,
    TOURNAMENT_STATS_WINS: 'tournament:stats:wins',
    TOURNAMENT_STATS_EARNINGS: 'tournament:stats:earnings',
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
            console.log('[Redis] Connected to Redis');
            resolve();
        });

        redis.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
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
 * Set username for wallet address
 */
export async function setUsername(
    walletAddress: string,
    username: string
): Promise<void> {
    const r = getRedis();
    const normalizedAddress = walletAddress.toLowerCase();
    await r.set(`${KEYS.WALLET_TO_ACCOUNT}username:${normalizedAddress}`, username);
    console.log(`[Redis] Set username for ${normalizedAddress}: ${username}`);
}

/**
 * Get username by wallet address
 */
export async function getUsername(
    walletAddress: string
): Promise<string | null> {
    const r = getRedis();
    const normalizedAddress = walletAddress.toLowerCase();
    return r.get(`${KEYS.WALLET_TO_ACCOUNT}username:${normalizedAddress}`);
}

/**
 * Generate random username
 */
export function generateUsername(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let random = '';
    for (let i = 0; i < 6; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Player_${random}`;
}

/**
 * Format wallet address with middle censoring
 * Example: 0x10f9aEFFbc4240d255a7ba0337011fA6003910E8 -> 0x10f9...10E8
 */
export function formatWalletAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
    id: string;          // Identity ID (wallet or socket.id) for deduplication
    socketId: string;    // Original socket.id for direct socket lookup
    name: string;
    walletAddress?: string;
    joinedAt: number;
}

/**
 * Clear the matchmaking queue (useful on server restart)
 */
export async function clearMatchmakingQueue(): Promise<void> {
    const r = getRedis();
    await r.del(KEYS.MATCHMAKING_QUEUE);
    await r.del(`${KEYS.MATCHMAKING_QUEUE}:data`);
}

/**
 * Add player to matchmaking queue
 */
export async function addToQueue(player: QueuePlayer): Promise<number> {
    const r = getRedis();
    const identityId = player.walletAddress || player.id;

    // Ensure player object internally uses the identityId for matching
    player.id = identityId;

    const score = player.joinedAt;
    const member = JSON.stringify(player);

    // Atomic: Remove old record (if any) and add new one
    await r.multi()
        .zrem(KEYS.MATCHMAKING_QUEUE, identityId)
        .hset(`${KEYS.MATCHMAKING_QUEUE}:data`, identityId, member)
        .zadd(KEYS.MATCHMAKING_QUEUE, score, identityId)
        .exec();

    return r.zcard(KEYS.MATCHMAKING_QUEUE);
}

/**
 * Remove player from matchmaking queue
 */
export async function removeFromQueue(playerId: string): Promise<boolean> {
    if (!isRedisConnected()) {
        console.warn(`[Redis] Skipping removeFromQueue(${playerId}) - Connection closed`);
        return false;
    }

    const r = getRedis();

    // Note: playerId here might be socket.id or wallet.
    // Try both or ensure socketServer sends the right one.
    // For now, we try to remove from both index and data
    const results = await r.multi()
        .zrem(KEYS.MATCHMAKING_QUEUE, playerId)
        .hdel(`${KEYS.MATCHMAKING_QUEUE}:data`, playerId)
        .exec();

    const removed = results && (results[0][1] as number > 0);
    if (removed) {
        console.log(`[Redis] Player ${playerId.substring(0, 8)} removed from queue`);
    }
    return !!removed;
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

    while (true) {
        // Get top 2 distinct player IDs
        const ids = await r.zrange(KEYS.MATCHMAKING_QUEUE, 0, 1);

        if (ids.length < 2) {
            return null;
        }

        // Fetch data for these IDs
        const [data1, data2] = await Promise.all([
            r.hget(`${KEYS.MATCHMAKING_QUEUE}:data`, ids[0]),
            r.hget(`${KEYS.MATCHMAKING_QUEUE}:data`, ids[1])
        ]);

        // SELF-CLEANING: If data is missing for an ID in ZSET, it's a "ghost" entry.
        if (!data1 || !data2) {
            const toRemove = [];
            if (!data1) toRemove.push(ids[0]);
            if (!data2) toRemove.push(ids[1]);

            console.log(`[Redis] Cleaning up ${toRemove.length} ghost entries from queue...`);
            const multi = r.multi();
            for (const id of toRemove) {
                multi.zrem(KEYS.MATCHMAKING_QUEUE, id);
                multi.hdel(`${KEYS.MATCHMAKING_QUEUE}:data`, id);
            }
            await multi.exec();

            // Continue loop to try next players
            continue;
        }

        const p1 = JSON.parse(data1) as QueuePlayer;
        const p2 = JSON.parse(data2) as QueuePlayer;

        // Safety check: Ensure they are not the same person
        if (p1.id === p2.id || (p1.walletAddress && p1.walletAddress === p2.walletAddress)) {
            console.warn(`[Redis] Matchmaking conflict: Player ${p1.name} matched with self. Cleaning.`);
            await r.multi()
                .zrem(KEYS.MATCHMAKING_QUEUE, ids[1])
                .hdel(`${KEYS.MATCHMAKING_QUEUE}:data`, ids[1])
                .exec();
            continue;
        }

        // Atomic remove and match
        const result = await r.multi()
            .zrem(KEYS.MATCHMAKING_QUEUE, ids[0])
            .zrem(KEYS.MATCHMAKING_QUEUE, ids[1])
            .hdel(`${KEYS.MATCHMAKING_QUEUE}:data`, ids[0])
            .hdel(`${KEYS.MATCHMAKING_QUEUE}:data`, ids[1])
            .exec();

        if (!result) return null;

        console.log(`[Redis] Matched ${p1.name} vs ${p2.name}`);
        return [p1, p2];
    }
}

/**
 * Get player's position in queue
 */
export async function getQueuePosition(playerId: string): Promise<number> {
    const r = getRedis();
    // Rank is 0-indexed, so we add 1
    const rank = await r.zrank(KEYS.MATCHMAKING_QUEUE, playerId);
    return rank !== null ? rank + 1 : 0; // 0 if not in queue
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
// GRID SNAPSHOTS (For Reconnection)
// ============================================

export async function setGridSnapshot(roomId: string, grid: any[][]): Promise<void> {
    const r = getRedis();
    await r.set(`${KEYS.GRID}${roomId}`, JSON.stringify(grid), 'EX', 3600); // 1 hour expiry
}

export async function getGridSnapshot<T>(roomId: string): Promise<T | null> {
    const r = getRedis();
    const data = await r.get(`${KEYS.GRID}${roomId}`);
    if (!data) return null;
    return JSON.parse(data) as T;
}

export async function deleteGridSnapshot(roomId: string): Promise<void> {
    const r = getRedis();
    await r.del(`${KEYS.GRID}${roomId}`);
}

// ============================================
// LEADERBOARD (Sorted Sets)
// ============================================

export async function updateLeaderboard(
    category: 'wins' | 'eth',
    walletAddress: string,
    score: number
): Promise<void> {
    const r = getRedis();
    if (category === 'wins') {
        // Incremental update for wins
        await r.zincrby(`${KEYS.LEADERBOARD}${category}`, score, walletAddress.toLowerCase());
    } else {
        // Absolute update for ETH balance
        await r.zadd(`${KEYS.LEADERBOARD}${category}`, score.toString(), walletAddress.toLowerCase());
    }
}

export async function getLeaderboard(
    category: 'wins' | 'eth',
    top: number = 10
): Promise<{ wallet: string; score: number }[]> {
    const r = getRedis();
    const data = await r.zrevrange(`${KEYS.LEADERBOARD}${category}`, 0, top - 1, 'WITHSCORES');

    const results: { wallet: string; score: number }[] = [];
    for (let i = 0; i < data.length; i += 2) {
        results.push({
            wallet: data[i],
            score: parseFloat(data[i + 1])
        });
    }
    return results;
}

/**
 * Get aggregated stats for a single player
 */
export async function getPlayerStats(walletAddress: string): Promise<{ wins: number; totalEarnings: number }> {
    const r = getRedis();
    const normalized = walletAddress.toLowerCase();

    // Fetch scores directly from the sorted sets
    const [winsStr, ethStr] = await Promise.all([
        r.zscore(`${KEYS.LEADERBOARD}wins`, normalized),
        r.zscore(`${KEYS.LEADERBOARD}eth`, normalized)
    ]);

    return {
        wins: winsStr ? parseInt(winsStr, 10) : 0,
        totalEarnings: ethStr ? parseFloat(ethStr) : 0
    };
}


/**
 * Get Tournament Stats for a player
 */
export async function getTournamentPlayerStats(walletAddress: string): Promise<{ wins: number; totalEarnings: number }> {
    const r = getRedis();
    const normalized = walletAddress.toLowerCase();

    const [winsStr, ethStr] = await Promise.all([
        r.zscore(KEYS.TOURNAMENT_STATS_WINS, normalized),
        r.zscore(KEYS.TOURNAMENT_STATS_EARNINGS, normalized)
    ]);

    return {
        wins: winsStr ? parseInt(winsStr, 10) : 0,
        totalEarnings: ethStr ? parseFloat(ethStr) : 0
    };
}

/**
 * Update Tournament Lifetime Stats
 */
export async function updateTournamentStats(
    category: 'wins' | 'earnings',
    walletAddress: string,
    amount: number
): Promise<number> {
    const r = getRedis();
    const normalized = walletAddress.toLowerCase();
    const key = category === 'wins' ? KEYS.TOURNAMENT_STATS_WINS : KEYS.TOURNAMENT_STATS_EARNINGS;

    // Increment score
    const newScore = await r.zincrby(key, amount, normalized);
    return parseFloat(newScore);
}

// ============================================
// TOURNAMENT LEADERBOARD
// ============================================

export async function updateTournamentScore(
    week: number,
    roomId: string,
    walletAddress: string,
    scoreToAdd: number
): Promise<number> {
    const r = getRedis();
    const key = KEYS.TOURNAMENT_LEADERBOARD(week, roomId);
    // Incrby returns the new score
    const newScore = await r.zincrby(key, scoreToAdd, walletAddress.toLowerCase());
    return parseFloat(newScore);
}

export async function getTournamentLeaderboard(
    week: number,
    roomId: string
): Promise<{ wallet: string; score: number }[]> {
    const r = getRedis();
    const key = KEYS.TOURNAMENT_LEADERBOARD(week, roomId);
    const data = await r.zrevrange(key, 0, -1, 'WITHSCORES');

    const results: { wallet: string; score: number }[] = [];
    for (let i = 0; i < data.length; i += 2) {
        results.push({
            wallet: data[i],
            score: parseFloat(data[i + 1])
        });
    }
    return results;
}

// Lobby Online Status
// We use a Sorted Set (ZSET) where score = timestamp
// This allows auto-expiration of ghosts (Heartbeat Pattern)

export async function setTournamentLobbyPresence(
    week: number,
    roomId: string,
    walletAddress: string,
    isOnline: boolean
): Promise<void> {
    const r = getRedis();
    const key = KEYS.TOURNAMENT_LOBBY_PLAYERS(week, roomId);

    if (isOnline) {
        // Update heartbeat (Score = Current Time)
        try {
            await r.zadd(key, Date.now(), walletAddress.toLowerCase());
        } catch (error: any) {
            // Auto-Migration: If key is wrong type (old Set vs new ZSet), delete and retry
            if (error.message && error.message.includes('WRONGTYPE')) {
                console.warn(`[Redis] Detected legacy key type for ${key}. Deleting and migrating to ZSET.`);
                await r.del(key);
                await r.zadd(key, Date.now(), walletAddress.toLowerCase());
            } else {
                throw error;
            }
        }
        // Set expiry for the whole key to avoid stale data if lobby is empty for a long time (e.g. 1 hour)
        await r.expire(key, 3600);
    } else {
        // Explicit remove
        try {
            await r.zrem(key, walletAddress.toLowerCase());
        } catch (error: any) {
            if (error.message && error.message.includes('WRONGTYPE')) {
                // If it's the wrong type, just delete the whole key to be safe/clean
                await r.del(key);
            }
        }
    }
}

export async function getTournamentLobbyOnlinePlayers(
    week: number,
    roomId: string
): Promise<string[]> {
    const r = getRedis();
    const key = KEYS.TOURNAMENT_LOBBY_PLAYERS(week, roomId);

    // 1. Clean up "ghosts" (players who haven't pinged in 10 seconds)
    // We use 10s buffer (client pings every 5s) - Fast but safe from jitter
    const threshold = Date.now() - 10000;
    await r.zremrangebyscore(key, 0, threshold);

    // 2. Return active players
    return r.zrange(key, 0, -1);
}


// ============================================
// GAME STATE SNAPSHOTS (For Crash Recovery)
// ============================================

/**
 * Minimal game state for recovery (no visual effects)
 */
interface GameSnapshot {
    grid: any[][];
    player1: any;
    player2: any;
    timeLeft: number;
    scores: { blue: number; red: number };
    timestamp: number;
}

/**
 * Save game state snapshot to Redis
 * Called periodically during gameplay for crash recovery
 */
export async function setGameSnapshot(roomId: string, state: {
    grid: any[][];
    player1: any;
    player2: any;
    timeLeft: number;
    scores: { blue: number; red: number };
}): Promise<void> {
    const r = getRedis();
    const snapshot: GameSnapshot = {
        grid: state.grid,
        player1: {
            x: state.player1.x,
            y: state.player1.y,
            angle: state.player1.angle,
            ink: state.player1.ink,
            weaponMode: state.player1.weaponMode,
        },
        player2: {
            x: state.player2.x,
            y: state.player2.y,
            angle: state.player2.angle,
            ink: state.player2.ink,
            weaponMode: state.player2.weaponMode,
        },
        timeLeft: state.timeLeft,
        scores: state.scores,
        timestamp: Date.now()
    };
    await r.set(`snapshot:${roomId}`, JSON.stringify(snapshot), 'EX', 300); // 5 min expiry
}

/**
 * Get game state snapshot from Redis
 */
export async function getGameSnapshot(roomId: string): Promise<GameSnapshot | null> {
    const r = getRedis();
    const data = await r.get(`snapshot:${roomId}`);
    return data ? JSON.parse(data) as GameSnapshot : null;
}

/**
 * Delete game state snapshot
 */
export async function deleteGameSnapshot(roomId: string): Promise<void> {
    const r = getRedis();
    await r.del(`snapshot:${roomId}`);
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
