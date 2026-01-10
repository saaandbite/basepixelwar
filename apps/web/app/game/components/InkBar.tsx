'use client';

// Ink Bar Component - Compact progress bar without card wrapper

import { memo } from 'react';
import { COLORS } from '../lib/constants';
import { Infinity as InfinityIcon } from 'lucide-react';

interface InkBarProps {
    ink: number;
    maxInk: number;
    isFrenzy: boolean;
    frenzyEndTime: number;
}

const InkBarMemo = memo(InkBarComponent);

export const InkBar = InkBarMemo;

function InkBarComponent({ ink, maxInk,
    isFrenzy,
    // frenzyEndTime // Unused
}: InkBarProps) {
    const percentage = (ink / maxInk) * 100;
    // const frenzyTimeLeft = isFrenzy ? Math.max(0, (frenzyEndTime - Date.now()) / 1000) : 0; // Usage removed

    return (
        <div className="w-full flex items-center gap-2">
            {/* Ink icon */}
            <div className="shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill={isFrenzy ? COLORS.frenzy : COLORS.ink}>
                    <path d="M12 2C12 2 4 10 4 15C4 19.4 7.6 23 12 23C16.4 23 20 19.4 20 15C20 10 12 2 12 2Z" />
                </svg>
            </div>

            {/* Progress bar */}
            <div className="flex-1 h-3 bg-slate-200 rounded-lg overflow-hidden">
                <div
                    className={`h-full rounded-lg transition-all duration-100 ease-out ${isFrenzy ? 'animate-frenzy bg-[length:200%_100%]' : ''}`}
                    style={{
                        width: `${isFrenzy ? 100 : percentage}%`,
                        background: isFrenzy
                            ? `linear-gradient(90deg, ${COLORS.frenzy}, #ff9500, ${COLORS.frenzy})`
                            : `linear-gradient(90deg, ${COLORS.ink}, #3b82f6)`
                    }}
                />
            </div>

            {/* Ink value */}
            <div className={`shrink-0 text-xs font-bold tabular-nums min-w-[32px] text-right ${isFrenzy ? 'text-[#FF6B35]' : 'text-slate-600'}`}>
                {isFrenzy ? (
                    <InfinityIcon size={14} className="animate-pulse" />
                ) : (
                    <span>{Math.floor(ink)}</span>
                )}
            </div>
        </div>
    );
}
