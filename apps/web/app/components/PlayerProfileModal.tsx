import { X, Trophy, Wallet, Crosshair } from 'lucide-react';
import { formatEther } from 'viem';
import { usePlayerProfile } from '../hooks/usePlayerProfile';

interface PlayerProfileModalProps {
    walletAddress: string | null;
    onClose: () => void;
    isTournamentContext?: boolean;
}

export default function PlayerProfileModal({ walletAddress, onClose, isTournamentContext = false }: PlayerProfileModalProps) {
    const { profile, loading, error } = usePlayerProfile(walletAddress, isTournamentContext ? 'tournament' : 'global');

    if (!walletAddress) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-terminal" onClick={onClose}>
            {/* Main Card */}
            <div
                className="pixel-card w-full max-w-md bg-[var(--pixel-bg)] border-4 border-white rounded-[2rem] shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
                />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-white hover:text-[var(--pixel-red)] hover:bg-white/10 rounded-xl transition-colors z-20"
                >
                    <X className="w-8 h-8" />
                </button>

                <div className="p-8 relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 mx-auto bg-[var(--pixel-blue)] border-4 border-white rounded-[1.5rem] flex items-center justify-center mb-4 shadow-lg">
                            <span className="text-5xl font-retro text-white mt-2">
                                {profile?.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                        </div>
                        <h2 className="text-3xl font-retro text-white mb-2 tracking-wide">
                            {loading ? 'LOADING...' : (profile?.username || 'PLAYER')}
                        </h2>
                        <div className="flex items-center justify-center gap-2 text-[var(--pixel-fg)] text-lg opacity-70 bg-black/30 py-1 px-4 rounded-full inline-block border border-white/10">
                            <Wallet className="w-4 h-4" />
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-12 h-12 border-4 border-[var(--pixel-yellow)] border-t-transparent rounded-full animate-spin" />
                            <span className="animate-blink text-xl text-[var(--pixel-yellow)]">FETCHING DATA...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center text-[var(--pixel-red)] py-8 font-bold text-xl border-2 border-[var(--pixel-red)] bg-red-900/10 rounded-xl">
                            ERROR: {error}
                        </div>
                    ) : profile ? (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#1a1a2e] rounded-2xl p-4 border-2 border-white/10 text-center hover:border-[var(--pixel-blue)] transition-colors">
                                    <div className="flex items-center justify-center gap-2 text-[var(--pixel-blue)] text-sm mb-2 uppercase tracking-wider font-bold">
                                        <Crosshair className="w-4 h-4" />
                                        VICTORIES
                                    </div>
                                    <div className="text-3xl font-retro text-white">
                                        {profile.stats.wins}
                                    </div>
                                </div>
                                <div className="bg-[#1a1a2e] rounded-2xl p-4 border-2 border-white/10 text-center hover:border-[var(--pixel-yellow)] transition-colors">
                                    <div className="flex items-center justify-center gap-2 text-[var(--pixel-yellow)] text-sm mb-2 uppercase tracking-wider font-bold">
                                        <Trophy className="w-4 h-4" />
                                        EARNINGS
                                    </div>
                                    <div className="text-2xl font-retro text-white">
                                        {profile.stats.totalEarnings ? Number(formatEther(BigInt(Math.floor(profile.stats.totalEarnings)))).toFixed(4) : '0.000'}
                                    </div>
                                    <div className="text-xs text-[var(--pixel-fg)] opacity-50 mt-1">ETH</div>
                                </div>
                            </div>

                            {/* Trophy Showcase */}
                            <div className="bg-black/20 rounded-2xl p-6 border-2 border-white/10">
                                <h3 className="text-sm font-bold text-[var(--pixel-fg)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    <Trophy className="w-4 h-4 text-[var(--pixel-pink)]" />
                                    TROPHY CASE
                                </h3>

                                {profile.hasTrophy ? (
                                    <div className="bg-[var(--pixel-yellow)]/10 border-2 border-[var(--pixel-yellow)] rounded-xl p-4 flex items-center gap-4 animate-pulse">
                                        <div className="w-16 h-16 bg-[var(--pixel-yellow)] rounded-lg flex items-center justify-center shrink-0 border-2 border-black">
                                            <Trophy className="w-8 h-8 text-black" />
                                        </div>
                                        <div>
                                            <div className="font-retro text-[var(--pixel-yellow)] text-sm mb-1">CHAMPION</div>
                                            <div className="text-xs text-white/80">Weekly Winner</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-[var(--pixel-fg)] text-lg opacity-50 border-2 border-dashed border-white/20 rounded-xl">
                                        NO TROPHIES YET
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
