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
        <div className="min-h-screen relative flex flex-col font-terminal text-[24px]">
            <div className="scanline" />
            <div className="fixed inset-0 bg-[var(--pixel-bg)] z-0" />

            {/* Profile Modal */}
            <PlayerProfileModal
                walletAddress={selectedWallet}
                onClose={() => setSelectedWallet(null)}
            />

            {/* Header */}
            <header className="relative z-10 p-6 border-b-4 border-[var(--pixel-card-border)] bg-black/90">
                <div className="container mx-auto flex items-center justify-between">
                    <Link href="/play" className="flex items-center gap-3 hover:text-[var(--pixel-yellow)] transition-colors">
                        <ArrowLeft className="w-8 h-8" />
                        <span className="font-bold">BACK</span>
                    </Link>

                    <div className="flex items-center gap-3 text-[var(--pixel-yellow)] font-retro text-base md:text-lg tracking-wider">
                        <Trophy className="w-6 h-6" />
                        <span>HALL OF FAME</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">

                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl text-[var(--pixel-yellow)] font-retro mb-4 text-shadow-hard">
                        TOP PLAYERS
                    </h1>
                    <p className="text-[var(--pixel-fg)] text-xl md:text-2xl">Who rules the pixel world?</p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-6 mb-12">
                    <button
                        onClick={() => setType('eth')}
                        className={`pixel-btn text-xl w-56 ${type === 'eth' ? 'pixel-btn-warning' : 'pixel-btn-outline'}`}
                    >
                        <Coins className="inline-block w-6 h-6 mr-3" /> EARNINGS
                    </button>
                    <button
                        onClick={() => setType('wins')}
                        className={`pixel-btn text-xl w-56 ${type === 'wins' ? 'pixel-btn-primary' : 'pixel-btn-outline'}`}
                    >
                        <Trophy className="inline-block w-6 h-6 mr-3" /> VICTORIES
                    </button>
                </div>

                {/* Arcade Table */}
                <div className="pixel-box border-4 border-[var(--pixel-fg)] p-0 overflow-hidden bg-[var(--pixel-card-bg)] shadow-2xl rounded-2xl">

                    {/* Fixed Header */}
                    <div className="grid grid-cols-12 gap-4 p-6 border-b-4 border-[var(--pixel-fg)] bg-[var(--pixel-card-bg)] text-[var(--pixel-yellow)] font-retro text-sm md:text-base tracking-widest">
                        <div className="col-span-2 text-center">RANK</div>
                        <div className="col-span-6">PLAYER</div>
                        <div className="col-span-4 text-right">SCORE</div>
                    </div>

                    {/* Scrollable List */}
                    <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {loading && (
                            <div className="py-16 text-center">
                                <Loader2 className="w-12 h-12 text-[var(--pixel-yellow)] animate-spin mx-auto mb-4" />
                                <p className="animate-blink text-2xl">LOADING DATA...</p>
                            </div>
                        )}

                        {error && (
                            <div className="py-12 text-center text-[var(--pixel-red)] text-2xl font-bold">
                                ERROR_CODE: {error}
                            </div>
                        )}

                        {!loading && !error && data.length === 0 && (
                            <div className="py-16 text-center text-[var(--pixel-fg)] opacity-60 text-2xl">
                                NO RECORDS FOUND
                            </div>
                        )}

                        {!loading && !error && data.length > 0 && (
                            data.map((entry, index) => (
                                <div
                                    key={entry.wallet}
                                    onClick={() => setSelectedWallet(entry.wallet)}
                                    className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-[var(--pixel-card-border)] cursor-pointer group transition-colors border-b-2 border-dashed border-[var(--pixel-card-border)] last:border-0"
                                >
                                    {/* Rank */}
                                    <div className={`col-span-2 text-center font-retro text-xl ${getRankColor(index)}`}>
                                        {index === 0 ? '1ST' : index === 1 ? '2ND' : index === 2 ? '3RD' : `${index + 1}`}
                                    </div>

                                    {/* Player */}
                                    <div className="col-span-6 flex items-center gap-4 overflow-hidden">
                                        <div className={`w-12 h-12 flex-shrink-0 bg-[var(--pixel-card-bg)] border-2 border-current flex items-center justify-center ${getRankColor(index)}`}>
                                            <span className="font-retro text-lg">{entry.username?.slice(0, 1).toUpperCase() || '?'}</span>
                                        </div>
                                        <div className="truncate">
                                            <span className={`block font-bold text-xl group-hover:text-white ${index < 3 ? 'text-white' : 'text-[var(--pixel-fg)]'}`}>
                                                {entry.username || 'UNKNOWN'}
                                            </span>
                                            <span className="text-sm text-[var(--pixel-fg)] opacity-50 font-mono">
                                                {entry.walletFormatted}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className={`col-span-4 text-right font-retro text-xl ${type === 'eth' ? 'text-[var(--pixel-green)]' : 'text-[var(--pixel-blue)]'}`}>
                                        {formatScore(entry.score)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer Note */}
                <div className="text-center mt-8 text-base text-[var(--pixel-fg)] animate-pulse">
                    TOP 3 PLAYERS GET FEATURED ON LANDING PAGE
                </div>

            </main>
        </div>
    );
}
