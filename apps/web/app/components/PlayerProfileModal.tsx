import { X, Trophy, Wallet, Crosshair, Gift, Loader2 } from 'lucide-react';
import { formatEther } from 'viem';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useUnclaimedRewards } from '../hooks/useUnclaimedRewards';
import { useClaimTrophy } from '../hooks/useClaimTrophy';
import { useNFTInventory } from '../hooks/useNFTInventory';
import { useAccount } from 'wagmi';

interface PlayerProfileModalProps {
    walletAddress: string | null;
    onClose: () => void;
    isTournamentContext?: boolean;
}

// Sub-component for claim button
function ClaimRewardButton({ week, onSuccess }: { week: number; onSuccess: () => void }) {
    const { claim, isPending, isConfirming, isSuccess, hasClaimed, error } = useClaimTrophy(week);

    if (isSuccess || hasClaimed) {
        onSuccess();
        return (
            <div className="text-[var(--pixel-green)] text-sm font-bold">✓ CLAIMED</div>
        );
    }

    return (
        <div>
            <button
                onClick={claim}
                disabled={isPending || isConfirming}
                className="pixel-btn bg-[var(--pixel-yellow)] text-black text-sm py-2 px-4 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
            >
                {isPending || isConfirming ? (
                    <><Loader2 className="animate-spin inline w-4 h-4 mr-1" /> CLAIMING...</>
                ) : (
                    '🎁 CLAIM'
                )}
            </button>
            {error && <p className="text-[var(--pixel-red)] text-xs mt-1">{error.message.slice(0, 40)}...</p>}
        </div>
    );
}

export default function PlayerProfileModal({ walletAddress, onClose, isTournamentContext = false }: PlayerProfileModalProps) {
    const { address } = useAccount();
    const { profile, loading, error } = usePlayerProfile(walletAddress, isTournamentContext ? 'tournament' : 'global');
    const { unclaimedRewards, isLoading: isLoadingRewards, refetch: refetchRewards } = useUnclaimedRewards();

    // Only show unclaimed rewards for the user's own profile
    const isOwnProfile = address?.toLowerCase() === walletAddress?.toLowerCase();

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

                            {/* Unclaimed Rewards Section - Only for own profile */}
                            {isOwnProfile && unclaimedRewards.length > 0 && (
                                <div className="bg-[var(--pixel-yellow)]/10 rounded-2xl p-4 border-2 border-[var(--pixel-yellow)] animate-pulse-slow">
                                    <h3 className="text-sm font-bold text-[var(--pixel-yellow)] mb-3 flex items-center gap-2 uppercase tracking-wider">
                                        <Gift className="w-4 h-4" />
                                        UNCLAIMED REWARDS
                                    </h3>
                                    <div className="space-y-2">
                                        {unclaimedRewards.map((reward) => (
                                            <div
                                                key={reward.week}
                                                className="bg-black/30 rounded-xl p-3 flex items-center justify-between border border-white/10"
                                            >
                                                <div>
                                                    <div className="font-retro text-white text-sm">WEEK #{reward.week}</div>
                                                    <div className="text-xs text-[var(--pixel-fg)] opacity-70">
                                                        Room #{reward.roomId} • {reward.score} pts
                                                    </div>
                                                </div>
                                                <ClaimRewardButton
                                                    week={reward.week}
                                                    onSuccess={() => refetchRewards()}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Trophy Showcase */}
                            <div className="bg-black/20 rounded-2xl p-6 border-2 border-white/10">
                                <h3 className="text-sm font-bold text-[var(--pixel-fg)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    <Trophy className="w-4 h-4 text-[var(--pixel-pink)]" />
                                    TROPHY CASE
                                </h3>

                                <TrophyGrid walletAddress={walletAddress} />
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function TrophyGrid({ walletAddress }: { walletAddress: string }) {
    const { nfts, loading, error } = useNFTInventory(walletAddress);

    if (loading) return <div className="text-center text-xs opacity-50">Loading trophies...</div>;
    if (error) return <div className="text-center text-red-500 text-xs">Failed load trophies</div>;
    if (nfts.length === 0) {
        return (
            <div className="text-center py-6 text-[var(--pixel-fg)] text-lg opacity-50 border-2 border-dashed border-white/20 rounded-xl">
                NO TROPHIES YET
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3">
            {nfts.map((nft) => (
                <a
                    key={nft.tokenId}
                    href={nft.openSeaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-black/40 border border-white/10 rounded-xl p-2 flex flex-col items-center hover:border-[var(--pixel-yellow)] transition-colors"
                >
                    <div className="w-full aspect-square bg-black/50 rounded-lg mb-2 overflow-hidden relative">
                        <img src={nft.image} alt={nft.name} className="object-contain w-full h-full" />
                    </div>
                    <div className="text-[10px] text-[var(--pixel-yellow)] font-bold mb-0.5">WEEK {nft.attributes.week}</div>
                    <div className="text-[9px] text-white/60">Room #{nft.attributes.roomSerial}</div>
                </a>
            ))}
        </div>
    );
}
