
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { contractService } from './contractService.js';
import { syncAllScoresToChain } from './tournamentScheduler.js';
import { initRedis, closeRedis } from './redis.js';

async function main() {
    await initRedis();
    console.log('--- DEBUG CHAIN STATE ---');
    console.log('Contract Address:', process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS);

    // 1. Check Current Week
    const onChainWeek = await contractService.getCurrentWeekFromChain();
    console.log('On-Chain Week:', onChainWeek);

    // 2. Check Player Info (User from screenshot)
    const wallet = '0xacf43a3D21115858022718E3FB2C530514FcfC25'; // From screenshot/logs

    console.log(`Checking player ${wallet}...`);

    const info29 = await contractService.getPlayerInfoFromChain(wallet, 29);
    console.log('Week 29 Info:', info29);

    const info30 = await contractService.getPlayerInfoFromChain(wallet, 30);
    console.log('Week 30 Info:', info30);

    // 3. Fix Week 29 Scores if needed
    if (info29 && info29.score === 0) {
        console.log('Week 29 Score is 0. Attempting to manual sync...');
        await syncAllScoresToChain(29);
        const info29After = await contractService.getPlayerInfoFromChain(wallet, 29);
        console.log('Week 29 Info After Sync:', info29After);
    }

    await closeRedis();
    process.exit(0);
}

main().catch(console.error);
