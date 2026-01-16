'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { Loader2, Trophy, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ABI for Tournament Contract
import { TOURNAMENT_ABI } from './abi';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

export default function TournamentPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();

    // Contract Reads
    const { data: currentWeek } = useReadContract({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: 'currentWeek',
        query: { refetchInterval: 10000 } // Refresh every 10s
    });

    const weekNum = currentWeek ? Number(currentWeek) : 0;

    // HYBRID SYSTEM: State for Room Data (Fetched from Backend)
    const [joinedRoomId, setJoinedRoomId] = useState<number>(0);
    const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
    const [isLoadingRoom, setIsLoadingRoom] = useState(false);

    const isJoined = joinedRoomId > 0;

    // Fetch Room Data from Backend API
    const fetchRoomData = async () => {
        if (!address || weekNum === 0) return;

        try {
            const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
            const res = await fetch(`${SERVER_URL}/api/tournament/room?wallet=${address}`);
            const data = await res.json();

            if (data.location) {
                setJoinedRoomId(data.location.roomId);
                setRoomPlayers(data.players || []);
            } else {
                setJoinedRoomId(0);
                setRoomPlayers([]);
            }
        } catch (err) {
            console.error("Failed to fetch room data:", err);
        }
    };

    // Initial Fetch
    useEffect(() => {
        if (address && weekNum > 0) {
            fetchRoomData();
        }
    }, [address, weekNum]);

    // Manual fetch for room prize pool (still from contract)
    const { data: roomData, refetch: refetchRoom } = useReadContract({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: 'rooms',
        args: [BigInt(weekNum), BigInt(joinedRoomId)],
        query: { enabled: isJoined && weekNum > 0 }
    });

    const prizePool = roomData ? (roomData as unknown as bigint) : 0n;

    // Actions
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // Handle Join Success -> Notify Backend
    useEffect(() => {
        if (isConfirmed && hash) {
            const notifyBackend = async () => {
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
                try {
                    await fetch(`${SERVER_URL}/api/tournament/join`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            walletAddress: address,
                            week: weekNum,
                            txHash: hash
                        })
                    });
                    // Refresh data
                    fetchRoomData();
                    refetchRoom();
                } catch (e) {
                    console.error("Backend join notification failed:", e);
                }
            };
            notifyBackend();
        }
    }, [isConfirmed, hash, address, weekNum, refetchRoom]);

    const handleJoin = () => {
        if (!TOURNAMENT_ADDRESS) return alert('Tournament Contract Address missing!');
        writeContract({
            address: TOURNAMENT_ADDRESS,
            abi: TOURNAMENT_ABI,
            functionName: 'joinTournament',
            value: parseEther('0.001')
        });
    };

    const handleClaim = (weekToClaim: number) => {
        writeContract({
            address: TOURNAMENT_ADDRESS,
            abi: TOURNAMENT_ABI,
            functionName: 'claimReward',
            args: [BigInt(weekToClaim)]
        });
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">P</div>
                            <span className="font-bold text-lg hidden sm:block">PixelWar</span>
                        </Link>
                        <div className="h-6 w-px bg-white/10 mx-2" />
                        <span className="text-sm font-medium text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                            Tournament Week #{weekNum}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Wallet>
                            <ConnectWallet className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors">
                                <Avatar className="h-6 w-6" />
                                <Name className="ml-2" />
                            </ConnectWallet>
                            <WalletDropdown>
                                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                                    <Avatar />
                                    <Name />
                                    <Address />
                                    <EthBalance />
                                </Identity>
                                <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">Wallet</WalletDropdownLink>
                                <WalletDropdownDisconnect />
                            </WalletDropdown>
                        </Wallet>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                        <div className="size-24 rounded-full bg-slate-800 flex items-center justify-center mb-4 ring-4 ring-slate-800 ring-offset-2 ring-offset-slate-950">
                            <Trophy className="size-12 text-yellow-500" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
                            Weekly Championship
                        </h1>
                        <p className="text-slate-400 max-w-lg text-lg leading-relaxed">
                            Compete in 10-player rooms. Top player wins the exclusive <span className="text-yellow-400 font-bold">PixelTrophy NFT</span>. Runner-ups win ETH.
                        </p>
                        <div className="pt-4">
                            <p className="text-sm text-slate-500 mb-2">Connect your wallet to enter</p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Status Card */}
                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />

                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                    <Trophy className="text-yellow-500" />
                                    Your Status
                                </h2>

                                {!isJoined ? (
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                            <AlertCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-bold text-blue-100">Ready to Join?</h3>
                                                <p className="text-blue-300/80 text-sm mt-1">
                                                    Entry Fee: <span className="text-white font-mono">0.001 ETH</span>. You will be placed in a room with 9 other players.
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleJoin}
                                            disabled={isPending || isConfirming}
                                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {(isPending || isConfirming) ? (
                                                <>
                                                    <Loader2 className="animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                "Join Tournament"
                                            )}
                                        </button>
                                        {writeError && (
                                            <p className="text-red-400 text-sm text-center">{writeError.message}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-800 rounded-xl border border-white/5">
                                                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Room ID</p>
                                                <p className="text-2xl font-mono font-bold text-white">#{joinedRoomId}</p>
                                            </div>
                                            <div className="p-4 bg-slate-800 rounded-xl border border-white/5">
                                                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Room Prize Pool</p>
                                                <p className="text-2xl font-mono font-bold text-green-400">{formatEther(prizePool)} ETH</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                                            <CheckCircle2 className="text-green-400 w-6 h-6" />
                                            <div>
                                                <p className="font-bold text-green-100">You are registered!</p>
                                                <p className="text-sm text-green-300/80">Play matches to earn score. Top 3 players win prizes.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Leaderboard Section (Only if joined) */}
                        {isJoined && (
                            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Users className="text-slate-400" />
                                        Room Players ({roomPlayers.length}/10)
                                    </h3>
                                    <span className="text-xs font-mono text-slate-500">Live Updates</span>
                                </div>

                                <div className="space-y-2">
                                    {roomPlayers.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 italic">
                                            Loading players or room is empty...
                                        </div>
                                    ) : (
                                        roomPlayers.map((p, i) => (
                                            <div key={p.walletAddress} className={`flex items-center justify-between p-3 rounded-lg border ${p.walletAddress?.toLowerCase() === address?.toLowerCase() ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/50 border-white/5'}`}>
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className={`font-mono text-sm ${p.walletAddress?.toLowerCase() === address?.toLowerCase() ? 'text-blue-200 font-bold' : 'text-slate-300'}`}>
                                                        {p.walletAddress} {p.walletAddress?.toLowerCase() === address?.toLowerCase() && '(You)'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Past Claims (Optional for MVP) */}
                        {/* Add Claim UI if user has pending rewards from previous weeks */}
                    </div>
                )}
            </main>
        </div>
    );
}
