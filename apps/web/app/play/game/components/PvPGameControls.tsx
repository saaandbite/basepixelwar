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
            <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-500 fill-cyan-500 shrink-0" />
                <div className="relative flex-1 h-3 bg-slate-200 rounded-lg overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-lg transition-all duration-100 ease-out ${barColor}`}
                        style={{ width: `${inkLevel}%` }}
                    />
                </div>
                <span className="font-bold text-slate-600 min-w-[32px] text-right text-xs tabular-nums shrink-0">{Math.round(inkLevel)}</span>
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
