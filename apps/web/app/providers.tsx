'use client';

import { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WalletProvider } from './contexts/WalletContext';

// Use Base Sepolia for testnet
const TARGET_CHAIN = baseSepolia;

// Polyfill for crypto.randomUUID (required for non-HTTPS environments)
if (typeof window !== 'undefined' && typeof crypto !== 'undefined' && !crypto.randomUUID) {
    (crypto as any).randomUUID = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

// Create wagmi config with Smart Wallet connector
function createWagmiConfig() {
    return createConfig({
        chains: [baseSepolia, base],
        connectors: [
            // Coinbase Smart Wallet ONLY - uses passkey/biometrics
            // No wallet extension or app installation required
            coinbaseWallet({
                appName: 'PixelWar',
                preference: 'smartWalletOnly', // CRITICAL: Only allow Smart Wallet with passkey
                chainId: baseSepolia.id, // Target Base Sepolia
            }),
        ],
        ssr: true,
        transports: {
            [baseSepolia.id]: http(),
            [base.id]: http(),
        },
    });
}

// Create config once
const wagmiConfig = createWagmiConfig();

export function Providers({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    // Create queryClient with useState to prevent SSR issues
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    }));

    // Ensure client-side only rendering for wallet components
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider
                    apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || ''}
                    chain={TARGET_CHAIN}
                    config={{
                        appearance: {
                            name: 'PixelWar',
                            mode: 'auto',
                            theme: 'base',
                        },
                        wallet: {
                            display: 'modal',
                        },
                    }}
                >
                    <WalletProvider>
                        {mounted ? children : null}
                    </WalletProvider>
                </OnchainKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
