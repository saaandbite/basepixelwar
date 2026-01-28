/**
 * Tournament Time Phase Configuration
 * 
 * This file defines the time-based phases for tournaments.
 * 
 * Phases:
 * 1. UPCOMING: Before registration starts
 * 2. REGISTRATION: Players can buy tickets to join the tournament
 * 3. POINT_COLLECTION: Tournament is active, 1vs1 game wins count towards tournament leaderboard
 * 4. ENDED: Tournament has ended, scheduler will call startNewWeek() on contract
 */

export type TournamentPhase = 'registration' | 'point_collection' | 'ended' | 'upcoming';

export interface TournamentSchedule {
    week: number;
    registrationStart: Date;
    registrationEnd: Date;
    pointCollectionStart: Date;
    pointCollectionEnd: Date;
}

// ============================================
// TESTING CONFIGURATION - Multiple Weeks
// 22 January 2026, starting at 14:00 WIB
// Each cycle: 10 min registration + 10 min point collection
// ============================================

// Testing: 28 January 2026
const TESTING_DATE = '2026-01-28';

const SCHEDULE_1: TournamentSchedule = {
    week: 12,
    // Registration: 10:45 - 10:47 WIB
    registrationStart: new Date(`${TESTING_DATE}T10:45:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T10:47:00+07:00`),
    // Point Collection: 10:47 - 10:50 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T10:47:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T10:50:00+07:00`),
};

const SCHEDULE_2: TournamentSchedule = {
    week: 13,
    // Registration: 10:50 - 10:52 WIB
    registrationStart: new Date(`${TESTING_DATE}T10:50:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T10:52:00+07:00`),
    // Point Collection: 10:52 - 10:55 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T10:52:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T10:55:00+07:00`),
};

export const CURRENT_TOURNAMENT_SCHEDULE = SCHEDULE_1;

const TESTING_SCHEDULES = [SCHEDULE_1, SCHEDULE_2];

/**
 * Get the current tournament schedule based on time
 * Automatically finds the correct week
 */
export function getCurrentSchedule(): TournamentSchedule {
    const now = new Date();

    // Find schedule where we are within or before it ends
    for (const schedule of TESTING_SCHEDULES) {
        // If current time is before this schedule ends, use it
        if (now < schedule.pointCollectionEnd) {
            return schedule;
        }
    }

    // All schedules have passed - return the last one as "ended"
    return TESTING_SCHEDULES[TESTING_SCHEDULES.length - 1];
}

// Legacy export removed to fix duplicate declaration error
// export const CURRENT_TOURNAMENT_SCHEDULE = getCurrentSchedule();

/**
 * Get the current tournament phase
 */
export function getCurrentPhase(): TournamentPhase {
    const now = new Date();
    const schedule = getCurrentSchedule();

    // Before registration starts
    if (now < schedule.registrationStart) {
        return 'upcoming';
    }

    // During registration period
    if (now >= schedule.registrationStart && now < schedule.registrationEnd) {
        return 'registration';
    }

    // During point collection period
    if (now >= schedule.pointCollectionStart && now <= schedule.pointCollectionEnd) {
        return 'point_collection';
    }

    // After point collection ends
    return 'ended';
}

/**
 * Check if currently in registration phase
 */
export function isRegistrationOpen(): boolean {
    return getCurrentPhase() === 'registration';
}

/**
 * Check if currently in point collection phase
 */
export function isPointCollectionActive(): boolean {
    return getCurrentPhase() === 'point_collection';
}

/**
 * Get detailed tournament status
 */
export function getTournamentStatus() {
    const now = new Date();
    const phase = getCurrentPhase();
    const schedule = getCurrentSchedule();

    let nextPhaseTime: Date | null = null;
    let nextPhaseName: string = '';
    let countdown: number = 0;

    switch (phase) {
        case 'upcoming':
            nextPhaseTime = schedule.registrationStart;
            nextPhaseName = 'Registration Opens';
            break;
        case 'registration':
            nextPhaseTime = schedule.registrationEnd;
            nextPhaseName = 'Registration Closes';
            break;
        case 'point_collection':
            nextPhaseTime = schedule.pointCollectionEnd;
            nextPhaseName = 'Tournament Ends';
            break;
        case 'ended':
            // Check if there's a next week schedule
            const nextSchedule = TESTING_SCHEDULES.find(s => s.week === schedule.week + 1);
            if (nextSchedule && now < nextSchedule.registrationStart) {
                nextPhaseTime = nextSchedule.registrationStart;
                nextPhaseName = `Week ${nextSchedule.week} Registration`;
            } else {
                nextPhaseName = 'All Weeks Complete';
            }
            break;
    }

    if (nextPhaseTime) {
        countdown = Math.max(0, Math.floor((nextPhaseTime.getTime() - now.getTime()) / 1000));
    }

    return {
        week: schedule.week,
        phase,
        countdown,
        nextPhaseName,
        schedule: {
            registrationStart: schedule.registrationStart.toISOString(),
            registrationEnd: schedule.registrationEnd.toISOString(),
            pointCollectionStart: schedule.pointCollectionStart.toISOString(),
            pointCollectionEnd: schedule.pointCollectionEnd.toISOString(),
        },
        serverTime: now.toISOString(),
    };
}
