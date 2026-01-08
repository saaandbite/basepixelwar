'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WalletProvider } from './contexts/WalletContext';

// Use Base Sepolia for testnet
const TARGET_CHAIN = baseSepolia;

// Wagmi config - properly configured for OnchainKit
const wagmiConfig = createConfig({
    chains: [baseSepolia, base],
    connectors: [
        coinbaseWallet({
            appName: 'PixelWar',
            preference: 'smartWalletOnly', // Use Coinbase Smart Wallet
        }),
    ],
    ssr: true,
    transports: {
        [baseSepolia.id]: http(),
        [base.id]: http(),
    },
});

export function Providers({ children }: { children: ReactNode }) {
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

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider
                    apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
                    chain={TARGET_CHAIN}
                    config={{
                        appearance: {
                            name: 'PixelWar',
                            mode: 'auto',
                            theme: 'base',
                        },
                        wallet: {
                            display: 'modal', // Show modal when connecting
                        },
                    }}
                >
                    <WalletProvider>
                        {children}
                    </WalletProvider>
                </OnchainKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
