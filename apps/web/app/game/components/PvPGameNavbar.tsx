import { User, Skull } from 'lucide-react';

interface PvPGameNavbarProps {
    scoreBlue: number;
    scoreRed: number;
    timeLeft: number;
    myTeam: 'blue' | 'red';
}

export function PvPGameNavbar({
    scoreBlue,
    scoreRed,
    timeLeft,
    myTeam
}: PvPGameNavbarProps) {
    // Format time mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Helper to determine if a score belongs to "You" or "Enemy"
    // Assuming Blue is always Bottom/You in this view layer due to rotation?
    // Actually, `myTeam` tells us who we are.
    // If myTeam is blue: Blue is YOU.
    // If myTeam is red: Red is YOU.

    // BUT the design typically puts YOU on the left?
    // Let's stick to Blue = Left, Red = Right for consistency with the bar colors often used,
    // OR we can swap them so "YOU" is always left.
    // The design shows "YOU" on the left with Blue icon.
    // If I am Red team, do I see myself as Red on the left?
    // Usually in these games, "YOU" is always Blue/Left locally?
    // But the server enforces Blue vs Red teams.
    // If I am Red, I am "Enemy" color? 
    // The prompt says "You" is Blue 44%, Enemy 56% Red in one shot.
    // Let's assume strict Team Blue = Left, Team Red = Right for now,
    // but label them "YOU" and "ENEMY" dynamically.

    const isBlueMe = myTeam === 'blue';

    return (
        <div className="w-full flex items-center justify-between px-4 py-3 bg-white shadow-sm border-b border-gray-100 z-10 sticky top-0">
            {/* Left: Blue Team */}
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md ${'bg-[#4CC9F0]'}`}>
                    <User size={20} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isBlueMe ? 'text-[#4CC9F0]' : 'text-gray-400'}`}>
                        {isBlueMe ? 'YOU' : 'ENEMY'}
                    </span>
                    <span className="text-xl font-black text-[#4CC9F0]">
                        {scoreBlue}%
                    </span>
                </div>
            </div>

            {/* Center: Timer */}
            <div className="bg-[#1E293B] text-white px-4 py-1.5 rounded-xl font-mono text-lg font-bold shadow-lg flex items-center gap-2">
                <span>{timeString}</span>
            </div>

            {/* Right: Red Team */}
            <div className="flex items-center gap-3 text-right">
                <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold uppercase tracking-wider ${!isBlueMe ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
                        {!isBlueMe ? 'YOU' : 'ENEMY'}
                    </span>
                    <span className="text-xl font-black text-[#FF6B6B]">
                        {scoreRed}%
                    </span>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md ${'bg-[#FF6B6B]'}`}>
                    <Skull size={20} fill="currentColor" />
                </div>
            </div>
        </div>
    );
}
