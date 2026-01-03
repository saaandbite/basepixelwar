    import { Droplets, Flame, Bomb } from 'lucide-react';

interface PvPGameControlsProps {
    weaponMode: 'machineGun' | 'shotgun' | 'inkBomb';
    setWeaponMode: (mode: 'machineGun' | 'shotgun' | 'inkBomb') => void;
    inkLevel: number; // 0-100
    myTeam: 'blue' | 'red';
}

const WEAPONS = [
    {
        id: 'machineGun',
        icon: Droplets,
        cost: 1,
        color: 'text-blue-400',
        bgColor: 'bg-blue-50',
        selectedBorder: 'border-blue-400',
    },
    {
        id: 'shotgun',
        icon: Flame,
        cost: 5,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        selectedBorder: 'border-orange-500',
    },
    {
        id: 'inkBomb',
        icon: Bomb,
        cost: 20,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        selectedBorder: 'border-purple-600',
    }
] as const;

export function PvPGameControls({
    weaponMode,
    setWeaponMode,
    inkLevel,
    myTeam
}: PvPGameControlsProps) {

    // Team color for the ink bar
    const barColor = myTeam === 'blue' ? 'bg-[#4CC9F0]' : 'bg-[#FF6B6B]';

    return (
        <div className="flex flex-col gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-white/50">
            {/* Ink Bar */}
            <div className="flex items-center gap-3">
                <Droplets className="w-5 h-5 text-cyan-500 fill-cyan-500" />
                <div className="relative flex-1 h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${barColor}`}
                        style={{ width: `${inkLevel}%` }}
                    />
                </div>
                <span className="font-bold text-slate-600 w-8 text-right text-sm">{Math.round(inkLevel)}</span>
            </div>

            {/* Weapon Cards */}
            <div className="grid grid-cols-3 gap-3">
                {WEAPONS.map((w) => {
                    const isSelected = weaponMode === w.id;
                    const Icon = w.icon;
                    const canAfford = inkLevel >= w.cost;

                    return (
                        <button
                            key={w.id}
                            onClick={() => setWeaponMode(w.id as 'machineGun' | 'shotgun' | 'inkBomb')}
                            disabled={!canAfford}
                            className={`
                                relative flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all duration-200
                                ${isSelected
                                    ? `${w.bgColor} ${w.selectedBorder} shadow-md scale-105 z-10`
                                    : 'bg-white border-slate-100 hover:border-slate-200'
                                }
                                ${!canAfford ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                            `}
                        >
                            <Icon
                                className={`w-6 h-6 ${isSelected ? w.color : 'text-slate-400'} ${isSelected ? 'fill-current' : ''}`}
                            />
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                <span className="text-[10px]">💧</span>
                                {w.cost}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
