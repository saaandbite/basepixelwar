"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Zap, Shield, Trophy, Gamepad2 } from "lucide-react";
import PixelCannon from "./components/PixelCannon";
import LivingBackground from "./components/LivingBackground"; // IMPORT NEW BACKGROUND

export default function LandingPage() {
  const [fire, setFire] = useState(false);
  const [projectile, setProjectile] = useState(false);
  const [hit, setHit] = useState(false);

  // Firing Sequence Logic
  useEffect(() => {
    const sequence = () => {
      // 1. Reset
      setHit(false);

      // 2. Fire Cannon
      setFire(true);
      setTimeout(() => setFire(false), 200);

      // 3. Projectile Fly
      setTimeout(() => setProjectile(true), 100);

      // 4. Impact
      setTimeout(() => {
        setProjectile(false);
        setHit(true);
      }, 500); // Flight time 400ms
    };

    // First shot delay
    const initialDelay = setTimeout(sequence, 1000);

    // Loop every 5s
    const interval = setInterval(sequence, 5000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[var(--pixel-bg)]">

      {/* 🚀 NEW: Living Background (Stars & Clouds) */}
      <LivingBackground />

      {/* CRT Scanline Overlay - low z-index so it doesn't block clicks */}
      <div className="scanline absolute inset-0 z-1 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 py-6 bg-transparent">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-[var(--pixel-red)] rounded-2xl flex items-center justify-center shadow-lg ${hit ? 'animate-shake' : ''}`}>
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl md:text-3xl text-retro text-white tracking-widest drop-shadow-md">
              PIXEL<span className="text-[var(--pixel-blue)]">WAR</span>
            </span>
          </div>

          <div className="hidden md:flex gap-8 text-retro text-sm">
            <Link href="/leaderboard" className="hover:text-[var(--pixel-yellow)] transition-colors">HIGHSCORES</Link>
            <Link href="/tournament" className="hover:text-[var(--pixel-yellow)] transition-colors">TOURNAMENT</Link>
          </div>

          <Link href="/play" className="pixel-btn pixel-btn-primary text-sm whitespace-nowrap shadow-lg">
            START GAME
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-24 text-center px-4 overflow-hidden">

        {/* Animated Badge */}
        <div className="pixel-badge bg-white/10 text-[var(--pixel-green)] mb-10 animate-float backdrop-blur-md border-[var(--pixel-green)]">
          ● SYSTEM_ONLINE
        </div>

        {/* Main Title - The Target */}
        <h1 className="text-6xl md:text-8xl lg:text-9xl mb-8 leading-none relative font-retro tracking-tighter drop-shadow-2xl">
          {/* Projectile */}
          {projectile && (
            <div
              className="projectile rounded-full"
              style={{
                bottom: '20px',
                left: '-200px',
                transformOrigin: 'bottom left'
              }}
            />
          )}

          <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">PIXEL</span>
          <span
            className={`block text-[var(--pixel-blue)] transition-all duration-200 ${hit ? 'animate-damage text-[var(--pixel-red)]' : ''}`}
            style={{
              textShadow: hit ? '0px 0px 20px rgba(239,68,68,0.8)' : '0px 10px 0px rgba(37,99,235,0.3)'
            }}
          >
            WARS
          </span>
        </h1>

        <p className="font-terminal text-3xl md:text-4xl text-gray-200 mb-14 max-w-3xl mx-auto drop-shadow-md leading-relaxed">
          REAL-TIME 1v1 BATTLES. <span className="text-[var(--pixel-blue)] font-bold">BLUE</span> VS <span className="text-[var(--pixel-red)] font-bold">RED</span>.
          <br />
          <span className="text-[var(--pixel-yellow)] animate-pulse">PRESS START TO FIGHT</span>
        </p>

        {/* CTA */}
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <Link href="/play" className="pixel-btn pixel-btn-success text-lg group min-w-[240px] !rounded-full">
            <span className="mr-2 group-hover:rotate-12 transition-transform inline-block">▶</span> INSERT COIN
          </Link>
          <Link href="/leaderboard" className="pixel-btn pixel-btn-outline text-lg min-w-[240px] !rounded-full hover:bg-white/10">
            VIEW RANKINGS
          </Link>
        </div>

        {/* Pixel Cannon (Bottom Left) - Keep it sharp pixel art! */}
        <div className="absolute bottom-10 left-4 md:left-20 pointer-events-none fade-in-up transform scale-125 z-50">
          <PixelCannon fire={fire} />
        </div>

      </main>

      {/* Features - Modern Cards */}
      <section className="relative z-10 py-24 bg-gradient-to-b from-[var(--pixel-bg)] to-black/50">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl mb-16 text-white font-retro">
            GAME FEATURES
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="pixel-card group hover:border-[var(--pixel-blue)]">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--pixel-card-bg)] p-4 rounded-2xl border-4 border-white group-hover:scale-110 transition-transform group-hover:border-[var(--pixel-blue)] shadow-xl">
                <Zap className="w-10 h-10 text-[var(--pixel-yellow)]" />
              </div>
              <h3 className="text-center text-2xl mt-8 mb-4 text-white font-retro">ZERO LAG</h3>
              <p className="text-center text-xl text-gray-400 leading-relaxed">
                High-speed WebSocket combat. No delays. Pure skill.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="pixel-card group hover:border-[var(--pixel-green)]">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--pixel-card-bg)] p-4 rounded-2xl border-4 border-white group-hover:scale-110 transition-transform group-hover:border-[var(--pixel-green)] shadow-xl">
                <Shield className="w-10 h-10 text-[var(--pixel-green)]" />
              </div>
              <h3 className="text-center text-2xl mt-8 mb-4 text-white font-retro">SECURE LOOT</h3>
              <p className="text-center text-xl text-gray-400 leading-relaxed">
                Win ETH directly to your wallet via Smart Contract settlement.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="pixel-card group hover:border-[var(--pixel-red)]">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--pixel-card-bg)] p-4 rounded-2xl border-4 border-white group-hover:scale-110 transition-transform group-hover:border-[var(--pixel-red)] shadow-xl">
                <Trophy className="w-10 h-10 text-[var(--pixel-red)]" />
              </div>
              <h3 className="text-center text-2xl mt-8 mb-4 text-white font-retro">WEEKLY CUP</h3>
              <p className="text-center text-xl text-gray-400 leading-relaxed">
                Join tournaments. Win legendary NFT Trophies. Prove your skill.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center border-t border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="container mx-auto text-gray-400 font-terminal">
          <p className="text-2xl mb-4 text-white">BUILT ON BASE L2</p>
          <div className="flex justify-center gap-6 text-lg opacity-60">
            <span>© 2026 PIXELWAR TEAM</span>
            <span>•</span>
            <a href="#" className="hover:text-white hover:underline transition-colors">SMART CONTRACT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}