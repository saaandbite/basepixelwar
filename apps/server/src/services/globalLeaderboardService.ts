import { Server } from 'socket.io';
import * as Redis from '../redis';

/**
 * GlobalLeaderboardService
 * 
 * Handles leaderboard for STANDARD 1vs1 matches (non-tournament)
 * 
 * Point System:
 * - Win: +10 points
 * - Streak Bonus: +2 points per consecutive win (max +10)
 * - Total Earnings tracked separately
 * 
 * Leaderboard Categories:
 * 1. Total Wins
 * 2. Total Points (weighted with streak)
 * 3. Total ETH Earnings
 */

// Redis Keys
const KEYS = {
    GLOBAL_POINTS: 'global:leaderboard:points',
    GLOBAL_WINS: 'global:leaderboard:wins',
    GLOBAL_EARNINGS: 'global:leaderboard:earnings',
    PLAYER_STREAK: (wallet: string) => `global:player:${wallet.toLowerCase()}:streak`,
    PLAYER_STATS: (wallet: string) => `global:player:${wallet.toLowerCase()}:stats`,
};

// Point constants
const POINTS = {
    WIN: 10,
    LOSS: 0,
    DRAW: 1,
    STREAK_BONUS_PER_WIN: 2,
    MAX_STREAK_BONUS: 10,
};

export interface GlobalPlayerStats {
    totalWins: number;
    totalLosses: number;
    totalPoints: number;
    currentStreak: number;
    bestStreak: number;
    totalEarnings: number; // in wei as string
    lastMatchAt: number;
}

export interface LeaderboardEntry {
    wallet: string;
    score: number;
    rank: number;
}

/**
 * Process match result for standard 1vs1 game
 * Called from gameStateManager when a standard game ends
 */
export async function processStandardMatchResult(
    io: Server,
    winnerWallet: string | undefined,
    loserWallet: string | undefined,
    prizeAmount: bigint = 0n
): Promise<void> {
    const r = Redis.getRedis();

    console.log(`[GlobalLeaderboard] Processing Standard Match Result`);
    console.log(`[GlobalLeaderboard] Winner: ${winnerWallet || 'N/A'}`);
    console.log(`[GlobalLeaderboard] Loser: ${loserWallet || 'N/A'}`);

    // === WINNER PROCESSING ===
    if (winnerWallet) {
        const wallet = winnerWallet.toLowerCase();

        // 1. Get current streak
        const streakStr = await r.get(KEYS.PLAYER_STREAK(wallet));
        const currentStreak = streakStr ? parseInt(streakStr, 10) : 0;
        const newStreak = currentStreak + 1;

        // 2. Calculate points with streak bonus
        const streakBonus = Math.min(currentStreak * POINTS.STREAK_BONUS_PER_WIN, POINTS.MAX_STREAK_BONUS);
        const totalPoints = POINTS.WIN + streakBonus;

        console.log(`[GlobalLeaderboard] ${wallet.slice(0, 8)}... earned ${totalPoints} points (Win: ${POINTS.WIN}, Streak Bonus: ${streakBonus})`);

        // 3. Update Redis
        await Promise.all([
            // Update streak
            r.set(KEYS.PLAYER_STREAK(wallet), newStreak.toString()),
            // Update points leaderboard
            r.zincrby(KEYS.GLOBAL_POINTS, totalPoints, wallet),
            // Update wins leaderboard
            r.zincrby(KEYS.GLOBAL_WINS, 1, wallet),
            // Update earnings if prize was won
            prizeAmount > 0n ? r.zincrby(KEYS.GLOBAL_EARNINGS, Number(prizeAmount), wallet) : Promise.resolve(),
            // Update player stats hash
            updatePlayerStats(wallet, {
                wins: 1,
                losses: 0,
                points: totalPoints,
                streak: newStreak,
                earnings: prizeAmount,
            }),
        ]);
    }

    // === LOSER PROCESSING ===
    if (loserWallet) {
        const wallet = loserWallet.toLowerCase();

        console.log(`[GlobalLeaderboard] ${wallet.slice(0, 8)}... lost - streak reset to 0`);

        // Reset streak, update stats
        await Promise.all([
            r.set(KEYS.PLAYER_STREAK(wallet), '0'),
            updatePlayerStats(wallet, {
                wins: 0,
                losses: 1,
                points: POINTS.LOSS,
                streak: 0,
                earnings: 0n,
            }),
        ]);
    }

    // === BROADCAST LEADERBOARD UPDATE ===
    const [topPoints, topWins] = await Promise.all([
        getLeaderboard('points', 10),
        getLeaderboard('wins', 10),
    ]);

    io.emit('global_leaderboard_update', {
        points: topPoints,
        wins: topWins,
        updatedAt: Date.now(),
    });
}

/**
 * Process draw result
 */
