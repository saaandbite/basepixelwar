
import { createWalletClient, http, publicActions, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
// Allow overriding GameVault address from env, or fallback to known deployment
const GAME_VAULT_ADDRESS = process.env.NEXT_PUBLIC_GAME_VAULT_ADDRESS as `0x${string}`;

// ABI definition
// Copied from packages/contracts/src/GameVaultABI.json
const GAME_VAULT_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "gameId",
                "type": "uint256"
            }
        ],
        "name": "startGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "gameId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "winner",
                "type": "address"
            }
        ],
        "name": "finalizeGame1vs1",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "gameId",
                "type": "uint256"
            }
        ],
        "name": "cancelGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "backendSigner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export class ContractService {
    private client: any;
    private account: any;
    private contract: any;
    private isConfigured: boolean = false;

    constructor() {
        // Manual initialization required to ensure env vars are loaded
    }

    public initialize() {
        // Load local .env (backup)
        dotenv.config();

        const pk = process.env.PRIVATE_KEY;
        const address = process.env.NEXT_PUBLIC_GAME_VAULT_ADDRESS || process.env.GAME_VAULT_ADDRESS;

        if (!pk || !address) {
            console.error('\n❌ [ContractService] CRITICAL CONFIG ERROR');
            if (!pk) console.error('   -> PRIVATE_KEY is missing');
            if (!address) console.error('   -> GAME_VAULT_ADDRESS is missing');
            console.error('   Contract features disabled.\n');
            return;
        }

        let formattedPk = pk;
        if (!formattedPk.startsWith('0x')) {
            formattedPk = `0x${formattedPk}`;
        }

        try {
            this.account = privateKeyToAccount(formattedPk as `0x${string}`);

            this.client = createWalletClient({
                account: this.account,
                chain: baseSepolia,
                transport: http(RPC_URL)
            }).extend(publicActions);

            this.contract = getContract({
                address: address as `0x${string}`,
                abi: GAME_VAULT_ABI,
                client: this.client
            });

            this.isConfigured = true;
            console.log(`[ContractService] ✅ Initialized with Wallet: ${this.account.address}`);
            console.log(`[ContractService] 🏛️ Contract: ${address}`);
        } catch (error) {
            console.error('[ContractService] Initialization failed:', error);
        }
    }

    async startGame(gameId: number): Promise<string | null> {
        if (!this.isConfigured) return null;

        try {
            console.log(`[ContractService] Starting game ${gameId} on-chain...`);
            const hash = await this.contract.write.startGame([BigInt(gameId)]);
            console.log(`[ContractService] Game ${gameId} started. Tx: ${hash}`);
            return hash;
        } catch (error) {
            console.error(`[ContractService] Failed to start game ${gameId}:`, error);
            return null;
        }
    }

    async finalizeGame1vs1(gameId: number, winnerAddress: string): Promise<string | null> {
        if (!this.isConfigured) {
            console.error('[ContractService] Cannot finalize game: ContractService not configured (Missing Env Vars?)');
            return null;
        }

        try {
            console.log(`[ContractService] Finalizing game ${gameId} for winner ${winnerAddress}...`);
            const hash = await this.contract.write.finalizeGame1vs1([
                BigInt(gameId),
                winnerAddress as `0x${string}`
            ]);
            console.log(`[ContractService] Game ${gameId} finalized. Tx: ${hash}`);
            return hash;
        } catch (error) {
            console.error(`[ContractService] Failed to finalize game ${gameId}:`, error);
            return null;
        }
    }

    async cancelGame(gameId: number): Promise<string | null> {
        if (!this.isConfigured) return null;

        try {
            console.log(`[ContractService] Cancelling game ${gameId}...`);
            const hash = await this.contract.write.cancelGame([BigInt(gameId)]);
            console.log(`[ContractService] Game ${gameId} cancelled. Tx: ${hash}`);
            return hash;
        } catch (error) {
            console.error(`[ContractService] Failed to cancel game ${gameId}:`, error);
            return null;
        }
    }

    async verifySigner(): Promise<{ serverAddress: string, contractSigner: string, isMatch: boolean } | null> {
        if (!this.isConfigured) return null;
        try {
            const serverAddress = this.account.address;
            const contractSigner = await this.contract.read.backendSigner();
            const isMatch = serverAddress.toLowerCase() === (contractSigner as string).toLowerCase();

            console.log(`[ContractService] Server Address: ${serverAddress}`);
            console.log(`[ContractService] Contract Signer: ${contractSigner}`);
            console.log(`[ContractService] Match: ${isMatch}`);

            return { serverAddress, contractSigner: contractSigner as string, isMatch };
        } catch (error) {
            console.error('[ContractService] Verification failed:', error);
            return null;
        }
    }
}

export const contractService = new ContractService();
