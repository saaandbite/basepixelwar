'use client';

// Weapon Selector Component - Card-based weapon selection

import { memo } from 'react';
import { WEAPON_MODES, type WeaponModeType } from '../lib/constants';
import type { WeaponMode } from '../types';

interface WeaponSelectorProps {
    currentMode: WeaponMode;
    ink: number;
    isFrenzy: boolean;
    onSelectMode: (mode: WeaponMode) => void;
}

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
                            aspect-square max-h-[60px] rounded-xl transition-all duration-150 ease-out
                            ${isActive
                                ? 'bg-gradient-to-b from-[#E6F7FC] to-[#D0F0FA] border-2 border-[#4CC9F0] shadow-[0_0_8px_rgba(76,201,240,0.4)]'
                                : 'bg-gradient-to-b from-[#F8F9FA] to-[#E9ECEF] border border-slate-200'
                            }
                            ${isLocked ? 'opacity-60' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}
                        `}
                        onClick={() => canAfford && onSelectMode(mode)}
                        disabled={isLocked}
                        title={`${config.name} - ${config.cost} ink`}
                    >
                        {/* Lock icon for locked weapons */}
                        {isLocked && (
                            <div className="absolute top-1 right-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="#9CA3AF">
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                </svg>
                            </div>
                        )}

                        {/* Weapon icon */}
                        <div className="flex-1 flex items-center justify-center">
                            <span className="text-[22px] leading-none">{config.icon}</span>
                        </div>

                        {/* Cost badge */}
                        <div className={`
                            flex items-center gap-0.5 px-1.5 py-0.5 mb-1 rounded-full text-[9px] font-bold
                            ${isActive
                                ? 'bg-[#4CC9F0]/20 text-[#3BA8C9]'
                                : 'bg-slate-200/80 text-slate-500'
                            }
                        `}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
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
