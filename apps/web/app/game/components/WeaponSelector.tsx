'use client';

// Weapon Selector Component - Ink/Blob themed card-based weapon selection

import React, { memo } from 'react';
import { WEAPON_MODES, type WeaponModeType } from '../lib/constants';
import type { WeaponMode } from '../types';

interface WeaponSelectorProps {
    currentMode: WeaponMode;
    ink: number;
    isFrenzy: boolean;
    onSelectMode: (mode: WeaponMode) => void;
}

// Custom SVG icons for each weapon (ink/blob theme)
const WeaponIcons: Record<WeaponModeType, (isActive: boolean) => React.ReactNode> = {
    machineGun: (isActive) => (
        // Single droplet stream
        <svg width="28" height="28" viewBox="0 0 24 24" className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
            <defs>
                <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60C5F7" />
                    <stop offset="100%" stopColor="#4CC9F0" />
                </linearGradient>
            </defs>
            <path
                d="M12 2C12 2 6 9 6 13.5C6 17.09 8.69 20 12 20C15.31 20 18 17.09 18 13.5C18 9 12 2 12 2Z"
                fill="url(#dropGrad)"
                className={isActive ? 'animate-pulse' : ''}
            />
            <ellipse cx="9" cy="12" rx="2" ry="1.5" fill="rgba(255,255,255,0.4)" />
            {/* Small trailing drops */}
            <circle cx="12" cy="22" r="1.5" fill="#4CC9F0" opacity="0.6" />
        </svg>
    ),
    shotgun: (isActive) => (
        // Triple droplet spread
        <svg width="32" height="28" viewBox="0 0 28 24" className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
            <defs>
                <linearGradient id="spreadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF9B71" />
                    <stop offset="100%" stopColor="#FF6B35" />
                </linearGradient>
            </defs>
            {/* Left drop */}
            <path
                d="M7 6C7 6 4 10 4 12.5C4 14.43 5.57 16 7.5 16C9.43 16 11 14.43 11 12.5C11 10 7 6 7 6Z"
                fill="url(#spreadGrad)"
                className={isActive ? 'animate-bounce' : ''}
                style={{ animationDuration: '0.6s' }}
            />
            {/* Center drop (larger) */}
            <path
                d="M14 2C14 2 9 9 9 13C9 16.31 11.24 19 14 19C16.76 19 19 16.31 19 13C19 9 14 2 14 2Z"
                fill="url(#spreadGrad)"
                className={isActive ? 'animate-bounce' : ''}
                style={{ animationDuration: '0.5s' }}
            />
            {/* Right drop */}
            <path
                d="M21 6C21 6 18 10 18 12.5C18 14.43 19.57 16 21.5 16C23.43 16 25 14.43 25 12.5C25 10 21 6 21 6Z"
                fill="url(#spreadGrad)"
                className={isActive ? 'animate-bounce' : ''}
                style={{ animationDuration: '0.7s' }}
            />
            {/* Highlights */}
            <ellipse cx="12" cy="11" rx="1.5" ry="1" fill="rgba(255,255,255,0.4)" />
        </svg>
    ),
    inkBomb: (isActive) => (
        // Big splash/explosion
        <svg width="30" height="30" viewBox="0 0 24 24" className={`transition-transform duration-300 ${isActive ? 'scale-110 rotate-12' : ''}`}>
            <defs>
                <radialGradient id="bombGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#9B5DE5" />
                    <stop offset="100%" stopColor="#7B2CBF" />
                </radialGradient>
            </defs>
            {/* Main bomb body */}
            <circle cx="12" cy="14" r="8" fill="url(#bombGrad)" />
            {/* Fuse */}
            <path d="M12 6 Q14 4 16 5" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Spark */}
            <circle cx="16" cy="5" r="2" fill="#FFD700" className={isActive ? 'animate-ping' : ''} />
            <circle cx="16" cy="5" r="1" fill="#FFF" />
            {/* Highlight */}
            <ellipse cx="9" cy="12" rx="2.5" ry="2" fill="rgba(255,255,255,0.35)" />
            {/* Splash particles */}
            {isActive && (
                <>
                    <circle cx="4" cy="10" r="1.5" fill="#7B2CBF" opacity="0.7" className="animate-ping" />
                    <circle cx="20" cy="12" r="1.5" fill="#7B2CBF" opacity="0.7" className="animate-ping" style={{ animationDelay: '0.2s' }} />
                    <circle cx="6" cy="18" r="1" fill="#7B2CBF" opacity="0.7" className="animate-ping" style={{ animationDelay: '0.4s' }} />
                </>
            )}
        </svg>
    ),
};

const WEAPON_LIST: { mode: WeaponModeType; key: string }[] = [
    { mode: 'machineGun', key: '1' },
    { mode: 'shotgun', key: '2' },
    { mode: 'inkBomb', key: '3' },
];

const WeaponSelectorMemo = memo(WeaponSelectorComponent);

export const WeaponSelector = WeaponSelectorMemo;

function WeaponSelectorComponent({ currentMode, ink, isFrenzy, onSelectMode }: WeaponSelectorProps) {
    return (
        <div className="w-full flex justify-center gap-2">
            {WEAPON_LIST.map(({ mode }) => {
                const config = WEAPON_MODES[mode];
                const canAfford = isFrenzy || ink >= config.cost;
                const isActive = currentMode === mode;
                const isLocked = !canAfford;

                return (
                    <button
                        key={mode}
                        className={`
                            relative flex flex-col items-center justify-between flex-1
                            aspect-square max-h-[68px] rounded-lg transition-all duration-200 ease-out
                            ${isActive
                                ? 'bg-gradient-to-b from-[#E6F7FC] to-[#C5EAFA] border-2 border-[#4CC9F0] shadow-[0_0_12px_rgba(76,201,240,0.5)] scale-[1.02]'
                                : 'bg-gradient-to-b from-[#F8F9FA] to-[#E9ECEF] border border-slate-200 hover:border-slate-300'
                            }
                            ${isLocked ? 'opacity-50 grayscale' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'}
                        `}
                        onClick={() => canAfford && onSelectMode(mode)}
                        disabled={isLocked}
                        title={`${config.name} - ${config.cost} ink`}
                    >
                        {/* Lock overlay for locked weapons */}
                        {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-lg z-10">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#64748B">
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                </svg>
                            </div>
                        )}

                        {/* Weapon icon */}
                        <div className="flex-1 flex items-center justify-center pt-1">
                            {WeaponIcons[mode](isActive)}
                        </div>

                        {/* Cost badge */}
                        <div className={`
                            flex items-center gap-0.5 px-2 py-0.5 mb-1.5 rounded-full text-[10px] font-bold
                            transition-colors duration-200
                            ${isActive
                                ? 'bg-[#4CC9F0]/25 text-[#2B9AB8]'
                                : 'bg-slate-200/80 text-slate-500'
                            }
                        `}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" opacity="0.8">
                                <path d="M12 2C12 2 4 10 4 15C4 19.4 7.6 23 12 23C16.4 23 20 19.4 20 15C20 10 12 2 12 2Z" />
                            </svg>
                            <span>{config.cost}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

