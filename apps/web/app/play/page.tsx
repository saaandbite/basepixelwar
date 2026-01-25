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
  Sword
} from "lucide-react";
import HelpOverlay from "../components/HelpOverlay";

export default function PlayHub() {
  const {
    isConnected,
    chainId,
    error,
    switchToBase,
  } = useWallet();

  const { connect: connectToServer, disconnect: disconnectFromServer } = useMultiplayer();

  useEffect(() => {
    connectToServer();
    return () => disconnectFromServer();
  }, [connectToServer, disconnectFromServer]);

  const isOnCorrectChain = isCorrectChain(chainId);

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-5xl mx-auto mb-10">

            {/* HEADER CARD (New - Full Width) */}
            <div className="md:col-span-4 relative block bg-white/5 border-4 border-white backdrop-blur-md shadow-[8px_8px_0_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff8ba7]/20 rounded-bl-full z-0"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#903749]/10 rounded-tr-full z-0"></div>

              <div className="relative z-10 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#903749] text-white rounded text-xs font-bold tracking-widest uppercase mb-4 shadow-sm">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Select Game Mode</span>
                </div>
                <h1 className="font-heading text-4xl md:text-6xl text-white font-retro tracking-wide drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
                  BATTLE ARENA
                </h1>
              </div>

              <div className="relative z-10 flex gap-3 opacity-80">
                <div className="w-3 h-3 bg-white animate-pulse"></div>
                <div className="w-3 h-3 bg-white animate-pulse delay-75"></div>
                <div className="w-3 h-3 bg-white animate-pulse delay-150"></div>
              </div>
            </div>


            {/* 1. 1v1 DUEL (Left Half - 2x2) */}
            <Link href="/room" className="group md:col-span-2 md:row-span-2 relative block min-h-[340px] md:min-h-full">
              <div className="absolute inset-0 bg-[#903749] border-4 border-white opacity-90 transition-all duration-300 group-hover:bg-[#7a2e3d] group-hover:scale-[1.01] shadow-[8px_8px_0_rgba(0,0,0,0.2)]"></div>

              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white z-20"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white z-20"></div>

              <div className="relative z-10 h-full p-8 md:p-12 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-retro tracking-widest border border-white/30">CLASSIC</div>
                  <Swords className="w-20 h-20 md:w-24 md:h-24 text-white group-hover:rotate-12 transition-transform duration-300 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
                </div>

                <div>
                  <h2 className="text-5xl md:text-7xl font-black font-retro text-white mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                    1 VS 1
                  </h2>
                  <p className="font-sans text-white/90 text-xl leading-relaxed mb-8 max-w-lg drop-shadow-md">
                    High stakes duel. Winner takes all.<br />Prove your worth in the arena.
                  </p>

                  <div className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#903749] font-black text-base uppercase tracking-wider group-hover:bg-[#ffc6c7] transition-colors rounded-none shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
                    Start Battle <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </Link>


            {/* 2. TOURNAMENT (Top Right Half - 2x1) */}
            <Link href="/tournament" className="group md:col-span-2 relative block min-h-[190px]">
              <div className="absolute inset-0 bg-white/10 border-4 border-white transition-all duration-300 group-hover:scale-[1.02] shadow-[8px_8px_0_rgba(0,0,0,0.1)] backdrop-blur-md"></div>

              <div className="absolute top-0 right-0 w-16 h-16 bg-[#ff8ba7]/20 rounded-bl-full z-0"></div>

              <div className="relative z-10 h-full p-6 flex flex-row items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <Trophy className="w-10 h-10 text-[#903749] drop-shadow-md" />
                    <h3 className="text-3xl font-black font-retro text-[#903749]">TOURNAMENT</h3>
                  </div>
                  <p className="font-sans text-[#903749]/80 text-sm font-bold pl-14">
                    Weekly Cup • Big Prizes • NFT Trophies
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 bg-[#903749] text-white text-[10px] font-bold rotate-6 shadow-lg border-2 border-[#903749] ml-4">
                  <span>LIVE</span>
                </div>
              </div>
            </Link>


            {/* 3. LEADERBOARD (Bottom Right 1 - 1x1) */}
            <Link href="/leaderboard" className="group md:col-span-1 relative block min-h-[190px]">
              <div className="absolute inset-0 bg-[#ff8ba7] border-4 border-white transition-all duration-300 group-hover:bg-[#ff7a9e] group-hover:scale-[1.02] shadow-[8px_8px_0_rgba(0,0,0,0.1)]"></div>

              <div className="relative z-10 h-full p-6 flex flex-col justify-between items-center text-center">
                <div className="p-3 bg-white/20 rounded-full ring-2 ring-white/30 backdrop-blur-sm mb-2">
                  <Medal className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                <h3 className="text-xl font-black font-retro leading-none text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                  HALL OF<br />FAME
                </h3>

                <div className="w-full bg-black/20 backdrop-blur-md border border-white/20 p-2 mt-2 rounded-none">
                  <div className="font-retro text-sm text-white drop-shadow-sm">
                    TOP: SATOSHI
                  </div>
                </div>
              </div>
            </Link>

            {/* 4. HELP / GUIDE (Bottom Right 2 - 1x1) */}
            <div className="group md:col-span-1 relative block min-h-[190px] cursor-pointer">
              <HelpOverlay customTrigger={
                <div className="w-full h-full relative block">
                  <div className="absolute inset-0 bg-[#00b894] border-4 border-white transition-all duration-300 group-hover:bg-[#00a884] group-hover:scale-[1.02] shadow-[8px_8px_0_rgba(0,0,0,0.1)]"></div>
                  <div className="relative z-10 h-full p-6 flex flex-col justify-between items-center text-center min-h-[190px]">
                    <div className="p-3 bg-white/20 rounded-full ring-2 ring-white/30 backdrop-blur-sm mb-2">
                      <BookOpen className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                    <h3 className="text-xl font-black font-retro leading-none text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                      GAME<br />GUIDE
                    </h3>
                    <div className="px-3 py-1 bg-white/20 rounded text-[10px] font-bold text-white border border-white/30">
                      READ MANUAL
                    </div>
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
