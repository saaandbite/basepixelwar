'use client';

import React from 'react';

interface PvPGameOverModalProps {
    myTeam: 'blue' | 'red';
    scores: { blue: number; red: number };
    onExit: () => void;
}

export function PvPGameOverModal({
    myTeam,
    scores,
    onExit,
}: PvPGameOverModalProps) {
    const myScore = myTeam === 'blue' ? scores.blue : scores.red;
    const enemyScore = myTeam === 'blue' ? scores.red : scores.blue;
    const isWinner = myScore > enemyScore;
    const isDraw = myScore === enemyScore;

    let title: string;
    let titleClass: string;
    let iconSvg: React.ReactElement;
    let gradientClass: string;

    if (isDraw) {
        title = 'DRAW';
        titleClass = 'font-display text-3xl font-bold text-slate-600';
        gradientClass = 'from-slate-100 to-slate-200';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
        );
    } else if (isWinner) {
        title = 'VICTORY!';
        titleClass = 'font-display text-3xl font-bold text-blue-600';
        gradientClass = 'from-blue-50 to-indigo-50';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 drop-shadow-md">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
        );
    } else {
        title = 'DEFEAT';
        titleClass = 'font-display text-3xl font-bold text-red-600';
        gradientClass = 'from-red-50 to-orange-50';
        iconSvg = (
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 drop-shadow-md">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        );
    }

    return (
        <div className="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center transform scale-100 transition-all border-4 ${isWinner ? 'border-blue-100' : 'border-red-100'}`}>

                {/* Result Icon */}
                <div className="flex justify-center mb-6 scale-110">
                    {iconSvg}
                </div>

                {/* Title */}
                <h2 className={`${titleClass} mb-2 tracking-tight`}>{title}</h2>
                <p className="text-slate-500 font-medium text-sm mb-8 uppercase tracking-wider">
                    {isWinner ? 'You conquered the arena!' : isDraw ? 'Ideally matched!' : 'Better luck next time!'}
                </p>

                {/* Scores */}
                <div className="flex gap-4 mb-8">
                    {/* My Score */}
                    <div className={`flex-1 rounded-2xl p-4 border-2 ${isWinner ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="text-xs font-black text-slate-400 uppercase mb-1">YOU</div>
                        <div className={`text-4xl font-black ${isWinner ? 'text-blue-600' : 'text-slate-700'}`}>
                            {myScore}%
                        </div>
                    </div>

                    {/* Enemy Score */}
                    <div className={`flex-1 rounded-2xl p-4 border-2 ${!isWinner && !isDraw ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="text-xs font-black text-slate-400 uppercase mb-1">ENEMY</div>
                        <div className={`text-4xl font-black ${!isWinner && !isDraw ? 'text-red-600' : 'text-slate-700'}`}>
                            {enemyScore}%
                        </div>
                    </div>
                </div>

                {/* Exit Button */}
                <button
                    onClick={onExit}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
                        <path d="m12 19-7-7 7-7" />
                        <path d="M19 12H5" />
                    </svg>
                    EXIT TO LOBBY
                </button>
            </div>
        </div>
    );
}
