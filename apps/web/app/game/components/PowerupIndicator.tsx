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

    const renderFooterIcon = (iconName: string) => {
        switch (iconName) {
            case 'auto_awesome':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                );
            case 'shield':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                    </svg>
                );
            case 'radioactive':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3-3M15.5 14.5A2.5 2.5 0 0 1 13 12c0-1.38.5-2 1-3 1.072-2.143 2.072-2.143 3-3" />
                        <path d="M12 12h.01" />
                        <path d="M12 2a10 10 0 1 0 10 10" />
                        <path d="M22 12h-2" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {/* Powerup Indicators - Symmetrical Left and Right Sides */}
            {burstShot > 0 && (
                <div className="absolute left-3 bottom-24 z-20">
                    <div className="bg-white rounded-xl w-14 h-14 shadow-md border border-slate-200 animate-powerup-bounce flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                            </svg>
                            <span className="font-bold text-xs">{burstShot}</span>
                        </div>
                    </div>
                </div>
            )}
            {shield > 0 && (
                <div className="absolute left-[72px] bottom-24 z-20">
                    <div className="bg-white rounded-xl w-14 h-14 shadow-md border border-slate-200 animate-powerup-bounce flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                            </svg>
                            <span className="font-bold text-xs">{shield}</span>
                        </div>
                    </div>
                </div>
            )}
            {callMeteor > 0 && (
                <div className="absolute right-3 bottom-24 z-20">
                    <div className="bg-white rounded-xl w-14 h-14 shadow-md border border-slate-200 animate-powerup-bounce flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3-3M15.5 14.5A2.5 2.5 0 0 1 13 12c0-1.38.5-2 1-3 1.072-2.143 2.072-2.143 3-3" />
                                <path d="M12 12h.01" />
                                <path d="M12 2a10 10 0 1 0 10 10" />
                                <path d="M22 12h-2" />
                            </svg>
                            <span className="font-bold text-xs">{callMeteor}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Meteor Warning Indicator */}
            {showMeteorWarning && (
                <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
                    <div className="bg-red-500/90 text-white p-3 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-warning-flash border-2 border-white/50 backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m13 2 9 6.265L12 22 2 8.265 11 2Z" />
                        </svg>
                    </div>
                </div>
            )}


            {/* Target Marker - Disabled: Canvas already renders this */}
            {/* {meteorTarget && (
                <div
                    className="absolute w-20 h-20 rounded-full border-4 border-dashed border-accent/40 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 bg-accent/5"
                    style={{ left: meteorTarget.x, top: meteorTarget.y }}
                >
                    <div className="absolute inset-0 border-2 border-dashed border-accent/20 rounded-full animate-pulse"></div>
                </div>
            )} */}


            {/* Footer */}
            <footer className="bg-white/95 border-t border-slate-100/80 px-4 py-2 z-10 shrink-0 backdrop-blur-sm flex justify-between items-center gap-3 relative overflow-hidden h-14">
                {/* Hint Text (LEFT) */}
                <div className="flex flex-col items-start justify-center text-slate-500 font-bold tracking-wide">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2c0 .667-1 2-1 3.5s2 1.833 2 2.5c0 1.667-1.333 2-2 2H8.5c-.667 0-1.333-.333-2-1-.667-.667-1.5-3-2.5-3S3 6.5 3 7.5s1.333 5.5 3 6 1.333.5 2 1.5 2 2 3.5 2 2-.333 3.5-1.5 1-2.5 1-4-.5-4-1-5S14 1.333 14 2Z" />
                        </svg>
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
                                {renderFooterIcon(footerStatus.icon)}
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
