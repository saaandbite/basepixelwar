
import { createWalletClient, http, publicActions, getContract, Hash } from 'viem';
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

import { GAME_VAULT_ABI, TOURNAMENT_ABI } from '@repo/contracts';

// ABI definition


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
            console.error('\n [ContractService] CRITICAL CONFIG ERROR');
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
            console.log(`[ContractService]  Initialized with Wallet: ${this.account.address}`);
            console.log(`[ContractService]  Contract: ${address}`);
        } catch (error) {
            console.error('[ContractService] Initialization failed:', error);
        }
    }

    /**
     * Wait for transaction to be mined and confirmed
     */
    private async waitForTransaction(hash: Hash): Promise<{ success: boolean; error?: string }> {
        try {
            console.log(`[ContractService]  Waiting for tx confirmation: ${hash}`);

            const receipt = await this.client.waitForTransactionReceipt({
                hash,
                timeout: 60_000, // 60 second timeout
            });

            if (receipt.status === 'success') {
                console.log(`[ContractService]  Transaction confirmed in block ${receipt.blockNumber}`);
                return { success: true };
            } else {
                console.error(`[ContractService]  Transaction REVERTED in block ${receipt.blockNumber}`);
                return { success: false, error: 'Transaction reverted' };
            }
        } catch (error: any) {
            console.error(`[ContractService]  Transaction confirmation failed:`, error?.message || error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    }

    async startGame(gameId: number): Promise<string | null> {
        if (!this.isConfigured) return null;

        try {
            console.log(`[ContractService] Starting game ${gameId} on-chain...`);
            const hash = await this.contract.write.startGame([BigInt(gameId)]);
            console.log(`[ContractService] Game ${gameId} tx sent: ${hash}`);

            // Wait for confirmation
            const result = await this.waitForTransaction(hash);
            if (!result.success) {
                console.error(`[ContractService] startGame FAILED: ${result.error}`);
                return null;
            }

            console.log(`[ContractService] Game ${gameId} started successfully!`);
            return hash;
        } catch (error: any) {
            console.error(`[ContractService] Failed to start game ${gameId}:`, error?.shortMessage || error?.message || error);
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
            console.log(`[ContractService] Game ${gameId} tx sent: ${hash}`);

            // Wait for confirmation
            const result = await this.waitForTransaction(hash);
            if (!result.success) {
                console.error(`[ContractService] finalizeGame1vs1 FAILED: ${result.error}`);
                return null;
            }

            console.log(`[ContractService] Game ${gameId} finalized successfully!`);
            return hash;
        } catch (error: any) {
            console.error(`[ContractService] Failed to finalize game ${gameId}:`, error?.shortMessage || error?.message || error);
            return null;
        }
    }

    async cancelGame(gameId: number): Promise<string | null> {
        if (!this.isConfigured) return null;

        try {
            console.log(`[ContractService] Cancelling game ${gameId}...`);
            const hash = await this.contract.write.cancelGame([BigInt(gameId)]);
            console.log(`[ContractService] Game ${gameId} tx sent: ${hash}`);

            // Wait for confirmation
            const result = await this.waitForTransaction(hash);
            if (!result.success) {
                console.error(`[ContractService] cancelGame FAILED: ${result.error}`);
                return null;
            }

            console.log(`[ContractService] Game ${gameId} cancelled successfully!`);
            return hash;
        } catch (error: any) {
            console.error(`[ContractService] Failed to cancel game ${gameId}:`, error?.shortMessage || error?.message || error);
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
            console.log(`[ContractService] Match: ${isMatch ? ' YES' : ' NO'}`);

            if (!isMatch) {
                console.error(`[ContractService]  CRITICAL: Server wallet does NOT match contract's backendSigner!`);
                console.error(`[ContractService]  Settlement transactions WILL FAIL with NotBackendSigner error!`);
            }

            return { serverAddress, contractSigner: contractSigner as string, isMatch };
        } catch (error) {
            console.error('[ContractService] Verification failed:', error);
            return null;
        }
    }

    async addTournamentScore(playerAddress: string): Promise<string | null> {
        if (!process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS) {
            console.log('[ContractService] Tournament Address not set. Skipping score update.');
            return null;
        }

        try {
            const tournamentAddress = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;
            console.log(`[ContractService] Adding score for ${playerAddress} to Tournament ${tournamentAddress}...`);

            // Imported ABI
            // const { TOURNAMENT_ABI } = await import('./tournamentAbi.js');

            const tournamentContract = getContract({
                address: tournamentAddress,
                abi: TOURNAMENT_ABI,
                client: this.client
            }) as any;

            const hash = await tournamentContract.write.addScore([playerAddress as `0x${string}`]);
            console.log(`[ContractService] Score added tx: ${hash}`);
            return hash;
        } catch (error: any) {
            console.error(`[ContractService] Failed to add score:`, error?.shortMessage || error?.message || error);
            return null;
        }
    }

    /**
     * Start a new week in the Tournament contract
     * This increments currentWeek, allowing players from the previous week to claim rewards
     * IMPORTANT: This function requires the backend wallet to be the owner of the Tournament contract
     */
    async startNewWeek(): Promise<string | null> {
        if (!this.isConfigured) {
            console.error('[ContractService] Cannot start new week: ContractService not configured');
            return null;
        }

        if (!process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS) {
            console.log('[ContractService] Tournament Address not set. Cannot start new week.');
            return null;
        }

        try {
            const tournamentAddress = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;
            console.log(`[ContractService] Starting new week on Tournament contract ${tournamentAddress}...`);

            const tournamentContract = getContract({
                address: tournamentAddress,
                abi: TOURNAMENT_ABI,
                client: this.client
            }) as any;

            const hash = await tournamentContract.write.startNewWeek();
            console.log(`[ContractService] startNewWeek tx sent: ${hash}`);

            // Wait for confirmation
            const result = await this.waitForTransaction(hash);
            if (!result.success) {
                console.error(`[ContractService] startNewWeek FAILED: ${result.error}`);
                return null;
            }

            console.log(`[ContractService] ✅ New week started successfully!`);
            return hash;
        } catch (error: any) {
            console.error(`[ContractService] Failed to start new week:`, error?.shortMessage || error?.message || error);
            return null;
        }
    }

    /**
     * Batch update player scores on-chain when tournament ends
     * @param players Array of player wallet addresses
     * @param scores Array of score values (must match players array length)
     */
    async setPlayerScoreBatch(players: string[], scores: number[]): Promise<string | null> {
        if (!this.isConfigured) {
            console.error('[ContractService] Cannot set scores: ContractService not configured');
            return null;
        }

        if (!process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS) {
            console.log('[ContractService] Tournament Address not set.');
            return null;
        }

        if (players.length !== scores.length) {
            console.error('[ContractService] Players and scores arrays must have same length');
            return null;
        }

        if (players.length === 0) {
            console.log('[ContractService] No players to update scores for');
            return null;
        }

        try {
            const tournamentAddress = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;
            console.log(`[ContractService] ========================================`);
            console.log(`[ContractService] Setting scores for ${players.length} players on Tournament contract...`);
            console.log(`[ContractService] ========================================`);

            const tournamentContract = getContract({
                address: tournamentAddress,
                abi: TOURNAMENT_ABI,
                client: this.client
            }) as any;

            // Convert addresses and scores to proper format
            const playerAddresses = players.map(p => p as `0x${string}`);
            const scoresBigInt = scores.map(s => BigInt(s));

            const hash = await tournamentContract.write.setPlayerScoreBatch([playerAddresses, scoresBigInt]);
            console.log(`[ContractService] setPlayerScoreBatch tx sent: ${hash}`);

            // Wait for confirmation
            const result = await this.waitForTransaction(hash);

            if (!result.success) {
                console.error(`[ContractService] setPlayerScoreBatch tx failed: ${result.error}`);
                return null;
            }

            console.log(`[ContractService] ✅ Scores updated for ${players.length} players!`);
            return hash;
        } catch (error: any) {
            console.error(`[ContractService] Failed to set player scores:`, error?.shortMessage || error?.message || error);
            return null;
        }
    }

    /**
     * Sync player data from smart contract to recover missing Redis data
     * Reads playerInfo(week, address) from the Tournament contract
     */
    async getPlayerInfoFromChain(playerAddress: string, week: number): Promise<{
        score: number;
        roomId: number;
        hasClaimed: boolean;
    } | null> {
        if (!this.isConfigured) {
            console.error('[ContractService] Cannot get player info: ContractService not configured');
            return null;
        }

        if (!process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS) {
            console.log('[ContractService] Tournament Address not set.');
            return null;
        }

        try {
            const tournamentAddress = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

            const tournamentContract = getContract({
                address: tournamentAddress,
                abi: TOURNAMENT_ABI,
                client: this.client
            }) as any;

            const result = await tournamentContract.read.playerInfo([
                BigInt(week),
                playerAddress as `0x${string}`
            ]);

            // result is a tuple: [score, roomId, hasClaimed]
            const score = Number(result[0]);
            const roomId = Number(result[1]);
            const hasClaimed = Boolean(result[2]);

            console.log(`[ContractService] Player ${playerAddress.slice(0, 8)}... Week ${week}: Score=${score}, Room=${roomId}, Claimed=${hasClaimed}`);

            return { score, roomId, hasClaimed };
        } catch (error: any) {
            console.error(`[ContractService] Failed to get player info:`, error?.shortMessage || error?.message || error);
            return null;
        }
    }

    /**
     * Get current week from smart contract
     */
    async getCurrentWeekFromChain(): Promise<number | null> {
        if (!this.isConfigured) {
            return null;
        }

        if (!process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS) {
            return null;
        }

        try {
            const tournamentAddress = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

            const tournamentContract = getContract({
                address: tournamentAddress,
                abi: TOURNAMENT_ABI,
                client: this.client
            }) as any;

            const week = await tournamentContract.read.currentWeek();
            return Number(week);
        } catch (error: any) {
            console.error(`[ContractService] Failed to get current week:`, error?.shortMessage || error?.message || error);
            return null;
        }
    }
}

export const contractService = new ContractService();
