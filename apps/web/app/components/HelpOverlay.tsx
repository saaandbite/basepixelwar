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

export default function HelpOverlay() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Button - Icon Only */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-3.5 bg-white text-[#FF8BA7] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 group border-2 border-[#FFE5E5]"
                aria-label="Help & Guide"
            >
                <HelpCircle size={24} className="group-hover:rotate-12 transition-transform" />

                {/* Tooltip */}
                <span className="absolute right-0 bottom-full mb-2 w-32 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center whitespace-nowrap">
                    Game Guide
                </span>
            </button>

            {/* Overlay Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] sm:flex sm:items-center sm:justify-center sm:p-4 bg-gradient-to-b from-[#FFE5E5] to-[#FFC6C6] sm:bg-black/50 sm:backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 relative flex flex-col"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white/95 backdrop-blur z-10 p-4 sm:p-6 border-b border-[#FFE5E5] flex items-center justify-between shrink-0">
                            <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center">
                                    <Gamepad2 size={20} />
                                </span>
                                PixelWar Guide
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-[#FFE5E5] rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1">

                            {/* Intro */}
                            <div className="bg-[#FFF8F4] p-4 rounded-xl border border-[#FFE5E5] text-[#1F2937] leading-relaxed font-medium">
                                <span className="text-[#FF8BA7] font-bold">PixelWar</span> is a real-time PvP arena where players fight to control territory and earn rewards on-chain.
                            </div>

                            {/* How to Play Steps */}
                            <section>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center">
                                        <Gamepad2 size={16} />
                                    </span>
                                    How to Play
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-[#FFFAFA] hover:bg-white hover:shadow-md border border-[#FFE5E5] transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center"><Zap size={16} /></span>
                                            1. Connect & Pay
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Connect wallet (Base Network) and pay 0.001 ETH entry fee.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#FFFAFA] hover:bg-white hover:shadow-md border border-[#FFE5E5] transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center"><Gamepad2 size={16} /></span>
                                            2. Aim & Shoot
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10"><strong>Tap/Click & Hold</strong> to shoot. Slide to aim the cannon.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#FFFAFA] hover:bg-white hover:shadow-md border border-[#FFE5E5] transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center"><Swords size={16} /></span>
                                            3. Weapons & Ink
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Choose weapon: <strong>Machine Gun</strong> (Fast), <strong>Shotgun</strong> (Spread), or <strong>Ink Bomb</strong> (Area). Watch your Ink Level!</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#FFFAFA] hover:bg-white hover:shadow-md border border-[#FFE5E5] transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center"><Flag size={16} /></span>
                                            4. Capture Territory
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Color as many grids as possible. Capture the <strong>Golden Pixel</strong> for FRENZY mode!</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-yellow-50 hover:bg-white hover:shadow-md border border-yellow-200 transition-all sm:col-span-2">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center"><Coins size={16} /></span>
                                            5. Win Rewards
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Winner gets <strong>0.00198 ETH</strong> sent directly to wallet (Instant Settlement).</p>
                                    </div>
                                </div>
                            </section>

                            <div className="grid sm:grid-cols-2 gap-6">
                                {/* Tips */}
                                <section className="bg-[#FFF8F4] p-5 rounded-xl border border-[#FFCDD2]">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center">
                                            <Lightbulb size={16} />
                                        </span>
                                        Pro Tips
                                    </h3>
                                    <ul className="space-y-2">
                                        <li className="flex gap-2 text-sm text-gray-700 items-start">
                                            <span className="text-[#FF8BA7] mt-0.5">•</span>
                                            <span>
                                                Use <strong>Ink Bomb</strong> to capture large enemy areas.
                                            </span>
                                        </li>
                                        <li className="flex gap-2 text-sm text-gray-700 items-start">
                                            <span className="text-[#FF8BA7] mt-0.5">•</span>
                                            <span>
                                                <strong>Machine Gun</strong> is good for capturing the Golden Pixel quickly.
                                            </span>
                                        </li>
                                        <li className="flex gap-2 text-sm text-gray-700 items-start">
                                            <span className="text-[#FF8BA7] mt-0.5">•</span>
                                            <span>
                                                Create <strong>Capture Combos</strong> for higher scores!
                                            </span>
                                        </li>
                                    </ul>
                                </section>

                                {/* Network Info */}
                                <section className="bg-[#FFF8F4] p-5 rounded-xl border border-[#FFCDD2]">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-lg bg-[#FFE5E5] text-[#FF8BA7] flex items-center justify-center">
                                            <Link2 size={16} />
                                        </span>
                                        Network Info
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        This game runs on <strong className="text-[#FF8BA7]">Base Network</strong> with instant on-chain settlement for maximum security and transparency.
                                    </p>
                                </section>
                            </div>

                            {/* Goal */}
                            <div className="text-center p-6 bg-gradient-to-br from-[#1F2937] to-[#374151] rounded-2xl text-white shadow-lg border border-[#FF8BA7]/20">
                                <Trophy className="w-10 h-10 text-[#F9C74F] mx-auto mb-3" />
                                <h3 className="font-bold text-lg mb-2 text-[#F9C74F]">Game Goal</h3>
                                <p className="text-gray-300">Control as much territory as possible, defeat opponents, and become the ruler of PixelWar.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-6 sm:pb-0">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-3 px-6 bg-[#FFE5E5] hover:bg-[#FFCDD2] text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Close Guide
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); }}
                                    className="flex-1 py-3 px-6 bg-[#FF8BA7] hover:bg-[#FF7B9C] text-white font-bold rounded-xl shadow-lg shadow-[#FF8BA7]/30 transition-all transform hover:-translate-y-0.5"
                                >
                                    Start Playing
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
