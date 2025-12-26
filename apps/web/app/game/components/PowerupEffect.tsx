'use client';

import React from 'react';
import { } from 'react';

interface PowerupEffectProps {
    show: boolean;
    type: 'burst' | 'shield' | 'meteor';
    x: number;
    y: number;
}

export function PowerupEffect({ show, type, x, y }: PowerupEffectProps) {
    if (!show) {
        return null;
    }

    let iconSvg: React.ReactElement;
    let color = '';

    switch (type) {
        case 'burst':
            iconSvg = (
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
            );
            color = 'text-purple-500';
            break;
        case 'shield':
            iconSvg = (
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                </svg>
            );
            color = 'text-green-500';
            break;
        case 'meteor':
            iconSvg = (
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3-3M15.5 14.5A2.5 2.5 0 0 1 13 12c0-1.38.5-2 1-3 1.072-2.143 2.072-2.143 3-3" />
                    <path d="M12 12h.01" />
                    <path d="M12 2a10 10 0 1 0 10 10" />
                    <path d="M22 12h-2" />
                </svg>
            );
            color = 'text-orange-500';
            break;
    }

    // Use position from props if available, otherwise use center of screen
    const left = x ? `${x}px` : '50%';
    const top = y ? `${y}px` : '50%';

    return (
        <div
            className={`absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-xl shadow-lg ${color} animate-powerup-effect`}
            style={{ left, top }}
        >
            {iconSvg}
        </div>
    );
}