export async function processDrawResult(
    io: Server,
    player1Wallet: string | undefined,
    player2Wallet: string | undefined
): Promise<void> {
    const r = Redis.getRedis();

    console.log(`[GlobalLeaderboard] Processing Draw`);

    // Both players get participation point, but streak is NOT broken
    for (const wallet of [player1Wallet, player2Wallet]) {
        if (wallet) {
            const w = wallet.toLowerCase();
            await r.zincrby(KEYS.GLOBAL_POINTS, POINTS.DRAW, w);
        }
    }

    // Broadcast update
    const topPoints = await getLeaderboard('points', 10);
    io.emit('global_leaderboard_update', {
        points: topPoints,
        updatedAt: Date.now(),
    });
}

/**
 * Update player stats hash
 */
async function updatePlayerStats(
    wallet: string,
    update: {
        wins: number;
        losses: number;
        points: number;
        streak: number;
        earnings: bigint;
    }
): Promise<void> {
    const r = Redis.getRedis();
    const key = KEYS.PLAYER_STATS(wallet);

    // Get existing stats
    const existing = await r.hgetall(key);

    const currentWins = parseInt(existing.totalWins || '0', 10);
    const currentLosses = parseInt(existing.totalLosses || '0', 10);
    const currentPoints = parseInt(existing.totalPoints || '0', 10);
    const bestStreak = parseInt(existing.bestStreak || '0', 10);
    const currentEarnings = BigInt(existing.totalEarnings || '0');

    // Calculate new values
    const newBestStreak = Math.max(bestStreak, update.streak);

    await r.hset(key, {
        totalWins: (currentWins + update.wins).toString(),
        totalLosses: (currentLosses + update.losses).toString(),
        totalPoints: (currentPoints + update.points).toString(),
        currentStreak: update.streak.toString(),
        bestStreak: newBestStreak.toString(),
        totalEarnings: (currentEarnings + update.earnings).toString(),
        lastMatchAt: Date.now().toString(),
    });
}

/**
 * Get leaderboard by category
 */
export async function getLeaderboard(
    category: 'points' | 'wins' | 'earnings',
    limit: number = 10
): Promise<LeaderboardEntry[]> {
    const r = Redis.getRedis();

    const keyMap = {
        points: KEYS.GLOBAL_POINTS,
        wins: KEYS.GLOBAL_WINS,
        earnings: KEYS.GLOBAL_EARNINGS,
    };

    const data = await r.zrevrange(keyMap[category], 0, limit - 1, 'WITHSCORES');

    const results: LeaderboardEntry[] = [];
    for (let i = 0; i < data.length; i += 2) {
        results.push({
            wallet: data[i],
            score: parseFloat(data[i + 1]),
            rank: Math.floor(i / 2) + 1,
        });
    }

    return results;
}

/**
 * Get player's global stats
 */
export async function getPlayerGlobalStats(walletAddress: string): Promise<GlobalPlayerStats | null> {
    const r = Redis.getRedis();
    const wallet = walletAddress.toLowerCase();

    const stats = await r.hgetall(KEYS.PLAYER_STATS(wallet));

    if (!stats || Object.keys(stats).length === 0) {
        return null;
    }

    return {
        totalWins: parseInt(stats.totalWins || '0', 10),
        totalLosses: parseInt(stats.totalLosses || '0', 10),
        totalPoints: parseInt(stats.totalPoints || '0', 10),
        currentStreak: parseInt(stats.currentStreak || '0', 10),
        bestStreak: parseInt(stats.bestStreak || '0', 10),
        totalEarnings: parseFloat(stats.totalEarnings || '0'),
        lastMatchAt: parseInt(stats.lastMatchAt || '0', 10),
    };
}

/**
 * Get player's rank in each category
 */
export async function getPlayerRanks(walletAddress: string): Promise<{
    pointsRank: number | null;
    winsRank: number | null;
    earningsRank: number | null;
}> {
    const r = Redis.getRedis();
    const wallet = walletAddress.toLowerCase();

    const [pointsRank, winsRank, earningsRank] = await Promise.all([
        r.zrevrank(KEYS.GLOBAL_POINTS, wallet),
        r.zrevrank(KEYS.GLOBAL_WINS, wallet),
        r.zrevrank(KEYS.GLOBAL_EARNINGS, wallet),
    ]);

    return {
        pointsRank: pointsRank !== null ? pointsRank + 1 : null,
        winsRank: winsRank !== null ? winsRank + 1 : null,
        earningsRank: earningsRank !== null ? earningsRank + 1 : null,
    };
}

/**
 * Check if a wallet is registered in tournament for current week
 */
export async function isInTournament(walletAddress: string, week: number): Promise<boolean> {
    const r = Redis.getRedis();
    const wallet = walletAddress.toLowerCase();

    // Check tournament player mapping (from tournamentManager.ts)
    const tournamentData = await r.get(`tournament:player:${wallet}`);

    if (!tournamentData) {
        return false;
    }

    try {
        const data = JSON.parse(tournamentData);
        return data.week === week;
    } catch {
        return false;
    }
}
