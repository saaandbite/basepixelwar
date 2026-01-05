"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

// ============ Types ============

export interface WalletState {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    chainId: number | null;
    error: string | null;
}

export interface WalletContextType extends WalletState {
    connect: () => Promise<void>;
    disconnect: () => void;
    switchToBase: () => Promise<void>;
    sendTransaction: (to: string, value: string, data?: string) => Promise<string>;
    signMessage: (message: string) => Promise<string>;
}

// ============ Constants ============

// Base Mainnet Chain ID
const BASE_CHAIN_ID = 8453;
// Base Sepolia (Testnet) Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Use testnet for development
const TARGET_CHAIN_ID = BASE_SEPOLIA_CHAIN_ID;

const BASE_CHAIN_CONFIG = {
    chainId: `0x${TARGET_CHAIN_ID.toString(16)}`,
    chainName: TARGET_CHAIN_ID === BASE_CHAIN_ID ? "Base" : "Base Sepolia",
    nativeCurrency: {
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
    },
    rpcUrls: TARGET_CHAIN_ID === BASE_CHAIN_ID
        ? ["https://mainnet.base.org"]
        : ["https://sepolia.base.org"],
    blockExplorerUrls: TARGET_CHAIN_ID === BASE_CHAIN_ID
        ? ["https://basescan.org"]
        : ["https://sepolia.basescan.org"],
};

// ============ Extend Window ============

declare global {
    interface Window {
        ethereum?: {
            isMetaMask?: boolean;
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on: (event: string, callback: (...args: unknown[]) => void) => void;
            removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
        };
    }
}

// ============ Context ============

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ============ Provider ============

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<WalletState>({
        address: null,
        isConnected: false,
        isConnecting: false,
        chainId: null,
        error: null,
    });

    // Check for existing connection on mount
    useEffect(() => {
        const checkConnection = async () => {
            if (typeof window === "undefined" || !window.ethereum) return;

            try {
                const accounts = (await window.ethereum.request({
                    method: "eth_accounts",
                })) as string[];

                const chainId = (await window.ethereum.request({
                    method: "eth_chainId",
                })) as string;

                if (accounts.length > 0 && accounts[0]) {
                    setState((prev) => ({
                        ...prev,
                        address: accounts[0],
                        isConnected: true,
                        chainId: parseInt(chainId, 16),
                    }));
                }
            } catch (err) {
                console.error("Error checking wallet connection:", err);
            }
        };

        checkConnection();
    }, []);

    // Listen for account and chain changes
    useEffect(() => {
        if (typeof window === "undefined" || !window.ethereum) return;

        const handleAccountsChanged = (accounts: unknown) => {
            const accountsArray = accounts as string[];
            if (accountsArray.length === 0 || !accountsArray[0]) {
                setState({
                    address: null,
                    isConnected: false,
                    isConnecting: false,
                    chainId: null,
                    error: null,
                });
            } else {
                setState((prev) => ({
                    ...prev,
                    address: accountsArray[0],
                    isConnected: true,
                }));
            }
        };

        const handleChainChanged = (chainId: unknown) => {
            const newChainId = parseInt(chainId as string, 16);
            setState((prev) => ({
                ...prev,
                chainId: newChainId,
            }));
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
                window.ethereum.removeListener("chainChanged", handleChainChanged);
            }
        };
    }, []);

    // Connect wallet
    const connect = useCallback(async () => {
        setState((prev) => ({ ...prev, error: null, isConnecting: true }));

        if (typeof window === "undefined" || !window.ethereum) {
            setState((prev) => ({
                ...prev,
                isConnecting: false,
                error: "MetaMask is not installed. Please install MetaMask to continue.",
            }));
            window.open("https://metamask.io/download/", "_blank");
            return;
        }

        try {
            // Request accounts
            const accounts = (await window.ethereum.request({
                method: "eth_requestAccounts",
            })) as string[];

            // Get chain ID
            const chainId = (await window.ethereum.request({
                method: "eth_chainId",
            })) as string;

            if (accounts.length > 0 && accounts[0]) {
                setState({
                    address: accounts[0],
                    isConnected: true,
                    isConnecting: false,
                    chainId: parseInt(chainId, 16),
                    error: null,
                });
            }
        } catch (err: unknown) {
            const error = err as { code?: number; message?: string };
            let errorMessage = "Failed to connect wallet. Please try again.";

            if (error.code === 4001) {
                errorMessage = "Connection rejected. Please approve the connection in MetaMask.";
            }

            setState((prev) => ({
                ...prev,
                isConnecting: false,
                error: errorMessage,
            }));
        }
    }, []);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        setState({
            address: null,
            isConnected: false,
            isConnecting: false,
            chainId: null,
            error: null,
        });
    }, []);

    // Switch to Base network
    const switchToBase = useCallback(async () => {
        if (typeof window === "undefined" || !window.ethereum) {
            throw new Error("MetaMask is not installed");
        }

        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: BASE_CHAIN_CONFIG.chainId }],
            });
        } catch (switchError: unknown) {
            const error = switchError as { code?: number };
            // Chain doesn't exist, add it
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [BASE_CHAIN_CONFIG],
                });
            } else {
                throw switchError;
            }
        }
    }, []);

    // Send transaction
    const sendTransaction = useCallback(
        async (to: string, value: string, data?: string): Promise<string> => {
            if (!state.address || !window.ethereum) {
                throw new Error("Wallet not connected");
            }

            // Ensure we're on the correct chain
            if (state.chainId !== TARGET_CHAIN_ID) {
                await switchToBase();
            }

            const txParams: {
                from: string;
                to: string;
                value: string;
                data?: string;
            } = {
                from: state.address,
                to,
                value,
            };

            if (data) {
                txParams.data = data;
            }

            const txHash = (await window.ethereum.request({
                method: "eth_sendTransaction",
                params: [txParams],
            })) as string;

            return txHash;
        },
        [state.address, state.chainId, switchToBase]
    );

    // Sign message
    const signMessage = useCallback(
        async (message: string): Promise<string> => {
            if (!state.address || !window.ethereum) {
                throw new Error("Wallet not connected");
            }

            const signature = (await window.ethereum.request({
                method: "personal_sign",
                params: [message, state.address],
            })) as string;

            return signature;
        },
        [state.address]
    );

    const value = useMemo<WalletContextType>(
        () => ({
            ...state,
            connect,
            disconnect,
            switchToBase,
            sendTransaction,
            signMessage,
        }),
        [state, connect, disconnect, switchToBase, sendTransaction, signMessage]
    );

    return (
        <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
    );
}

// ============ Hook ============

export function useWallet(): WalletContextType {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
}

// ============ Utility Functions ============

export function formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isCorrectChain(chainId: number | null): boolean {
    return chainId === TARGET_CHAIN_ID;
}

export { TARGET_CHAIN_ID, BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID };
