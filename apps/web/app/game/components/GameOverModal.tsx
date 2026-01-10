'use client';

import React from 'react';
import { Home } from 'lucide-react';

// Game Over Modal Component

interface GameOverModalProps {
    blueScore: number;
    maxCombo: number;
    powerupsCollected: number;
    onPlayAgain: () => void;
    onExit: () => void;
}

export function GameOverModal({
    blueScore,
    maxCombo,
    powerupsCollected,
    onPlayAgain,
    onExit,
}: GameOverModalProps) {
    // Determine result
    let title: string;
    let titleClass: string;
    let iconSvg: React.ReactElement;

    if (blueScore > 60) {
        title = 'EPIC VICTORY!';
        titleClass = 'font-display text-3xl font-bold text-saweria-pink';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saweria-pink">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
        );
    } else if (blueScore > 50) {
        title = 'GREAT WIN!';
        titleClass = 'font-display text-3xl font-bold text-saweria-pink';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saweria-pink-dark">
                <circle cx="12" cy="12" r="10" />
                <path d="m8 14 4 4 4-4" />
                <path d="M12 8v8" />
            </svg>
        );
    } else if (blueScore > 40) {
        title = 'CLOSE MATCH!';
        titleClass = 'font-display text-3xl font-bold text-yellow-600';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
            </svg>
        );
    } else if (blueScore > 25) {
        title = 'DEFEAT';
        titleClass = 'font-display text-3xl font-bold text-primary';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
            </svg>
        );
    } else {
        title = 'CRUSHED';
        titleClass = 'font-display text-3xl font-bold text-red-600';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-saweria-cream/90 to-saweria-coral/90 flex items-center justify-center backdrop-blur-sm transition-opacity opacity-100">
            <div className="bg-white rounded-3xl shadow-2xl text-center max-w-[340px] w-full transform scale-100 transition-transform duration-300 border-2 border-saweria-coral flex flex-col items-center p-7">
                {/* Icon */}
                <div className="flex justify-center mb-5">{iconSvg}</div>

                {/* Title */}
                <h2 className={titleClass}>{title}</h2>

                {/* Score Card */}
                <div className="bg-gradient-to-r from-saweria-coral/30 to-saweria-cream rounded-2xl border-2 border-saweria-pink-light w-full p-4 mt-4">
                    <p className="text-text-muted font-semibold text-xs mb-1">FINAL SCORE</p>
                    <p className="text-xl font-bold text-text-main">
                        BLUE TERRITORY: <span className="text-saweria-pink">{blueScore}%</span>
                    </p>
                    <div className="mt-2 h-2 bg-saweria-coral/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-saweria-pink to-saweria-pink-light"
                            style={{ width: `${blueScore}%` }}
                        ></div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="flex gap-3 w-full mt-4">
                    <div className="flex-1 bg-saweria-coral/20 rounded-2xl border-2 border-saweria-pink-light p-3">
                        <p className="text-[10px] text-text-muted mb-0.5 font-semibold">MAX COMBO</p>
                        <p className="font-bold text-lg text-amber-500">x{maxCombo}</p>
                    </div>
                    <div className="flex-1 bg-saweria-coral/20 rounded-2xl border-2 border-saweria-pink-light p-3">
                        <p className="text-[10px] text-text-muted mb-0.5 font-semibold">POWER-UPS</p>
                        <p className="font-bold text-lg text-saweria-pink">{powerupsCollected}</p>
                    </div>
                </div>

                {/* Play Again Button */}
                <button
                    onClick={onPlayAgain}
                    className="w-full bg-gradient-to-r from-saweria-pink to-saweria-pink-light text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform hover:from-saweria-pink-dark hover:to-saweria-pink flex items-center justify-center gap-2 py-3.5 px-6 mt-4"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                    PLAY AGAIN
                </button>

                {/* Exit to Lobby Button */}
                <button
                    onClick={onExit}
                    className="w-full bg-white border-2 border-saweria-coral hover:border-saweria-pink text-gray-700 hover:text-saweria-pink font-bold py-3 rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 group mt-3"
                >
                    <Home size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                    EXIT TO LOBBY
                </button>
            </div>
        </div>
    );
}
