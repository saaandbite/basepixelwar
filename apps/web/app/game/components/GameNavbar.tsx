// import { GOLDEN_PIXEL_SPAWN_INTERVAL, GAME_DURATION } from '../lib/constants'; // Unused
import type { GoldenPixel } from '../types';
import { User, Swords } from 'lucide-react';

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
    // Unused props commented out to fix lint
    // goldenPixel,
    // lastGoldenPixelSpawn,
    // isFrenzy,
    // frenzyEndTime
}: GameNavbarProps) {
    // Format time mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Unused variables commented out
    // const elapsedTime = GAME_DURATION - timeLeft;
    // const timeSinceLastSpawn = elapsedTime - lastGoldenPixelSpawn;
    // const nextSpawnIn = Math.max(0, GOLDEN_PIXEL_SPAWN_INTERVAL - timeSinceLastSpawn);
    // const frenzyTimeLeft = isFrenzy ? Math.max(0, (frenzyEndTime - Date.now()) / 1000) : 0;

    return (
        <div className="w-full flex items-center justify-between px-3 py-2 bg-white/90 backdrop-blur-sm shadow-sm shrink-0 border-b border-slate-100">
            {/* Left: Blue Score */}
            <div className="flex items-center gap-2 min-w-[80px]">
                <div className="w-9 h-9 rounded-xl bg-[#4CC9F0] flex items-center justify-center shadow-sm border-2 border-white">
                    <User size={20} className="text-white" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs font-semibold text-slate-400 uppercase">You</span>
                    <span className="text-base font-bold text-[#4CC9F0] tabular-nums">{scoreBlue}%</span>
                </div>
            </div>

            {/* Center: Timer */}
            <div className="flex flex-col items-center">
                <div className="bg-slate-800 text-white font-mono font-bold text-lg px-3 py-0.5 rounded-lg shadow">
                    {timeString}
                </div>
            </div>

            {/* Right: Red Score */}
            <div className="flex items-center gap-2 min-w-[80px] justify-end">
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Enemy</span>
                    <span className="text-base font-bold text-[#FF6B6B] tabular-nums">{scoreRed}%</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#FF6B6B] flex items-center justify-center shadow-sm border-2 border-white">
                    <Swords size={20} className="text-white" />
                </div>
            </div>
        </div>
    );
}
