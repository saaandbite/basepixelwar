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
    Zap
} from "lucide-react";

export default function HelpOverlay() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-white text-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 font-bold group border-2 border-gray-100"
                aria-label="Help & Guide"
            >
                <span className="bg-pink-100 text-pink-500 p-1 rounded-full group-hover:rotate-12 transition-transform">
                    <HelpCircle size={20} className="w-5 h-5" />
                </span>
                <span>Help</span>

                {/* Tooltip */}
                <span className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform translate-y-2 group-hover:translate-y-0 text-center">
                    Need help? Click for PixelWar game guide
                </span>
            </button>

            {/* Overlay Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white/95 backdrop-blur z-10 p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                                <span className="text-pink-500">🎮</span> PixelWar Guide
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-8">

                            {/* Intro */}
                            <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 text-pink-900 leading-relaxed font-medium">
                                PixelWar is a real-time PvP arena where players fight to control territory and earn rewards on-chain.
                            </div>

                            {/* How to Play Steps */}
                            <section>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🕹️</span> How to Play
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Zap size={16} /></span>
                                            1. Connect & Pay
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Connect wallet (Base Network) and pay 0.001 ETH entry fee.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><Gamepad2 size={16} /></span>
                                            2. Aim & Shoot
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10"><strong>Tap/Click & Hold</strong> to shoot. Slide to aim the cannon.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><Swords size={16} /></span>
                                            3. Weapons & Ink
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Choose weapon: <strong>Machine Gun</strong> (Fast), <strong>Shotgun</strong> (Spread), or <strong>Ink Bomb</strong> (Area). Watch your Ink Level!</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Flag size={16} /></span>
                                            4. Capture Territory
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Color as many grids as possible. Capture the <strong>Golden Pixel</strong> for FRENZY mode!</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all sm:col-span-2">
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
                                <section className="bg-yellow-50/50 p-5 rounded-xl border border-yellow-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="text-xl">⚠️</span> Pro Tips
                                    </h3>
                                    <ul className="space-y-2">
                                        <li className="flex gap-2 text-sm text-gray-700 items-start">
                                            <span className="text-yellow-500 mt-0.5">•</span>
                                            <span>
                                                Use <strong>Ink Bomb</strong> to capture large enemy areas.
                                            </span>
                                        </li>
                                        <li className="flex gap-2 text-sm text-gray-700 items-start">
                                            <span className="text-yellow-500 mt-0.5">•</span>
                                            <span>
                                                <strong>Machine Gun</strong> is good for capturing the Golden Pixel quickly.
                                            </span>
                                        </li>
                                        <li className="flex gap-2 text-sm text-gray-700 items-start">
                                            <span className="text-yellow-500 mt-0.5">•</span>
                                            <span>
                                                Create <strong>Capture Combos</strong> for higher scores!
                                            </span>
                                        </li>
                                    </ul>
                                </section>

                                {/* Network Info */}
                                <section className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="text-xl">🔗</span> Network Info
                                    </h3>
                                    <p className="text-sm text-blue-900">
                                        This game runs on <strong>Base Network</strong> with instant on-chain settlement for maximum security and transparency.
                                    </p>
                                </section>
                            </div>

                            {/* Goal */}
                            <div className="text-center p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white shadow-lg">
                                <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                                <h3 className="font-bold text-lg mb-2 text-yellow-400">Game Goal</h3>
                                <p className="text-gray-300">Control as much territory as possible, defeat opponents, and become the ruler of PixelWar.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Close Guide
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); }}
                                    className="flex-1 py-3 px-6 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-200 transition-all transform hover:-translate-y-0.5"
                                >
                                    Start Playing 🚀
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
