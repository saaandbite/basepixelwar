import { getRedis } from './redis';
import { recordDeposit } from './db';
import { verifyTransaction } from './utils/transaction.js';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS;
const TOURNAMENT_PRICE_ETH = '0.001';

const KEYS = {
    TOURNAMENT_ROOM: (week: number, roomId: number) => `tournament:${week}:room:${roomId}`,
    TOURNAMENT_PLAYER: (wallet: string) => `tournament:player:${wallet.toLowerCase()}`, // Maps wallet -> { week, roomId }
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
 * 1. Verify Transaction (On-Chain)
 * 2. Check if already joined.
 * 3. Increment global player counter for the week.
 * 4. Calculate Room ID.
 * 5. Add to Redis List for that Request.
 * 6. Map Player -> Room.
 */
export async function joinTournament(
    walletAddress: string,
    week: number,
    txHash: string
): Promise<{ roomId: number; isNew: boolean }> {
    const wallet = walletAddress.toLowerCase();
    const mask = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

    console.log(`\n========================================`);
    console.log(`[Tournament] PAYMENT PROCESSING - ${mask}`);
    console.log(`========================================`);
    console.log(`[Tournament] Week: ${week}, TxHash: ${txHash.slice(0, 10)}...`);

    // 0. Security Check - On-Chain Verification
    console.log(`[Tournament] Step 1/4: Verifying transaction on-chain...`);
    const isValid = await verifyTransaction({
        txHash,
        sender: walletAddress,
        amount: TOURNAMENT_PRICE_ETH,
        toAddress: TOURNAMENT_ADDRESS
    });

    if (!isValid) {
        console.error(`[Tournament] PAYMENT FAILED: On-chain verification failed for ${mask}`);
        console.error(`[Tournament] TxHash: ${txHash}`);
        throw new Error('Invalid Transaction: Verification failed on-chain');
    }
    console.log(`[Tournament] Step 1/4: On-chain verification PASSED`);

    const r = getRedis();

    // 1. Check if already joined
    console.log(`[Tournament] Step 2/4: Checking duplicate registration...`);
    const existing = await r.get(KEYS.TOURNAMENT_PLAYER(wallet));
    if (existing) {
        const data = JSON.parse(existing) as PlayerLocation;
        // If joined this week, return existing info
        if (data.week === week) {
            console.log(`[Tournament] DUPLICATE: ${mask} already in Week ${week}, Room ${data.roomId}`);
            console.log(`========================================\n`);
            return { roomId: data.roomId, isNew: false };
        }
    }
    console.log(`[Tournament] Step 2/4: New player confirmed`);

    // 2. Increment counter to determine room
    console.log(`[Tournament] Step 3/4: Assigning room...`);
    const count = await r.incr(KEYS.TOURNAMENT_COUNTER(week));

    // 3. Calculate Room ID (1-based)
    // Players 1-10 -> Room 1
    // Players 11-20 -> Room 2
    const roomId = Math.floor((count - 1) / PLAYERS_PER_ROOM) + 1;

    // 4. Add to Room List
    const playerEntry: TournamentPlayer = {
        walletAddress: wallet,
        joinedAt: Date.now(),
        txHash
    };

    await r.rpush(KEYS.TOURNAMENT_ROOM(week, roomId), JSON.stringify(playerEntry));
    console.log(`[Tournament] Step 3/4: Player #${count} assigned to Room ${roomId}`);

    // 5. Save Player Mapping
    const location: PlayerLocation = { week, roomId };
    await r.set(KEYS.TOURNAMENT_PLAYER(wallet), JSON.stringify(location));
    console.log(`[Tournament] Redis mapping saved: ${mask} -> Week ${week} Room ${roomId}`);

    // 6. TigerBeetle Audit Log (Parallel, don't block room assignment)
    console.log(`[Tournament] Step 4/4: Recording to TigerBeetle ledger...`);
    import('./db.js').then(async ({ recordDeposit }) => {
        try {
            // 0.001 ETH = 1000000000000000 wei
            const TICKET_PRICE = 1000000000000000n;
            await recordDeposit(wallet, TICKET_PRICE, txHash);
            console.log(`[Tournament] TigerBeetle: Deposit recorded for ${mask} (${TOURNAMENT_PRICE_ETH} ETH)`);
        } catch (err) {
            console.error(`[Tournament] TigerBeetle: FAILED to record deposit for ${mask}:`, err);
        }
    });

    console.log(`[Tournament] PAYMENT SUCCESS: ${mask} joined Week ${week}, Room ${roomId}`);
    console.log(`========================================\n`);

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
 * Get player's current room info
 */
export async function getPlayerRoom(walletAddress: string): Promise<PlayerLocation | null> {
    const mask = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    console.log(`[Redis] Checking room for player: ${mask}`);
    const r = getRedis();
    const data = await r.get(KEYS.TOURNAMENT_PLAYER(walletAddress.toLowerCase()));
    if (!data) return null;
    return JSON.parse(data) as PlayerLocation;
}
