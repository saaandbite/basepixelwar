import { GOLDEN_PIXEL_SPAWN_INTERVAL, GAME_DURATION } from '../lib/constants';
import type { GoldenPixel } from '../types';

interface GameNavbarProps {
    scoreBlue: number;
    scoreRed: number;
    timeLeft: number;
    goldenPixel?: GoldenPixel | null;
    lastGoldenPixelSpawn?: number;
    isFrenzy?: boolean;
    frenzyEndTime?: number;
}

export function GameNavbar({
    scoreBlue,
    scoreRed,
    timeLeft,
    goldenPixel,
    lastGoldenPixelSpawn = 0,
    isFrenzy = false,
    frenzyEndTime = 0,
}: GameNavbarProps) {
    // Format time mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Golden Pixel countdown
    const elapsedTime = GAME_DURATION - timeLeft;
    const timeSinceLastSpawn = elapsedTime - lastGoldenPixelSpawn;
    const nextSpawnIn = Math.max(0, GOLDEN_PIXEL_SPAWN_INTERVAL - timeSinceLastSpawn);
    const frenzyTimeLeft = isFrenzy ? Math.max(0, (frenzyEndTime - Date.now()) / 1000) : 0;

    // Determine status badge content
    let statusBadge = null;
    if (isFrenzy) {
        statusBadge = (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#FF6B35] to-[#ff9500] text-white animate-pulse">
                ⚡ {frenzyTimeLeft.toFixed(1)}s
            </div>
        );
    } else if (goldenPixel?.active) {
        statusBadge = (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#FFD700] to-[#ffc107] text-[#7c5800] animate-pulse">
                🪙 CAPTURE!
            </div>
        );
    } else {
        statusBadge = (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                🪙 {Math.ceil(nextSpawnIn)}s
            </div>
        );
    }

    return (
        <div className="w-full flex items-center justify-between px-3 py-2 bg-white/90 backdrop-blur-sm shadow-sm shrink-0 border-b border-slate-100">
            {/* Left: Blue Score */}
            <div className="flex items-center gap-2 min-w-[80px]">
                <div className="w-9 h-9 rounded-lg bg-[#4CC9F0] flex items-center justify-center shadow-sm border-2 border-white">
                    <span className="text-base">👤</span>
                </div>
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">You</span>
                    <span className="text-base font-bold text-[#4CC9F0] tabular-nums">{scoreBlue}%</span>
                </div>
            </div>

            {/* Center: Timer + Status */}
            <div className="flex flex-col items-center gap-1">
                <div className="bg-slate-800 text-white font-mono font-bold text-lg px-3 py-0.5 rounded-md shadow">
                    {timeString}
                </div>
                {statusBadge}
            </div>

            {/* Right: Red Score */}
            <div className="flex items-center gap-2 min-w-[80px] justify-end">
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Enemy</span>
                    <span className="text-base font-bold text-[#FF6B6B] tabular-nums">{scoreRed}%</span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#FF6B6B] flex items-center justify-center shadow-sm border-2 border-white">
                    <span className="text-base">😈</span>
                </div>
            </div>
        </div>
    );
}
