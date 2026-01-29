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
const TESTING_DATE = '2026-01-29';

const SCHEDULE_1: TournamentSchedule = {
    week: 27,
    // Registration: 10:43 - 10:48 WIB
    registrationStart: new Date(`${TESTING_DATE}T10:43:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T10:48:00+07:00`),
    // Point Collection: 10:48 - 10:53 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T10:48:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T10:53:00+07:00`),
};

const SCHEDULE_2: TournamentSchedule = {
    week: 28,
    // Registration: 10:58 - 11:03 WIB (5m gap)
    registrationStart: new Date(`${TESTING_DATE}T10:58:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T11:03:00+07:00`),
    // Point Collection: 11:03 - 11:08 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T11:03:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T11:08:00+07:00`),
};

const SCHEDULE_3: TournamentSchedule = {
    week: 29,
    // Registration: 11:13 - 11:18 WIB
    registrationStart: new Date(`${TESTING_DATE}T11:13:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T11:18:00+07:00`),
    // Point Collection: 11:18 - 11:23 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T11:18:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T11:23:00+07:00`),
};

const SCHEDULE_4: TournamentSchedule = {
    week: 30,
    // Registration: 11:28 - 11:33 WIB
    registrationStart: new Date(`${TESTING_DATE}T11:28:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T11:33:00+07:00`),
    // Point Collection: 11:33 - 11:38 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T11:33:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T11:38:00+07:00`),
};

const SCHEDULE_5: TournamentSchedule = {
    week: 31,
    // Registration: 11:43 - 11:48 WIB
    registrationStart: new Date(`${TESTING_DATE}T11:43:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T11:48:00+07:00`),
    // Point Collection: 11:48 - 11:53 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T11:48:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T11:53:00+07:00`),
};

const SCHEDULE_6: TournamentSchedule = {
    week: 32,
    // Registration: 11:58 - 12:03 WIB
    registrationStart: new Date(`${TESTING_DATE}T11:58:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T12:03:00+07:00`),
    // Point Collection: 12:03 - 12:08 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T12:03:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T12:08:00+07:00`),
};

const SCHEDULE_7: TournamentSchedule = {
    week: 33,
    // Registration: 12:13 - 12:18 WIB
    registrationStart: new Date(`${TESTING_DATE}T12:13:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T12:18:00+07:00`),
    // Point Collection: 12:18 - 12:23 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T12:18:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T12:23:00+07:00`),
};

const SCHEDULE_8: TournamentSchedule = {
    week: 34,
    // Registration: 12:28 - 12:33 WIB
    registrationStart: new Date(`${TESTING_DATE}T12:28:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T12:33:00+07:00`),
    // Point Collection: 12:33 - 12:38 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T12:33:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T12:38:00+07:00`),
};

const SCHEDULE_9: TournamentSchedule = {
    week: 35,
    // Registration: 12:43 - 12:48 WIB
    registrationStart: new Date(`${TESTING_DATE}T12:43:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T12:48:00+07:00`),
    // Point Collection: 12:48 - 12:53 WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T12:48:00+07:00`),
    pointCollectionEnd: new Date(`${TESTING_DATE}T12:53:00+07:00`),
};

export const CURRENT_TOURNAMENT_SCHEDULE = SCHEDULE_1;

const TESTING_SCHEDULES = [SCHEDULE_1, SCHEDULE_2, SCHEDULE_3, SCHEDULE_4, SCHEDULE_5, SCHEDULE_6, SCHEDULE_7, SCHEDULE_8, SCHEDULE_9];

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
