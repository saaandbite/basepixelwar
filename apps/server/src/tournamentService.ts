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
        // Winner gets +3 points (Week Score)
        const newScore = await Redis.updateTournamentScore(week, tournamentRoomId, winnerWallet, 3);

        // Also update Lifetime Tournament Wins
        await Redis.updateTournamentStats('wins', winnerWallet, 1);

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

    io.to(lobbyRoomId).emit('lobby_leaderboard_update', leaderboard);
    console.log(`[TournamentService] Broadcasted leaderboard update to ${lobbyRoomId}`);
}

/**
 * Distribute Prizes for a Room
 * Called when a room is finished or week ends.
 */
export async function distributeRoomPrizes(
    week: number,
    roomId: number,
    force: boolean = false
): Promise<void> {
    console.log(`[TournamentService] Distributing prizes for Week ${week} Room ${roomId}...`);

    // 1. Get Final Leaderboard
    const leaderboard = await Redis.getTournamentLeaderboard(week, roomId.toString());

    if (leaderboard.length === 0) {
        console.log(`[TournamentService] No players in room. Skipping distribution.`);
        return;
    }

    // Sort by score descending
    const ranked = leaderboard.sort((a, b) => b.score - a.score);
    const winner = ranked[0];

    console.log(`[TournamentService] Podium:`);
    console.log(`  1. ${winner.wallet} (${winner.score} pts)`);
    if (ranked[1]) console.log(`  2. ${ranked[1].wallet} (${ranked[1].score} pts)`);
    if (ranked[2]) console.log(`  3. ${ranked[2].wallet} (${ranked[2].score} pts)`);

    // 2. Award NFT to Winner (TigerBeetle Shadow Log)
    // We import dynamically to avoid circular deps if any, though here it's fine
    try {
        const { recordNFTWin, transferPrizeFromVault } = await import('./db.js');

        await recordNFTWin(winner.wallet, week);

        // ============ SAVE NFT WIN TO USER PROFILE IN REDIS ============
        // Store NFT win details in the user's Redis profile
        await Redis.recordUserNFTWin(winner.wallet, week, roomId);

        // 3. Award ETH Prizes to Runner-ups
        // Prize Structure:
        // 1st: NFT + (Maybe ETH? For now just NFT as per requirements "NFT wins")
        // 2nd: 0.005 ETH
        // 3rd: 0.002 ETH

        // Note: These values should nominally come from the collected pool. 
        // For strictness, we should check `getTreasuryBalance` or `totalPlayersThisWeek * entryFee`.
        // For this implementation, we use fixed small rewards as proof of concept.

        if (ranked[1]) {
            // 2nd Place: 0.005 ETH
            const prize2nd = 5000000000000000n; // 0.005 ETH
            await transferPrizeFromVault(ranked[1].wallet, prize2nd, roomId);

            // Record specifically for Tournament Stats
            await Redis.updateTournamentStats('earnings', ranked[1].wallet, Number(prize2nd));
        }

        if (ranked[2]) {
            // 3rd Place: 0.002 ETH
            const prize3rd = 2000000000000000n; // 0.002 ETH
            await transferPrizeFromVault(ranked[2].wallet, prize3rd, roomId);

            // Record specifically for Tournament Stats
            await Redis.updateTournamentStats('earnings', ranked[2].wallet, Number(prize3rd));
        }

        console.log(`[TournamentService] Distribution Complete for Week ${week} Room ${roomId}`);

    } catch (err) {
        console.error(`[TournamentService] Distribution Failed:`, err);
        // Important: logic to retry or alert admin would go here
    }
}
