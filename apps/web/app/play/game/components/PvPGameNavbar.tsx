import { User, Skull } from 'lucide-react';

interface PvPGameNavbarProps {
    scoreBlue: number;
    scoreRed: number;
    timeLeft: number;
    myTeam: 'blue' | 'red';
    blueWallet?: string | null;
    redWallet?: string | null;
}

function shortenAddress(address?: string | null) {
    if (!address) return 'UNKNOWN';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PvPGameNavbar({
    scoreBlue,
    scoreRed,
    timeLeft,
    myTeam,
    blueWallet,
    redWallet
}: PvPGameNavbarProps) {
    // Format time mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const isBlueMe = myTeam === 'blue';

    return (
        <div className="w-full flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-3 bg-white shadow-sm border-b border-gray-100 z-10 sticky top-0">
            {/* Left: Blue Team */}
            <div className="flex items-center gap-1.5 sm:gap-3">
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shadow-md ${'bg-[#4CC9F0]'}`}>
                    <User size={14} className="sm:w-5 sm:h-5" fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider ${isBlueMe ? 'text-[#4CC9F0]' : 'text-gray-400'}`}>
                        {shortenAddress(blueWallet)} {isBlueMe && <span className="text-[8px] sm:text-[10px]">(You)</span>}
                    </span>
                    <span className="text-base sm:text-xl font-black text-[#4CC9F0] leading-none">
                        {scoreBlue}%
                    </span>
                </div>
            </div>

            {/* Center: Timer */}
            <div className="bg-[#1E293B] text-white px-2.5 py-0.5 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl font-mono text-sm sm:text-lg font-bold shadow-lg flex items-center gap-2">
                <span>{timeString}</span>
            </div>

            {/* Right: Red Team */}
            <div className="flex items-center gap-1.5 sm:gap-3 text-right">
                <div className="flex flex-col items-end">
                    <span className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider ${!isBlueMe ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
                        {shortenAddress(redWallet)} {!isBlueMe && <span className="text-[8px] sm:text-[10px]">(You)</span>}
                    </span>
                    <span className="text-base sm:text-xl font-black text-[#FF6B6B] leading-none">
                        {scoreRed}%
                    </span>
                </div>
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shadow-md ${'bg-[#FF6B6B]'}`}>
                    <Skull size={14} className="sm:w-5 sm:h-5" fill="currentColor" />
                </div>
            </div>
        </div>
    );
}
