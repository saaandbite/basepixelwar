import { createWalletClient, http, publicActions, getContract, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

// Ensure Private Key is formatted correctly
let pk = process.env.PRIVATE_KEY || '';
if (!pk.startsWith('0x') && pk.length > 0) {
    pk = `0x${pk}`;
}

// OVERRIDE for safety/accuracy based on user input
const TOURNAMENT_ADDRESS_OVERRIDE = '0xa523e5244ea5f90ad1fc1a7a7c40a1a8465a303a'; 

const PRIVATE_KEY = pk as `0x${string}`;
const TOURNAMENT_ADDRESS = (TOURNAMENT_ADDRESS_OVERRIDE || process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS) as `0x${string}`;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

const TOURNAMENT_ABI = parseAbi([
    'function trophyContract() view returns (address)'
]);

const TROPHY_ABI = parseAbi([
    'function tournamentContract() view returns (address)',
    'function setTournamentContract(address _contract) external'
]);

async function main() {
    console.log('=== FIX TROPHY PERMISSIONS ===');
    
    if (!PRIVATE_KEY || !TOURNAMENT_ADDRESS) {
        console.error('Missing PRIVATE_KEY or NEXT_PUBLIC_TOURNAMENT_ADDRESS in .env');
        process.exit(1);
    }

    const account = privateKeyToAccount(PRIVATE_KEY);
    const client = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(RPC_URL)
    }).extend(publicActions);

    console.log(`Validator Wallet: ${account.address}`);
    console.log(`Tournament Contract: ${TOURNAMENT_ADDRESS}`);

    // 1. Get Trophy Address from Tournament Address
    const tournament = getContract({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        client
    });

    const trophyAddress = await tournament.read.trophyContract();
    console.log(`Trophy Contract: ${trophyAddress}`);

    if (!trophyAddress || trophyAddress === '0x0000000000000000000000000000000000000000') {
        console.error('Tournament contract does not have a trophy address set!');
        process.exit(1);
    }

    // 2. Check permissions on Trophy Contract
    const trophy = getContract({
        address: trophyAddress,
        abi: TROPHY_ABI,
        client
    });

    const currentAllowed = await trophy.read.tournamentContract();
    console.log(`Current Allowed Minter: ${currentAllowed}`);

    if (currentAllowed.toLowerCase() === TOURNAMENT_ADDRESS.toLowerCase()) {
        console.log('✅ Permissions are ALREADY CORRECT. No action needed.');
    } else {
        console.log('⚠️  Permissions MISMATCH. Fixing now...');
        try {
            const hash = await trophy.write.setTournamentContract([TOURNAMENT_ADDRESS]);
            console.log(`Transaction sent: ${hash}`);
            
            console.log('Waiting for confirmation...');
            const receipt = await client.waitForTransactionReceipt({ hash });
            
            if (receipt.status === 'success') {
                console.log('✅ SUCCESS! Permissions updated.');
            } else {
                console.error('❌ FAILED. Transaction reverted.');
            }
        } catch (error: any) {
            console.error('Error sending transaction:', error.message || error);
        }
    }
}

main().catch(console.error);
