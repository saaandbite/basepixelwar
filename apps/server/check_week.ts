
import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
dotenv.config();

const ABI = parseAbi([
    'function currentWeek() view returns (uint256)'
]);

async function main() {
    const client = createPublicClient({
        chain: baseSepolia,
        transport: http()
    });

    const address = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;
    if (!address) throw new Error("Missing Address");

    console.log("Checking contract at:", address);
    try {
        const week = await client.readContract({
            address,
            abi: ABI,
            functionName: 'currentWeek'
        });
        console.log("Current On-Chain Week:", week.toString());
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
