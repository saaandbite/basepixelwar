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
import styles from "../page.module.css"; // Reuse some styles or create new ones? Let's use clean tailwind for this component to be safe and independent.

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
                    Butuh bantuan? Klik untuk panduan bermain PixelWar
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
                                PixelWar adalah arena PvP real-time di mana pemain bertarung untuk menguasai wilayah dan mendapatkan reward secara on-chain.
                            </div>

                            {/* How to Play Steps */}
                            <section>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🕹️</span> Cara Bermain
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Zap size={16} /></span>
                                            1. Connect Wallet
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Hubungkan wallet kamu untuk mulai bermain.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><Gamepad2 size={16} /></span>
                                            2. Start Game
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Masuk ke arena dan pilih wilayah target.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><Swords size={16} /></span>
                                            3. Battle Real-Time
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Bertarung melawan pemain lain secara langsung.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Flag size={16} /></span>
                                            4. Claim Territory
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Menangkan pertarungan untuk menguasai area.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all sm:col-span-2">
                                        <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center"><Coins size={16} /></span>
                                            5. Earn Rewards
                                        </div>
                                        <p className="text-sm text-gray-600 pl-10">Dapatkan reward dan naikkan peringkat leaderboard.</p>
                                    </div>
                                </div>
                            </section>

                            <div className="grid sm:grid-cols-2 gap-6">
                                {/* Tips */}
                                <section className="bg-yellow-50/50 p-5 rounded-xl border border-yellow-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="text-xl">⚠️</span> Tips Singkat
                                    </h3>
                                    <ul className="space-y-2">
                                        <li className="flex gap-2 text-sm text-gray-700">
                                            <span className="text-yellow-500">•</span> Perhatikan timing serangan
                                        </li>
                                        <li className="flex gap-2 text-sm text-gray-700">
                                            <span className="text-yellow-500">•</span> Pilih wilayah dengan strategi
                                        </li>
                                        <li className="flex gap-2 text-sm text-gray-700">
                                            <span className="text-yellow-500">•</span> Semakin sering menang, semakin tinggi ranking kamu
                                        </li>
                                    </ul>
                                </section>

                                {/* Network Info */}
                                <section className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="text-xl">🔗</span> Network Info
                                    </h3>
                                    <p className="text-sm text-blue-900">
                                        Game ini berjalan di <strong>Base Network</strong> dengan settlement on-chain instan untuk keamanan dan transparansi maksimal.
                                    </p>
                                </section>
                            </div>

                            {/* Goal */}
                            <div className="text-center p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white shadow-lg">
                                <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                                <h3 className="font-bold text-lg mb-2 text-yellow-400">Tujuan Game</h3>
                                <p className="text-gray-300">Kuasai wilayah sebanyak mungkin, kalahkan lawan, dan jadilah penguasa PixelWar.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Close Guide
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); /* Add any start game logic if needed */ }}
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
