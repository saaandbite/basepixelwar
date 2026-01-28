
import { createWalletClient, http, publicActions, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load env from apps/server
dotenv.config({ path: path.resolve(__dirname, '../apps/server/.env') });

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

// Minimal ABI to check gameVault and owner
const ABI = [
    {
        "inputs": [],
        "name": "gameVault",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_gameVault", "type": "address" }],
        "name": "setGameVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function main() {
    if (!PRIVATE_KEY || !TOURNAMENT_ADDRESS) {
        console.error("Missing Env Vars");
        return;
    }

    const account = privateKeyToAccount(PRIVATE_KEY);
    const client = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(RPC_URL)
    }).extend(publicActions);

    console.log(`Backend Wallet: ${account.address}`);
    console.log(`Tournament Contract: ${TOURNAMENT_ADDRESS}`);

    const contract = getContract({
        address: TOURNAMENT_ADDRESS,
        abi: ABI,
        client
    });

    const gameVault = await contract.read.gameVault();
    const owner = await contract.read.owner();

    console.log(`Contract Owner: ${owner}`);
    console.log(`Contract gameVault: ${gameVault}`);

    if (gameVault.toLowerCase() !== account.address.toLowerCase()) {
        console.error(`\n[MISMATCH] Contract 'gameVault' is NOT the Backend Wallet!`);
        console.error(`Backend calls to addScore() will FAIL.`);
        console.log(`Current gameVault: ${gameVault}`);
        console.log(`Expected (Backend): ${account.address}`);

        if (owner.toLowerCase() === account.address.toLowerCase()) {
            console.log(`\n[FIX] Backend Wallet IS the Owner. Attempting to update gameVault...`);
            try {
                const hash = await contract.write.setGameVault([account.address]);
                console.log(`Updating gameVault... Tx: ${hash}`);
                await client.waitForTransactionReceipt({ hash });
                console.log(`[SUCCESS] gameVault updated to Backend Wallet!`);
            } catch (e) {
                console.error(`[ERROR] Failed to update gameVault:`, e);
            }
        } else {
            console.error(`[CRITICAL] Backend Wallet is NOT the Owner. Cannot fix automatically.`);
        }
    } else {
        console.log(`\n[SUCCESS] Permissions check PASSED. Backend Wallet is set as gameVault.`);
    }
}

main().catch(console.error);
