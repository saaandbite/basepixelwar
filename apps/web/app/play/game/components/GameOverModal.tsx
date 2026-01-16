'use client';

import React, { useEffect, useState } from 'react';
import { Home, Trophy, Ban, Swords, RotateCcw, Zap, Flame } from 'lucide-react';

interface GameOverModalProps {
    blueScore: number;
    maxCombo: number;
    powerupsCollected: number;
    onPlayAgain: () => void;
    onExit: () => void;
}

// Simple CountUp Hook (Internal)
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

export function GameOverModal({
    blueScore,
    maxCombo,
    powerupsCollected,
    onPlayAgain,
    onExit,
}: GameOverModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    // Determine Theme based on score
    // > 60: Epic Victory
    // > 50: Great Win
    // > 40: Close Match
    // <= 40: Defeat

    let theme;

    if (blueScore > 60) {
        theme = {
            gradient: 'from-pink-500 to-pink-600',
            bgGradient: 'from-pink-50 to-white',
            borderColor: 'border-pink-200',
            textColor: 'text-pink-600',
            icon: Trophy,
            title: 'EPIC VICTORY!',
            subtext: 'You Dominated The Arena!',
            badge: 'Legendary',
            badgeStyles: 'bg-pink-100 text-pink-700',
            isWin: true
        };
    } else if (blueScore > 50) {
        theme = {
            gradient: 'from-pink-400 to-pink-500',
            bgGradient: 'from-pink-50 to-white',
            borderColor: 'border-pink-200',
            textColor: 'text-pink-500',
            icon: Trophy,
            title: 'GREAT WIN!',
            subtext: 'Well Served!',
            badge: 'Victor',
            badgeStyles: 'bg-pink-100 text-pink-700',
            isWin: true
        };
    } else if (blueScore > 40) {
        theme = {
            gradient: 'from-amber-500 to-amber-600',
            bgGradient: 'from-amber-50 to-white',
            borderColor: 'border-amber-200',
            textColor: 'text-amber-600',
            icon: Ban, // Stalemate/Close icon
            title: 'CLOSE MATCH!',
            subtext: 'Almost There!',
            badge: 'Runner Up',
            badgeStyles: 'bg-amber-100 text-amber-700',
            isWin: false
        };
    } else {
        theme = {
            gradient: 'from-red-500 to-red-600',
            bgGradient: 'from-red-50 to-white',
            borderColor: 'border-red-200',
            textColor: 'text-red-600',
            icon: Swords,
            title: 'CRUSHED',
            subtext: 'Better Luck Next Time!',
            badge: 'Defeated',
            badgeStyles: 'bg-red-100 text-red-700',
            isWin: false
        };
    }

    // Animated Values
    const displayedScore = useCountUp(blueScore, 1500, 200);
    const displayedCombo = useCountUp(maxCombo, 1500, 400);
    const displayedPowerups = useCountUp(powerupsCollected, 1500, 600);

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden">
            {/* Background Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Confetti Particles (CSS only, simplified) */}
            {theme.isWin && (
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
                <div className="relative flex justify-center mb-2 sm:mb-4">
                    <div className={`relative z-10 p-2 sm:p-3 rounded-full bg-gradient-to-br ${theme.bgGradient} shadow-inner`}>
                        <theme.icon className={`w-8 h-8 sm:w-12 sm:h-12 ${theme.textColor}`} strokeWidth={1.5} />
                    </div>
                    {/* Pulsing Glow behind icon */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r ${theme.gradient} blur-xl opacity-20 animate-pulse`} />
                </div>

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
                <div className="flex flex-col items-center mb-6 sm:mb-8">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-7xl sm:text-8xl font-black tabular-nums tracking-tighter ${theme.textColor}`}>
                            {displayedScore}
                        </span>
                        <span className={`text-3xl font-bold ${theme.textColor} opacity-80`}>%</span>
                    </div>
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Territory Control</span>
                </div>

                {/* Statistics Row - Stats specific to Single Player */}
                <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6 sm:mb-8 px-4">
                    <div className="flex items-center gap-2">
                        <div className="text-amber-500">
                            <Flame size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Max Combo</span>
                            <span className="font-black text-slate-800 text-xl leading-none">x{displayedCombo}</span>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-slate-300"></div>

                    <div className="flex items-center gap-2">
                        <div className="text-purple-500">
                            <Zap size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Powerups</span>
                            <span className="font-black text-slate-800 text-xl leading-none">{displayedPowerups}</span>
                        </div>
                    </div>
                </div>

                {/* Buttons Action Group */}
                <div className="space-y-3">
                    {/* Play Again Button */}
                    <button
                        onClick={onPlayAgain}
                        className="w-full bg-gradient-to-r from-saweria-pink to-saweria-pink-light hover:from-saweria-pink-dark hover:to-saweria-pink text-white font-bold py-3 rounded-full shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 group text-sm"
                    >
                        <RotateCcw size={18} className="group-hover:-rotate-90 transition-transform duration-300" />
                        <span>PLAY AGAIN</span>
                    </button>

                    {/* Exit to Lobby Button */}
                    <button
                        onClick={onExit}
                        className="w-full bg-white border-2 border-saweria-coral hover:border-saweria-pink text-slate-700 hover:text-saweria-pink font-bold py-3 rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 group text-sm"
                    >
                        <Home size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                        <span>EXIT TO LOBBY</span>
                    </button>
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
