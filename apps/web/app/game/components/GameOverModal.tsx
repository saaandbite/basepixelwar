'use client';

// Game Over Modal Component

interface GameOverModalProps {
    blueScore: number;
    maxCombo: number;
    powerupsCollected: number;
    onPlayAgain: () => void;
}

export function GameOverModal({
    blueScore,
    maxCombo,
    powerupsCollected,
    onPlayAgain,
}: GameOverModalProps) {
    // Determine result
    let title: string;
    let titleClass: string;
    let icon: string;

    if (blueScore > 60) {
        title = 'EPIC VICTORY!';
        titleClass = 'font-display text-4xl font-bold text-secondary mb-1';
        icon = '🏆';
    } else if (blueScore > 50) {
        title = 'GREAT WIN!';
        titleClass = 'font-display text-4xl font-bold text-blue-600 mb-1';
        icon = '🎉';
    } else if (blueScore > 40) {
        title = 'CLOSE MATCH!';
        titleClass = 'font-display text-4xl font-bold text-yellow-600 mb-1';
        icon = '🤝';
    } else if (blueScore > 25) {
        title = 'DEFEAT';
        titleClass = 'font-display text-4xl font-bold text-primary mb-1';
        icon = '💔';
    } else {
        title = 'CRUSHED';
        titleClass = 'font-display text-4xl font-bold text-red-600 mb-1';
        icon = '💀';
    }

    return (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-slate-900/70 to-blue-900/70 flex items-center justify-center backdrop-blur-sm transition-opacity opacity-100">
            <div className="bg-white/95 p-7 rounded-[32px] shadow-2xl text-center max-w-[320px] w-full transform scale-100 transition-transform duration-300 backdrop-blur-sm border border-white/50">
                <div className="text-7xl mb-3 animate-bounce">{icon}</div>
                <h2 className={titleClass}>{title}</h2>
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-xl p-4 mb-5 border border-slate-200">
                    <p className="text-slate-400 font-bold text-sm mb-1">FINAL SCORE</p>
                    <p className="text-2xl font-bold text-secondary">
                        BLUE TERRITORY: <span className="text-secondary">{blueScore}%</span>
                    </p>
                    <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-secondary to-blue-400"
                            style={{ width: `${blueScore}%` }}
                        ></div>
                    </div>
                </div>
                <div className="flex gap-3 mb-6">
                    <div className="flex-1 bg-slate-50 rounded-xl p-2 border border-slate-200">
                        <p className="text-xs text-slate-500">MAX COMBO</p>
                        <p className="font-bold text-lg text-yellow-500">x{maxCombo}</p>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl p-2 border border-slate-200">
                        <p className="text-xs text-slate-500">POWER-UPS</p>
                        <p className="font-bold text-lg text-purple-600">{powerupsCollected}</p>
                    </div>
                </div>
                <button
                    onClick={onPlayAgain}
                    className="w-full bg-gradient-to-r from-slate-800 to-slate-700 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-600 flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-rounded text-xl">replay</span>
                    PLAY AGAIN
                </button>
            </div>
        </div>
    );
}
