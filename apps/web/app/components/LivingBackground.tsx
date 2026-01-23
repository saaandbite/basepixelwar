"use client";

import React, { useEffect, useState } from 'react';

// Primary: #ff8ba7 (Coral Pink)
// Accent colors derived for harmony:
// - Light: #ffc6c7 (Soft Pink)
// - Lighter: #ffe4e6 (Blush)
// - Deep: #c44569 (Deep Rose)
// - Dark: #903749 (Berry)
// - Warm: #ff6b9d (Hot Pink)

// CSS-only cloud shapes using box-shadow - now with pink/peach tones
const CLOUD_VARIANTS = [
    // Variant 1: Classic Puff - Soft Pink/Peach
    `
    40px 0px 0 -10px rgba(255,198,199,0.8), 
    70px 0px 0 -10px rgba(255,228,230,0.9), 
    20px 20px 0 -10px rgba(255,198,199,0.7), 
    50px 20px 0 -10px rgba(255,255,255,0.6), 
    80px 20px 0 -10px rgba(255,228,230,0.8),
    30px 40px 0 -10px rgba(255,198,199,0.7), 
    60px 40px 0 -10px rgba(255,255,255,0.5)
  `,
    // Variant 2: Wide & Flat - Warm tones
    `
     30px 10px 0 -10px rgba(255,228,230,0.8), 
     60px 10px 0 -10px rgba(255,198,199,0.7), 
     90px 10px 0 -10px rgba(255,255,255,0.6),
     20px 30px 0 -10px rgba(255,198,199,0.8), 
     50px 30px 0 -10px rgba(255,228,230,0.7), 
     80px 30px 0 -10px rgba(255,255,255,0.5), 
     110px 30px 0 -10px rgba(255,198,199,0.6)
  `,
    // Variant 3: Fluffy - Mixed warm
    `
     20px 0px 0 -10px rgba(255,107,157,0.4), 
     50px 5px 0 -10px rgba(255,198,199,0.7), 
     80px 0px 0 -10px rgba(255,228,230,0.8),
     35px 25px 0 -10px rgba(255,255,255,0.6), 
     65px 25px 0 -10px rgba(255,198,199,0.7)
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
    color: string;
    size: number;
}

interface FloatingOrb {
    id: number;
    top: number;
    left: number;
    size: number;
    duration: number;
    delay: number;
}

// Sparkle colors that complement #ff8ba7
const SPARKLE_COLORS = [
    '#ffffff',      // Pure white
    '#ffc6c7',      // Soft pink
    '#ffe4e6',      // Blush
    '#fff0f3',      // Near white pink
    '#ff8ba7',      // Main coral pink
];

export default function LivingBackground() {
    const [clouds, setClouds] = useState<Cloud[]>([]);
    const [stars, setStars] = useState<Star[]>([]);
    const [orbs, setOrbs] = useState<FloatingOrb[]>([]);

    useEffect(() => {
        // Generate sparkle stars with varying colors and sizes
        const newStars = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 4,
            color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)] ?? '#ffffff',
            size: 2 + Math.random() * 4
        }));
        setStars(newStars);

        // Generate floating orbs for ambient glow
        const newOrbs = Array.from({ length: 8 }, (_, i) => ({
            id: i,
            top: 10 + Math.random() * 80,
            left: Math.random() * 100,
            size: 100 + Math.random() * 200,
            duration: 15 + Math.random() * 20,
            delay: Math.random() * 10
        }));
        setOrbs(newOrbs);

        // Initial Clouds
        const initialClouds = Array.from({ length: 8 }, (_, i) => ({
            id: i,
            top: Math.random() * 50, // Top 50% of screen
            left: Math.random() * 100,
            scale: 0.6 + Math.random() * 1.2,
            speed: 30 + Math.random() * 50,
            opacity: 0.15 + Math.random() * 0.25,
            variant: Math.floor(Math.random() * CLOUD_VARIANTS.length)
        }));
        setClouds(initialClouds);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">

            {/* 0. Main Gradient Background - Coral Pink Theme */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,139,167,0.5) 0%, transparent 50%),
                        radial-gradient(ellipse 60% 40% at 80% 80%, rgba(196,69,105,0.3) 0%, transparent 40%),
                        radial-gradient(ellipse 70% 50% at 20% 90%, rgba(255,107,157,0.25) 0%, transparent 45%),
                        linear-gradient(180deg, 
                            #ff8ba7 0%, 
                            #e77a95 25%, 
                            #c44569 50%, 
                            #903749 75%, 
                            #5c2434 100%
                        )
                    `
                }}
            />

            {/* 1. Floating Orbs for Ambient Glow */}
            {orbs.map((orb) => (
                <div
                    key={`orb-${orb.id}`}
                    className="absolute rounded-full animate-float-orb"
                    style={{
                        top: `${orb.top}%`,
                        left: `${orb.left}%`,
                        width: `${orb.size}px`,
                        height: `${orb.size}px`,
                        background: `radial-gradient(circle, rgba(255,198,199,0.4) 0%, rgba(255,139,167,0.1) 50%, transparent 70%)`,
                        filter: 'blur(30px)',
                        animationDuration: `${orb.duration}s`,
                        animationDelay: `${orb.delay}s`
                    }}
                />
            ))}

            {/* 2. Sparkle Stars Layer */}
            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full animate-sparkle"
                    style={{
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        backgroundColor: star.color,
                        boxShadow: `0 0 ${star.size * 2}px ${star.color}`,
                        animationDelay: `${star.delay}s`
                    }}
                />
            ))}

            {/* 3. Clouds Layer */}
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
                        filter: 'drop-shadow(2px 4px 6px rgba(144,55,73,0.3))'
                    }}
                >
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

            {/* 4. Grid Floor (Retro Perspective) - Pink Theme */}
            <div
                className="absolute bottom-0 w-full h-[35vh] opacity-30"
                style={{
                    background: 'linear-gradient(transparent 0%, rgba(255,139,167,0.5) 60%, rgba(196,69,105,0.8) 100%)',
                    maskImage: 'linear-gradient(to top, black, transparent)',
                    WebkitMaskImage: 'linear-gradient(to top, black, transparent)'
                }}
            >
                <div className="w-full h-full animate-grid-move"
                    style={{
                        backgroundSize: '50px 50px',
                        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
                        transform: 'perspective(500px) rotateX(60deg) translateY(0)'
                    }}
                />
            </div>

            {/* 5. Subtle Vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    boxShadow: 'inset 0 0 150px 50px rgba(92,36,52,0.4)'
                }}
            />

            <style jsx>{`
        @keyframes sparkle {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(0.8); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.2); 
          }
        }
        .animate-sparkle {
          animation: sparkle 3s ease-in-out infinite;
        }

        @keyframes float-orb {
          0%, 100% { 
            transform: translate(0, 0) scale(1);
            opacity: 0.6;
          }
          25% {
            transform: translate(20px, -30px) scale(1.1);
            opacity: 0.8;
          }
          50% { 
            transform: translate(-10px, -50px) scale(0.9);
            opacity: 0.5;
          }
          75% {
            transform: translate(-30px, -20px) scale(1.05);
            opacity: 0.7;
          }
        }
        .animate-float-orb {
          animation: float-orb 20s ease-in-out infinite;
        }

        @keyframes drift {
          from { transform: translateX(-15vw) scale(var(--scale)); }
          to { transform: translateX(115vw) scale(var(--scale)); }
        }
        
        @keyframes grid-move {
            0% { background-position: 0 0; }
            100% { background-position: 0 50px; }
        }
        .animate-grid-move {
            animation: grid-move 3s linear infinite;
        }
      `}</style>
        </div>
    );
}
