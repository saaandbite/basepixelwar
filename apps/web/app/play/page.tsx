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
  Wifi,
  WifiOff,
  Loader2,
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
    connectionStatus,
    playerId 
  } = useMultiplayer();

  useEffect(() => {
    connectToServer();
    return () => disconnectFromServer();
  }, [connectToServer, disconnectFromServer]);

  const isOnCorrectChain = isCorrectChain(chainId);

  return (
    <div className="min-h-screen relative flex flex-col font-terminal text-[var(--pixel-fg)] bg-[#ffe4e6] overflow-x-hidden">

      {/* Hero Section Container (Background + Nav + Hero Content) */}
      <div className="relative w-full min-h-screen flex flex-col bg-gradient-to-b from-[#ffe4e6] to-[#ff8ba7]">

        {/* Navbar - Matching Landing Page exactly */}
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

          {/* Title Section matching landing page text shadow style */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-[#903749]/10 rounded-full mb-6 border border-[#903749]/20 backdrop-blur-sm">
              <Gamepad2 className="w-4 h-4 text-[#903749]" />
              <span className="text-xs font-bold text-[#903749] tracking-widest uppercase">Select Game Mode</span>
            </div>
            <h1
              className="font-heading text-4xl md:text-6xl text-white font-retro mb-4 tracking-wide"
              style={{ textShadow: '4px 4px 0 var(--pixel-primary-darker), 0 0 20px #5c1a26' }}
            >
              BATTLE ARENA
            </h1>
          </div>

          {/* Error Message */}
          <div className="w-full max-w-4xl mx-auto mb-8">
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


          {/* GAME MODE CARDS - Styled like GameFeatures.tsx */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">

            {/* 1. 1v1 DUEL - Primary Card */}
            <Link href="/room" className="group relative block bg-[#903749] overflow-hidden transition-all duration-300 hover:bg-[#7a2e3d] hover:-translate-y-2 min-h-[320px]">

              {/* Corner Brackets - like GameFeatures */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/50 group-hover:border-white transition-colors duration-300 z-20"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/20 group-hover:border-[#ff8ba7] transition-colors duration-300 z-20"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/20 group-hover:border-[#ff8ba7] transition-colors duration-300 z-20"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#ff8ba7] group-hover:scale-110 transition-transform duration-300 z-20"></div>

              {/* Pixel Accent */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/20 group-hover:bg-[#ff8ba7] transition-colors"></div>

              <div className="relative z-10 h-full p-8 flex flex-col">
                {/* Icon Container with Tech Border */}
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border border-white/30 skew-x-6 group-hover:skew-x-0 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Swords className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-[10px] font-retro tracking-widest border border-white/20 w-fit mb-4">CLASSIC</div>

                <h2 className="font-retro text-3xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] group-hover:text-[#ffc6c7] transition-colors">
                  1 VS 1 DUEL
                </h2>
                <p className="font-terminal text-base text-white/80 leading-relaxed drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)] mb-6">
                  High stakes duel. Winner takes all. Prove your worth in the arena.
                </p>

                <div className="mt-auto inline-flex items-center gap-2 text-white/70 group-hover:text-white transition-colors text-sm font-bold">
                  Start Battle <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>


            {/* 2. TOURNAMENT */}
            <Link href="/tournament" className="group relative block bg-white/5 border border-white/10 overflow-hidden transition-all duration-300 hover:bg-white/10 hover:-translate-y-2 min-h-[320px]">

              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/50 group-hover:border-white transition-colors duration-300 z-20"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/20 group-hover:border-[#ff8ba7] transition-colors duration-300 z-20"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/20 group-hover:border-[#ff8ba7] transition-colors duration-300 z-20"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#903749] group-hover:scale-110 transition-transform duration-300 z-20"></div>

              {/* Pixel Accent */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/20 group-hover:bg-[#ff8ba7] transition-colors"></div>

              <div className="relative z-10 h-full p-8 flex flex-col">
                {/* Icon Container with Tech Border */}
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border border-white/30 skew-x-6 group-hover:skew-x-0 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-[#903749] opacity-20 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="px-3 py-1 bg-[#903749] text-white text-[10px] font-retro tracking-widest border border-white/20 w-fit mb-4">
                  LIVE EVENT
                </div>

                <h3 className="font-retro text-3xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] group-hover:text-[#ffc6c7] transition-colors">
                  TOURNAMENT
                </h3>
                <p className="font-terminal text-base text-white/80 leading-relaxed drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)] mb-6">
                  Weekly Cup with big prizes. Compete and win exclusive NFT Trophies.
                </p>

                <div className="mt-auto inline-flex items-center gap-2 text-white/70 group-hover:text-white transition-colors text-sm font-bold">
                  Join Now <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>


            {/* 3. LEADERBOARD */}
            <Link href="/leaderboard" className="group relative block bg-[#ff8ba7] border border-white/20 overflow-hidden transition-all duration-300 hover:bg-[#ff7a9e] hover:-translate-y-2 min-h-[320px]">

              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/50 group-hover:border-white transition-colors duration-300 z-20"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/20 group-hover:border-white transition-colors duration-300 z-20"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/20 group-hover:border-white transition-colors duration-300 z-20"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white group-hover:scale-110 transition-transform duration-300 z-20"></div>

              {/* Pixel Accent */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/40 group-hover:bg-white transition-colors"></div>

              <div className="relative z-10 h-full p-8 flex flex-col">
                {/* Icon Container with Tech Border */}
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border border-white/50 skew-x-6 group-hover:skew-x-0 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Medal className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-retro tracking-widest border border-white/30 w-fit mb-4">RANKINGS</div>

                <h3 className="font-retro text-3xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)] group-hover:text-white transition-colors">
                  HALL OF FAME
                </h3>
                <p className="font-terminal text-base text-white/90 leading-relaxed drop-shadow-[1px_1px_0_rgba(0,0,0,0.3)] mb-6">
                  See top players and their achievements. Climb the global leaderboard.
                </p>

                <div className="mt-auto inline-flex items-center gap-2 text-white/80 group-hover:text-white transition-colors text-sm font-bold">
                  View Rankings <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

          </div>

          {/* SERVER CONNECTION STATUS - Stacked Container Below */}
          <div className="w-full max-w-5xl mx-auto mt-8">
            <div className={`relative overflow-hidden transition-all duration-300 ${
              connectionStatus === 'connected' 
                ? 'bg-emerald-500/20 border border-emerald-400/30' 
                : connectionStatus === 'connecting'
                  ? 'bg-yellow-500/20 border border-yellow-400/30'
                  : 'bg-red-500/20 border border-red-400/30'
            }`}>
              {/* Corner Brackets */}
              <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 z-20 ${
                connectionStatus === 'connected' ? 'border-emerald-400' : connectionStatus === 'connecting' ? 'border-yellow-400' : 'border-red-400'
              }`}></div>
              <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 z-20 ${
                connectionStatus === 'connected' ? 'border-emerald-400' : connectionStatus === 'connecting' ? 'border-yellow-400' : 'border-red-400'
              }`}></div>

              <div className="relative z-10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`relative w-10 h-10 flex items-center justify-center ${
                    connectionStatus === 'connected' 
                      ? 'text-emerald-400' 
                      : connectionStatus === 'connecting'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}>
                    {connectionStatus === 'connected' && (
                      <Wifi className="w-6 h-6" />
                    )}
                    {connectionStatus === 'connecting' && (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    )}
                    {connectionStatus === 'disconnected' && (
                      <WifiOff className="w-6 h-6" />
                    )}
                  </div>

                  {/* Status Text */}
                  <div>
                    <div className={`font-retro text-sm ${
                      connectionStatus === 'connected' 
                        ? 'text-emerald-300' 
                        : connectionStatus === 'connecting'
                          ? 'text-yellow-300'
                          : 'text-red-300'
                    }`}>
                      {connectionStatus === 'connected' && 'SERVER CONNECTED'}
                      {connectionStatus === 'connecting' && 'CONNECTING...'}
                      {connectionStatus === 'disconnected' && 'SERVER OFFLINE'}
                    </div>
                    <div className="font-terminal text-xs text-white/60">
                      {connectionStatus === 'connected' && 'Real-time multiplayer ready'}
                      {connectionStatus === 'connecting' && 'Establishing connection to game server'}
                      {connectionStatus === 'disconnected' && 'Unable to reach game server'}
                    </div>
                  </div>
                </div>

                {/* Status Indicator Dot */}
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' 
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]' 
                      : connectionStatus === 'connecting'
                        ? 'bg-yellow-400 animate-pulse shadow-[0_0_10px_#facc15]'
                        : 'bg-red-400 shadow-[0_0_10px_#f87171]'
                  }`} />
                  {playerId && (
                    <span className="font-terminal text-[10px] text-white/40 hidden md:block">
                      ID: {playerId.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      <HelpOverlay />
    </div>
  );
}
