import { memo } from 'react';
import { GAME_DURATION } from '../lib/constants';

interface GameNavbarProps {
    scoreBlue: number;
    scoreRed: number;
    timeLeft: number;
}

export const GameNavbar = memo(function GameNavbar({
    scoreBlue,
    scoreRed,
    timeLeft,
}: GameNavbarProps) {
    // Format minutes:seconds
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <nav className="w-full max-w-[420px] p-2 flex items-center gap-3 z-10 shrink-0">
            {/* Player Avatar (Blue) */}
            <div className="relative group shrink-0">
                <div className="w-14 h-14 rounded-xl border-4 border-white shadow-lg overflow-hidden bg-blue-100 ring-2 ring-blue-400/50">
                    <img
                        src="/assets/avatars/avatar_blue.png"
                        alt="Player"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute -bottom-2 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm flex items-center gap-0.5">
                    <span>🏆</span> 23
                </div>
            </div>

            {/* Center Status Board */}
            <div className="flex-1 flex flex-col gap-1 mt-1">
                {/* Score Bar with Central Badge */}
                <div className="relative h-6 w-full flex rounded-full overflow-hidden border-2 border-slate-900 shadow-sm bg-slate-800">
                    {/* Blue Progress */}
                    <div
                        className="h-full bg-[#4CC9F0] transition-all duration-300 ease-out"
                        style={{ width: `${scoreBlue}%` }}
                    />
                    {/* Separator / Red Progress implied by remainder? Or explicit? */}
                    {/* Red Progress */}
                    <div
                        className="h-full bg-[#FF4D4D] transition-all duration-300 ease-out flex-1"
                    />

                    {/* Central Badge (Leading Score or just 50%?) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="bg-black/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-700 shadow-sm">
                            {scoreBlue > scoreRed ? scoreBlue : scoreRed}%
                        </div>
                    </div>
                </div>

                {/* Timer Row */}
                <div className="flex items-center justify-center gap-4 mt-1">
                    <span className="text-[10px] font-extrabold text-[#4CC9F0] uppercase tracking-wider">You</span>

                    <div className="bg-black text-white px-3 py-0.5 rounded-md font-mono font-bold text-sm tracking-widest border border-slate-700 shadow-sm">
                        {timeString}
                    </div>

                    <span className="text-[10px] font-extrabold text-[#FF4D4D] uppercase tracking-wider">Enemy</span>
                </div>
            </div>

            {/* Enemy Avatar (Red) */}
            <div className="relative group shrink-0">
                {/* Name removed from here */}
                <div className="w-14 h-14 rounded-xl border-4 border-white shadow-lg overflow-hidden bg-red-100 ring-2 ring-red-400/50">
                    <img
                        src="/assets/avatars/avatar_red.png"
                        alt="Enemy"
                        className="w-full h-full object-cover scale-x-[-1]" // Flip if needed to look left
                    />
                </div>
                <div className="absolute -bottom-2 -left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm flex items-center gap-0.5">
                    <span>🏆</span> 28
                </div>
            </div>
        </nav>
    );
});
