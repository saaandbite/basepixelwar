'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

// PixelTrophy contract ABI (minimal for inventory fetching)
const PIXEL_TROPHY_ABI = [
    {
        inputs: [],
        name: "tokenCounter",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "tokenURI",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

const PIXEL_TROPHY_ADDRESS = process.env.NEXT_PUBLIC_PIXEL_TROPHY_ADDRESS as `0x${string}`;

export interface NFTItem {
    tokenId: number;
    name: string;
    description: string;
    image: string; // base64 SVG data URL
    attributes: {
        week: number;
        roomSerial: number;
    };
    openSeaUrl: string;
}

interface UseNFTInventoryResult {
    nfts: NFTItem[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    refetch: () => void;
}

/**
 * Hook to fetch NFT inventory from PixelTrophy contract
 * Uses direct contract calls to iterate and find user's tokens
 * 
 * @param address - User's wallet address
 * @returns NFTItem array with metadata and OpenSea links
 */
export function useNFTInventory(address: string | undefined): UseNFTInventoryResult {
    const [nfts, setNfts] = useState<NFTItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    const publicClient = usePublicClient({ chainId: baseSepolia.id });

    const refetch = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        if (!address || !PIXEL_TROPHY_ADDRESS || !publicClient) {
            setNfts([]);
            setTotalCount(0);
            return;
        }

        const fetchInventory = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Get user's NFT balance first (quick check)
                const balance = await publicClient.readContract({
                    address: PIXEL_TROPHY_ADDRESS,
                    abi: PIXEL_TROPHY_ABI,
                    functionName: 'balanceOf',
                    args: [address as `0x${string}`],
                });

                const balanceNum = Number(balance);
                setTotalCount(balanceNum);

                if (balanceNum === 0) {
                    setNfts([]);
                    setLoading(false);
                    return;
                }

                // 2. Get total token count
                const tokenCounter = await publicClient.readContract({
                    address: PIXEL_TROPHY_ADDRESS,
                    abi: PIXEL_TROPHY_ABI,
                    functionName: 'tokenCounter',
                });

                const totalTokens = Number(tokenCounter);
                const userNfts: NFTItem[] = [];

                // 3. Iterate through all tokens to find user's tokens
                // We'll batch these calls for efficiency
                const ownerPromises = [];
                for (let i = 0; i < totalTokens; i++) {
                    ownerPromises.push(
                        publicClient.readContract({
                            address: PIXEL_TROPHY_ADDRESS,
                            abi: PIXEL_TROPHY_ABI,
                            functionName: 'ownerOf',
                            args: [BigInt(i)],
                        }).catch(() => null) // Handle burned/non-existent tokens
                    );
                }

                const owners = await Promise.all(ownerPromises);

                // 4. Get tokenURI for user's tokens
                const userTokenIds: number[] = [];
                owners.forEach((owner, tokenId) => {
                    if (owner && owner.toLowerCase() === address.toLowerCase()) {
                        userTokenIds.push(tokenId);
                    }
                });

                // 5. Fetch metadata for each user token
                const tokenURIPromises = userTokenIds.map(tokenId =>
                    publicClient.readContract({
                        address: PIXEL_TROPHY_ADDRESS,
                        abi: PIXEL_TROPHY_ABI,
                        functionName: 'tokenURI',
                        args: [BigInt(tokenId)],
                    })
                );

                const tokenURIs = await Promise.all(tokenURIPromises);

                // 6. Parse metadata (base64 JSON -> NFTItem)
                for (let i = 0; i < userTokenIds.length; i++) {
                    try {
                        const tokenId = userTokenIds[i];
                        const tokenURI = tokenURIs[i];

                        // Skip if tokenId or tokenURI is undefined
                        if (tokenId === undefined || !tokenURI) {
                            continue;
                        }

                        // Parse base64 encoded JSON metadata
                        // Format: data:application/json;base64,{base64_json}
                        const base64Json = tokenURI.split(',')[1];
                        if (!base64Json) {
                            console.warn(`[useNFTInventory] Invalid tokenURI format for token ${tokenId}`);
                            continue;
                        }
                        const jsonString = atob(base64Json);
                        const metadata = JSON.parse(jsonString);

                        // Extract attributes
                        const weekAttr = metadata.attributes?.find((a: any) => a.trait_type === 'Week');
                        const roomAttr = metadata.attributes?.find((a: any) => a.trait_type === 'Room Serial');

                        // OpenSea URL for Base Sepolia
                        // Format: https://testnets.opensea.io/assets/base-sepolia/{contract}/{tokenId}
                        const openSeaUrl = `https://testnets.opensea.io/assets/base-sepolia/${PIXEL_TROPHY_ADDRESS}/${tokenId}`;

                        userNfts.push({
                            tokenId,
                            name: metadata.name || `PixelWar Trophy #${tokenId}`,
                            description: metadata.description || '',
                            image: metadata.image || '',
                            attributes: {
                                week: weekAttr ? Number(weekAttr.value) : 0,
                                roomSerial: roomAttr ? Number(roomAttr.value) : 0,
                            },
                            openSeaUrl,
                        });
                    } catch (parseError) {
                        console.error(`[useNFTInventory] Failed to parse token ${userTokenIds[i]}:`, parseError);
                    }
                }

                setNfts(userNfts);
            } catch (err) {
                console.error('[useNFTInventory] Error fetching inventory:', err);
                setError('Failed to load NFT inventory');
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, [address, publicClient, refreshKey]);

    return {
        nfts,
        loading,
        error,
        totalCount,
        refetch,
    };
}
