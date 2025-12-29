'use client';

// Powerup Indicator Component



interface PowerupIndicatorProps {
    shield: number;
    globalShield?: { active: boolean; team: 'blue' | 'red'; endTime: number } | null;
    footerStatus: { name: string; icon: string; color: string } | null;
}

export function PowerupIndicator({
    shield,
    footerStatus,
    globalShield,
}: PowerupIndicatorProps) {


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
            {shield > 0 && (
                <div className="absolute left-3 bottom-24 z-20 pointer-events-none">
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
            <footer className="bg-white/95 border-t border-slate-100/80 px-4 py-3 z-10 shrink-0 backdrop-blur-sm flex justify-between items-center gap-3 relative overflow-hidden h-12">
                {/* Hint Text (LEFT) - Simplified */}
                <div className="flex items-center gap-2 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2c0 .667-1 2-1 3.5s2 1.833 2 2.5c0 1.667-1.333 2-2 2H8.5c-.667 0-1.333-.333-2-1-.667-.667-1.5-3-2.5-3S3 6.5 3 7.5s1.333 5.5 3 6 1.333.5 2 1.5 2 2 3.5 2 2-.333 3.5-1.5 1-2.5 1-4-.5-4-1-5S14 1.333 14 2Z" />
                    </svg>
                    <span className="text-xs font-medium">Hold & drag to shoot</span>
                </div>

                {/* Power-up Notification (RIGHT) - Simplified */}
                <div className="flex items-center gap-1.5">
                    {footerStatus ? (
                        <div className={`flex items-center gap-1.5 ${footerStatus.color} animate-pulse`}>
                            {renderFooterIcon(footerStatus.icon)}
                            <span className="text-sm font-bold">{footerStatus.name}</span>
                        </div>
                    ) : shield > 0 ? (
                        <div className="flex items-center gap-1.5 text-green-500">
                            {renderFooterIcon('shield')}
                            <span className="text-sm font-bold">Shield x{shield}</span>
                        </div>
                    ) : globalShield?.active && globalShield.team === 'blue' ? (
                        <div className="flex items-center gap-1.5 text-green-500 animate-pulse">
                            {renderFooterIcon('shield')}
                            <span className="text-sm font-bold">Protected</span>
                        </div>
                    ) : (
                        <span className="text-xs text-slate-300 font-medium italic">No boosters</span>
                    )}
                </div>
            </footer>
        </>
    );
}
