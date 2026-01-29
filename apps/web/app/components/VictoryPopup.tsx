import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Trophy, Share2, X, Loader2, Sparkles } from 'lucide-react';
import { useUnclaimedRewards } from '../hooks/useUnclaimedRewards';
import { useClaimTrophy } from '../hooks/useClaimTrophy';

export default function VictoryPopup() {
    const { address } = useAccount();
    const { unclaimedRewards, isLoading, refetch } = useUnclaimedRewards();
    const [latestReward, setLatestReward] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Watch for new rewards
    useEffect(() => {
        if (unclaimedRewards.length > 0) {
            // Find the most recent reward (highest week number)
            const newest = unclaimedRewards[0];

            // Only show if we haven't dismissed it this session? 
            // For now, show if present.
            if (!latestReward || newest.week !== latestReward.week) {
                setLatestReward(newest);
                setIsVisible(true);
            }
        }
    }, [unclaimedRewards]);

    const handleShare = () => {
        if (!latestReward) return;
        const text = `I just won Week #${latestReward.week} in @BasePixelWar! 🏆\n\nRoom #${latestReward.roomId} • Score: ${latestReward.score}\n\nJoin the battle territory now!`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (!isVisible || !latestReward) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
            <div className="relative w-full max-w-md mx-4">
                {/* Confetti / Sparkles */}
                <div className="absolute -top-12 -left-12 text-[var(--pixel-yellow)] animate-pulse"><Sparkles className="w-8 h-8" /></div>
                <div className="absolute -bottom-8 -right-8 text-[var(--pixel-blue)] animate-pulse delay-75"><Sparkles className="w-12 h-12" /></div>

                {/* Card */}
                <div className="pixel-card bg-[#1a1a2e] border-4 border-[var(--pixel-yellow)] rounded-[2rem] p-8 shadow-[0_0_50px_rgba(255,215,0,0.3)] text-center relative overflow-hidden">

                    {/* Close Button */}
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Content */}
                    <div className="mb-6 animate-bounce-slow">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-b from-[var(--pixel-yellow)] to-orange-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl mb-4">
                            <Trophy className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-retro text-[var(--pixel-yellow)] mb-2 uppercase tracking-wide text-shadow-sm">
                            VICTORY!
                        </h2>
                        <p className="text-white/80 font-retro text-lg">
                            You won Week #{latestReward.week}
                        </p>
                    </div>

                    <div className="bg-black/30 rounded-xl p-4 border border-white/10 mb-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <div className="text-[10px] text-[var(--pixel-fg)] opacity-60 uppercase mb-1">Room</div>
                                <div className="font-bold text-white text-xl">#{latestReward.roomId}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-[var(--pixel-fg)] opacity-60 uppercase mb-1">Score</div>
                                <div className="font-bold text-[var(--pixel-blue)] text-xl">{latestReward.score}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <ClaimButton
                            week={latestReward.week}
                            onSuccess={() => {
                                refetch();
                            }}
                        />

                        <button
                            onClick={handleShare}
                            className="w-full bg-[#1da1f2] hover:bg-[#1a91da] text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 group border-b-4 border-[#117eb8]"
                        >
                            <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            SHARE ACHIEVEMENT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ClaimButton({ week, onSuccess }: { week: number; onSuccess: () => void }) {
    const { claim, isPending, isConfirming, isSuccess, hasClaimed, error } = useClaimTrophy(week);
    const [hasFiredSuccess, setHasFiredSuccess] = useState(false);

    // Track success state safely at top level
    useEffect(() => {
        if ((isSuccess || hasClaimed) && !hasFiredSuccess) {
            setHasFiredSuccess(true);
            onSuccess();
        }
    }, [isSuccess, hasClaimed, hasFiredSuccess, onSuccess]);

    if (isSuccess || hasClaimed) {
        return (
            <button disabled className="w-full bg-[var(--pixel-green)] text-black font-bold py-3 px-6 rounded-xl border-b-4 border-green-700 cursor-default">
                ✓ REWARD CLAIMED
            </button>
        );
    }

    return (
        <div className="w-full">
            <button
                onClick={claim}
                disabled={isPending || isConfirming}
                className="w-full bg-[var(--pixel-yellow)] text-black font-bold py-3 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-yellow-600 flex items-center justify-center gap-2"
            >
                {isPending || isConfirming ? (
                    <><Loader2 className="animate-spin w-5 h-5" /> CLAIMING...</>
                ) : (
                    'CLAIM REWARD'
                )}
            </button>
            {error && <p className="text-[var(--pixel-red)] text-xs mt-2 font-bold">{error.message.slice(0, 50)}...</p>}
        </div>
    );
}
