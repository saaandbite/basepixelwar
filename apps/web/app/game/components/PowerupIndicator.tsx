'use client';

// Powerup Indicator Component

import { COLORS } from '../lib/constants';

interface PowerupIndicatorProps {
    burstShot: number;
    shield: number;
    callMeteor: number;
    showMeteorWarning: boolean;
    meteorTarget: { x: number; y: number } | null;
    footerStatus: { name: string; icon: string; color: string } | null;
}

export function PowerupIndicator({
    burstShot,
    shield,
    callMeteor,
    showMeteorWarning,
    meteorTarget,
    footerStatus,
}: PowerupIndicatorProps) {
    const hasPowerups = burstShot > 0 || shield > 0 || callMeteor > 0;

    return (
        <>
            {/* Powerup Container */}
            {hasPowerups && (
                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
                    {burstShot > 0 && (
                        <div className="bg-white rounded-xl p-2 shadow-md border border-slate-200 animate-powerup-bounce">
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-rounded text-2xl text-purple-600">
                                    auto_awesome
                                </span>
                                <span className="font-bold text-sm mt-1">{burstShot}</span>
                            </div>
                        </div>
                    )}
                    {shield > 0 && (
                        <div className="bg-white rounded-xl p-2 shadow-md border border-slate-200 animate-powerup-bounce">
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-rounded text-2xl text-green-600">
                                    shield
                                </span>
                                <span className="font-bold text-sm mt-1">{shield}</span>
                            </div>
                        </div>
                    )}
                    {callMeteor > 0 && (
                        <div className="bg-white rounded-xl p-2 shadow-md border border-slate-200 animate-powerup-bounce">
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-rounded text-2xl text-orange-600">
                                    radioactive
                                </span>
                                <span className="font-bold text-sm mt-1">{callMeteor}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Meteor Warning Indicator */}
            {showMeteorWarning && (
                <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
                    <div className="bg-red-500/90 text-white p-3 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-warning-flash border-2 border-white/50 backdrop-blur-sm">
                        <span className="material-symbols-rounded text-3xl block">meteor</span>
                    </div>
                </div>
            )}

            {/* Target Marker */}
            {meteorTarget && (
                <div
                    className="absolute w-20 h-20 rounded-full border-4 border-dashed border-accent/40 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 bg-accent/5 backdrop-blur-sm"
                    style={{ left: meteorTarget.x, top: meteorTarget.y }}
                >
                    <div className="absolute inset-0 border-2 border-dashed border-accent/20 rounded-full animate-pulse"></div>
                </div>
            )}

            {/* Footer */}
            <footer className="bg-white/95 border-t border-slate-100/80 px-4 py-2 z-10 shrink-0 backdrop-blur-sm flex justify-between items-center gap-3 relative overflow-hidden h-20">
                {/* Hint Text (LEFT) */}
                <div className="flex flex-col items-start justify-center text-slate-500 font-bold tracking-wide">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-xl">touch_app</span>
                        <span className="text-xs md:text-sm">CONTROLS</span>
                    </div>
                    <span className="text-[10px] md:text-xs text-slate-400 mt-0.5">
                        HOLD & DRAG TO SHOOT
                    </span>
                </div>

                {/* Power-up Notification (RIGHT) */}
                <div className="flex flex-col items-end justify-center">
                    {footerStatus ? (
                        <>
                            <span className="text-[10px] text-slate-400 font-bold mb-0.5">ACQUIRED</span>
                            <div className={`flex items-center gap-1 ${footerStatus.color} animate-pulse`}>
                                <span className="material-symbols-rounded text-lg">{footerStatus.icon}</span>
                                <span className="text-xs font-bold tracking-wide">{footerStatus.name}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="text-[10px] text-slate-400 font-bold mb-0.5">STATUS</span>
                            <span className="text-xs text-slate-300 font-bold tracking-wide">NO BOOSTERS</span>
                        </>
                    )}
                </div>
            </footer>
        </>
    );
}
