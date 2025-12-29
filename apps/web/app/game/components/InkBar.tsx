'use client';

// Ink Bar Component - Shows player's ink level

import { memo } from 'react';
import { COLORS, WEAPON_MODES } from '../lib/constants';

interface InkBarProps {
    ink: number;
    maxInk: number;
    isFrenzy: boolean;
    frenzyEndTime: number;
}

const InkBarMemo = memo(InkBarComponent);

export const InkBar = InkBarMemo;

function InkBarComponent({ ink, maxInk, isFrenzy, frenzyEndTime }: InkBarProps) {
    const percentage = (ink / maxInk) * 100;
    const frenzyTimeLeft = isFrenzy ? Math.max(0, (frenzyEndTime - Date.now()) / 1000) : 0;

    return (
        <div className="w-full px-2">
            <div className="flex items-center gap-1.5 bg-white/90 rounded-xl px-2.5 py-1.5 shadow-sm border border-cyan-400/30">
                {/* Ink icon */}
                <div className="shrink-0 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isFrenzy ? COLORS.frenzy : COLORS.ink}>
                        <path d="M12 2C12 2 4 10 4 15C4 19.4 7.6 23 12 23C16.4 23 20 19.4 20 15C20 10 12 2 12 2ZM12 21C8.7 21 6 18.3 6 15C6 11.4 11 5.8 12 4.5C13 5.8 18 11.4 18 15C18 18.3 15.3 21 12 21Z" />
                        <circle cx="12" cy="15" r="4" opacity="0.6" />
                    </svg>
                </div>

                {/* Ink bar */}
                <div className="flex-1 h-5 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg relative overflow-hidden border border-black/5">
                    <div
                        className={`h-full rounded-md transition-all duration-100 ease-out shadow-[0_0_8px_rgba(76,201,240,0.4)] ${isFrenzy ? 'animate-frenzy bg-[length:200%_100%]' : ''}`}
                        style={{
                            width: `${isFrenzy ? 100 : percentage}%`,
                            background: isFrenzy
                                ? `linear-gradient(90deg, ${COLORS.frenzy}, #ff9500, ${COLORS.frenzy})`
                                : `linear-gradient(90deg, ${COLORS.ink}, #3b82f6)`
                        }}
                    />

                    {/* Cost markers */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                            style={{ left: `${(WEAPON_MODES.machineGun.cost / maxInk) * 100}%` }}
                            title="Machine Gun: 1"
                        />
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                            style={{ left: `${(WEAPON_MODES.shotgun.cost / maxInk) * 100}%` }}
                            title="Shotgun: 5"
                        />
                        <div
                            className="absolute top-0 bottom-0 w-[3px] bg-white/80"
                            style={{ left: `${(WEAPON_MODES.inkBomb.cost / maxInk) * 100}%` }}
                            title="Ink Bomb: 20"
                        />
                    </div>
                </div>

                {/* Ink value */}
                <div className={`shrink-0 min-w-10 text-right text-sm font-bold tabular-nums ${isFrenzy ? 'text-[#FF6B35]' : 'text-slate-700'}`}>
                    {isFrenzy ? (
                        <span className="animate-pulse">∞ {frenzyTimeLeft.toFixed(1)}s</span>
                    ) : (
                        <span>{Math.floor(ink)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
