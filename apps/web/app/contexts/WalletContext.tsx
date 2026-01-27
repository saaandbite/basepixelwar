"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect, useRef } from "react";
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

    // ============ Auto-Fund New Users ============
    // When a wallet connects, automatically fund it with 0.03 ETH if it's a new user
    const hasFundedRef = useRef(false);

    useEffect(() => {
        // Only trigger if wallet is connected and we have an address
        if (!isConnected || !address) {
            hasFundedRef.current = false;
            return;
        }

        // Prevent multiple calls for the same connection
        if (hasFundedRef.current) return;
        hasFundedRef.current = true;

        // Check if we've already attempted to fund this wallet in this session
        const fundedKey = `funded_${address.toLowerCase()}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(fundedKey)) {
            console.log('[Wallet] Already attempted funding this session, skipping');
            return;
        }

        // Call the auto-fund API
        const fundNewUser = async () => {
            try {
                // Determine server URL
                const serverUrl = typeof window !== 'undefined'
                    ? (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                        ? `${window.location.protocol}//${window.location.hostname}:3000`
                        : process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000')
                    : 'http://localhost:3000';

                console.log('[Wallet] Checking if new user needs funding...', address);

                const response = await fetch(`${serverUrl}/api/user/fund`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: address }),
                });

                const result = await response.json();

                if (result.success) {
                    console.log('[Wallet] ✅ Auto-funded new user with 0.03 ETH!', result.txHash);
                } else if (result.reason === 'already_funded') {
                    console.log('[Wallet] User already funded previously');
                } else {
                    console.log('[Wallet] Funding skipped:', result.message || result.reason);
                }

                // Mark as attempted in session storage
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(fundedKey, 'true');
                }
            } catch (err) {
                console.error('[Wallet] Auto-fund API error:', err);
            }
        };

        fundNewUser();
    }, [isConnected, address]);

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
