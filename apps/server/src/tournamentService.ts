import { Server } from 'socket.io';
import * as Redis from './redis';

/**
 * TournamentService
 * 
 * STRICT ISOLATION:
 * This service handles all "Business Logic" for Tournaments (Points, Leaderboards, Lobby Updates).
 * It receives RAW game results (Winner Wallet, Loser Wallet) from the Game Engine (GameStateManager).
 * It does NOT know about Game Grids, Cannons, or Physics.
 */

export async function processMatchResult(
    io: Server,
    tournamentRoomId: string,
    week: number,
    winnerWallet: string | undefined,
    loserWallet: string | undefined
) {
    console.log(`[TournamentService] Processing Match Result for Lobby ${tournamentRoomId} (Week ${week})`);

    // 1. Update Winner Score
    if (winnerWallet) {
        console.log(`[TournamentService] Winner: ${winnerWallet}`);
        // Winner gets +3 points
        const newScore = await Redis.updateTournamentScore(week, tournamentRoomId, winnerWallet, 3);
        console.log(`[TournamentService] Awarded +3 points to ${winnerWallet}. New Score: ${newScore}`);
    } else {
        console.error(`[TournamentService] CRITICAL: Winner wallet is undefined! Points LOST.`);
    }

    // 2. Update Loser Score (Participation)
    if (loserWallet) {
        console.log(`[TournamentService] Loser: ${loserWallet}`);
        // Loser gets +1 point
        const newScore = await Redis.updateTournamentScore(week, tournamentRoomId, loserWallet, 1);
        console.log(`[TournamentService] Awarded +1 point to ${loserWallet}. New Score: ${newScore}`);
    }

    // 3. Broadcast Update to Lobby
    // This ensures everyone in the lobby sees the new leaderboard immediately
    const lobbyRoomId = `tournament_lobby_${tournamentRoomId}`;
    const leaderboard = await Redis.getTournamentLeaderboard(week, tournamentRoomId);

    if (io) {
        io.to(lobbyRoomId).emit('lobby_leaderboard_update', leaderboard);
        console.log(`[TournamentService] Broadcasted leaderboard update to ${lobbyRoomId}`);
    }
}
