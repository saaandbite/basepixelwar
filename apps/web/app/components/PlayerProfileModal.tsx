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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-24 bg-purple-500/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 ring-4 ring-slate-800">
                            <span className="text-3xl font-bold text-white">
                                {profile?.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {loading ? 'Loading...' : (profile?.username || 'Unknown Player')}
                        </h2>
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-mono">
                            <Wallet className="w-3 h-3" />
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400 py-8">{error}</div>
                    ) : profile ? (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 text-center">
                                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">
                                        <Crosshair className="w-4 h-4" />
                                        Wins
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        {profile.stats.wins}
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 text-center">
                                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                        Earnings
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        {profile.stats.totalEarnings ? Number(formatEther(BigInt(Math.floor(profile.stats.totalEarnings)))).toFixed(4) : '0.000'} <span className="text-xs text-slate-500">ETH</span>
                                    </div>
                                </div>
                            </div>

                            {/* Trophy Showcase */}
                            <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    <Trophy className="w-4 h-4 text-purple-400" />
                                    Trophy Case
                                </h3>

                                {profile.hasTrophy ? (
                                    <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-4 group hover:bg-yellow-500/20 transition-all">
                                        <div className="w-16 h-16 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                            <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-lg" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-yellow-400 mb-1">PixelWar Champion</div>
                                            <div className="text-xs text-yellow-200/60">Weekly Tournament Winner</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-600 text-sm italic border border-dashed border-slate-700 rounded-xl">
                                        No trophies yet.
                                        <br />
                                        Win a tournament to earn one!
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
