"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Coins, Medal, User, Loader2 } from "lucide-react";
import PlayerProfileModal from "../components/PlayerProfileModal";

interface LeaderboardEntry {
    wallet: string;
    walletFormatted: string;
    username: string;
    score: number;
}

type LeaderboardType = "eth" | "wins";

export default function LeaderboardPage() {
    const [type, setType] = useState<LeaderboardType>("eth");
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

    useEffect(() => {
        fetchLeaderboard();
    }, [type]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);

        try {
            const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
            const response = await fetch(`${serverUrl}/leaderboard?type=${type}`);

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const formatScore = (score: number) => {
        if (type === 'eth') {
            const eth = score / 1e18;
            return `${eth.toFixed(5)} ETH`;
        }
        return score.toString();
    };

    const getRankColor = (index: number) => {
        if (index === 0) return 'text-[var(--pixel-yellow)]'; // Gold
        if (index === 1) return 'text-[var(--pixel-fg)]';      // Silver
        if (index === 2) return 'text-[#cd7f32]';              // Bronze
        return 'text-[var(--pixel-blue)]';                     // Others
    };

    return (
        <div className="min-h-screen relative flex flex-col font-terminal text-white overflow-x-hidden"
            style={{
                background: 'linear-gradient(180deg, #ff8ba7 0%, #903749 100%)'
            }}>

            {/* Background Pattern Overlay */}
            <div className="fixed inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Profile Modal */}
            <PlayerProfileModal
                walletAddress={selectedWallet}
                onClose={() => setSelectedWallet(null)}
            />

            {/* Header */}
            <header className="w-full flex justify-center py-6 relative z-10">
                <div className="flex items-center gap-4">
                    {/* Back Pill */}
                    <Link href="/play" className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 backdrop-blur-sm text-white font-sans text-sm font-bold tracking-wider hover:bg-white/10 hover:border-white/40 transition-all skew-x-[-10deg]">
                        <div className="skew-x-[10deg] flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>BACK TO LOBBY</span>
                        </div>
                    </Link>

                    {/* Title Pill */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 backdrop-blur-sm text-white font-sans text-sm font-bold tracking-wider skew-x-[-10deg]">
                        <div className="skew-x-[10deg] flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span>HALL OF FAME</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">

                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl text-white font-retro mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
                        TOP PLAYERS
                    </h1>
                    <p className="text-white/80 text-xl font-terminal">Who rules the pixel world?</p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-4 mb-8">
                    <button
                        onClick={() => setType('eth')}
                        className={`px-8 py-3 rounded-sm font-retro text-lg transition-all border skew-x-[-10deg] ${type === 'eth'
                                ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                                : 'bg-black/20 text-white/50 border-white/20 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <div className="skew-x-[10deg] flex items-center gap-2">
                            <Coins className="w-5 h-5" /> EARNINGS
                        </div>
                    </button>
                    <button
                        onClick={() => setType('wins')}
                        className={`px-8 py-3 rounded-sm font-retro text-lg transition-all border skew-x-[-10deg] ${type === 'wins'
                                ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : 'bg-black/20 text-white/50 border-white/20 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <div className="skew-x-[10deg] flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> VICTORIES
                        </div>
                    </button>
                </div>

                {/* Arcade Table */}
                <div className="relative bg-black/20 border border-white/10 backdrop-blur-md rounded-sm overflow-hidden">
                    {/* Decorative Corners */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/30" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/30" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/30" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/30" />

                    {/* Fixed Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-black/20 text-white/50 font-sans font-bold text-xs md:text-sm tracking-[0.2em]">
                        <div className="col-span-2 text-center">RANK</div>
                        <div className="col-span-6">PLAYER</div>
                        <div className="col-span-4 text-right">SCORE</div>
                    </div>

                    {/* Scrollable List */}
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {loading && (
                            <div className="py-16 text-center">
                                <Loader2 className="w-10 h-10 text-white/50 animate-spin mx-auto mb-4" />
                                <p className="animate-pulse text-white/70 font-retro">LOADING DATA...</p>
                            </div>
                        )}

                        {error && (
                            <div className="py-12 text-center text-red-400 font-bold bg-red-900/10">
                                ERROR_CODE: {error}
                            </div>
                        )}

                        {!loading && !error && data.length === 0 && (
                            <div className="py-16 text-center text-white/30 text-xl font-retro">
                                NO RECORDS FOUND
                            </div>
                        )}

                        {!loading && !error && data.length > 0 && (
                            <div className="divide-y divide-white/5">
                                {data.map((entry, index) => (
                                    <div
                                        key={entry.wallet}
                                        onClick={() => setSelectedWallet(entry.wallet)}
                                        className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-white/5 cursor-pointer group transition-colors"
                                    >
                                        {/* Rank */}
                                        <div className={`col-span-2 text-center font-retro text-2xl ${index === 0 ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' :
                                                index === 1 ? 'text-slate-300 drop-shadow-[0_0_5px_rgba(203,213,225,0.5)]' :
                                                    index === 2 ? 'text-amber-600 drop-shadow-[0_0_5px_rgba(217,119,6,0.5)]' :
                                                        'text-white/50'
                                            }`}>
                                            {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `${index + 1}`}
                                        </div>

                                        {/* Player */}
                                        <div className="col-span-6 flex items-center gap-4 overflow-hidden">
                                            <div className={`w-10 h-10 flex-shrink-0 border-2 flex items-center justify-center font-retro text-lg bg-black/40 ${index === 0 ? 'border-yellow-400 text-yellow-400' :
                                                    index === 1 ? 'border-slate-300 text-slate-300' :
                                                        index === 2 ? 'border-amber-600 text-amber-600' :
                                                            'border-white/20 text-white/50'
                                                }`}>
                                                {entry.username?.slice(0, 1).toUpperCase() || '?'}
                                            </div>
                                            <div className="truncate flex flex-col">
                                                <span className={`block font-bold text-lg group-hover:text-blue-300 transition-colors ${index < 3 ? 'text-white' : 'text-white/80'}`}>
                                                    {entry.username || 'UNKNOWN'}
                                                </span>
                                                <span className="text-xs text-white/40 font-mono">
                                                    {entry.walletFormatted}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className={`col-span-4 text-right font-retro text-xl ${type === 'eth' ? 'text-green-400' : 'text-blue-400'}`}>
                                            {formatScore(entry.score)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Note */}
                <div className="text-center mt-8 text-sm text-white/40 font-mono animate-pulse">
                    TOP 3 PLAYERS GET FEATURED ON LANDING PAGE
                </div>

            </main>
        </div>
    );
}
