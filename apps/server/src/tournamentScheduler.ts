/**
 * Tournament Scheduler
 * 
 * Automatically handles week transitions in the Tournament smart contract.
 * When the tournament phase changes to 'ended', this scheduler calls startNewWeek()
 * to increment the currentWeek in the smart contract, enabling players to claim rewards.
 */

import { getTournamentStatus, getCurrentPhase, TournamentPhase } from './tournamentConfig.js';
import { contractService } from './contractService.js';

// Track if we've already transitioned this week
let weekTransitionDone = false;
let lastKnownPhase: TournamentPhase | null = null;

// Mutex to prevent concurrent calls
let isTransitioning = false;

/**
 * Initialize the tournament scheduler
 * Checks every 5 seconds if the tournament has ended and triggers week transition
 */
export function initTournamentScheduler(): void {
    console.log('[TournamentScheduler] ========================================');
    console.log('[TournamentScheduler] Tournament Scheduler Initialized');
    console.log('[TournamentScheduler] ========================================');

    // Initial status check
    const status = getTournamentStatus();
    console.log(`[TournamentScheduler] Current Phase: ${status.phase}`);
    console.log(`[TournamentScheduler] Current Week: ${status.week}`);
    console.log(`[TournamentScheduler] Next: ${status.nextPhaseName} in ${status.countdown}s`);

    lastKnownPhase = status.phase;

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
        console.log('[TournamentScheduler] 🏁 TOURNAMENT ENDED! Starting week transition...');
        console.log('[TournamentScheduler] ========================================');

        try {
            // Call startNewWeek() on the smart contract
            const txHash = await contractService.startNewWeek();

            if (txHash) {
                console.log(`[TournamentScheduler] ✅ Week transition successful!`);
                console.log(`[TournamentScheduler] TX Hash: ${txHash}`);
                console.log(`[TournamentScheduler] Players can now claim rewards from the previous week.`);
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
