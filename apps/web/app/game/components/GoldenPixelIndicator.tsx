'use client';

// Golden Pixel Indicator Component - Shows golden pixel status and countdown

import { GOLDEN_PIXEL_SPAWN_INTERVAL, GAME_DURATION } from '../lib/constants';
import type { GoldenPixel } from '../types';

interface GoldenPixelIndicatorProps {
    goldenPixel: GoldenPixel | null;
    timeLeft: number;
    lastGoldenPixelSpawn: number;
    isFrenzy: boolean;
    frenzyEndTime: number;
}

export function GoldenPixelIndicator({
    goldenPixel,
    timeLeft,
    lastGoldenPixelSpawn,
    isFrenzy,
    frenzyEndTime,
}: GoldenPixelIndicatorProps) {
    const elapsedTime = GAME_DURATION - timeLeft;
    const timeSinceLastSpawn = elapsedTime - lastGoldenPixelSpawn;
    const nextSpawnIn = Math.max(0, GOLDEN_PIXEL_SPAWN_INTERVAL - timeSinceLastSpawn);
    const frenzyTimeLeft = isFrenzy ? Math.max(0, (frenzyEndTime - Date.now()) / 1000) : 0;

    // Show frenzy mode indicator
    if (isFrenzy) {
        return (
            <div className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                bg-gradient-to-br from-[#FF6B35] to-[#ff9500] text-white shadow-[0_0_20px_rgba(255,107,53,0.6)] animate-pulse
            `}>
                <div className="text-base animate-pulse">⚡</div>
                <div className="flex flex-col leading-[1.1]">
                    <span className="text-[11px] uppercase tracking-wider">FRENZY!</span>
                    <span className="text-sm font-bold">{frenzyTimeLeft.toFixed(1)}s</span>
                </div>
            </div>
        );
    }

    // Show active golden pixel
    if (goldenPixel && goldenPixel.active) {
        return (
            <div className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                bg-gradient-to-br from-[#FFD700] to-[#ffc107] text-[#7c5800] shadow-[0_0_15px_rgba(255,215,0,0.5)] animate-pulse
            `}>
                <div className="text-sm animate-[spin_1s_linear_infinite]">🪙</div>
                <span className="text-[11px] uppercase tracking-wider font-bold">CAPTURE!</span>
            </div>
        );
    }

    // Show countdown to next spawn
    return (
        <div className={`
            flex items-center px-2.5 py-1 rounded-full text-xs font-bold
            bg-gradient-to-br from-[#FFD700] via-[#FFC107] to-[#FFB300] 
            text-[#5a4000] shadow-md border border-[#FFE55C]
            drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]
        `}>
            <span className="tabular-nums">{Math.ceil(nextSpawnIn)}s</span>
        </div>
    );
}
