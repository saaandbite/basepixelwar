"use client";

import React, { useEffect, useState } from 'react';

// CSS-only cloud shapes using box-shadow to be lightweight
const CLOUD_VARIANTS = [
    // Variant 1: Classic Puff
    `
    40px 0px 0 -10px #FFF, 
    70px 0px 0 -10px #FFF, 
    20px 20px 0 -10px #FFF, 
    50px 20px 0 -10px #FFF, 
    80px 20px 0 -10px #FFF,
    30px 40px 0 -10px #FFF, 
    60px 40px 0 -10px #FFF
  `,
    // Variant 2: Wide & Flat
    `
     30px 10px 0 -10px #FFF, 
     60px 10px 0 -10px #FFF, 
     90px 10px 0 -10px #FFF,
     20px 30px 0 -10px #FFF, 
     50px 30px 0 -10px #FFF, 
     80px 30px 0 -10px #FFF, 
     110px 30px 0 -10px #FFF
  `
];

interface Cloud {
    id: number;
    top: number;
    left: number;
    scale: number;
    speed: number;
    opacity: number;
    variant: number;
}

interface Star {
    id: number;
    top: number;
    left: number;
    delay: number;
}

export default function LivingBackground() {
    const [clouds, setClouds] = useState<Cloud[]>([]);
    const [stars, setStars] = useState<Star[]>([]);

    useEffect(() => {
        // Generate static stars
        const newStars = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 3
        }));
        setStars(newStars);

        // Initial Clouds
        const initialClouds = Array.from({ length: 6 }, (_, i) => ({
            id: i,
            top: Math.random() * 60, // Only top 60% of screen
            left: Math.random() * 100,
            scale: 0.5 + Math.random() * 1, // 0.5x to 1.5x
            speed: 20 + Math.random() * 40, // 20s to 60s
            opacity: 0.1 + Math.random() * 0.2,
            variant: Math.floor(Math.random() * CLOUD_VARIANTS.length)
        }));
        setClouds(initialClouds);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[var(--pixel-bg)]">

            {/* 0. Deep Gradient Overlay for Atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B15] via-[#1a1a2e] to-[#2a2a40] opacity-100" />

            {/* 1. Stars Layer */}
            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                    style={{
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        animationDelay: `${star.delay}s`
                    }}
                />
            ))}

            {/* 2. Clouds Layer */}
            {clouds.map((cloud) => (
                <div
                    key={cloud.id}
                    className="absolute"
                    style={{
                        top: `${cloud.top}%`,
                        left: `${cloud.left}%`,
                        opacity: cloud.opacity,
                        transform: `scale(${cloud.scale})`,
                        animation: `drift ${cloud.speed}s linear infinite`,
                        filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.2))' // Hard shadow for cloud
                    }}
                >
                    {/* Pixel Cloud Construction using Box Shadow */}
                    <div
                        style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: 'transparent',
                            boxShadow: CLOUD_VARIANTS[cloud.variant]
                        }}
                    />
                </div>
            ))}

            {/* 3. Grid Floor (Retro Perspective) */}
            <div
                className="absolute bottom-0 w-full h-[30vh] opacity-20"
                style={{
                    background: 'linear-gradient(transparent 0%, var(--pixel-blue) 100%)',
                    maskImage: 'linear-gradient(to top, black, transparent)',
                    WebkitMaskImage: 'linear-gradient(to top, black, transparent)'
                }}
            >
                {/* Moving Grid Lines */}
                <div className="w-full h-full animate-grid-move"
                    style={{
                        backgroundSize: '40px 40px',
                        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        transform: 'perspective(500px) rotateX(60deg) translateY(0)'
                    }}
                />
            </div>

            <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }

        @keyframes drift {
          from { transform: translateX(-10vw) scale(var(--scale)); }
          to { transform: translateX(110vw) scale(var(--scale)); }
        }
        
        @keyframes grid-move {
            0% { background-position: 0 0; }
            100% { background-position: 0 40px; }
        }
        .animate-grid-move {
            animation: grid-move 2s linear infinite;
        }
      `}</style>
        </div>
    );
}
