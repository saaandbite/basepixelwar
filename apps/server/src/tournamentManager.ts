import { getRedis } from './redis';
import { recordDeposit } from './db';
import { verifyTransaction } from './utils/transaction.js';
import { isRegistrationOpen, getTournamentStatus } from './tournamentConfig.js';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS;
const TOURNAMENT_PRICE_ETH = '0.001';

const KEYS = {
    TOURNAMENT_ROOM: (week: number, roomId: number) => `tournament:${week}:room:${roomId}`,
    // Updated to be week-specific to preserve history
    TOURNAMENT_PLAYER: (wallet: string, week: number) => `tournament:player:${wallet.toLowerCase()}:week:${week}`,
    TOURNAMENT_COUNTER: (week: number) => `tournament:${week}:player_count`,
};

const PLAYERS_PER_ROOM = 10;

export interface TournamentPlayer {
    walletAddress: string;
    joinedAt: number;
    txHash: string;
}

export interface PlayerLocation {
    week: number;
    roomId: number;
}

/**
 * Register a player joining the tournament
 * 
 * Logic:
 * 1. Check if registration is open (TIME PHASE CHECK)
 * 2. Verify Transaction (On-Chain)
 * 3. Check if already joined.
 * 4. Increment global player counter for the week.
 * 5. Calculate Room ID.
 * 6. Add to Redis List for that Request.
 * 7. Map Player -> Room.
 */
export async function joinTournament(
    walletAddress: string,
    week: number,
    txHash: string
): Promise<{ roomId: number; isNew: boolean }> {
    const wallet = walletAddress.toLowerCase();
    const mask = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

    console.log(`[Tournament] PAYMENT PROCESSING - ${mask}`);
    console.log(`[Tournament] Week: ${week}, TxHash: ${txHash.slice(0, 10)}...`);

    // 0. TIME PHASE CHECK - Registration must be open
    if (!isRegistrationOpen()) {
        const status = getTournamentStatus();
        // Allow if we are in the gap but technically "joining" for the *upcoming* (current) week?
        // Actually isRegistrationOpen checks the schedule.
        // If current time is in the gap, isRegistrationOpen() for Week 20 is FALSE. For Week 21 it is FALSE.
        // So players cannot join during the gap. This is correct.

        console.error(`[Tournament] REGISTRATION CLOSED: Current phase is '${status.phase}'`);
        throw new Error(`Registration is closed. Current phase: ${status.phase}. Next: ${status.nextPhaseName} in ${status.countdown}s`);
    }

    // 1. Security Check - On-Chain Verification
    console.log(`[Tournament] Step 1/5: Verifying transaction on-chain...`);
    const isValid = await verifyTransaction({
        txHash,
        sender: walletAddress,
        amount: TOURNAMENT_PRICE_ETH,
        toAddress: TOURNAMENT_ADDRESS
    });

    if (!isValid) {
        console.warn(`[Tournament] Log verification failed for ${mask}. Checking on-chain state directly...`);
        // Fallback: Check if player is actually registered on-chain
        const { contractService } = await import('./contractService.js');
        const chainWeek = await contractService.getCurrentWeekFromChain();
        const checkWeek = chainWeek || week;

        const onChainInfo = await contractService.getPlayerInfoFromChain(walletAddress, checkWeek);

        if (onChainInfo && onChainInfo.roomId > 0) {
            console.log(`[Tournament] On-chain state confirmed (Fallback): ${mask} is in Room ${onChainInfo.roomId}`);
            // Proceed to register in backend
        } else {
            console.error(`[Tournament] PAYMENT FAILED: On-chain verification failed for ${mask}`);
            throw new Error('Invalid Transaction: Verification failed on-chain');
        }
    }

    const r = getRedis();

    // 2. Check if already joined (for THIS week)
    const existing = await r.get(KEYS.TOURNAMENT_PLAYER(wallet, week));
    if (existing) {
        const data = JSON.parse(existing) as PlayerLocation;
        console.log(`[Tournament] DUPLICATE: ${mask} already in Week ${week}, Room ${data.roomId}`);
        return { roomId: data.roomId, isNew: false };
    }

    // 3. Increment counter to determine room
    const count = await r.incr(KEYS.TOURNAMENT_COUNTER(week));
    const roomId = Math.floor((count - 1) / PLAYERS_PER_ROOM) + 1;

    // 4. Add to Room List
    const playerEntry: TournamentPlayer = {
        walletAddress: wallet,
        joinedAt: Date.now(),
        txHash
    };

    await r.rpush(KEYS.TOURNAMENT_ROOM(week, roomId), JSON.stringify(playerEntry));

    // 5. Save Player Mapping (Week-Scoped)
    const location: PlayerLocation = { week, roomId };
    await r.set(KEYS.TOURNAMENT_PLAYER(wallet, week), JSON.stringify(location));
    console.log(`[Tournament] Redis mapping saved: ${mask} -> Week ${week} Room ${roomId}`);

    // 6. TigerBeetle Audit Log
    import('./db.js').then(async ({ recordDeposit }) => {
        try {
            const TICKET_PRICE = 1000000000000000n;
            await recordDeposit(wallet, TICKET_PRICE, txHash);
        } catch (err) {
            console.error(`[Tournament] TigerBeetle: FAILED to record deposit for ${mask}:`, err);
        }
    });

    return { roomId, isNew: true };
}

