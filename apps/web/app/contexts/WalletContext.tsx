"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useSendTransaction } from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { parseEther } from "viem";

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
export const BASE_CHAIN_ID = 8453 as number;
// Base Sepolia (Testnet) Chain ID
export const BASE_SEPOLIA_CHAIN_ID = 84532 as number;

// Use testnet for development
export const TARGET_CHAIN_ID = BASE_SEPOLIA_CHAIN_ID as number;

const TARGET_CHAIN = TARGET_CHAIN_ID === BASE_CHAIN_ID ? base : baseSepolia;

// ============ Context ============

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ============ Provider ============

export function WalletProvider({ children }: { children: React.ReactNode }) {
    // Wagmi hooks
    const { address, isConnected, isConnecting, chain, connector } = useAccount();
    const { connect: wagmiConnect, connectors, isPending: isConnectPending } = useConnect();
    const { disconnect: wagmiDisconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const { sendTransactionAsync } = useSendTransaction();

    // Derived state
    const chainId = chain?.id ?? null;
    const error = null; // Wagmi handles errors differently, we'll handle inline

    // Log current connector for debugging
    console.log('[Wallet] Current state:', {
        isConnected,
        connector: connector?.id,
        connectorName: connector?.name,
        chainId
    });

    // Connect wallet - Smart Wallet only (passkey/biometrics)
    const connect = useCallback(async () => {
        try {
            console.log('[Wallet] Connecting with Smart Wallet (passkey)...');
            console.log('[Wallet] Available connectors:', connectors.map(c => ({ id: c.id, name: c.name, ready: c.ready })));

            // Find the Coinbase Smart Wallet connector
            const smartWalletConnector = connectors.find(c =>
                c.id === 'coinbaseWalletSDK' || c.name?.toLowerCase().includes('coinbase')
            ) || connectors[0];

            if (smartWalletConnector) {
                console.log('[Wallet] Using connector:', smartWalletConnector.id, smartWalletConnector.name);

                // Connect with the Smart Wallet connector
                wagmiConnect(
                    { connector: smartWalletConnector },
                    {
                        onSuccess: (data) => {
                            console.log('[Wallet] Connected successfully:', data);
                        },
                        onError: (error) => {
                            console.error('[Wallet] Connection error:', error);
                        },
                    }
                );
            } else {
                console.error('[Wallet] No Smart Wallet connector available. Connectors:', connectors);
            }
        } catch (err) {
            console.error("Failed to connect wallet:", err);
        }
    }, [wagmiConnect, connectors]);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        wagmiDisconnect();
    }, [wagmiDisconnect]);

    // Switch to Base network
    const switchToBase = useCallback(async () => {
        try {
            switchChain({ chainId: TARGET_CHAIN.id });
        } catch (err) {
            console.error("Failed to switch chain:", err);
            throw err;
        }
    }, [switchChain]);

    // Send transaction
    const sendTransaction = useCallback(
        async (to: string, value: string, data?: string): Promise<string> => {
            if (!address) {
                throw new Error("Wallet not connected");
            }

            // Ensure we're on the correct chain
            if (chainId !== TARGET_CHAIN_ID) {
                console.log('[Wallet] Switching to correct chain before tx...');
                await switchToBase();
            }

            // Convert hex value to bigint
            // value is expected in hex format like "0x38D7EA4C68000"
            const valueInWei = BigInt(value);

            console.log('[Wallet] Sending transaction:', { to, value: valueInWei.toString(), hasData: !!data });

            const txHash = await sendTransactionAsync({
                to: to as `0x${string}`,
                value: valueInWei,
                data: data as `0x${string}` | undefined,
            });

            console.log('[Wallet] Transaction sent:', txHash);
            return txHash;
        },
        [address, chainId, switchToBase, sendTransactionAsync]
    );

    // Sign message - not currently using wagmi signMessage, keeping stub
    const signMessage = useCallback(
        async (message: string): Promise<string> => {
            if (!address || typeof window === "undefined" || !window.ethereum) {
                throw new Error("Wallet not connected");
            }

            // Fallback to window.ethereum for now
            const signature = (await window.ethereum.request({
                method: "personal_sign",
                params: [message, address],
            })) as string;

            return signature;
        },
        [address]
    );

    const value = useMemo<WalletContextType>(
        () => ({
            address: address ?? null,
            isConnected,
            isConnecting: isConnecting || isConnectPending,
            chainId,
            error,
            connect,
            disconnect,
            switchToBase,
            sendTransaction,
            signMessage,
        }),
        [address, isConnected, isConnecting, isConnectPending, chainId, error, connect, disconnect, switchToBase, sendTransaction, signMessage]
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

// ============ Extend Window for fallback ============

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
