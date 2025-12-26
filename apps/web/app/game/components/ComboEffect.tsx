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
            className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400/90 text-white px-4 py-1 rounded-full font-display font-bold text-lg shadow-combo backdrop-blur-sm border border-yellow-500/50 z-30"
        >
            <span className="material-symbols-rounded align-middle text-base mr-1">bolt</span> 
            x{comboStreak} COMBO!
        </div>
    );
}