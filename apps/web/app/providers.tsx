'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { coinbaseWallet, metaMask, injected, walletConnect } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WalletProvider } from './contexts/WalletContext';

// Use Base Sepolia for testnet
const TARGET_CHAIN = baseSepolia;

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com/
// This is required for mobile browser -> wallet app connections
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// Debug log for WalletConnect setup
if (typeof window !== 'undefined') {
    console.log('[Providers] WalletConnect Project ID:', WALLETCONNECT_PROJECT_ID ? 'SET (' + WALLETCONNECT_PROJECT_ID.substring(0, 8) + '...)' : 'NOT SET');
}

// Wagmi config - support multiple wallets including MetaMask
const wagmiConfig = createConfig({
    chains: [baseSepolia, base],
    connectors: typeof window !== 'undefined' ? [
        // Injected connector (auto-detects MetaMask, Coinbase Wallet extension, etc.)
        injected({
            shimDisconnect: true,
        }),
        // MetaMask specifically
        metaMask({
            dappMetadata: {
                name: 'PixelWar',
            },
        }),
        // WalletConnect - Required for mobile browser to wallet app connections
        walletConnect({
            projectId: WALLETCONNECT_PROJECT_ID,
            metadata: {
                name: 'PixelWar',
                description: 'Pixel Battle Game',
                url: window.location.origin,
                icons: ['https://pixelwar.xyz/icon.svg'],
            },
            showQrModal: true, // Shows QR modal for desktop, deep links on mobile
        }),
        // Coinbase Wallet (both browser extension and mobile)
        coinbaseWallet({
            appName: 'PixelWar',
            preference: 'all', // Support all Coinbase Wallet types
        }),
    ] : [],
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
