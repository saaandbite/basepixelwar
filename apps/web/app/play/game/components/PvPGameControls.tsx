import { WeaponSelector } from './WeaponSelector';
import { Droplets } from 'lucide-react';

interface PvPGameControlsProps {
    weaponMode: 'machineGun' | 'shotgun' | 'inkBomb';
    setWeaponMode: (mode: 'machineGun' | 'shotgun' | 'inkBomb') => void;
    inkLevel: number; // 0-100
    myTeam: 'blue' | 'red';
    weaponStates?: Record<'machineGun' | 'shotgun' | 'inkBomb', {
        usage: number;
        isOverheated: boolean;
        cooldownEndTime: number;
    }>;
    isFrenzy?: boolean;
}

export function PvPGameControls({
    weaponMode,
    setWeaponMode,
    inkLevel,
    myTeam,
    weaponStates,
    isFrenzy = false
}: PvPGameControlsProps) {

    // Team color for the ink bar
    const barColor = myTeam === 'blue' ? 'bg-[#4CC9F0]' : 'bg-[#FF6B6B]';

    return (
        <div className="flex flex-col gap-2 sm:gap-4 px-3 py-2 sm:p-4 bg-white/50 backdrop-blur-sm rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-white/50">
            {/* Ink Bar */}
            <div className="flex items-center gap-1.5 sm:gap-3">
                <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 fill-cyan-500" />
                <div className="relative flex-1 h-2.5 sm:h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${barColor}`}
                        style={{ width: `${inkLevel}%` }}
                    />
                </div>
                <span className="font-bold text-slate-600 w-6 sm:w-8 text-right text-xs sm:text-sm">{Math.round(inkLevel)}</span>
            </div>

            {/* Weapon Selector (Shared Component) */}
            <WeaponSelector
                currentMode={weaponMode}
                onSelectMode={setWeaponMode}
                ink={inkLevel}
                isFrenzy={isFrenzy}
                weaponStates={weaponStates || {
                    machineGun: { usage: 0, isOverheated: false, cooldownEndTime: 0 },
                    shotgun: { usage: 0, isOverheated: false, cooldownEndTime: 0 },
                    inkBomb: { usage: 0, isOverheated: false, cooldownEndTime: 0 },
                }}
            />
        </div>
    );
}
