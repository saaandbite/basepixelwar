"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    HelpCircle,
    X,
    Gamepad2,
    Swords,
    Flag,
    Coins,
    Trophy,
    Zap,
    Lightbulb,
    Link2,
    Crosshair,
    Target,
    MousePointer2
} from "lucide-react";

interface HelpOverlayProps {
    customTrigger?: React.ReactNode;
}

export default function HelpOverlay({ customTrigger }: HelpOverlayProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reusing the Style System from Play Page
    const cardBaseClass = "relative bg-[#13131f] border border-white/10 p-6 group transition-all duration-300 hover:-translate-y-1 overflow-hidden shadow-lg rounded-xl";
    const cornerBracketClass = "absolute w-4 h-4 transition-colors duration-300 z-20"; // Slightly smaller for modal
    const iconContainerClass = "relative w-12 h-12 mb-3 flex items-center justify-center z-10";
    const iconBgClass = "absolute inset-0 border border-white/30 skew-x-6 group-hover:skew-x-0 transition-transform duration-300 bg-black/20";
    const iconFillClass = "absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-300";

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

    // Card Component to reduce repetition
    const ManualCard = ({ title, activeColor, icon: Icon, step, description, bgColor }: any) => (
        <div className={`relative ${cardBaseClass} ${bgColor} flex flex-col items-center text-center h-full`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={pixelPattern}></div>

            {/* Tech Corners */}
            <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/40 group-hover:border-white`}></div>
            <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/40 group-hover:border-white`}></div>
            <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/40 group-hover:border-white`}></div>
            <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white/40 group-hover:border-white`}></div>

            <div className="relative z-10 w-full flex flex-col items-center">
                {/* Step Pill */}
                <div className="mb-4 px-3 py-1 bg-black/20 rounded-full border border-white/20 text-white text-[10px] font-bold font-sans uppercase tracking-widest">
                    STEP {step}
                </div>

                <div className={`${iconContainerClass} mx-auto mb-2`}>
                    <div className={iconBgClass}></div>
                    <div className={`${iconFillClass} bg-white`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                </div>

                <h3 className="font-retro text-xl mb-3 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                    {title}
                </h3>
                <p className="font-sans font-medium text-sm text-white/90 leading-relaxed px-2">
                    {description}
                </p>
            </div>
        </div>
    );

    // Portal content
    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="relative bg-[#0f0f1a] border-4 border-white/20 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={pixelPattern}></div>

                {/* Header */}
                <div className="relative z-10 p-6 sm:p-8 bg-[#181825] border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#2d1b2e] rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                            <Gamepad2 size={24} className="text-[#ff8ba7]" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black font-retro text-white tracking-wide drop-shadow-[2px_2px_0_#903749]">
                                GAME MANUAL
                            </h2>
                            <p className="text-white/60 text-xs font-bold font-sans tracking-widest uppercase">
                                OFFICIAL BATTLE GUIDE
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white hover:text-red-400 rounded-xl transition-all border border-white/5 hover:border-red-400/30"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">

                    {/* Welcome Banner */}
                    <div className="mb-10 text-center">
                        <h3 className="text-xl text-white font-sans font-medium leading-relaxed max-w-2xl mx-auto">
                            <span className="text-[#ff8ba7] font-black">PIXEL WAR</span> IS A REAL-TIME PVP ARENA.
                            <br />
                            FIGHT FOR TERRITORY. EARN ETHEREUM.
                        </h3>
                    </div>

                    {/* STEPS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <ManualCard
                            step="1"
                            title="CONNECT & PAY"
                            icon={Zap}
                            bgColor="bg-[#00b894] hover:bg-[#00ceb0]" // Greenish
                            description="Connect Base Wallet. Pay 0.001 ETH entry fee to join the arena."
                        />
                        <ManualCard
                            step="2"
                            title="AIM & SHOOT"
                            icon={Target}
                            bgColor="bg-[#d63031] hover:bg-[#ff4757]" // Red
                            description="Click & Hold to fire. Slide cursor to aim. Destroy enemies."
                        />
                        <ManualCard
                            step="3"
                            title="CAPTURE ZONES"
                            icon={Flag}
                            bgColor="bg-[#0984e3] hover:bg-[#74b9ff]" // Blue
                            description="Cover the grid with your color. Control space to earn points."
                        />
                        <ManualCard
                            step="4"
                            title="WIN ETH"
                            icon={Coins}
                            bgColor="bg-[#e1b12c] hover:bg-[#fbc531]" // Gold
                            description="Winner takes the pot via Smart Contract. Instant payout."
                        />
                    </div>

                    {/* Pro Strategies (Wide) */}
                    <div className="relative bg-[#2d1b2e] border border-white/10 p-8 rounded-xl group hover:border-[#ff8ba7]/50 transition-colors mb-8">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={pixelPattern}></div>
                        {/* Corners */}
                        <div className={`${cornerBracketClass} top-0 left-0 border-t-2 border-l-2 border-white/30 group-hover:border-[#ff8ba7]`}></div>
                        <div className={`${cornerBracketClass} top-0 right-0 border-t-2 border-r-2 border-white/30 group-hover:border-[#ff8ba7]`}></div>
                        <div className={`${cornerBracketClass} bottom-0 left-0 border-b-2 border-l-2 border-white/30 group-hover:border-[#ff8ba7]`}></div>
                        <div className={`${cornerBracketClass} bottom-0 right-0 border-b-2 border-r-2 border-white/30 group-hover:border-[#ff8ba7]`}></div>

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                            <div className="w-16 h-16 bg-[#ff8ba7]/20 rounded-full flex items-center justify-center shrink-0 border border-[#ff8ba7]/30">
                                <Lightbulb className="w-8 h-8 text-[#ff8ba7]" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="font-retro text-2xl text-white mb-2">PRO STRATEGIES</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                        <strong className="text-[#ff8ba7] block mb-1 font-sans text-sm tracking-wider uppercase">INK BOMB</strong>
                                        <p className="text-white/80 text-sm font-sans">Use bombs to clear large enemy clusters instantly and reset zones.</p>
                                    </div>
                                    <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                        <strong className="text-[#ff8ba7] block mb-1 font-sans text-sm tracking-wider uppercase">SHOTGUN DEFENSE</strong>
                                        <p className="text-white/80 text-sm font-sans">Wait for enemies to get close, then bast them for max damage.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Network Info */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#0984e3]/10 border border-[#0984e3]/30 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-[#0984e3] animate-pulse" />
                            <span className="text-[#0984e3] font-bold font-sans text-sm tracking-widest uppercase">
                                POWERED BY BASE L2 • LOW GAS • INSTANT
                            </span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center pb-8">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="group relative px-10 py-4 bg-white text-[#13131f] font-black font-sans text-xl tracking-wider uppercase rounded hover:bg-[#ff8ba7] transition-all overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                BACK TO BATTLE <Swords className="w-5 h-5" />
                            </span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Custom Trigger or Default Floating Button */}
            {customTrigger ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer w-full h-full">
                    {customTrigger}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-4 bg-[#0984e3] text-white rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all border-4 border-white group animate-bounce-in"
                    aria-label="Help & Guide"
                >
                    <HelpCircle size={32} className="group-hover:rotate-12 transition-transform" />

                    {/* Pixel Tooltip */}
                    <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-black text-white text-xs font-retro border-2 border-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        GAME GUIDE
                    </span>
                </button>
            )}

            {/* Render Modal via Portal */}
            {isOpen && mounted && createPortal(modalContent, document.body)}
        </>
    );
}
