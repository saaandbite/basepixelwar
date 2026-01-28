'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Trophy, CheckCircle2, ExternalLink, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

// PixelTrophy Contract Configuration
const PIXEL_TROPHY_ADDRESS = process.env.NEXT_PUBLIC_PIXEL_TROPHY_ADDRESS as `0x${string}`;
const PIXEL_TROPHY_ABI = [
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
    }
] as const;

export default function VerifyTrophyPage() {
    const params = useParams();
    const tokenId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{
        owner: string;
        image: string;
        name: string;
        description: string;
        attributes: { trait_type: string; value: string | number }[];
    } | null>(null);

    useEffect(() => {
        if (!tokenId || !PIXEL_TROPHY_ADDRESS) return;

        const fetchData = async () => {
            try {
                // Create client directly to ensure independence from wallet connection
                const client = createPublicClient({
                    chain: baseSepolia,
                    transport: http()
                });

                // Fetch Owner and TokenURI in parallel
                const [owner, tokenURI] = await Promise.all([
                    client.readContract({
                        address: PIXEL_TROPHY_ADDRESS,
                        abi: PIXEL_TROPHY_ABI,
                        functionName: 'ownerOf',
                        args: [BigInt(tokenId)]
                    }),
                    client.readContract({
                        address: PIXEL_TROPHY_ADDRESS,
                        abi: PIXEL_TROPHY_ABI,
                        functionName: 'tokenURI',
                        args: [BigInt(tokenId)]
                    })
                ]);

                // Parse Metadata
                const base64Json = tokenURI.split(',')[1];
                if (!base64Json) throw new Error("Invalid Token URI format");

                const jsonString = atob(base64Json);
                const metadata = JSON.parse(jsonString);

                setData({
                    owner,
                    image: metadata.image,
                    name: metadata.name,
                    description: metadata.description,
                    attributes: metadata.attributes
                });
            } catch (err: any) {
                console.error("Verification failed:", err);
                setError(err.message || "Could not verify trophy. It may not exist yet.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tokenId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--pixel-bg)] text-white font-terminal flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-[var(--pixel-yellow)] animate-spin mb-4" />
                <h2 className="text-xl animate-pulse">VERIFYING ON BLOCKCHAIN...</h2>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[var(--pixel-bg)] text-white font-terminal flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-red-900/20 border-2 border-[var(--pixel-red)] p-8 rounded-2xl text-center">
                    <AlertTriangle className="w-16 h-16 text-[var(--pixel-red)] mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">VERIFICATION FAILED</h1>
                    <p className="text-[var(--pixel-red)] opacity-80 mb-6">{error}</p>
                    <a href="/" className="pixel-btn bg-white text-black px-6 py-2 rounded-lg hover:scale-105 transition-transform inline-block">
                        BACK TO HOME
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--pixel-bg)] text-white font-terminal p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
            />

            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center relative z-10">

                {/* Visual Side */}
                <div className="order-2 md:order-1 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[var(--pixel-yellow)] to-[var(--pixel-pink)] rounded-[2rem] opacity-75 blur group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative bg-black border-4 border-white rounded-[1.8rem] p-4 shadow-2xl">
                        <div className="aspect-square bg-[#1a1a2e] rounded-xl overflow-hidden flex items-center justify-center relative">
                            {/* Grid Background */}
                            <div className="absolute inset-0 opacity-20"
                                style={{ backgroundImage: 'linear-gradient(#4f4f4f 1px, transparent 1px), linear-gradient(90deg, #4f4f4f 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                            />
                            <img src={data.image} alt={data.name} className="w-[90%] h-[90%] object-contain relative z-10 drop-shadow-2xl" />
                        </div>
                    </div>
                </div>

                {/* Info Side */}
                <div className="order-1 md:order-2 space-y-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-[var(--pixel-blue)]/20 text-[var(--pixel-blue)] px-3 py-1 rounded-full border border-[var(--pixel-blue)] mb-4 text-sm font-bold tracking-wider">
                            <ShieldCheck className="w-4 h-4" />
                            OFFICIAL BLOCKCHAIN RECORD
                        </div>
                        <h1 className="text-4xl md:text-5xl font-retro text-white mb-2 leading-tight">
                            {data.name}
                        </h1>
                        <p className="text-[var(--pixel-fg)] opacity-70 text-lg">
                            {data.description}
                        </p>
                    </div>

                    <div className="bg-white/5 border-2 border-white/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-sm opacity-50 uppercase tracking-widest">OWNER</span>
                            <a
                                href={`https://sepolia.basescan.org/address/${data.owner}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[var(--pixel-yellow)] hover:underline flex items-center gap-2"
                            >
                                {data.owner.slice(0, 6)}...{data.owner.slice(-4)}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-sm opacity-50 uppercase tracking-widest">TOKEN ID</span>
                            <span className="font-mono text-white">#{tokenId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm opacity-50 uppercase tracking-widest">CONTRACT</span>
                            <a
                                href={`https://sepolia.basescan.org/address/${PIXEL_TROPHY_ADDRESS}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-white/70 hover:text-white hover:underline flex items-center gap-2"
                            >
                                {PIXEL_TROPHY_ADDRESS.slice(0, 6)}...{PIXEL_TROPHY_ADDRESS.slice(-4)}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    {/* Attributes */}
                    <div className="grid grid-cols-2 gap-3">
                        {data.attributes.map((attr, idx) => (
                            <div key={idx} className="bg-black/30 border border-white/10 rounded-lg p-3 text-center hover:border-[var(--pixel-pink)] transition-colors">
                                <div className="text-[10px] text-[var(--pixel-pink)] uppercase font-bold mb-1">{attr.trait_type}</div>
                                <div className="text-lg font-retro text-white">{attr.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4">
                        <a
                            href={`https://sepolia.basescan.org/token/${PIXEL_TROPHY_ADDRESS}?a=${tokenId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full block text-center pixel-btn bg-[var(--pixel-bg)] border-2 border-white/20 text-white py-3 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            VIEW ON BASESCAN
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
