'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Flag, Home, Target, Swords, Ban, Coins, ExternalLink, Check } from 'lucide-react';

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
            // Ease out quart
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
}: PvPGameOverModalProps) {
    const myScore = myTeam === 'blue' ? scores.blue : scores.red;
    const enemyScore = myTeam === 'blue' ? scores.red : scores.blue;
    const isWinner = myScore > enemyScore;
    const isDraw = myScore === enemyScore;

    const [isVisible, setIsVisible] = useState(false);
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    // Theme Configuration - Saweria Style
    // Theme Configuration - High Contrast
    const theme = isWinner ? {
        gradient: 'from-pink-500 to-pink-600',
        bgGradient: 'from-pink-50 to-white',
        borderColor: 'border-pink-200',
        textColor: 'text-pink-600',
        icon: Trophy,
        title: 'VICTORY!',
        subtext: 'You Conquered The Arena!',
        badge: 'Domination Achieved',
        badgeStyles: 'bg-pink-100 text-pink-700'
    } : isDraw ? {
        gradient: 'from-slate-500 to-slate-600',
        bgGradient: 'from-slate-50 to-white',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-600',
        icon: Ban,
        title: 'DRAW',
        subtext: 'A Perfectly Matched Battle!',
        badge: 'Stalemate',
        badgeStyles: 'bg-slate-100 text-slate-700'
    } : {
        gradient: 'from-red-500 to-red-600',
        bgGradient: 'from-red-50 to-white',
        borderColor: 'border-red-200',
        textColor: 'text-red-600',
        icon: Swords,
        title: 'DEFEAT',
        subtext: 'Better Luck Next Time!',
        badge: 'Match Completed',
        badgeStyles: 'bg-red-100 text-red-700'
    };

    // Animated Values
    const displayedScore = useCountUp(myScore, 1500, 200);
    // Fallback stats if not provided (should be provided by logic)
    const totalTiles = stats?.totalTilesCaptured || 0;
    const currentTiles = stats?.currentTilesOwned || Math.round((myScore / 100) * (26 * 44));

    const displayedTiles = useCountUp(currentTiles, 1500, 400);
    const displayedCaptured = useCountUp(totalTiles, 1500, 600);

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden">
            {/* Background Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Confetti Particles (CSS only, simplified) */}
            {isWinner && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full animate-confetti"
                            style={{
                                backgroundColor: ['#FFD700', '#FF69B4', '#00BFFF', '#32CD32'][i % 4],
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Main Card */}
            <div
                className={`
                    relative bg-white/95 backdrop-blur-xl rounded-3xl p-3 sm:p-6 max-w-sm w-full mx-4 shadow-2xl border-4 ${theme.borderColor}
                    transform transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)
                    max-h-[90vh] overflow-y-auto scrollbar-hide
                    ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-75 translate-y-10 opacity-0'}
                `}
            >
                {/* Result Icon with Shine Effect */}
                {/* Result Icon with Shine Effect */}
                <div className="relative flex justify-center mb-2 sm:mb-4">
                    <div className={`relative z-10 p-2 sm:p-3 rounded-full bg-gradient-to-br ${theme.bgGradient} shadow-inner`}>
                        <theme.icon className={`w-8 h-8 sm:w-12 sm:h-12 ${theme.textColor}`} strokeWidth={1.5} />
                    </div>
                    {/* Pulsing Glow behind icon */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r ${theme.gradient} blur-xl opacity-20 animate-pulse`} />
                </div>

                {/* Title & Subtext */}
                {/* Title & Subtext */}
                <div className="text-center mb-3 sm:mb-6">
                    <h1 className={`text-h2 font-black bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient} mb-2 tracking-tight`}>
                        {theme.title}
                    </h1>
                    <p className={`font-bold text-sm tracking-wide uppercase mb-3 text-slate-600`}>
                        {theme.subtext}
                    </p>

                    {/* Badge - High Contrast Pill */}
                    <div className={`
                        inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase
                        ${theme.badgeStyles}
                    `}>
                        {theme.badge}
                    </div>
                </div>

                {/* Dominant Score Display */}
                {/* Dominant Score Display */}
                {/* Dominant Score Display */}
                <div className="flex flex-col items-center mb-6 sm:mb-8">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-7xl sm:text-8xl font-black tabular-nums tracking-tighter ${theme.textColor}`}>
                            {displayedScore}
                        </span>
                        <span className={`text-3xl font-bold ${theme.textColor} opacity-80`}>%</span>
                    </div>
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Total Team Area</span>
                </div>

                {/* Statistics Row - Simplified/Clean */}
                <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6 sm:mb-8 px-4">
                    <div className="flex items-center gap-2">
                        <div className={`${isWinner ? 'text-blue-600' : 'text-slate-500'}`}>
                            <Flag size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Territory</span>
                            <span className="font-black text-slate-800 text-xl leading-none">{displayedTiles}</span>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-slate-300"></div>

                    <div className="flex items-center gap-2">
                        <div className={`${isWinner ? 'text-amber-600' : 'text-slate-500'}`}>
                            <Target size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Captured</span>
                            <span className="font-black text-slate-800 text-xl leading-none">{displayedCaptured}</span>
                        </div>
                    </div>
                </div>

                {/* Claim Reward Section (Winner Only) */}
                {isWinner && !isTournament && (
                    <div className="mb-3">
                        {!claimed ? (
                            <button
                                onClick={() => setClaimed(true)}
                                className="w-full bg-gradient-to-r from-saweria-pink to-saweria-pink-light hover:from-saweria-pink-dark hover:to-saweria-pink text-white font-bold py-3 rounded-full shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 group text-sm"
                            >
                                <Coins size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>CLAIM REWARD</span>
                            </button>
                        ) : (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-3 sm:p-4 animate-fade-in-up">
                                {/* Header */}
                                <div className="flex items-center justify-center gap-2 mb-3">
                                    <div className="p-1.5 bg-emerald-100 rounded-full">
                                        <Coins size={16} className="text-emerald-600" />
                                    </div>
                                    <span className="font-bold text-emerald-700 text-sm tracking-wide">REWARD CLAIMED!</span>
                                </div>

                                {/* Breakdown */}
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Total Pool</span>
                                        <span className="font-semibold text-slate-800">0.002 ETH</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Platform Fee (1%)</span>
                                        <span className="font-semibold text-red-500">-0.00002 ETH</span>
                                    </div>
                                    <div className="border-t border-emerald-200 my-2"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-emerald-800">Your Reward</span>
                                        <span className="font-black text-emerald-600 text-lg">0.00198 ETH</span>
                                    </div>
                                </div>

                                {/* Success indicator with Basescan link */}
                                <div className="mt-4 text-center space-y-1">
                                    <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1">
                                        <Check size={12} /> Sent to your wallet
                                    </div>
                                    {settlementTxHash && (
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${settlementTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline group/link"
                                        >
                                            <span>View Transaction on Basescan</span>
                                            <ExternalLink size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Exit Button */}
                <button
                    onClick={onExit}
                    className="w-full bg-white border-2 border-saweria-coral hover:border-saweria-pink text-text-main hover:text-saweria-pink font-bold py-3 rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 group text-sm"
                >
                    <Home size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                    <span>{isTournament ? 'BACK TO TOURNAMENT' : 'EXIT TO LOBBY'}</span>
                </button>
            </div>

            <style jsx>{`
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .animate-confetti {
                    animation: confetti 4s ease-out forwards;
                }
                @keyframes fade-in-up {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
