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
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
} from "@coinbase/onchainkit/identity";
import {
  Wallet as WalletIcon,
  Trophy,
  AlertTriangle,
  Medal,
  Swords,
  ArrowLeft,
  ChevronRight,
  User
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

  const { connect: connectToServer, disconnect: disconnectFromServer } = useMultiplayer();

  useEffect(() => {
    connectToServer();
    return () => disconnectFromServer();
  }, [connectToServer, disconnectFromServer]);

  const isOnCorrectChain = isCorrectChain(chainId);

  return (
    <div className="min-h-screen relative flex flex-col font-terminal text-[24px]"> {/* Enforcing 24px base */}
      {/* Scanlines */}
      <div className="scanline" />

      {/* Background */}
      <div className="fixed inset-0 bg-[var(--pixel-bg)] z-0" />

      {/* Header */}
      <header className="relative z-10 p-6 border-b-4 border-[var(--pixel-card-border)] bg-black/80">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-[var(--pixel-fg)] hover:text-white transition-colors">
            <ArrowLeft className="w-8 h-8" />
            <span className="text-2xl font-bold">BACK</span>
          </Link>

          <div className="text-retro text-[var(--pixel-blue)] text-lg md:text-xl tracking-wider">
            MODE SELECT
          </div>

          {/* Wallet Status Box */}
          <div className="flex items-center gap-6">
            {isConnected && isOnCorrectChain && (
              <div className="hidden md:flex items-center gap-3 text-[var(--pixel-green)] text-xl">
                <span className="w-4 h-4 bg-[var(--pixel-green)] animate-blink" />
                BASE_NET
              </div>
            )}

            <Wallet>
              <ConnectWallet className="!font-terminal !text-xl !px-6 !py-3 !h-auto !min-h-0 !bg-[var(--pixel-card-bg)] !border-2 !border-[var(--pixel-card-border)] hover:!border-[var(--pixel-blue)] !rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md">
                <WalletIcon className="w-6 h-6 mr-3" />
                <span>{isConnected ? 'WALLET_OK' : 'CONNECT'}</span>
              </ConnectWallet>
              <WalletDropdown className="!font-terminal !rounded-xl border-4 border-white">
                <Identity className="px-6 py-4" hasCopyAddressOnClick>
                  <Avatar className="!rounded-full border-2 border-white" />
                  <Name />
                  <Address />
                </Identity>
                <WalletDropdownDisconnect className="!rounded-lg hover:bg-red-500 hover:text-white" />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 container mx-auto px-4 py-12 flex flex-col items-center">

        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl text-white mb-4 text-shadow-hard font-retro tracking-tight">
            SELECT GAME MODE
          </h1>
          <div className="h-2 w-48 bg-[var(--pixel-blue)] mx-auto" />
        </div>

        {/* Error Box */}
        {error && (
          <div className="pixel-box w-full max-w-2xl mb-12 border-4 border-[var(--pixel-red)] bg-black">
            <h3 className="text-[var(--pixel-red)] mb-3 flex items-center gap-3 text-2xl font-bold">
              <AlertTriangle className="w-8 h-8" /> SYSTEM ERROR
            </h3>
            <p className="text-xl">{error}</p>
          </div>
        )}

        {/* Chain Warning */}
        {isConnected && !isOnCorrectChain && (
          <div className="pixel-box w-full max-w-2xl mb-12 bg-black border-4 border-[var(--pixel-yellow)]">
            <h3 className="text-[var(--pixel-yellow)] text-center text-2xl mb-6 font-bold flex items-center justify-center gap-3">
              <AlertTriangle className="w-8 h-8" /> WRONG SYSTEM <AlertTriangle className="w-8 h-8" />
            </h3>
            <p className="text-center mb-6 text-xl">UPLINK TO BASE NETWORK REQUIRED</p>
            <button onClick={switchToBase} className="pixel-btn pixel-btn-warning w-full text-xl py-4">
              SWITCH NETWORK
            </button>
          </div>
        )}

        {/* Game Mode Cards */}
        <div className="grid md:grid-cols-3 gap-8 w-full max-w-7xl">

          {/* Quick Match - BLUE THEME */}
          <Link href="/room" className="group relative transform hover:-translate-y-2 transition-transform duration-200">
            <div className="pixel-card h-full border-4 border-[var(--pixel-blue)] hover:bg-[var(--pixel-card-border)] transition-colors">
              <div className="bg-black border-4 border-[var(--pixel-blue)] p-6 mb-6 flex justify-center h-48 items-center">
                <Swords className="w-24 h-24 text-[var(--pixel-blue)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-[var(--pixel-blue)] text-3xl mb-3 flex items-center gap-2 font-retro">
                1 VS 1
                <ChevronRight className="w-8 h-8 opacity-0 group-hover:opacity-100" />
              </h3>
              <p className="text-[var(--pixel-fg)] text-xl mb-6 leading-relaxed">
                Classic Duel. <br />
                Wager ETH. <br />
                Winner takes all.
              </p>
              <div className="pixel-badge bg-[var(--pixel-blue)] text-white text-lg border-2 border-white">
                ENTRY: 0.001 ETH
              </div>
            </div>
          </Link>

          {/* Tournament - RED THEME */}
          <Link href="/tournament" className="group relative transform hover:-translate-y-2 transition-transform duration-200">
            <div className="pixel-card h-full border-4 border-[var(--pixel-red)] hover:bg-[var(--pixel-card-border)] transition-colors">
              <div className="absolute -top-5 right-4 bg-[var(--pixel-red)] text-white text-base px-4 py-1 font-bold animate-pulse border-2 border-white shadow-lg">
                LIVE EVENT
              </div>
              <div className="bg-black border-4 border-[var(--pixel-red)] p-6 mb-6 flex justify-center h-48 items-center">
                <Trophy className="w-24 h-24 text-[var(--pixel-red)] group-hover:rotate-12 transition-transform" />
              </div>
              <h3 className="text-[var(--pixel-red)] text-3xl mb-3 flex items-center gap-2 font-retro">
                TOURNEY
                <ChevronRight className="w-8 h-8 opacity-0 group-hover:opacity-100" />
              </h3>
              <p className="text-[var(--pixel-fg)] text-xl mb-6 leading-relaxed">
                Weekly Cup. <br />
                Elimination Bracket. <br />
                Win NFT Trophy.
              </p>
              <div className="pixel-badge bg-[var(--pixel-red)] text-white text-lg border-2 border-white">
                PRIZE: NFT + ETH
              </div>
            </div>
          </Link>

          {/* Leaderboard - YELLOW THEME */}
          <Link href="/leaderboard" className="group relative transform hover:-translate-y-2 transition-transform duration-200">
            <div className="pixel-card h-full border-4 border-[var(--pixel-yellow)] hover:bg-[var(--pixel-card-border)] transition-colors">
              <div className="bg-black border-4 border-[var(--pixel-yellow)] p-6 mb-6 flex justify-center h-48 items-center">
                <Medal className="w-24 h-24 text-[var(--pixel-yellow)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-[var(--pixel-yellow)] text-3xl mb-3 flex items-center gap-2 font-retro">
                RANKING
                <ChevronRight className="w-8 h-8 opacity-0 group-hover:opacity-100" />
              </h3>
              <p className="text-[var(--pixel-fg)] text-xl mb-6 leading-relaxed">
                Hall of Fame. <br />
                Global Stats. <br />
                Check Top Players.
              </p>
              <div className="text-[var(--pixel-yellow)] text-lg font-bold border-b-2 border-current inline-block">
                 /// VIEW STATS
              </div>
            </div>
          </Link>

        </div>

        {/* Player Stats Footer */}
        {isConnected && address && (
          <div className="mt-16 w-full max-w-2xl mb-12">
            <div className="pixel-box flex items-center justify-between border-4 border-[var(--pixel-card-border)]">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[var(--pixel-blue)] flex items-center justify-center border-4 border-white">
                  <User className="text-white w-8 h-8" />
                </div>
                <div>
                  <div className="text-[var(--pixel-fg)] text-base mb-1">PLAYER_ID</div>
                  <div className="text-retro text-xl text-white tracking-widest">{formatAddress(address)}</div>
                </div>
              </div>
              <div className="text-[var(--pixel-green)] text-3xl font-retro px-6">
                Lv.1
              </div>
            </div>
          </div>
        )}

      </main>

      <HelpOverlay />
    </div>
  );
}
