'use client';

import { useEffect, useRef } from 'react';

interface ComboEffectProps {
    show: boolean;
    comboStreak: number;
}

export function ComboEffect({ show, comboStreak }: ComboEffectProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (show && comboStreak >= 2 && containerRef.current) {
            // Trigger animation
            const element = containerRef.current;
            element.classList.remove('animate-combo-pop');
            void element.offsetWidth; // Trigger reflow
            element.classList.add('animate-combo-pop');
        }
    }, [show, comboStreak]);

    if (!show || comboStreak < 2) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400/90 text-white px-4 py-1 rounded-full font-display font-bold text-lg shadow-combo backdrop-blur-sm border border-yellow-500/50 z-30 pointer-events-none"
        >
            <div className="inline-block align-middle mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            </div>
            x{comboStreak} COMBO!
        </div>
    );
}