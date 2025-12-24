'use client';

// Game Instructions Overlay

interface GameInstructionsProps {
    onStart: () => void;
}

export function GameInstructions({ onStart }: GameInstructionsProps) {
    return (
        <div className="absolute inset-0 z-30 bg-slate-900/80 flex flex-col items-center justify-center backdrop-blur-[2px] text-white">
            <div className="text-center max-w-[320px] p-6">
                <h1 className="font-display text-4xl font-bold mb-4 text-yellow-300 animate-float">
                    CHROMA DUEL
                </h1>
                <p className="text-lg mb-6">
                    Capture territory by shooting your color bullets! Watch out for meteors that
                    flip territory.
                </p>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-secondary/80"></div>
                        <span className="font-bold">YOU</span>
                        <span className="mx-2 text-slate-300">VS</span>
                        <span className="font-bold">CPU</span>
                        <div className="w-6 h-6 rounded-full bg-primary/80"></div>
                    </div>
                    <p className="text-sm text-slate-200">Drag to aim and shoot automatically!</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-purple-900/40 rounded-xl p-3 border border-purple-500/30">
                        <span className="material-symbols-rounded text-purple-300 text-3xl mb-1 block">
                            star
                        </span>
                        <p className="text-sm font-bold">Power-ups</p>
                        <p className="text-xs text-slate-300">Collect special abilities!</p>
                    </div>
                    <div className="bg-yellow-900/40 rounded-xl p-3 border border-yellow-500/30">
                        <span className="material-symbols-rounded text-yellow-200 text-3xl mb-1 block">
                            radioactive
                        </span>
                        <p className="text-sm font-bold">Meteor</p>
                        <p className="text-xs text-slate-300">Watch the warnings!</p>
                    </div>
                </div>

                <button
                    onClick={onStart}
                    className="bg-gradient-to-r from-secondary to-blue-400 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:from-secondary/90 hover:to-blue-400/90 transition-all active:scale-95 transform"
                >
                    START GAME
                </button>

                <div className="mt-6 text-xs text-slate-400">
                    <p>Hold & Drag to Shoot • Collect power-ups</p>
                </div>
            </div>
        </div>
    );
}
