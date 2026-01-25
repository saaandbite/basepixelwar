"use client";

import { useState } from "react";
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
    Link2
} from "lucide-react";

interface HelpOverlayProps {
    customTrigger?: React.ReactNode;
}

export default function HelpOverlay({ customTrigger }: HelpOverlayProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Custom Trigger or Default Floating Button */}
            {customTrigger ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                    {customTrigger}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-4 bg-[var(--pixel-blue)] text-white rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all border-4 border-white group animate-bounce-in"
                    aria-label="Help & Guide"
                >
                    <HelpCircle size={32} className="group-hover:rotate-12 transition-transform" />

                    {/* Pixel Tooltip */}
                    <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-black text-white text-xs font-retro border-2 border-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        GAME GUIDE
                    </span>
                </button>
            )}

            {/* Overlay Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-terminal text-[20px]">
                    <div className="bg-[var(--pixel-bg)] border-4 border-white rounded-[2rem] w-full max-w-4xl h-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">

                        {/* Decorative Scanlines */}
                        <div className="scanline absolute inset-0 pointer-events-none opacity-50 z-0" />

                        {/* Header */}
                        <div className="relative z-10 p-6 border-b-4 border-white/10 bg-[#13131f] flex items-center justify-between shrink-0">
                            <h2 className="text-2xl sm:text-3xl font-retro text-[var(--pixel-yellow)] flex items-center gap-4 text-shadow-hard">
                                <Gamepad2 size={32} />
                                PIXEL WARS MANUAL
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 text-white hover:text-[var(--pixel-red)] rounded-xl transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="relative z-10 p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">

                            {/* Intro Box */}
                            <div className="pixel-box bg-white/5 border-2 border-white/20 text-white leading-relaxed text-xl">
                                <span className="text-[var(--pixel-blue)] font-bold">PIXEL WAR</span> IS A REAL-TIME PVP ARENA.
                                FIGHT FOR TERRITORY. EARN ETHEREUM.
                            </div>

                            {/* How to Play Steps */}
                            <section>
                                <h3 className="text-xl font-retro text-white mb-6 flex items-center gap-3 border-b-2 border-white/10 pb-2">
                                    <Lightbulb className="text-[var(--pixel-yellow)]" />
                                    HOW TO PLAY
                                </h3>

                                <div className="grid sm:grid-cols-2 gap-6">
                                    {/* Step 1 */}
                                    <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[var(--pixel-blue)] transition-colors group">
                                        <div className="font-retro text-[var(--pixel-blue)] mb-2 flex items-center gap-2 text-lg">
                                            <Zap size={20} /> Step 1
                                        </div>
                                        <div className="font-bold text-white mb-1">CONNECT & PAY</div>
                                        <p className="text-[var(--pixel-fg)] opacity-80 text-lg">
                                            Connect Base Wallet. Pay 0.001 ETH entry fee.
                                        </p>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[var(--pixel-red)] transition-colors group">
                                        <div className="font-retro text-[var(--pixel-red)] mb-2 flex items-center gap-2 text-lg">
                                            <Crosshair size={20} className="group-hover:rotate-45 transition-transform" /> Step 2
                                        </div>
                                        <div className="font-bold text-white mb-1">AIM & SHOOT</div>
                                        <p className="text-[var(--pixel-fg)] opacity-80 text-lg">
                                            Click & Hold to shoot. Slide to aim (Desktop/Mobile).
                                        </p>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[var(--pixel-green)] transition-colors group">
                                        <div className="font-retro text-[var(--pixel-green)] mb-2 flex items-center gap-2 text-lg">
                                            <Flag size={20} /> Step 3
                                        </div>
                                        <div className="font-bold text-white mb-1">CAPTURE ZONES</div>
                                        <p className="text-[var(--pixel-fg)] opacity-80 text-lg">
                                            Cover the grid with your color. Capture Golden Pixel for Frenzy!
                                        </p>
                                    </div>

                                    {/* Step 4 */}
                                    <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[var(--pixel-yellow)] transition-colors group">
                                        <div className="font-retro text-[var(--pixel-yellow)] mb-2 flex items-center gap-2 text-lg">
                                            <Coins size={20} /> Step 4
                                        </div>
                                        <div className="font-bold text-white mb-1">WIN ETH</div>
                                        <p className="text-[var(--pixel-fg)] opacity-80 text-lg">
                                            Winner takes 0.00198 ETH instantly via Smart Contract.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Pro Tips */}
                                <div className="pixel-box border-2 border-[var(--pixel-pink)] bg-[var(--pixel-pink)]/5">
                                    <h3 className="text-lg font-retro text-[var(--pixel-pink)] mb-4 uppercase">
                                        PRO STRATEGIES
                                    </h3>
                                    <ul className="space-y-4">
                                        <li className="flex gap-3 text-lg text-white items-start">
                                            <span className="text-[var(--pixel-pink)]">»</span>
                                            <span>Use <strong className="text-[var(--pixel-pink)]">Ink Bomb</strong> to clear large enemy areas.</span>
                                        </li>
                                        <li className="flex gap-3 text-lg text-white items-start">
                                            <span className="text-[var(--pixel-pink)]">»</span>
                                            <span><strong className="text-[var(--pixel-pink)]">Shotgun</strong> is best for close range defense.</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Network */}
                                <div className="pixel-box border-2 border-[var(--pixel-blue)] bg-[var(--pixel-blue)]/5">
                                    <h3 className="text-lg font-retro text-[var(--pixel-blue)] mb-4 uppercase">
                                        NETWORK
                                    </h3>
                                    <p className="text-white text-lg">
                                        Running on <strong className="text-[var(--pixel-blue)]">BASE L2</strong>.
                                        <br />
                                        Fast transactions. Low gas. Instant payouts.
                                    </p>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="pixel-btn pixel-btn-primary w-full md:w-auto text-xl px-12 py-4 !rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    BACK TO BATTLE
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Helper icons not imported
function Crosshair({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
        </svg>
    )
}
