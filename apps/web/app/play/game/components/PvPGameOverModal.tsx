'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Flag, Home, Target, Swords, Ban, Coins, ExternalLink, Check, Zap, Crown, Loader2 } from 'lucide-react';
import { useClaimTrophy } from '../../../hooks/useClaimTrophy';

interface PvPGameOverModalProps {
    myTeam: 'blue' | 'red';
    scores: { blue: number; red: number };
    stats?: {
        currentTilesOwned: number;
        totalTilesCaptured: number;
    };
    settlementTxHash?: string | null;
    onExit: () => void;
    isTournament?: boolean;
    weekNumber?: number; // Required for tournament NFT claim
}

// Simple CountUp Hook
const useCountUp = (end: number, duration: number = 1000, delay: number = 0) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;

            if (progress < delay) {
                animationFrame = requestAnimationFrame(animate);
                return;
            }

            const animationProgress = Math.min((progress - delay) / duration, 1);
            const ease = 1 - Math.pow(1 - animationProgress, 4);

            setCount(Math.floor(end * ease));

            if (animationProgress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, delay]);

    return count;
};

export function PvPGameOverModal({
    myTeam,
    scores,
    stats,
    settlementTxHash,
    onExit,
    isTournament = false,
    weekNumber,
}: PvPGameOverModalProps) {
    const myScore = myTeam === 'blue' ? scores.blue : scores.red;
    const enemyScore = myTeam === 'blue' ? scores.red : scores.blue;
    const isWinner = myScore > enemyScore;
    const isDraw = myScore === enemyScore;

    const [isVisible, setIsVisible] = useState(false);

    // NFT Claim Hook for tournament games
    const {
        canClaim,
        hasClaimed,
        claim,
        isPending,
        isConfirming,
        isSuccess,
        error: claimError,
        txHash,
    } = useClaimTrophy(isTournament ? weekNumber : undefined);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    // Theme Configuration - MODERN RETRO (Rounded & Pop)
    const theme = isWinner ? {
        color: 'text-[var(--pixel-pink)]', // Pink for Codédex Vibe
        borderColor: 'border-[var(--pixel-pink)]',
        bg: 'bg-[#1a1a2e]', // Deep Space Blue
        icon: Trophy,
        title: 'GREAT WIN!',
        subtext: 'WELL SERVED!',
        badge: 'VICTOR',
        badgeBg: 'bg-[var(--pixel-pink)] text-white'
    } : isDraw ? {
        color: 'text-[var(--pixel-fg)]',
        borderColor: 'border-[var(--pixel-fg)]',
        bg: 'bg-[#1a1a2e]',
        icon: Ban,
        title: 'DRAW GAME',
        subtext: 'PERFECTLY BALANCED',
        badge: 'STALEMATE',
        badgeBg: 'bg-[var(--pixel-fg)] text-black'
    } : {
        color: 'text-gray-400',
        borderColor: 'border-gray-600',
        bg: 'bg-[#1a1a2e]',
        icon: Swords,
        title: 'DEFEAT',
        subtext: 'BETTER LUCK NEXT TIME',
        badge: 'FALLEN',
        badgeBg: 'bg-gray-600 text-white'
    };

    // Animated Values
    const displayedScore = useCountUp(myScore, 1500, 200);
    const totalTiles = stats?.totalTilesCaptured || 0;
    const currentTiles = stats?.currentTilesOwned || Math.round((myScore / 100) * (26 * 44));

    const displayedTiles = useCountUp(currentTiles, 1500, 400);
    const displayedCaptured = useCountUp(totalTiles, 1500, 600);

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden font-terminal">
            {/* Dark Overlay with Blur */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Confetti Particles (Winner Only) */}
            {isWinner && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-3 h-3 bg-white animate-confetti rounded-full" // Rounded confetti
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                                backgroundColor: ['#f472b6', '#2979FF', '#FFD600'][i % 3]
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Main Modern Pixel Card - ROUNDED */}
            <div
                className={`
                    relative ${theme.bg} p-6 sm:p-8 w-full max-w-[340px] sm:max-w-md mx-4 
                    border-4 border-white rounded-[2rem]
                    shadow-[0px_20px_40px_-5px_rgba(0,0,0,0.6)]
                    transform transition-all duration-500
                    max-h-[85vh] overflow-y-auto overflow-x-hidden
                    ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-10 opacity-0'}
                `}
            >
                <div className="text-center">

                    {/* Icon Circle - Floating & Glowing */}
                    <div className="relative flex justify-center mb-3 sm:mb-6">
                        <div className={`
                            relative z-10 w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center 
                            rounded-full border-4 ${theme.borderColor} bg-[var(--pixel-bg)]
                            animate-float shadow-xl
                        `}>
                            <theme.icon className={`w-8 h-8 sm:w-12 sm:h-12 ${theme.color}`} strokeWidth={2} />
                        </div>
                        {/* Glow */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full blur-xl animate-pulse`} />
                    </div>

                    {/* Title - Press Start 2P */}
                    <h1 className={`font-retro text-2xl sm:text-5xl mb-1 sm:mb-3 ${theme.color} drop-shadow-md leading-tight`}>
                        {theme.title}
                    </h1>

                    <p className="font-bold text-xs sm:text-lg tracking-widest uppercase mb-3 sm:mb-6 text-white/80 leading-none">
                        {theme.subtext}
                    </p>

                    {/* Badge Pill */}
                    <div className={`
                        inline-block px-4 sm:px-6 py-1 sm:py-2 mb-4 sm:mb-8 text-xs sm:text-lg font-bold tracking-widest uppercase 
                        rounded-full border-2 border-white/20
                        ${theme.badgeBg}
                        animate-bounce-in
                    `}>
                        {theme.badge}
                    </div>

                    {/* Big Percentage Score - Clean & White */}
                    <div className="flex flex-col items-center mb-4 sm:mb-8 bg-black/20 rounded-2xl p-2 sm:p-4 border border-white/10">
                        <div className="flex items-baseline justify-center">
                            <span className={`font-retro text-4xl sm:text-7xl text-white drop-shadow-lg`}>
                                {displayedScore}
                            </span>
                            <span className={`font-retro text-xl sm:text-4xl text-white/50 ml-2`}>%</span>
                        </div>
                        <span className="text-white/60 text-[10px] sm:text-sm uppercase tracking-[0.3em] mt-1">
                            CONTROL RATE
                        </span>
                    </div>

                    {/* Stats Row - Clean Pills */}
                    <div className="flex justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
                        <div className="flex-1 bg-white/5 rounded-xl p-2 sm:p-3 border border-white/10">
                            <div className="flex items-center justify-center gap-2 mb-1 text-[var(--pixel-yellow)]">
                                <Zap size={12} className="sm:w-4 sm:h-4" />
                                <span className="font-bold text-[10px] sm:text-xs uppercase">Combo</span>
                            </div>
                            <span className="font-retro text-base sm:text-xl text-white">x97</span>
                        </div>

                        <div className="flex-1 bg-white/5 rounded-xl p-2 sm:p-3 border border-white/10">
                            <div className="flex items-center justify-center gap-2 mb-1 text-[var(--pixel-blue)]">
                                <Flag size={12} className="sm:w-4 sm:h-4" />
                                <span className="font-bold text-[10px] sm:text-xs uppercase">Captures</span>
                            </div>
                            <span className="font-retro text-base sm:text-xl text-white">{displayedCaptured}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 sm:space-y-4">
                        {/* Tournament NFT Claim Button */}
                        {isWinner && isTournament && canClaim && !hasClaimed && !isSuccess && (
                            <div className="mb-2 sm:mb-4">
                                <button
                                    onClick={claim}
                                    disabled={isPending || isConfirming}
                                    className="pixel-btn pixel-btn-primary w-full text-sm sm:text-lg !rounded-xl shadow-lg hover:shadow-xl transition-all py-2.5 sm:py-3 disabled:opacity-50"
                                >
                                    {isPending || isConfirming ? (
                                        <>
                                            <Loader2 size={16} className="inline mr-2 sm:w-5 sm:h-5 animate-spin" />
                                            {isPending ? 'CONFIRM IN WALLET...' : 'MINTING...'}
                                        </>
                                    ) : (
                                        <>
                                            <Trophy size={16} className="inline mr-2 sm:w-5 sm:h-5" />
                                            CLAIM NFT TROPHY
                                        </>
                                    )}
                                </button>
                                {claimError && (
                                    <p className="text-red-400 text-xs mt-2 text-center">
                                        {claimError.message.slice(0, 50)}...
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Tournament Claim Success */}
                        {isWinner && isTournament && (hasClaimed || isSuccess) && (
                            <div className="mb-2 sm:mb-4">
                                <div className="border border-[var(--pixel-green)] bg-[var(--pixel-green)]/10 p-2 sm:p-4 rounded-xl">
                                    <div className="text-[var(--pixel-green)] font-bold text-sm sm:text-lg mb-0.5 sm:mb-2 flex items-center justify-center gap-2">
                                        <Check size={16} className="sm:w-6 sm:h-6" />
                                        <span>NFT TROPHY CLAIMED!</span>
                                    </div>
                                    {txHash && (
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--pixel-blue)] text-[10px] sm:text-xs underline flex items-center justify-center gap-1"
                                        >
                                            View on BaseScan <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Standard PvP ETH Reward (auto-claimed by contract) */}
                        {isWinner && !isTournament && settlementTxHash && (
                            <div className="mb-2 sm:mb-4">
                                <div className="border border-[var(--pixel-green)] bg-[var(--pixel-green)]/10 p-2 sm:p-4 rounded-xl">
                                    <div className="text-[var(--pixel-green)] font-bold text-sm sm:text-lg mb-0.5 sm:mb-2 flex items-center justify-center gap-2">
                                        <Check size={16} className="sm:w-6 sm:h-6" />
                                        <span>REWARD SENT!</span>
                                    </div>
                                    <div className="text-white/80 text-[10px] sm:text-sm">
                                        PRIZE: <span className="text-[var(--pixel-green)] font-bold">0.00198 ETH</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onExit}
                            className="pixel-btn pixel-btn-outline w-full text-sm sm:text-lg !rounded-xl hover:bg-white/10 py-2.5 sm:py-3"
                        >
                            <Home size={16} className="inline mr-2 mb-1 sm:w-5 sm:h-5" />
                            {isTournament ? 'TOURNAMENT LOBBY' : 'EXIT TO LOBBY'}
                        </button>
                    </div>

                </div>
            </div>

            <style jsx>{`
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .animate-confetti {
                    animation: confetti 4s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
