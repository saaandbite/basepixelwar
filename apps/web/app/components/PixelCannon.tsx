"use client";

import React from 'react';

// Props Interface
interface CannonProps {
    fire: boolean;
}

export default function PixelCannon({ fire }: CannonProps) {
    return (
        <div className={`relative w-24 h-24 md:w-32 md:h-32 transition-transform duration-100 ${fire ? 'translate-y-2 translate-x-1' : ''}`}>

            {/* Smoke Effect (Particles) */}
            {fire && (
                <div className="absolute top-0 right-0 -mr-10 -mt-10">
                    <div className="w-4 h-4 bg-gray-400 absolute animate-ping rounded-full opacity-75"></div>
                    <div className="w-6 h-6 bg-gray-300 absolute top-[-10px] right-[-10px] animate-ping delay-75 rounded-full opacity-50"></div>
                    <div className="w-8 h-8 bg-white absolute top-[-20px] right-[-10px] animate-pulse delay-100 rounded-full"></div>
                </div>
            )}

            {/* Muzzle Flash */}
            {fire && (
                <div className="absolute top-0 right-0 w-12 h-12 bg-[var(--pixel-yellow)] rounded-full blur-sm animate-pulse z-20 transform translate-x-4 -translate-y-4 shadow-[0_0_20px_#F59E0B]" />
            )}

            {/* Cannon Body (SVG Pixel Art) */}
            <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-lg filter"
            >
                {/* Wheel (Rounded for Modern Retro) */}
                <circle cx="20" cy="50" r="12" fill="#4B5563" stroke="white" strokeWidth="4" />
                <circle cx="20" cy="50" r="4" fill="#9CA3AF" />

                {/* Barrel */}
                <path d="M16 40L48 16L56 24L24 48L16 40Z" fill="#1F2937" stroke="white" strokeWidth="4" />

                {/* Barrel Highlight */}
                <path d="M22 42L48 22" stroke="#4B5563" strokeWidth="4" strokeLinecap="round" />

                {/* Base / Mount */}
                <path d="M20 50L36 40" stroke="#374151" strokeWidth="6" strokeLinecap="round" />
            </svg>
        </div>
    );
}
