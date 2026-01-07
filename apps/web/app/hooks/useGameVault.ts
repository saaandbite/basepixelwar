"use client";

import { useCallback, useState } from "react";
import { useWallet, TARGET_CHAIN_ID, isCorrectChain } from "../contexts/WalletContext";

// ============ Types ============

export enum GameMode {
    OneVsOne = 0,
    TwoVsTwo = 1,
}

export enum GameState {
    Waiting = 0,
    Active = 1,
    Completed = 2,
    Cancelled = 3,
}

export interface GameInfo {
    mode: GameMode;
    state: GameState;
    prizePool: bigint;
    playerCount: number;
    maxPlayers: number;
    createdAt: number;
}

export interface UseGameVaultReturn {
    // State
    isLoading: boolean;
    error: string | null;
    lastTxHash: string | null;

    // Functions
    createGame: (mode: GameMode) => Promise<string>;
    joinGame: (gameId: number) => Promise<string>;

    // Utility
    getBidAmount: () => string;
    clearError: () => void;
}

// ============ Constants ============

// Contract address - UPDATE THIS after deployment
// Contract address - UPDATE THIS after deployment
// const GAME_VAULT_ADDRESS = process.env.NEXT_PUBLIC_GAME_VAULT_ADDRESS || "0x089a1619c076b6e844620cf80ea3b981daca3772";
const GAME_VAULT_ADDRESS = "0x089a1619c076b6e844620cf80ea3b981daca3772";

// Bid amount in wei (0.001 ETH)
const BID_AMOUNT_WEI = "0x38D7EA4C68000"; // 0.001 ETH = 1000000000000000 wei

// ============ ABI Encoding Helpers ============

// Function selectors (keccak256 of function signature, first 4 bytes)
const FUNCTION_SELECTORS = {
    // createGame(uint8) - mode is enum, treated as uint8
    createGame: "0xe580f6ab", // cast sig "createGame(uint8)"
    // joinGame(uint256)
    joinGame: "0xefaa55a0", // cast sig "joinGame(uint256)"
};

function encodeUint8(value: number): string {
    // Pad to 32 bytes (64 hex characters)
    return value.toString(16).padStart(64, "0");
}

function encodeUint256(value: number | bigint): string {
    // Pad to 32 bytes (64 hex characters)
    const hex = typeof value === "bigint" ? value.toString(16) : value.toString(16);
    return hex.padStart(64, "0");
}

// ============ Hook ============

export function useGameVault(): UseGameVaultReturn {
    const { address, chainId, sendTransaction, switchToBase } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);

    // Ensure correct chain before transaction
    const ensureCorrectChain = useCallback(async () => {
        if (!isCorrectChain(chainId)) {
            await switchToBase();
        }
    }, [chainId, switchToBase]);

    // Create a new game
    const createGame = useCallback(
        async (mode: GameMode): Promise<string> => {
            if (!address) {
                throw new Error("Wallet not connected");
            }

            // if (GAME_VAULT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            //    throw new Error("Game Vault contract address not configured. Please set NEXT_PUBLIC_GAME_VAULT_ADDRESS.");
            // }

            setIsLoading(true);
            setError(null);

            try {
                await ensureCorrectChain();

                // Encode function call: createGame(uint8 mode)
                const data = FUNCTION_SELECTORS.createGame + encodeUint8(mode);

                console.log("[GameVault] Creating game with params:", {
                    to: GAME_VAULT_ADDRESS,
                    toLength: GAME_VAULT_ADDRESS.length,
                    value: BID_AMOUNT_WEI,
                    data
                });

                const txHash = await sendTransaction(
                    GAME_VAULT_ADDRESS,
                    BID_AMOUNT_WEI,
                    data
                );

                setLastTxHash(txHash);
                console.log("[GameVault] Game created, tx:", txHash);
                return txHash;
            } catch (err: any) {
                console.error("[GameVault] createGame error:", err);
                if (typeof err === 'object') {
                    try {
                        console.error("[GameVault] createGame error JSON:", JSON.stringify(err, null, 2));
                    } catch (e) { }
                }
                const errorMessage = err?.message || "Failed to create game";
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [address, ensureCorrectChain, sendTransaction]
    );

    // Join an existing game
    const joinGame = useCallback(
        async (gameId: number): Promise<string> => {
            if (!address) {
                throw new Error("Wallet not connected");
            }

            // if (GAME_VAULT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            //    throw new Error("Game Vault contract address not configured. Please set NEXT_PUBLIC_GAME_VAULT_ADDRESS.");
            // }

            setIsLoading(true);
            setError(null);

            try {
                await ensureCorrectChain();

                // Encode function call: joinGame(uint256 gameId)
                const data = FUNCTION_SELECTORS.joinGame + encodeUint256(gameId);

                const txHash = await sendTransaction(
                    GAME_VAULT_ADDRESS,
                    BID_AMOUNT_WEI,
                    data
                );

                setLastTxHash(txHash);
                console.log("[GameVault] Game joined, tx:", txHash);
                return txHash;
            } catch (err: any) {
                console.error("[GameVault] joinGame error:", err);
                if (typeof err === 'object') {
                    try {
                        console.error("[GameVault] joinGame error JSON:", JSON.stringify(err, null, 2));
                    } catch (e) { }
                }
                const errorMessage = err?.message || "Failed to join game";
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [address, ensureCorrectChain, sendTransaction]
    );

    // Get bid amount as formatted string
    const getBidAmount = useCallback((): string => {
        return "0.001 ETH";
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isLoading,
        error,
        lastTxHash,
        createGame,
        joinGame,
        getBidAmount,
        clearError,
    };
}

// ============ Utility Exports ============

export { GAME_VAULT_ADDRESS, BID_AMOUNT_WEI, TARGET_CHAIN_ID };
