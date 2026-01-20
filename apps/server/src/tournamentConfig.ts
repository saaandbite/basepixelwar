/**
 * Tournament Time Phase Configuration
 * 
 * This file defines the time-based phases for tournaments.
 * 
 * Phases:
 * 1. REGISTRATION: Players can buy tickets to join the tournament
 * 2. POINT_COLLECTION: Tournament is active, 1vs1 game wins count towards tournament leaderboard
 * 3. ENDED: Tournament has ended, waiting for next week
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
// TESTING CONFIGURATION (Week 1)
// Change these values for production
// ============================================

// Testing: 20-21 January 2026
const TESTING_DATE = '2026-01-20';
const NEXT_DAY = '2026-01-21';

export const CURRENT_TOURNAMENT_SCHEDULE: TournamentSchedule = {
    week: 1,
    // Registration: 16:00 - 21:00 WIB
    registrationStart: new Date(`${TESTING_DATE}T16:00:00+07:00`),
    registrationEnd: new Date(`${TESTING_DATE}T21:00:00+07:00`),
    // Point Collection: 21:01 - 12:00 next day WIB
    pointCollectionStart: new Date(`${TESTING_DATE}T21:01:00+07:00`),
    pointCollectionEnd: new Date(`${NEXT_DAY}T12:00:00+07:00`),
};

/**
 * Get the current tournament phase
 */
export function getCurrentPhase(): TournamentPhase {
    const now = new Date();
    const schedule = CURRENT_TOURNAMENT_SCHEDULE;

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
    const schedule = CURRENT_TOURNAMENT_SCHEDULE;

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
            nextPhaseName = 'Next Week';
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
