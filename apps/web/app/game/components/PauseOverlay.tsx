'use client';

// Pause Overlay Component

interface PauseOverlayProps {
    onResume: () => void;
    onRestart: () => void;
}

export function PauseOverlay({ onResume, onRestart }: PauseOverlayProps) {
    return (
        <div className="absolute inset-0 z-40 bg-slate-900/30 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white/80 p-6 rounded-3xl shadow-2xl text-center transform scale-100 transition-all border-4 border-white/50 backdrop-blur-sm">
                <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-rounded text-4xl text-secondary/80">pause</span>
                </div>
                <h2 className="font-display text-3xl font-bold text-slate-700 mb-2">GAME PAUSED</h2>
                <p className="text-slate-500 mb-6">Take a breath, territory awaits!</p>
                <button
                    onClick={onResume}
                    className="bg-gradient-to-r from-secondary to-blue-400 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-transform mt-4 w-full hover:from-secondary/90 hover:to-blue-400/90"
                >
                    RESUME GAME
                </button>
                <button
                    onClick={onRestart}
                    className="mt-3 text-slate-500 hover:text-slate-700 font-bold transition-colors"
                >
                    RESTART GAME
                </button>
            </div>
        </div>
    );
}
