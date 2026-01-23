/**
 * Tournament Scheduler
 * 
 * Automatically handles week transitions in the Tournament smart contract.
 * When the tournament phase changes to 'ended', this scheduler:
 * 1. Syncs all player scores from Redis to the smart contract
 * 2. Calls startNewWeek() to enable reward claims
 */

import { getTournamentStatus, getCurrentPhase, TournamentPhase } from './tournamentConfig.js';
import { contractService } from './contractService.js';
import { getRedis, getTournamentLeaderboard } from './redis.js';

// Track if we've already transitioned this week
let weekTransitionDone = false;
let lastKnownPhase: TournamentPhase | null = null;

// Mutex to prevent concurrent calls
let isTransitioning = false;

// Track if scores have been synced for the current tournament week
let scoresSyncedForWeek: number | null = null;

/**
 * Sync all tournament scores from Redis to smart contract
 * Collects scores from all rooms and submits in batches
 * PUBLIC: Can be called manually via API endpoint
 */
export async function syncAllScoresToChain(week: number): Promise<boolean> {
    try {
        const r = getRedis();

        // Get total player count to determine number of rooms
        const playerCountKey = `tournament:${week}:player_count`;
        const playerCountStr = await r.get(playerCountKey);
        const playerCount = playerCountStr ? parseInt(playerCountStr) : 0;

        console.log(`[TournamentScheduler] Debugging Score Sync: Week=${week} PlayerCount=${playerCount}`);

        if (playerCount === 0) {
            console.log(`[TournamentScheduler] No players joined tournament Week ${week} (Redis key: ${playerCountKey} is empty/0)`);
            
            // EMERGENCY FALLBACK: Check leaderboard directly if counter is broken
            console.log(`[TournamentScheduler] ⚠️ Checking room leaderboards directly as fallback...`);
            const leaderboard = await getTournamentLeaderboard(week, "1"); // Try room 1
            if (leaderboard.length > 0) {
                console.log(`[TournamentScheduler] ⚠️ Fallback found ${leaderboard.length} players in Room 1! Proceeding with sync.`);
                // Force proceed with at least 1 room
            } else {
                return false;
            }
        }

        const PLAYERS_PER_ROOM = 10;
        // Use max(1, ...) to ensure we at least check Room 1 if playerCount fallback logic is used
        const totalRooms = Math.max(1, Math.ceil(playerCount / PLAYERS_PER_ROOM));

        console.log(`[TournamentScheduler] Found ${playerCount} players in ${totalRooms} rooms`);

        // Collect all players and their scores
        const allPlayers: string[] = [];
        const allScores: number[] = [];

        for (let roomId = 1; roomId <= totalRooms; roomId++) {
            // FIX: Always use string-based lookup for reliability
            const leaderboard = await getTournamentLeaderboard(week, roomId.toString());

            if (leaderboard.length > 0) {
                console.log(`[TournamentScheduler] Room ${roomId}: ${leaderboard.length} players`);

                for (const entry of leaderboard) {
                    allPlayers.push(entry.wallet);
                    allScores.push(entry.score);
                }
            } else {
                 console.log(`[TournamentScheduler] Room ${roomId} is empty or no scores recorded.`);
            }
        }

        if (allPlayers.length === 0) {
            console.log(`[TournamentScheduler] No scores to sync`);
            // WARNING: returning false here might be correct if no one played, 
            // but we should still proceed to start new week. 
            // In the current logic, checkAndTransition proceeds regardless of this return value for step 2.
            return false;
        }

        console.log(`[TournamentScheduler] Syncing ${allPlayers.length} players' scores to chain...`);

        // Send in batches of 100 (contract limit)
        const BATCH_SIZE = 100;
        let allSuccess = true;

        for (let i = 0; i < allPlayers.length; i += BATCH_SIZE) {
            const batchPlayers = allPlayers.slice(i, i + BATCH_SIZE);
            const batchScores = allScores.slice(i, i + BATCH_SIZE);

            console.log(`[TournamentScheduler] Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allPlayers.length / BATCH_SIZE)} (${batchPlayers.length} players)`);

            const txHash = await contractService.setPlayerScoreBatch(batchPlayers, batchScores);

            if (txHash) {
                console.log(`[TournamentScheduler] Batch synced! TX: ${txHash}`);
            } else {
                console.error(`[TournamentScheduler] Batch sync failed!`);
                allSuccess = false;
            }
        }

        if (allSuccess) {
            console.log(`[TournamentScheduler] ✅ All scores synced to chain!`);
            scoresSyncedForWeek = week;
            return true;
        }
        return false;

    } catch (error) {
        console.error(`[TournamentScheduler] Error syncing scores to chain:`, error);
        return false;
    }
}

/**
 * Initialize the tournament scheduler
 * Checks every 5 seconds if the tournament has ended and triggers week transition
 */
