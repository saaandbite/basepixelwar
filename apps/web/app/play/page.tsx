"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet, isCorrectChain } from "../contexts/WalletContext";
import { useMultiplayer } from "./game/hooks/useMultiplayer";
import SmartWalletButton from "../components/SmartWalletButton";
import {
  Trophy,
  AlertTriangle,
  Medal,
  Swords,
  ChevronRight,
  Gamepad2,
  BookOpen,
  Activity,
  Zap
} from "lucide-react";
import HelpOverlay from "../components/HelpOverlay";

// === ORNAMENT CARD COMPONENT ===
interface PixelCardProps {
  number: string;
  title: string;
  description: string;
  color: string; // Hex color
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  statusText?: string; // Optional status text (e.g., "LIVE NOW")
}

const PixelCard = ({ number, title, description, color, icon, href, onClick, className = "", statusText }: PixelCardProps) => {
  const CardContent = (
    <div
      className={`relative w-full h-[260px] overflow-hidden group transition-all duration-300 hover:-translate-y-2 backdrop-blur-sm ${className}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Corner Pixels */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-white z-20 transition-shadow duration-300 group-hover:shadow-[0_0_10px_var(--accent-color)]" style={{ '--accent-color': color, boxShadow: '0 0 5px var(--accent-color)' } as React.CSSProperties} />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-white z-20 transition-shadow duration-300 group-hover:shadow-[0_0_10px_var(--accent-color)]" style={{ '--accent-color': color, boxShadow: '0 0 5px var(--accent-color)' } as React.CSSProperties} />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white z-20 transition-shadow duration-300 group-hover:shadow-[0_0_10px_var(--accent-color)]" style={{ '--accent-color': color, boxShadow: '0 0 5px var(--accent-color)' } as React.CSSProperties} />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white z-20 transition-shadow duration-300 group-hover:shadow-[0_0_10px_var(--accent-color)]" style={{ '--accent-color': color, boxShadow: '0 0 5px var(--accent-color)' } as React.CSSProperties} />

      {/* Hover Border Glow */}
      <div className="absolute inset-0 border border-transparent group-hover:border-[color:var(--accent-color)] transition-colors duration-300 pointer-events-none" style={{ '--accent-color': color } as React.CSSProperties} />

      {/* Background Accent Gradient (Very subtle) */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />



      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-8">

        {/* Header Section */}
        <div>
          <h2 className="text-4xl md:text-5xl font-black font-retro text-white uppercase tracking-tight leading-[0.9] drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
            {title}
          </h2>

          {/* Status Badge */}
          {statusText && (
            <div className="inline-block mt-3 px-3 py-1 bg-[color:var(--accent-color)] bg-opacity-20 border border-[color:var(--accent-color)] text-white text-xs font-bold font-sans tracking-widest uppercase transition-colors"
              style={{ '--accent-color': color } as React.CSSProperties}>
              {statusText}
            </div>
          )}
        </div>

        {/* Center Icon (Faded in background normally, glows on hover) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group-hover:scale-110">
          <div className="text-white/20 group-hover:text-white group-hover:drop-shadow-[0_0_15px_var(--accent-color)] transition-all duration-300"
            style={{ '--accent-color': color } as React.CSSProperties}>
            {/* Clone the icon with larger size if needed, but wrapper scale handles it */}
            {icon}
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-auto relative z-30">
          <p className="text-white/70 font-terminal text-sm leading-snug max-w-[90%] group-hover:text-white transition-colors">
            {description}
          </p>

          {/* Action Arrow */}
          <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
            <ChevronRight className="w-6 h-6 text-[color:var(--accent-color)]" style={{ '--accent-color': color } as React.CSSProperties} />
          </div>
        </div>

      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-color)] focus:ring-opacity-50 rounded-sm" style={{ '--accent-color': color } as React.CSSProperties}>
        {CardContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className="block w-full cursor-pointer focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-color)] focus:ring-opacity-50 rounded-sm" style={{ '--accent-color': color } as React.CSSProperties}>
      {CardContent}
    </div>
  );
};


export default function PlayHub() {
  const {
    isConnected,
    chainId,
    error,
    switchToBase,
  } = useWallet();

  const {
    connect: connectToServer,
    disconnect: disconnectFromServer,
    connectionStatus
  } = useMultiplayer();

  useEffect(() => {
    connectToServer();
    return () => disconnectFromServer();
  }, [connectToServer, disconnectFromServer]);

  const isOnCorrectChain = isCorrectChain(chainId);
  const isServerOnline = connectionStatus === 'connected';

  return (
    <div className="min-h-screen relative flex flex-col font-terminal text-[var(--pixel-fg)] overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #ff8ba7 0%, #903749 100%)'
      }}>

      {/* Global Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Navbar moved to be cleaner */}
      <nav className="relative z-10 w-full py-6">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 select-none">
            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
              <span className="text-3xl md:text-4xl font-black font-retro tracking-tighter text-white drop-shadow-[4px_4px_0_#000]">PIXEL</span>
              <span className="text-3xl md:text-4xl font-black font-retro tracking-tighter text-[var(--pixel-red)] drop-shadow-[4px_4px_0_#fff]">WAR</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {isConnected && isOnCorrectChain && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded border border-green-500/40">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-green-400 tracking-wider">BASE MAINNET</span>
              </div>
            )}

            <SmartWalletButton className="!font-terminal !text-xl !px-6 !py-3 !h-auto !min-h-0 !bg-[var(--pixel-card-bg)] !border-2 !border-[var(--pixel-card-border)] hover:!border-[var(--pixel-blue)] !rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md" />
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center">

        {/* Error Banners */}
        <div className="w-full mx-auto mb-8 space-y-4">
          {error && (
            <div className="w-full p-4 bg-red-500 text-white font-bold font-sans flex items-center gap-3 shadow-[4px_4px_0_#000]">
              <AlertTriangle className="w-6 h-6" /> {error}
            </div>
          )}
          {isConnected && !isOnCorrectChain && (
            <div className="w-full p-6 bg-yellow-400 text-black border-4 border-black shadow-[8px_8px_0_#000] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-10 h-10" />
                <div>
                  <h3 className="font-black text-2xl uppercase">Wrong Network</h3>
                  <p className="font-sans font-bold">Switch to Base Mainnet to enter the arena.</p>
                </div>
              </div>
              <button onClick={switchToBase} className="px-8 py-3 bg-black text-white font-retro text-xl hover:scale-105 transition-transform">
                SWITCH NOW
              </button>
            </div>
          )}
        </div>

        {/* HERO TITLE */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black font-retro text-white mb-2 drop-shadow-[6px_6px_0_#903749]">
            CHOOSE YOUR PATH
          </h1>
          <p className="text-gray-400 font-sans text-xl max-w-2xl mx-auto">
            Select a game mode to begin your journey in the Pixel War universe.
          </p>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full mx-auto">

          {/* CARD 01: BATTLE ARENA (Pink/Red) */}
          <PixelCard
            number="01"
            title="BATTLE ARENA"
            description="High stakes 1v1 duels. Fight for glory and rewards."
            color="#ff4757" // Vibrant Red/Pink
            icon={<Swords className="w-16 h-16" />}
            href="/room"
            statusText="POPULAR"
          />

          {/* CARD 02: TOURNAMENT (Green) */}
          <PixelCard
            number="02"
            title="TOURNAMENT"
            description="Weekly championships. Compete for the Golden Trophy."
            color="#2ed573" // Vibrant Green
            icon={<Trophy className="w-16 h-16" />}
            href="/tournament"
            statusText="LIVE WEEKLY"
          />

          {/* CARD 03: LEADERBOARD (Blue) */}
          <PixelCard
            number="03"
            title="HALL OF FAME"
            description="View top players and historical records."
            color="#1e90ff" // Vibrant Blue
            icon={<Medal className="w-16 h-16" />}
            href="/leaderboard"
          />

          {/* CARD 04: SERVER STATUS (Dark/Purple) */}
          <div className="md:col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <PixelCard
              number="04"
              title="SERVER STATUS"
              description={isServerOnline ? "Systems operational. Ready for combat." : "Systems offline. Maintenance in progress."}
              color={isServerOnline ? "#5352ed" : "#3742fa"}
              icon={<Activity className="w-16 h-16" />}
              statusText={isServerOnline ? "ONLINE" : "OFFLINE"}
            />

            <div className="relative h-[260px]">
              <HelpOverlay customTrigger={
                <div className="w-full h-full">
                  <PixelCard
                    number="05"
                    title="GAME GUIDE"
                    description="Master the controls and learn winning strategies."
                    color="#ffa502" // Orange
                    icon={<BookOpen className="w-16 h-16" />}
                  />
                </div>
              } />
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
