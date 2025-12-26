'use client';

import React from 'react';

// Game Over Modal Component

interface GameOverModalProps {
    blueScore: number;
    maxCombo: number;
    powerupsCollected: number;
    onPlayAgain: () => void;
}

export function GameOverModal({
    blueScore,
    maxCombo,
    powerupsCollected,
    onPlayAgain,
}: GameOverModalProps) {
    // Determine result
    let title: string;
    let titleClass: string;
    let iconSvg: React.ReactElement;

    if (blueScore > 60) {
        title = 'EPIC VICTORY!';
        titleClass = 'font-display text-4xl font-bold text-secondary mb-1';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
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
        titleClass = 'font-display text-4xl font-bold text-blue-600 mb-1';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <circle cx="12" cy="12" r="10" />
                <path d="m8 14 4 4 4-4" />
                <path d="M12 8v8" />
            </svg>
        );
    } else if (blueScore > 40) {
        title = 'CLOSE MATCH!';
        titleClass = 'font-display text-4xl font-bold text-yellow-600 mb-1';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
            </svg>
        );
    } else if (blueScore > 25) {
        title = 'DEFEAT';
        titleClass = 'font-display text-4xl font-bold text-primary mb-1';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
            </svg>
        );
    } else {
        title = 'CRUSHED';
        titleClass = 'font-display text-4xl font-bold text-red-600 mb-1';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-slate-900/70 to-blue-900/70 flex items-center justify-center backdrop-blur-sm transition-opacity opacity-100">
            <div className="bg-white/95 rounded-2xl shadow-2xl text-center max-w-[360px] w-full transform scale-100 transition-transform duration-300 backdrop-blur-sm border border-white/50 flex flex-col items-center" style={{ padding: '48px 32px' }}>
                <div className="flex justify-center" style={{ marginBottom: '24px' }}>{iconSvg}</div>
                <h2 className={titleClass} style={{ marginBottom: '12px' }}>{title}</h2>
                <div className="bg-gradient-to-r from-blue-100 to-slate-100 rounded-xl border border-slate-300 w-full" style={{ padding: '24px 20px', marginBottom: '12px' }}>
                    <p className="text-slate-600 font-bold text-sm mb-1">FINAL SCORE</p>
                    <p className="text-2xl font-bold text-blue-600">
                        BLUE TERRITORY: <span className="text-blue-700">{blueScore}%</span>
                    </p>
                    <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-secondary to-blue-400"
                            style={{ width: `${blueScore}%` }}
                        ></div>
                    </div>
                </div>
                <div className="flex gap-5 w-full" style={{ marginBottom: '12px' }}>
                    <div className="flex-1 bg-slate-100 rounded-xl border border-slate-300" style={{ padding: '12px' }}>
                        <p className="text-xs text-slate-600 mb-1 font-semibold">MAX COMBO</p>
                        <p className="font-bold text-xl text-amber-600">x{maxCombo}</p>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-xl border border-slate-300" style={{ padding: '12px' }}>
                        <p className="text-xs text-slate-600 mb-1 font-semibold">POWER-UPS</p>
                        <p className="font-bold text-xl text-purple-700">{powerupsCollected}</p>
                    </div>
                </div>
                <button
                    onClick={onPlayAgain}
                    className="w-full bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl font-bold shadow-xl active:scale-95 transition-transform hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-600 flex items-center justify-center gap-2"
                    style={{ padding: '16px 32px' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                    PLAY AGAIN
                </button>
            </div>
        </div>
    );
}
