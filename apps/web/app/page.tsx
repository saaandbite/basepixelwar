"use client";

import Link from "next/link";
import { Zap, Shield, Trophy } from "lucide-react";
import Hero3D from "./components/Hero3D";
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Identity, Address, EthBalance } from '@coinbase/onchainkit/identity';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative flex flex-col font-terminal text-[var(--pixel-fg)] bg-gradient-to-b from-[#ffe4e6] to-[#ff8ba7] overflow-x-hidden">

      {/* Interactive 3D Background */}
      <Hero3D />

      {/* Navbar */}
      <nav className="relative z-10 w-full py-6 md:py-10">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <strong className="font-heading text-2xl md:text-3xl text-[#903749] font-retro tracking-widest">
              PIXEL WAR
            </strong>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex gap-10 font-body text-xl md:text-2xl uppercase tracking-widest font-bold">
            <Link href="/" className="text-[#903749] border-b-4 border-[#903749] pb-1" style={{ color: '#903749' }}>Home</Link>
            <Link href="/leaderboard" className="text-[#903749]/70 hover:text-[#903749] transition-all" style={{ color: '#903749' }}>Rankings</Link>
            <Link href="/tournament" className="text-[#903749]/70 hover:text-[#903749] transition-all" style={{ color: '#903749' }}>Tournament</Link>
          </div>

          {/* Connect Wallet / Mobile Menu Placeholder */}
          <div className="flex items-center">
            <Wallet>
              <ConnectWallet className="pixel-btn-connect !font-terminal !text-lg !h-auto !min-h-0 hover:!bg-gray-100 transition-transform">
                <Avatar className="h-6 w-6" />
                <Name />
              </ConnectWallet>
              <WalletDropdown className="!font-terminal">
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

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 max-w-5xl mx-auto">

        {/* Brand Logo */}
        <h1 className="font-heading text-4xl md:text-7xl lg:text-8xl leading-tight mb-6 text-white drop-shadow-[4px_4px_0_var(--pixel-primary-darker)] font-retro">
          <strong className="text-[#ff8ba7] font-normal">Pixel</strong>
          <strong className="text-black font-normal"> War</strong>
        </h1>

        {/* Headline */}
        <h1 className="font-heading text-4xl md:text-7xl lg:text-8xl leading-tight mb-10 text-white drop-shadow-[4px_4px_0_var(--pixel-primary-darker)] font-retro animate-float">
          Compete.Conquer.Claim your territory!
        </h1>

        <p className="font-body text-2xl md:text-3xl lg:text-4xl text-white/90 mb-12 max-w-4xl leading-relaxed drop-shadow-md">
          Real-Time PvP Battle Arena with Instant On-Chain Settlement on Base L2 <br />
          <span className="text-[var(--pixel-primary-darker)] font-bold bg-white/20 px-2 rounded">BLUE</span> vs <span className="text-[var(--pixel-primary-darker)] font-bold bg-white/20 px-2 rounded">RED</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row gap-6 items-center flex-wrap justify-center">
          <Link href="/play" className="pixel-btn pixel-btn-primary text-lg md:text-xl px-8 py-5 group">
            <span className="mr-3 group-hover:rotate-12 transition-transform inline-block">⚔️</span> START BATTLE
          </Link>
          <Link href="/tournament" className="pixel-btn pixel-btn-secondary text-lg md:text-xl px-8 py-5 group">
            <span className="mr-3 group-hover:scale-110 transition-transform inline-block">🏆</span> JOIN TOURNAMENT
          </Link>
        </div>

      </main>

      {/* Features Section (Preserved logic, updated style) */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm border-4 border-white/30 p-8 rounded-xl hover:-translate-y-2 transition-transform text-center shadow-lg">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-retro text-white mb-4">ZERO LAG</h3>
              <p className="text-xl text-white/80">
                High-speed WebSocket combat. No delays. Pure skill.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm border-4 border-white/30 p-8 rounded-xl hover:-translate-y-2 transition-transform text-center shadow-lg">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-retro text-white mb-4">SECURE LOOT</h3>
              <p className="text-xl text-white/80">
                Win ETH directly to your wallet via Smart Contract.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm border-4 border-white/30 p-8 rounded-xl hover:-translate-y-2 transition-transform text-center shadow-lg">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-retro text-white mb-4">WEEKLY CUP</h3>
              <p className="text-xl text-white/80">
                Join tournaments. Win legendary NFT Trophies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center border-t-2 border-white/20 bg-black/10 backdrop-blur-lg">
        <div className="container mx-auto text-white/60 font-terminal">
          <p className="text-2xl mb-4 text-white">BUILT ON BASE L2</p>
          <div className="flex justify-center gap-6 text-lg">
            <span>© 2026 PIXELWAR TEAM</span>
            <span>•</span>
            <a href="#" className="hover:text-white hover:underline transition-colors">SMART CONTRACT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}