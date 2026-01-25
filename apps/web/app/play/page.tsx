"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useWallet, formatAddress, isCorrectChain } from "../contexts/WalletContext";
import { useMultiplayer } from "./game/hooks/useMultiplayer";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  Trophy,
  AlertTriangle,
  Medal,
  Swords,
  ChevronRight,
  Gamepad2,
  BookOpen,
  Sword,
  Zap,
  Activity
} from "lucide-react";
import HelpOverlay from "../components/HelpOverlay";

export default function PlayHub() {
  const {
    address,
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

  // Base card class without background (we'll add varied bgs)
  const cardBaseClass = "relative border border-white/10 p-6 md:p-8 group transition-all duration-300 hover:-translate-y-2 overflow-hidden shadow-xl";
  const cornerBracketClass = "absolute w-6 h-6 transition-colors duration-300 z-20";
  const iconContainerClass = "relative w-16 h-16 mb-4 flex items-center justify-center z-10";
  const iconBgClass = "absolute inset-0 border border-white/30 skew-x-6 group-hover:skew-x-0 transition-transform duration-300 bg-black/20";
  const iconFillClass = "absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-300";

  // CSS Pattern for Pixel Art Effect
  const pixelPattern = {
    backgroundImage: `
        linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%), 
        linear-gradient(-45deg, rgba(0,0,0,0.1) 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.1) 75%), 
        linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.1) 75%)
    `,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
  };

  return (
    <div className="min-h-screen relative flex flex-col font-terminal text-[var(--pixel-fg)] bg-[#ffe4e6] overflow-x-hidden">

      {/* Hero Section Container (Background + Nav + Hero Content) */}
      <div className="relative w-full min-h-screen flex flex-col bg-gradient-to-b from-[#ffe4e6] to-[#ff8ba7]">

        {/* Navbar */}
        <nav className="relative z-10 w-full py-6 md:py-10">
          <div className="container mx-auto px-4 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 select-none">
              <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
                <span className="text-3xl md:text-4xl font-black font-retro tracking-tighter text-[#FFC6C7] drop-shadow-[3px_3px_0_#000000]">PIXEL</span>
                <span className="text-3xl md:text-4xl font-black font-retro tracking-tighter text-black drop-shadow-[3px_3px_0_rgba(255,255,255,0.8)]">WAR</span>
              </div>
            </Link>

            {/* Wallet Section */}
            <div className="flex items-center gap-4">
              {isConnected && isOnCorrectChain && (
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full border border-white/40 backdrop-blur-sm">
                  <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]" />
                  <span className="text-xs font-bold text-[#903749] tracking-wider">BASE MAINNET</span>
                </div>
              )}

              <Wallet>
                <ConnectWallet className="pixel-btn-connect !font-sans !font-bold !text-lg !h-auto !min-h-0 hover:!bg-gray-100 transition-transform !text-black">
                  <Avatar className="h-6 w-6" />
                  <Name />
                </ConnectWallet>
                <WalletDropdown className="!font-sans">
                  <Identity className="px-4 py-3" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">Wallet</WalletDropdownLink>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative z-10 flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">

          {/* Error Message */}
          <div className="w-full max-w-5xl mx-auto mb-6">
            {error && (
              <div className="w-full p-4 mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 font-sans rounded shadow-sm flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}
            {isConnected && !isOnCorrectChain && (
              <div className="w-full p-6 bg-yellow-50 border-4 border-yellow-400 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-yellow-800 font-black text-xl mb-1">WRONG NETWORK</h3>
                    <p className="text-yellow-700 font-sans">Please switch to Base Mainnet to play.</p>
                  </div>
                </div>
                <button onClick={switchToBase} className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-full transition-all shadow-md active:scale-95 whitespace-nowrap">
                  SWITCH NETWORK
                </button>
              </div>
            )}
          </div>


          {/* 4-COLUMN BENTO GRID LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full mx-auto mb-10">

            {/* HEADER CARD (Full Width) - Dark Tech Theme */}
            <div className={`md:col-span-4 ${cardBaseClass} bg-[#2d1b2e] flex flex-col md:flex-row items-center justify-between gap-6`}>
              <div className="absolute inset-0 opacity-10" style={pixelPattern}></div>

              {/* Tech Corners */}
              <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/50 group-hover:border-[#ff8ba7]`}></div>
              <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/50 group-hover:border-[#ff8ba7]`}></div>
              <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/50 group-hover:border-[#ff8ba7]`}></div>
              <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white/50 group-hover:border-[#ff8ba7]`}></div>

              <div className="relative z-10 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 text-[#ff8ba7] border border-[#ff8ba7]/30 rounded text-base font-bold font-sans tracking-widest uppercase mb-4 shadow-sm backdrop-blur-md">
                  <Gamepad2 className="w-5 h-5" />
                  <span>Select Game Mode</span>
                </div>
                <h1 className="font-heading text-4xl md:text-6xl text-white font-retro tracking-wide drop-shadow-[4px_4px_0_#903749]">
                  BATTLE ARENA
                </h1>
              </div>

              <div className="relative z-10 flex gap-3 opacity-80">
                <div className="w-3 h-3 bg-[#ff8ba7] animate-pulse"></div>
                <div className="w-3 h-3 bg-[#903749] animate-pulse delay-75"></div>
                <div className="w-3 h-3 bg-[#ff8ba7] animate-pulse delay-150"></div>
              </div>
            </div>


            {/* 1. 1v1 DUEL (Left Half - 2x2) - RED THEME */}
            <Link href="/room" className={`md:col-span-2 md:row-span-2 ${cardBaseClass} bg-[#903749] min-h-[340px] md:min-h-full flex flex-col justify-between hover:bg-[#a63d54]`}>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={pixelPattern}></div>

              {/* Tech Corners */}
              <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/50 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white group-hover:scale-110`}></div>

              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="px-4 py-1.5 bg-black/20 backdrop-blur-sm text-white text-sm font-bold font-sans tracking-widest border border-white/30 rounded-sm">CLASSIC</div>

                  <div className={iconContainerClass}>
                    <div className={iconBgClass}></div>
                    <div className={`${iconFillClass} bg-white`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Swords className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-5xl md:text-7xl font-black font-retro text-white mb-4 drop-shadow-[5px_5px_0_rgba(0,0,0,0.3)]">
                    1 VS 1
                  </h2>
                  <p className="font-sans text-white/90 text-2xl leading-relaxed mb-8 max-w-lg drop-shadow-md font-bold">
                    High stakes duel. Winner takes all.
                  </p>

                  <div className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#903749] font-black font-sans text-xl uppercase tracking-wider group-hover:bg-[#ffc6c7] transition-colors border-b-4 border-black/20 shadow-lg rounded-sm">
                    Start Battle <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Link>


            {/* 2. server status (1x1) - DYNAMIC GREEN/RED THEME */}
            <div className={`md:col-span-1 ${cardBaseClass} ${isServerOnline ? 'bg-[#00b894] hover:bg-[#00ceb0]' : 'bg-[#d63031] hover:bg-[#ff4757]'} min-h-[190px] flex flex-col items-center justify-center text-center transition-colors`}>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={pixelPattern}></div>

              {/* Tech Corners */}
              <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/50 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white group-hover:scale-110`}></div>

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className={`${iconContainerClass} mx-auto mb-4`}>
                  <div className={iconBgClass}></div>
                  <div className={`${iconFillClass} bg-white`}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                </div>

                <h3 className="font-retro text-xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                  STATUS
                </h3>
                <div className="font-bold font-sans text-base uppercase tracking-widest px-6 py-2 rounded border border-white/40 bg-black/10 text-white">
                  {isServerOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>

            {/* 3. TOURNAMENT (1x1) - GOLD/AMBER THEME */}
            <Link href="/tournament" className={`md:col-span-1 ${cardBaseClass} bg-[#e1b12c] hover:bg-[#fbc531] min-h-[190px] flex flex-col items-center justify-center text-center`}>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={pixelPattern}></div>

              <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/50 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white group-hover:scale-110`}></div>

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className={`${iconContainerClass} mx-auto mb-4`}>
                  <div className={iconBgClass}></div>
                  <div className={`${iconFillClass} bg-white`}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                </div>

                <h3 className="font-retro text-xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                  TOURNAMENT
                </h3>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#e1b12c] text-sm font-bold font-sans uppercase rounded-sm border border-white/20 shadow-sm">
                  <span>LIVE NOW</span>
                </div>
              </div>
            </Link>


            {/* 4. LEADERBOARD (1x1) - PURPLE THEME */}
            <Link href="/leaderboard" className={`md:col-span-1 ${cardBaseClass} bg-[#6c5ce7] hover:bg-[#a29bfe] min-h-[190px] flex flex-col items-center justify-center text-center`}>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={pixelPattern}></div>

              <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/50 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/20 group-hover:border-white`}></div>
              <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white group-hover:scale-110`}></div>

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className={`${iconContainerClass} mx-auto mb-4`}>
                  <div className={iconBgClass}></div>
                  <div className={`${iconFillClass} bg-white`}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Medal className="w-8 h-8 text-white" />
                  </div>
                </div>

                <h3 className="font-retro text-xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                  HALL OF FAME
                </h3>
                <div className="font-sans font-bold text-base text-white/90 drop-shadow-sm bg-black/10 px-4 py-1.5 rounded border border-white/20">
                  VIEW
                </div>
              </div>
            </Link>

            {/* 5. HELP / GUIDE (1x1) - BLUE THEME */}
            <div className={`md:col-span-1 ${cardBaseClass} bg-[#0984e3] hover:bg-[#74b9ff] min-h-[190px] flex flex-col items-center justify-center text-center cursor-pointer p-0`}>
              <HelpOverlay customTrigger={
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={pixelPattern}></div>

                  <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/50 group-hover:border-white`}></div>
                  <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/20 group-hover:border-white`}></div>
                  <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/20 group-hover:border-white`}></div>
                  <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white group-hover:scale-110`}></div>

                  <div className={`${iconContainerClass} mx-auto mb-4`}>
                    <div className={iconBgClass}></div>
                    <div className={`${iconFillClass} bg-white`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <h3 className="font-retro text-xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                    HOW TO PLAY
                  </h3>
                  <div className="px-5 py-2 bg-white/20 rounded text-sm font-bold font-sans text-white border border-white/30">
                    MANUAL
                  </div>
                </div>
              } />
            </div>


          </div>

        </main>
      </div>

    </div>
  );
}
