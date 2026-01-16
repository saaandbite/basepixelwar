'use client';

// Weapon Selector Component - Ink/Blob themed card-based weapon selection

import React, { memo } from 'react';
import { WEAPON_MODES, type WeaponModeType } from '../lib/constants';
import type { WeaponMode } from '../types';
import Image from 'next/image';

interface WeaponSelectorProps {
    currentMode: WeaponMode;
    ink: number;
    isFrenzy: boolean;
    onSelectMode: (mode: WeaponMode) => void;
    // Per-Weapon Usage System
    weaponStates: Record<WeaponMode, {
        usage: number;
        isOverheated: boolean;
        cooldownEndTime: number;
    }>;
}

// Custom Pixel Art icons for each weapon
const WeaponIcons: Record<WeaponModeType, (isActive: boolean) => React.ReactNode> = {
    machineGun: (isActive) => (
        <div className={`relative w-8 h-8 transition-transform duration-200 ${isActive ? 'scale-125' : ''}`}>
            <Image
                src="/assets/game/icons/machine_gun.png"
                alt="Machine Gun"
                fill
                className={`object-contain ${isActive ? 'brightness-110 drop-shadow-md' : 'grayscale-[0.3]'}`}
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    ),
    shotgun: (isActive) => (
        <div className={`relative w-9 h-8 transition-transform duration-200 ${isActive ? 'scale-125' : ''}`}>
            <Image
                src="/assets/game/icons/shotgun.png"
                alt="Shotgun"
                fill
                className={`object-contain ${isActive ? 'brightness-110 drop-shadow-md' : 'grayscale-[0.3]'}`}
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    ),
    inkBomb: (isActive) => (
        <div className={`relative w-8 h-8 transition-transform duration-200 ${isActive ? 'scale-125 rotate-6' : ''}`}>
            <Image
                src="/assets/game/icons/ink_bomb.png"
                alt="Ink Bomb"
                fill
                className={`object-contain ${isActive ? 'brightness-110 drop-shadow-md' : 'grayscale-[0.3]'}`}
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    ),
};

const WEAPON_LIST: { mode: WeaponModeType; key: string }[] = [
    { mode: 'machineGun', key: '1' },
    { mode: 'shotgun', key: '2' },
    { mode: 'inkBomb', key: '3' },
];

const WeaponSelectorMemo = memo(WeaponSelectorComponent);

export const WeaponSelector = WeaponSelectorMemo;

function WeaponSelectorComponent({ currentMode, ink, isFrenzy, onSelectMode, weaponStates }: WeaponSelectorProps) {

    // Local state for smooth countdown animation
    const [now, setNow] = React.useState(Date.now());

    React.useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full flex justify-center gap-2">
            {WEAPON_LIST.map(({ mode }) => {
                const config = WEAPON_MODES[mode];
                const canAfford = isFrenzy || ink >= config.cost;
                const isActive = currentMode === mode;

                // Per-Weapon State
                const wState = weaponStates ? weaponStates[mode] : { usage: 0, isOverheated: false, cooldownEndTime: 0 };
                const isOverheated = wState.isOverheated;

                const isLocked = !canAfford; // Only lock visually for cost, overheat has its own overlay

                // Usage Progress
                const max = config.maxDuration;
                let usagePercent = 0;
                if (max > 0) {
                    usagePercent = Math.min(100, (wState.usage / max) * 100);
                }

                // Cooldown Progress (for overheat overlay)
                let cooldownPercent = 0;
                const timeLeft = Math.max(0, wState.cooldownEndTime - now);
                const recovery = config.recoveryDuration || 3000;
                if (isOverheated && recovery > 0) {
                    cooldownPercent = (timeLeft / recovery) * 100;
                }

                return (
                    <button
                        key={mode}
                        className={`
                            relative flex flex-col items-center justify-between flex-1
                            aspect-square max-h-[56px] sm:max-h-[68px] rounded-lg transition-all duration-200 ease-out
                            ${isActive
                                ? 'bg-gradient-to-b from-[#E6F7FC] to-[#C5EAFA] border-2 border-[#4CC9F0] shadow-[0_0_12px_rgba(76,201,240,0.5)] scale-[1.02]'
                                : 'bg-gradient-to-b from-[#F8F9FA] to-[#E9ECEF] border border-slate-200 hover:border-slate-300'
                            }
                            ${(isLocked || isOverheated) ? 'opacity-50 grayscale' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'}
                        `}
                        onClick={() => canAfford && !isOverheated && onSelectMode(mode)}
                        disabled={isLocked || isOverheated}
                        title={`${config.name} - ${config.cost} ink (Usage: ${Math.round(usagePercent)}%)`}
                    >
                        {/* Cost Lock Overlay (Only if not overheated, priority to Overheat) */}
                        {isLocked && !isOverheated && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-lg z-10 w-full h-full">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#64748B">
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                </svg>
                            </div>
                        )}

                        {/* Overheat / Cooldown Overlay */}
                        {isOverheated && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg z-20 overflow-hidden animate-pulse w-full h-full">
                                <div className="absolute inset-0 bg-red-400/10 backdrop-blur-[1px]" />
                                <div className="relative z-30 text-white font-bold text-xs drop-shadow-md">
                                    {Math.ceil(timeLeft / 1000)}s
                                </div>
                                {/* Cooldown Progress Bar at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-900/20">
                                    <div
                                        className="h-full bg-red-500 transition-all duration-100 ease-linear"
                                        style={{ width: `${cooldownPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Usage Bar (Stamina) - Visible when not overheated and usage > 0 */}
                        {!isOverheated && usagePercent > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 z-0 w-full">
                                <div
                                    className={`h-full transition-all duration-100 ease-linear ${usagePercent > 80 ? 'bg-orange-500' : 'bg-blue-400'}`}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                        )}

                        {/* Weapon icon */}
                        <div className="flex-1 flex items-center justify-center pt-1 scale-90 sm:scale-100 z-0">
                            {WeaponIcons[mode](isActive)}
                        </div>

                        {/* Cost badge */}
                        <div className={`
                            flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 mb-1 sm:mb-1.5 rounded-full text-[9px] sm:text-[10px] font-bold
                            transition-colors duration-200 z-0
                            ${isActive
                                ? 'bg-[#4CC9F0]/25 text-[#2B9AB8]'
                                : 'bg-slate-200/80 text-slate-500'
                            }
                        `}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" opacity="0.8" className="sm:w-[9px] sm:h-[9px]">
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

