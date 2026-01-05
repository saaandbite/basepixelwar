'use client';

// Powerup Indicator Component - Only shows floating indicators, no footer



interface PowerupIndicatorProps {
    shield: number;
}

export function PowerupIndicator({
    shield,
}: PowerupIndicatorProps) {
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
        </>
    );
}
