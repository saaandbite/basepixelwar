"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Shield, Trophy, Swords } from "lucide-react";
import Hero3D from "./components/Hero3D";
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Identity, Address, EthBalance } from '@coinbase/onchainkit/identity';
import GameFeatures from "./components/GameFeatures";
import HowItWorks from "./components/HowItWorks";
import Footer from "./components/Footer";
import ScrollReveal from "./components/ScrollReveal";

export default function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 1200;
  const isSmallMobile = windowWidth < 480;

  // --- MOBILE RENDER (Strictly < 1200px) ---
  const renderMobile = () => {
    return (
      <div className="min-h-screen relative flex flex-col font-terminal text-[var(--pixel-fg)] bg-[#ffe4e6] overflow-x-hidden">
        {/* Mobile Background Wrapper */}
        <div className="relative w-full min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#ffe4e6] to-[#ff8ba7]">
          {/* Mobile 3D Layer - Stronger fade specifically for mobile text readability */}
          <div className="absolute inset-0 z-0" style={{
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
          }}>
            <Hero3D />
          </div>

          {/* Mobile Navbar */}
          <nav className="relative z-10 w-full py-4">
            <div className="container mx-auto px-4 flex items-center justify-between">
              {/* Mobile Logo */}
              <div className="flex items-center gap-2 select-none">
                <div className="flex items-center gap-1 group">
                  <span className={`${isSmallMobile ? 'text-xl' : 'text-3xl'} font-black font-retro tracking-tighter text-[#FFC6C7] drop-shadow-[2px_2px_0_#000000]`}>PIXEL</span>
                  <span className={`${isSmallMobile ? 'text-xl' : 'text-3xl'} font-black font-retro tracking-tighter text-black drop-shadow-[2px_2px_0_rgba(255,255,255,0.8)]`}>WAR</span>
                </div>
              </div>

              {/* Mobile Wallet - Compact */}
              <div className="flex items-center">
                <Wallet>
                  <ConnectWallet className="pixel-btn-connect !font-sans !font-bold !text-sm !px-3 !py-1 !min-h-0 hover:!bg-gray-100 transition-transform !text-black">
                    <Avatar className="h-5 w-5" />
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

          {/* Mobile Hero Content */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-10 w-full max-w-[100vw] overflow-hidden">
            <ScrollReveal direction="down" duration={1000}>
              <h1
                className={`${isSmallMobile ? 'text-2xl' : 'text-4xl'} font-heading leading-tight mb-4 text-white font-retro break-words w-full`}
                style={{ textShadow: '2px 2px 0 var(--pixel-primary-darker), 0 0 10px #5c1a26' }}
              >
                <strong className="text-[#ff8ba7] font-normal">Pixel</strong>
                <strong className="text-black font-normal"> War</strong>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="down" duration={1000} delay={200}>
              <h1
                className={`${isSmallMobile ? 'text-2xl' : 'text-5xl'} font-heading leading-tight mb-6 text-white font-retro animate-float break-words w-full px-2`}
                style={{ textShadow: '3px 3px 0 var(--pixel-primary-darker), 0 0 10px #5c1a26' }}
              >
                Compete. Conquer. Claim!
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <p
                className={`${isSmallMobile ? 'text-sm' : 'text-lg'} font-terminal text-white mb-8 max-w-sm leading-relaxed px-4`}
                style={{ textShadow: '0 1px 2px rgba(92, 26, 38, 0.5), 0 0 5px rgba(92, 26, 38, 0.4)' }}
              >
                PvP Battle Arena on Base L2
              </p>
            </ScrollReveal>

            <ScrollReveal delay={600} className="flex flex-col gap-4 items-center justify-center w-full px-4 font-sans font-black tracking-wider">
              <Link href="/play" className="w-full max-w-xs text-base py-3 group !font-sans flex items-center justify-center !rounded-full border-4 border-[#903749] bg-[#903749] text-white hover:bg-[#7a2e3d] hover:border-[#7a2e3d] transition-all !shadow-none active:scale-95">
                <Swords className="w-5 h-5 mr-2" /> START BATTLE
              </Link>

              <Link href="/tournament" className="w-full max-w-xs text-base py-3 group !font-sans flex items-center justify-center !rounded-full border-4 border-white bg-white !text-[#903749] hover:bg-[#903749] hover:border-[#903749] hover:!text-white transition-all !shadow-none active:scale-95">
                <Trophy className="w-5 h-5 mr-2" /> TOURNAMENT
              </Link>
            </ScrollReveal>
          </main>
        </div>

        {/* Feature Sections (Shared Components remain) */}
        <GameFeatures />
        <HowItWorks />
        <Footer />
      </div>
    );
  };

  // --- DESKTOP RENDER (Strictly >= 1200px) ---
  const renderDesktop = () => {
    return (
      <div className="min-h-screen relative flex flex-col font-terminal text-[var(--pixel-fg)] bg-[#ffe4e6] overflow-x-hidden">
        {/* Desktop Background Wrapper */}
        <div className="relative w-full min-h-screen flex flex-col bg-gradient-to-b from-[#ffe4e6] to-[#ff8ba7]">
          {/* Desktop 3D Layer - Long fade for immersion */}
          <div className="absolute inset-0 z-0" style={{
            maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
          }}>
            <Hero3D />
          </div>

          {/* Desktop Navbar */}
          <nav className="relative z-10 w-full py-10">
            <div className="container mx-auto px-4 flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3 select-none">
                <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
                  <span className="text-4xl font-black font-retro tracking-tighter text-[#FFC6C7] drop-shadow-[3px_3px_0_#000000]">PIXEL</span>
                  <span className="text-4xl font-black font-retro tracking-tighter text-black drop-shadow-[3px_3px_0_rgba(255,255,255,0.8)]">WAR</span>
                </div>
              </div>

              {/* Desktop Wallet */}
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

          {/* Desktop Hero Content */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-32 max-w-5xl mx-auto">
            <ScrollReveal direction="down" duration={1000}>
              <h1
                className="font-heading text-8xl leading-tight mb-6 text-white font-retro"
                style={{ textShadow: '4px 4px 0 var(--pixel-primary-darker), 0 0 20px #5c1a26' }}
              >
                <strong className="text-[#ff8ba7] font-normal">Pixel</strong>
                <strong className="text-black font-normal"> War</strong>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="down" duration={1000} delay={200}>
              <h1
                className="font-heading text-8xl leading-tight mb-10 text-white font-retro animate-float"
                style={{ textShadow: '4px 4px 0 var(--pixel-primary-darker), 0 0 20px #5c1a26' }}
              >
                Compete.Conquer.Claim your territory!
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <p
                className="font-terminal text-4xl text-white mb-12 max-w-3xl leading-relaxed"
                style={{ textShadow: '0 2px 4px rgba(92, 26, 38, 0.5), 0 0 10px rgba(92, 26, 38, 0.4)' }}
              >
                Real-Time PvP Battle Arena with Instant On-Chain Settlement on Base L2
              </p>
            </ScrollReveal>

            <ScrollReveal delay={600} className="flex flex-row gap-6 items-center justify-center font-sans font-black tracking-wider">
              <Link href="/play" className="text-lg px-10 py-3 group !font-sans flex items-center justify-center !rounded-full border-4 border-[#903749] bg-[#903749] text-white hover:bg-[#7a2e3d] hover:border-[#7a2e3d] transition-all !shadow-none hover:!shadow-lg transform">
                <Swords className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" /> START BATTLE
              </Link>

              <Link href="/tournament" className="text-lg px-10 py-3 group !font-sans flex items-center justify-center !rounded-full border-4 border-white bg-white !text-[#903749] hover:bg-[#903749] hover:border-[#903749] hover:!text-white transition-all !shadow-none hover:!shadow-lg transform">
                <Trophy className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" /> JOIN TOURNAMENT
              </Link>
            </ScrollReveal>
          </main>
        </div>

        {/* Feature Sections (Shared Components remain) */}
        <GameFeatures />
        <HowItWorks />
        <Footer />
      </div>
    );
  };

  if (!isMounted) return null; // Avoid hydration mismatch on initial load

  return isMobile ? renderMobile() : renderDesktop();
}