import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { TOURNAMENT_ABI } from '../tournament/abi';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

interface PlayerStats {
    wins: number;
    totalEarnings: number;
}

interface PlayerProfile {
    wallet: string;
    username: string;
    stats: PlayerStats;
    hasTrophy: boolean;
}

// Helper to get socket URL (same as TournamentPage)
const getServerUrl = () => {
    // 1. Dynamic Detection (Best for LAN / Mobile Testing)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // If we are accessing via IP (e.g. 192.168.x.x) or special domain, use it!
        // We ignored the Env Var here because it often defaults to localhost in build time
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}:3000`;
        }
    }

    // 2. Fallback to Env Var (Production domain or configured localhost)
    if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL;

    // 3. Last Resort
    return 'http://localhost:3000';
};

export function usePlayerProfile(targetWallet: string | null, type: 'global' | 'tournament' = 'global') {
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Backend Data (Stats)
    const fetchBackendData = async () => {
        if (!targetWallet) return;
        setLoading(true);
        try {
            const serverUrl = getServerUrl();
            const res = await fetch(`${serverUrl}/api/profile?wallet=${targetWallet}&type=${type}`);

            if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}`);

            const data = await res.json();
            return data;
        } catch (err) {
            console.error(err);
            setError('Failed to load profile data');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // 2. Read Contract for Trophy (NFT)
    const { data: trophyContractAddress } = useReadContract({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: 'trophyContract',
        query: { enabled: !!TOURNAMENT_ADDRESS }
    });

    // We need the Trophy ABI or at least balanceOf. 
    // Since we don't have the Trophy ABI file explicitly, we can use a minimal ABI here
    // or assume standard ERC721 `balanceOf`.
    const ERC721_MINIMAL_ABI = [{
        inputs: [{ name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }] as const;

    const { data: trophyBalance } = useReadContract({
        address: trophyContractAddress as `0x${string}`,
        abi: ERC721_MINIMAL_ABI,
        functionName: 'balanceOf',
        args: targetWallet ? [targetWallet as `0x${string}`] : undefined,
        query: { enabled: !!trophyContractAddress && !!targetWallet }
    });

    useEffect(() => {
        if (!targetWallet) {
            setProfile(null);
            return;
        }

        const load = async () => {
            const backendData = await fetchBackendData();
            if (backendData) {
                setProfile({
                    wallet: backendData.wallet,
                    username: backendData.username,
                    stats: backendData.stats,
                    hasTrophy: trophyBalance ? Number(trophyBalance) > 0 : false
                });
            }
        };

        load();
    }, [targetWallet, trophyBalance]);

    return { profile, loading, error };
}
