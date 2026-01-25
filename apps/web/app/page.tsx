"use client";

import Link from "next/link";
import { Zap, Shield, Trophy, Swords } from "lucide-react";
import Hero3D from "./components/Hero3D";
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Identity, Address, EthBalance } from '@coinbase/onchainkit/identity';

export default function LandingPage() {
  return (
    <div className="min-h-screen relative flex flex-col font-terminal text-[var(--pixel-fg)] bg-gradient-to-b from-[#ffe4e6] to-[#ff8ba7] overflow-x-hidden">

      {/* Hero Section Container (Background + Nav + Hero Content) */}
      <div className="relative w-full min-h-screen flex flex-col">
        {/* Interactive 3D Background - Confined to this container with CSS Mask for smooth fade */}
        <div className="absolute inset-0 z-0" style={{
          maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
        }}>
          <Hero3D />
        </div>

        {/* Navbar */}
        <nav className="relative z-10 w-full py-6 md:py-10">
          <div className="container mx-auto px-4 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 select-none">
              <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
                <span className="text-3xl md:text-4xl font-black font-retro tracking-tighter text-[#FFC6C7] drop-shadow-[3px_3px_0_#000000]">PIXEL</span>
                <span className="text-3xl md:text-4xl font-black font-retro tracking-tighter text-black drop-shadow-[3px_3px_0_rgba(255,255,255,0.8)]">WAR</span>
              </div>
            </div>

            {/* Connect Wallet / Mobile Menu Placeholder */}
            <div className="flex items-center">
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

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 max-w-5xl mx-auto">

          {/* Brand Logo */}
          <h1
            className="font-heading text-4xl md:text-7xl lg:text-8xl leading-tight mb-6 text-white font-retro"
            style={{ textShadow: '4px 4px 0 var(--pixel-primary-darker), 0 0 20px #5c1a26' }}
          >
            <strong className="text-[#ff8ba7] font-normal">Pixel</strong>
            <strong className="text-black font-normal"> War</strong>
          </h1>

          {/* Headline */}
          <h1
            className="font-heading text-4xl md:text-7xl lg:text-8xl leading-tight mb-10 text-white font-retro animate-float"
            style={{ textShadow: '4px 4px 0 var(--pixel-primary-darker), 0 0 20px #5c1a26' }}
          >
            Compete.Conquer.Claim your territory!
          </h1>

          <p
            className="font-terminal text-2xl md:text-3xl lg:text-4xl text-white mb-12 max-w-3xl leading-relaxed"
            style={{ textShadow: '0 2px 4px rgba(92, 26, 38, 0.5), 0 0 10px rgba(92, 26, 38, 0.4)' }}
          >
            Real-Time PvP Battle Arena with Instant On-Chain Settlement on Base L2
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col md:flex-row gap-6 items-center flex-wrap justify-center font-sans font-black tracking-wider">
            {/* Primary Button: Red Background, White Text */}
            <Link href="/play" className="text-base md:text-lg px-10 py-3 group !font-sans flex items-center justify-center !rounded-full border-4 border-[#903749] bg-[#903749] text-white hover:bg-[#7a2e3d] hover:border-[#7a2e3d] transition-all !shadow-none hover:!shadow-lg transform">
              <Swords className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" /> START BATTLE
            </Link>

            {/* Secondary Button: White Background, Red Text */}
            <Link href="/tournament" className="text-base md:text-lg px-10 py-3 group !font-sans flex items-center justify-center !rounded-full border-4 border-white bg-white !text-[#903749] hover:bg-[#903749] hover:border-[#903749] hover:!text-white transition-all !shadow-none hover:!shadow-lg transform">
              <Trophy className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" /> JOIN TOURNAMENT
            </Link>
          </div>
        </main >
      </div>

      {/* Features Section (Preserved logic, updated style) */}
      < section className="relative z-10 py-24" >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm border-4 border-white/30 p-8 rounded-xl hover:-translate-y-2 transition-transform text-center shadow-lg">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-retro text-white mb-4">ZERO LAG</h3>
              <p className="font-sans text-lg text-[#903749]">
                High-speed WebSocket combat. No delays. Pure skill.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm border-4 border-white/30 p-8 rounded-xl hover:-translate-y-2 transition-transform text-center shadow-lg">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-retro text-white mb-4">SECURE LOOT</h3>
              <p className="font-sans text-lg text-[#903749]">
                Win ETH directly to your wallet via Smart Contract.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm border-4 border-white/30 p-8 rounded-xl hover:-translate-y-2 transition-transform text-center shadow-lg">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-retro text-white mb-4">WEEKLY CUP</h3>
              <p className="font-sans text-lg text-[#903749]">
                Join tournaments. Win legendary NFT Trophies.
              </p>
            </div>
          </div>
        </div>
      </section >

      {/* Footer */}
      < footer className="relative z-10 py-12 text-center border-t-2 border-white/20 bg-black/10 backdrop-blur-lg" >
        <div className="container mx-auto text-white/60 font-terminal">
          <p className="text-2xl mb-4 text-white">BUILT ON BASE L2</p>
          <div className="flex justify-center gap-6 text-lg">
            <span>© 2026 PIXELWAR TEAM</span>
            <span>•</span>
            <a href="#" className="hover:text-white hover:underline transition-colors">SMART CONTRACT</a>
          </div>
        </div>
      </footer >
    </div >
  );
}