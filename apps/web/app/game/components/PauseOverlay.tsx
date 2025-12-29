'use client';

// Pause Overlay Component

interface PauseOverlayProps {
    onResume: () => void;
    onRestart: () => void;
}

export function PauseOverlay({ onResume, onRestart }: PauseOverlayProps) {
    return (
        <div className="absolute inset-0 z-40 bg-slate-900/30 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white/70 rounded-2xl shadow-2xl transform scale-100 transition-all border-2 border-white/50 backdrop-blur-sm flex flex-col gap-5 p-6">
                <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 w-11 h-11 rounded-full flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary/80">
                            <rect width="4" height="16" x="6" y="4" rx="1" />
                            <rect width="4" height="16" x="14" y="4" rx="1" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h2 className="font-display text-xl font-bold text-slate-700">GAME PAUSED</h2>
                        <p className="text-slate-500 text-xs">Take a breath, territory awaits!</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={onResume}
                        className="bg-gradient-to-r from-secondary to-blue-400 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform w-full hover:from-secondary/90 hover:to-blue-400/90 py-3 px-6"
                    >
                        RESUME GAME
                    </button>
                    <button
                        onClick={onRestart}
                        className="bg-slate-100 text-slate-600 rounded-xl font-bold active:scale-95 transition-transform w-full hover:bg-slate-200 border border-slate-200 py-2.5 px-6"
                    >
                        RESTART GAME
                    </button>
                </div>
            </div>
        </div>
    );
}
