'use client';

// Game HUD Component

import { memo } from 'react';
import { GAME_DURATION } from '../lib/constants';

interface GameHUDProps {
    scoreBlue: number;
    scoreRed: number;
    timeLeft: number;
    isSoundOn: boolean;
    onPause: () => void;
    onToggleSound: () => void;
    comboStreak: number;
    showCombo: boolean;
}

const GameHUDMemo = memo(GameHUDComponent);

export const GameHUD = GameHUDMemo;

function GameHUDComponent({
    scoreBlue,
    scoreRed,
    timeLeft,
    isSoundOn,
    onPause,
    onToggleSound,
    comboStreak,
    showCombo,
}: GameHUDProps) {
    // Calculate timer ring
    const percentage = timeLeft / GAME_DURATION;
    // const circumference = 2 * Math.PI * 28;
    // const offset = circumference - percentage * circumference;

    // Timer color based on time remaining
    const timerColor =
        timeLeft < 15 ? '#EF4444' : timeLeft < 30 ? '#F97316' : '#4CC9F0';

    return (
        <header className="w-full p-3 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 flex justify-between items-center shrink-0">
            {/* Pause Button */}
            <button
                onClick={onPause}
                className="w-11 h-11 bg-slate-50/80 rounded-xl shadow-btn active:shadow-btn-active active:translate-y-[2px] flex items-center justify-center text-secondary hover:text-secondary/80 transition-all border border-slate-200/80 backdrop-blur-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="4" height="16" x="6" y="4" rx="1" />
                    <rect width="4" height="16" x="14" y="4" rx="1" />
                </svg>
            </button>

            {/* Score Board & Timer - Horizontal Layout */}
            <div className="flex items-center gap-3">
                {/* Timer Ring - Compact */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="absolute -rotate-90" width="48" height="48" viewBox="0 0 48 48">
                        <circle
                            cx="24"
                            cy="24"
                            r="20"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="3"
                        ></circle>
                        <circle
                            cx="24"
                            cy="24"
                            r="20"
                            fill="none"
                            stroke={timerColor}
                            strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 20}
                            strokeDashoffset={(2 * Math.PI * 20) - percentage * (2 * Math.PI * 20)}
                            className="timer-ring"
                        ></circle>
                    </svg>
                    <div className="bg-slate-900/85 text-white w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider shadow-md">
                        {timeLeft}s
                    </div>
                </div>

                {/* Score Board */}
                <div className="bg-gradient-to-r from-red-50/90 to-blue-50/90 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-2 backdrop-blur-sm">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-primary/90 border border-white shadow-sm"></div>
                        <span className="font-display font-bold text-base text-slate-800 tabular-nums">
                            {scoreRed}%
                        </span>
                    </div>
                    <div className="w-[1px] h-4 bg-slate-300/60"></div>
                    <div className="flex items-center gap-1">
                        <span className="font-display font-bold text-base text-slate-800 tabular-nums">
                            {scoreBlue}%
                        </span>
                        <div className="w-3 h-3 rounded-full bg-secondary/90 border border-white shadow-sm"></div>
                    </div>
                </div>
            </div>

            {/* Combo Counter */}
            {showCombo && comboStreak >= 2 && (
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400/90 text-white px-4 py-1 rounded-full font-display font-bold text-lg shadow-combo backdrop-blur-sm border border-yellow-500/50 animate-combo-pop pointer-events-none">
                    <div className="inline-block align-middle mr-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                    </div>
                    x{comboStreak} COMBO!
                </div>
            )}

            {/* Sound Toggle */}
            <button
                onClick={onToggleSound}
                className="w-11 h-11 bg-slate-50/80 rounded-xl shadow-btn active:shadow-btn-active active:translate-y-[2px] flex items-center justify-center text-slate-400 hover:text-accent transition-colors border border-slate-200/80 backdrop-blur-sm"
            >
                {isSoundOn ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                )}
            </button>
        </header>
    );
}
