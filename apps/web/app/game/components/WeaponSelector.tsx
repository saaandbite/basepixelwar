'use client';

// Weapon Selector Component - Lets player switch between weapon modes

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
        <div className="flex gap-1.5 p-2 bg-white/95 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-black/5">
            {WEAPON_LIST.map(({ mode, key }) => {
                const config = WEAPON_MODES[mode];
                const canAfford = isFrenzy || ink >= config.cost;
                const isActive = currentMode === mode;

                return (
                    <button
                        key={mode}
                        className={`
                            relative w-[52px] h-[52px] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 ease-out
                            ${isActive
                                ? 'border-[#4CC9F0] bg-gradient-to-b from-[#4CC9F0]/15 to-[#4CC9F0]/25 shadow-[0_0_0_3px_rgba(76,201,240,0.2),0_4px_12px_rgba(76,201,240,0.3)]'
                                : 'border-slate-200 bg-gradient-to-b from-white to-slate-50'
                            }
                            ${!canAfford
                                ? 'opacity-40 cursor-not-allowed grayscale-[0.8]'
                                : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:border-[#4CC9F0]'
                            }
                            ${isActive ? '' : 'active:translate-y-0'}
                        `}
                        onClick={() => canAfford && onSelectMode(mode)}
                        disabled={!canAfford}
                        title={`${config.name} - ${config.cost} ink\n${config.description}`}
                    >
                        <span className="text-[20px] leading-none">{config.icon}</span>
                        <span className={`text-[10px] font-bold px-1 py-[1px] rounded ${isActive ? 'text-[#4CC9F0] bg-[#4CC9F0]/20' : 'text-slate-500 bg-black/5'}`}>
                            {config.cost}
                        </span>
                        <span className="absolute top-0.5 right-1 text-[9px] font-semibold text-slate-400 opacity-70">
                            {key}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
