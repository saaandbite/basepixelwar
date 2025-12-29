'use client';

// Game Instructions Overlay

interface GameInstructionsProps {
    onStart: () => void;
}

export function GameInstructions({ onStart }: GameInstructionsProps) {
    return (
        <div className="absolute inset-0 z-30 bg-slate-900/80 flex flex-col items-center justify-center backdrop-blur-[2px] text-white">
            <div className="text-center max-w-[320px] p-5">
                <h1 className="font-display text-3xl font-bold mb-2 text-yellow-300 drop-shadow-md">
                    CHROMA DUEL
                </h1>
                <p className="text-sm mb-4 text-slate-200">
                    Capture territory by shooting your color bullets! Watch out for meteors that
                    flip territory.
                </p>

                {/* Cards Container with consistent spacing */}
                <div className="flex flex-col gap-3">
                    {/* VS Card */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
                        <div className="flex items-center justify-center gap-3 mb-1">
                            <div className="w-4 h-4 rounded-full bg-secondary/80"></div>
                            <span className="font-bold text-sm">YOU</span>
                            <span className="mx-1 text-slate-300 text-xs">VS</span>
                            <span className="font-bold text-sm">CPU</span>
                            <div className="w-4 h-4 rounded-full bg-primary/80"></div>
                        </div>
                        <p className="text-xs text-slate-300">Drag to aim and shoot automatically!</p>
                    </div>

                    {/* Power-ups Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-purple-900/40 rounded-xl border border-purple-500/30 flex flex-col items-center p-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-300 mb-1">
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                <path d="M5 3v4" />
                                <path d="M19 17v4" />
                                <path d="M3 5h4" />
                                <path d="M17 19h4" />
                            </svg>
                            <p className="text-xs font-bold">Power-ups</p>
                            <p className="text-[10px] text-slate-300">Collect abilities!</p>
                        </div>
                        <div className="bg-yellow-900/40 rounded-xl border border-yellow-500/30 flex flex-col items-center p-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-200 mb-1">
                                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3-3M15.5 14.5A2.5 2.5 0 0 1 13 12c0-1.38.5-2 1-3 1.072-2.143 2.072-2.143 3-3" />
                                <path d="M12 12h.01" />
                                <path d="M12 2a10 10 0 1 0 10 10" />
                                <path d="M22 12h-2" />
                            </svg>
                            <p className="text-xs font-bold">Meteor</p>
                            <p className="text-[10px] text-slate-300">Watch warnings!</p>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={onStart}
                        className="bg-gradient-to-r from-secondary to-blue-400 text-white rounded-xl font-bold text-base shadow-lg hover:from-secondary/90 hover:to-blue-400/90 transition-all active:scale-95 transform py-3 px-8 mt-1"
                    >
                        START GAME
                    </button>
                </div>

                <div className="mt-3 text-xs text-slate-400">
                    <p>Hold & Drag to Shoot</p>
                </div>
            </div>
        </div>
    );
}