/**
 * Get players in a specific room
 */
export async function getRoomPlayers(week: number, roomId: number): Promise<TournamentPlayer[]> {
    console.log(`[Redis] Fetching players for Week ${week} Room ${roomId}`);
    const r = getRedis();
    const list = await r.lrange(KEYS.TOURNAMENT_ROOM(week, roomId), 0, -1);

    return list.map(item => JSON.parse(item) as TournamentPlayer);
}

/**
 * Get player's room info (defaults to current week if week not provided)
 */
export async function getPlayerRoom(walletAddress: string, checkWeek?: number): Promise<PlayerLocation | null> {
    const mask = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    const r = getRedis();

    // Determine target week
    let targetWeek = checkWeek;
    if (!targetWeek) {
        const { getTournamentStatus } = await import('./tournamentConfig.js');
        targetWeek = getTournamentStatus().week;
    }

    // Try to find for specific week
    const data = await r.get(KEYS.TOURNAMENT_PLAYER(walletAddress.toLowerCase(), targetWeek));
    if (data) {
        return JSON.parse(data) as PlayerLocation;
    }

    // FALLBACK: If querying for CURRENT week, check On-Chain for sync
    // We only sync if we are looking for the "active" tournament week
    try {
        const { getTournamentStatus } = await import('./tournamentConfig.js');
        const currentConfigWeek = getTournamentStatus().week;

        if (targetWeek === currentConfigWeek) {
            const { contractService } = await import('./contractService.js');
            const fs = await import('fs');

            // Log to file for visibility
            fs.appendFileSync('/tmp/debug_tournament.log', `[${new Date().toISOString()}] Checking ${mask} Week ${targetWeek} (Config: ${currentConfigWeek})\n`);

            // Check chain for this specific week
            console.log(`[Tournament-DEBUG] Checking On-Chain for ${mask} Week ${targetWeek}...`);
            const onChainInfo = await contractService.getPlayerInfoFromChain(walletAddress, targetWeek);
            console.log(`[Tournament-DEBUG] On-Chain Result for ${mask}:`, JSON.stringify(onChainInfo));

            fs.appendFileSync('/tmp/debug_tournament.log', `[${new Date().toISOString()}] OnChain Result: ${JSON.stringify(onChainInfo)}\n`);

            if (onChainInfo && onChainInfo.roomId > 0) {
                console.log(`[Tournament] SYNC: Player ${mask} found on-chain (Week ${targetWeek}, Room ${onChainInfo.roomId}) but missing in Redis. Syncing...`);
                fs.appendFileSync('/tmp/debug_tournament.log', `[${new Date().toISOString()}] SYNCING to Redis\n`);

                // Sync to Redis (Week-Scoped)
                const location: PlayerLocation = { week: targetWeek, roomId: onChainInfo.roomId };
                await r.set(KEYS.TOURNAMENT_PLAYER(walletAddress.toLowerCase(), targetWeek), JSON.stringify(location));

                return location;
            } else {
                console.log(`[Tournament-DEBUG] Player ${mask} NOT found on-chain for Week ${targetWeek} (RoomID=${onChainInfo?.roomId})`);
                fs.appendFileSync('/tmp/debug_tournament.log', `[${new Date().toISOString()}] NOT FOUND on chain\n`);
            }
        }
    } catch (err) {
        console.error(`[Tournament] Error checking on-chain sync for ${mask}:`, err);
        const fs = require('fs');
        fs.appendFileSync('/tmp/debug_tournament.log', `[${new Date().toISOString()}] ERROR: ${err}\n`);
    }

    return null;
}