export async function initTournamentScheduler(): Promise<void> {
    console.log('[TournamentScheduler] ========================================');
    console.log('[TournamentScheduler] Tournament Scheduler Initialized');
    console.log('[TournamentScheduler] ========================================');

    // Initial status check
    const status = getTournamentStatus();
    console.log(`[TournamentScheduler] Current Phase: ${status.phase}`);
    console.log(`[TournamentScheduler] Config Week: ${status.week}`);
    console.log(`[TournamentScheduler] Next: ${status.nextPhaseName} in ${status.countdown}s`);

    lastKnownPhase = status.phase;

    // Check on-chain week to determine if transition already happened
    // This prevents duplicate startNewWeek() calls after server restart
    try {
        const onChainWeek = await contractService.getCurrentWeekFromChain();
        console.log(`[TournamentScheduler] On-chain Week: ${onChainWeek}`);

        if (onChainWeek !== null && onChainWeek > status.week) {
            // On-chain week is already ahead - transition was done in a previous run
            console.log(`[TournamentScheduler] On-chain week (${onChainWeek}) > config week (${status.week})`);
            console.log(`[TournamentScheduler] Setting weekTransitionDone = true (already transitioned)`);
            weekTransitionDone = true;
        }
    } catch (error) {
        console.error('[TournamentScheduler] Failed to check on-chain week:', error);
    }

    // Check every 5 seconds
    setInterval(async () => {
        await checkAndTransition();
    }, 5000);
}

/**
 * Check if tournament has ended and trigger week transition
 */
async function checkAndTransition(): Promise<void> {
    const currentPhase = getCurrentPhase();

    // Detect phase change
    if (currentPhase !== lastKnownPhase) {
        console.log(`[TournamentScheduler] Phase changed: ${lastKnownPhase} → ${currentPhase}`);
        lastKnownPhase = currentPhase;
    }

    // When phase changes to 'ended' and we haven't transitioned yet
    if (currentPhase === 'ended' && !weekTransitionDone && !isTransitioning) {
        // MUTEX: Set flag BEFORE calling smart contract to prevent race condition
        isTransitioning = true;

        console.log('[TournamentScheduler] ========================================');
        console.log('[TournamentScheduler] 🏁 TOURNAMENT ENDED! Starting finalization...');
        console.log('[TournamentScheduler] ========================================');

        try {
            const status = getTournamentStatus();
            const week = status.week;

            // STEP 1: Sync all player scores to smart contract
            console.log(`[TournamentScheduler] Step 1/2: Syncing scores for Week ${week} to blockchain...`);
            await syncAllScoresToChain(week);

            // STEP 2: Call startNewWeek() on the smart contract
            console.log(`[TournamentScheduler] Step 2/2: Starting new week on-chain...`);
            const txHash = await contractService.startNewWeek();

            if (txHash) {
                console.log(`[TournamentScheduler] ✅ Week transition successful!`);
                console.log(`[TournamentScheduler] TX Hash: ${txHash}`);
                console.log(`[TournamentScheduler] Players can now claim rewards from Week ${week}.`);
                weekTransitionDone = true;
            } else {
                console.error('[TournamentScheduler] ❌ Week transition failed!');
                console.error('[TournamentScheduler] Possible causes:');
                console.error('  - Backend wallet is not the owner of Tournament contract');
                console.error('  - Tournament contract address is not set');
                console.error('  - Network issue');
                // Don't set weekTransitionDone so we retry on next interval
            }
        } catch (error) {
            console.error('[TournamentScheduler] Week transition error:', error);
        } finally {
            // Release mutex after operation completes (success or failure)
            isTransitioning = false;
        }
    }

    // Reset the flag when a new registration phase starts
    // This allows the next week's transition to happen
    if (currentPhase === 'registration' && weekTransitionDone) {
        console.log('[TournamentScheduler] New registration phase detected. Resetting transition flag.');
        weekTransitionDone = false;
    }
}

/**
 * Manually trigger week transition (for admin use)
 */
export async function manualWeekTransition(): Promise<boolean> {
    if (isTransitioning) {
        console.log('[TournamentScheduler] Week transition already in progress...');
        return false;
    }

    isTransitioning = true;
    console.log('[TournamentScheduler] Manual week transition triggered...');

    try {
        const txHash = await contractService.startNewWeek();

        if (txHash) {
            console.log(`[TournamentScheduler] Manual transition successful! TX: ${txHash}`);
            weekTransitionDone = true;
            return true;
        }

        console.error('[TournamentScheduler] Manual transition failed!');
        return false;
    } finally {
        isTransitioning = false;
    }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
    weekTransitionDone: boolean;
    lastKnownPhase: TournamentPhase | null;
    isTransitioning: boolean;
} {
    return {
        weekTransitionDone,
        lastKnownPhase,
        isTransitioning
    };
}
