
import { getTournamentStatus, getCurrentSchedule } from './apps/server/src/tournamentConfig';

try {
    const status = getTournamentStatus();
    console.log("Current Tournament Status:");
    console.log(JSON.stringify(status, null, 2));

    const schedule = getCurrentSchedule();
    console.log("\nCurrent Schedule Week:", schedule.week);
    console.log("Reg Start:", schedule.registrationStart);
    console.log("Reg End:", schedule.registrationEnd);
    console.log("Point Start:", schedule.pointCollectionStart);
    console.log("Point End:", schedule.pointCollectionEnd);
} catch (error) {
    console.error("Error verifying tournament status:", error);
}
