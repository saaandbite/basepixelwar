'use client';

import { useEffect, useRef } from 'react';

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

    let icon = '';
    let color = '';

    switch (type) {
        case 'burst':
            icon = '✨';
            color = 'text-purple-500';
            break;
        case 'shield':
            icon = '🛡️';
            color = 'text-green-500';
            break;
        case 'meteor':
            icon = '☄️';
            color = 'text-orange-500';
            break;
    }

    // Use position from props if available, otherwise use center of screen
    const left = x ? `${x}px` : '50%';
    const top = y ? `${y}px` : '50%';

    return (
        <div 
            className={`absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2 text-4xl px-4 py-2 rounded-xl shadow-lg ${color} animate-powerup-effect`}
            style={{ left, top }}
        >
            {icon}
        </div>
    );
}