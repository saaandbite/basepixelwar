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
    Crosshair
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

    // Portal content to body to escape parent stacking contexts (transforms/filters)
    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-terminal text-[20px]">
            <div className="bg-[#13131f] border-4 border-white rounded-[2rem] w-full max-w-4xl h-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">

                {/* Decorative Scanlines */}
                <div className="scanline absolute inset-0 pointer-events-none opacity-50 z-0" />

                {/* Header */}
                <div className="relative z-10 p-6 border-b-4 border-white/10 bg-[#1e1e2e] flex items-center justify-between shrink-0">
                    <h2 className="text-2xl sm:text-3xl font-retro text-[#f1c40f] flex items-center gap-4 text-shadow-hard">
                        <Gamepad2 size={32} />
                        PIXEL WARS MANUAL
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/10 text-white hover:text-[#e74c3c] rounded-xl transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="relative z-10 p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10 text-white">

                    {/* Intro Box */}
                    <div className="pixel-box bg-white/5 border-2 border-white/20 p-6 leading-relaxed text-xl rounded-xl">
                        <span className="text-[#0984e3] font-bold">PIXEL WAR</span> IS A REAL-TIME PVP ARENA.
                        FIGHT FOR TERRITORY. EARN ETHEREUM.
                    </div>

                    {/* How to Play Steps */}
                    <section>
                        <h3 className="text-xl font-retro text-white mb-6 flex items-center gap-3 border-b-2 border-white/10 pb-2">
                            <Lightbulb className="text-[#f1c40f]" />
                            HOW TO PLAY
                        </h3>

                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* Step 1 */}
                            <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[#0984e3] transition-colors group">
                                <div className="font-retro text-[#0984e3] mb-2 flex items-center gap-2 text-lg">
                                    <Zap size={20} /> Step 1
                                </div>
                                <div className="font-bold text-white mb-1">CONNECT & PAY</div>
                                <p className="text-white/80 text-lg">
                                    Connect Base Wallet. Pay 0.001 ETH entry fee.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[#e74c3c] transition-colors group">
                                <div className="font-retro text-[#e74c3c] mb-2 flex items-center gap-2 text-lg">
                                    <Crosshair size={20} className="group-hover:rotate-45 transition-transform" /> Step 2
                                </div>
                                <div className="font-bold text-white mb-1">AIM & SHOOT</div>
                                <p className="text-white/80 text-lg">
                                    Click & Hold to shoot. Slide to aim (Desktop/Mobile).
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[#00b894] transition-colors group">
                                <div className="font-retro text-[#00b894] mb-2 flex items-center gap-2 text-lg">
                                    <Flag size={20} /> Step 3
                                </div>
                                <div className="font-bold text-white mb-1">CAPTURE ZONES</div>
                                <p className="text-white/80 text-lg">
                                    Cover the grid with your color. Capture Golden Pixel for Frenzy!
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="bg-[#0f0f1a] p-5 rounded-2xl border-2 border-white/10 hover:border-[#f1c40f] transition-colors group">
                                <div className="font-retro text-[#f1c40f] mb-2 flex items-center gap-2 text-lg">
                                    <Coins size={20} /> Step 4
                                </div>
                                <div className="font-bold text-white mb-1">WIN ETH</div>
                                <p className="text-white/80 text-lg">
                                    Winner takes 0.00198 ETH instantly via Smart Contract.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Pro Tips */}
                        <div className="pixel-box border-2 border-[#ff8ba7] bg-[#ff8ba7]/5 p-6 rounded-xl">
                            <h3 className="text-lg font-retro text-[#ff8ba7] mb-4 uppercase">
                                PRO STRATEGIES
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex gap-3 text-lg text-white items-start">
                                    <span className="text-[#ff8ba7]">»</span>
                                    <span>Use <strong className="text-[#ff8ba7]">Ink Bomb</strong> to clear large enemy areas.</span>
                                </li>
                                <li className="flex gap-3 text-lg text-white items-start">
                                    <span className="text-[#ff8ba7]">»</span>
                                    <span><strong className="text-[#ff8ba7]">Shotgun</strong> is best for close range defense.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Network */}
                        <div className="pixel-box border-2 border-[#0984e3] bg-[#0984e3]/5 p-6 rounded-xl">
                            <h3 className="text-lg font-retro text-[#0984e3] mb-4 uppercase">
                                NETWORK
                            </h3>
                            <p className="text-white text-lg">
                                Running on <strong className="text-[#0984e3]">BASE L2</strong>.
                                <br />
                                Fast transactions. Low gas. Instant payouts.
                            </p>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="pt-4 flex justify-center">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="bg-[#0984e3] hover:bg-[#74b9ff] text-white text-xl px-12 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-retro uppercase border-b-4 border-[#06528d]"
                        >
                            BACK TO BATTLE
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
