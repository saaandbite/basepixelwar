'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { Loader2, Trophy, Users, AlertCircle, CheckCircle2, Swords, Timer, XCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// ABI for Tournament Contract
import { TOURNAMENT_ABI } from './abi';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

// Helper to get socket URL (same as useMultiplayer)
const getServerUrl = () => {
    // 1. Dynamic Detection (Best for LAN / Mobile Testing)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // If we are accessing via IP (e.g. 192.168.x.x) or special domain, use it!
        // We ignored the Env Var here because it often defaults to localhost in build time
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}:3000`;
        }
    }

    // 2. Fallback to Env Var (Production domain or configured localhost)
    if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL;

    // 3. Last Resort
    return 'http://localhost:3000';
};

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

    // Local State
    const [joinedRoomId, setJoinedRoomId] = useState<number>(0);
    const [isLoadingRoom, setIsLoadingRoom] = useState(false);

    // Lobby State
    const socketRef = useRef<Socket | null>(null);
    const [roomLeaderboard, setRoomLeaderboard] = useState<{ wallet: string; score: number }[]>([]);
    const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());

    // Challenge State
    const [incomingChallenge, setIncomingChallenge] = useState<{ challengerWallet: string; tournamentRoomId: string } | null>(null);
    const [isChallengePending, setIsChallengePending] = useState(false); // Waiting for *my* challenge to be accepted
    const [debugMsg, setDebugMsg] = useState<string>(''); // Temporary debug info

    const isJoined = joinedRoomId > 0;

    // Fetch Room Data from Backend API (Initial Check)
    const fetchRoomData = useCallback(async () => {
        if (!address || weekNum === 0) {
            setDebugMsg(`Wait: Addr=${!!address} Week=${weekNum}`);
            return;
        }

        try {
            // Use helper to get correct server URL (works for localhost, LAN, and prod)
            const SERVER_URL = getServerUrl();
            setDebugMsg(`Fetching: ${SERVER_URL}/api/tournament/room?wallet=${address?.slice(0, 6)}...`);

            const res = await fetch(`${SERVER_URL}/api/tournament/room?wallet=${address}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            setDebugMsg(`Success: Room=${data?.location?.roomId}`);

            if (data.location) {
                setJoinedRoomId(data.location.roomId);
                // We rely on Socket for live player list, but initial fetch gives comprehensive list
                if (data.players) {
                    // Initialize leaderboard with all registered players (score 0 if missing)
                    const initialLeaderboard = data.players.map((p: any) => ({
                        wallet: p.walletAddress,
                        score: 0 // Will be updated by socket
                    }));
                    setRoomLeaderboard(initialLeaderboard);
                }
            } else {
                setJoinedRoomId(0);
            }
        } catch (err) {
            console.error("Failed to fetch room data:", err);
        }
    }, [address, weekNum]);

    // Initial Fetch
    useEffect(() => {
        if (address && weekNum > 0) {
            fetchRoomData();
        }
    }, [address, weekNum, fetchRoomData]);

    // ==========================================
    // SOCKET LOBBY CONNECTION
    // ==========================================
    useEffect(() => {
        if (!isJoined || !address || !joinedRoomId || !weekNum) return;

        // Connect to Socket
        const socket = io(getServerUrl(), {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Tournament] Connected to Lobby Socket');
            // Join Lobby
            socket.emit('join_tournament_lobby', {
                week: weekNum,
                roomId: joinedRoomId.toString(),
                walletAddress: address
            });
        });

        // Event: Lobby State (Initial)
        socket.on('lobby_state', (data: { onlinePlayers: string[]; leaderboard: { wallet: string; score: number }[] }) => {
            console.log('[Tournament] Lobby State:', data);
            setOnlinePlayers(new Set(data.onlinePlayers.map(w => w.toLowerCase())));

            // Merge leaderboards safely
            setRoomLeaderboard(prev => {
                // If the socket provides a leaderboard, use it. 
                // But it might only include players who have scored.
                // We want to overlay scores onto the full list if possible.
                // For now, simpler approach: Use Socket Data directly if available, else prev.

                // Better approach: Update scores in existing list
                if (!data.leaderboard) return prev;

                // Create map of scores
                const scoreMap = new Map(data.leaderboard.map(p => [p.wallet.toLowerCase(), p.score]));

                // Update previous list (which has all registered players)
                const updated = prev.map(p => ({
                    ...p,
                    score: scoreMap.get(p.wallet.toLowerCase()) || p.score || 0
                }));

                // Add any new players from leaderboard that weren't in initial list (unlikely strict tournament but safe)
                data.leaderboard.forEach(lbPlayer => {
                    if (!updated.find(p => p.wallet.toLowerCase() === lbPlayer.wallet.toLowerCase())) {
                        updated.push(lbPlayer);
                    }
                });

                return updated;
            });
        });

        // Event: Player Update (Another player online/offline)
        socket.on('lobby_player_update', (data: { walletAddress: string; isOnline: boolean }) => {
            setOnlinePlayers(prev => {
                const next = new Set(prev);
                const w = data.walletAddress.toLowerCase();
                if (data.isOnline) next.add(w);
                else next.delete(w);
                return next;
            });
        });

        // Event: Leaderboard Update
        socket.on('lobby_leaderboard_update', (data: { wallet: string; score: number }[]) => {
            setRoomLeaderboard(prev => {
                const scoreMap = new Map(data.map(p => [p.wallet.toLowerCase(), p.score]));
                const updated = prev.map(p => ({
                    ...p,
                    score: scoreMap.get(p.wallet.toLowerCase()) ?? p.score ?? 0
                }));
                return updated;
            });
        });

        // Event: Challenge Received
        socket.on('challenge_received', (data: { challengerWallet: string; tournamentRoomId: string }) => {
            console.log("Challenge Received!", data);
            // Only show if not already busy?
            setIncomingChallenge(data);
        });

        // Event: Challenge Failed
        socket.on('challenge_failed', (data: { reason: string }) => {
            alert(`Challenge Failed: ${data.reason}`);
            setIsChallengePending(false);
        });

        // Event: Game Start (Redirect)
        socket.on('game_start', (data: any) => {
            console.log("Game Start!", data);
            // Save Session for Game Page
            sessionStorage.setItem('pvp_mode', 'true');
            sessionStorage.setItem('pvp_room_id', data.roomId);
            sessionStorage.setItem('pvp_team', data.yourTeam);
            // Use router to push
            router.push('/play/game');
        });

        return () => {
            socket.disconnect();
        };
    }, [isJoined, address, joinedRoomId, weekNum, router]);


    // ==========================================
    // ACTIONS
    // ==========================================

    // Send Challenge
    const handleChallenge = (targetWallet: string) => {
        if (!socketRef.current) return;
        setIsChallengePending(true);
        socketRef.current.emit('challenge_player', {
            targetWallet,
            tournamentRoomId: joinedRoomId.toString()
        });

        // Timeout safeguard
        setTimeout(() => setIsChallengePending(false), 10000);
    };

    // Accept Challenge
    const handleAccept = () => {
        if (!socketRef.current || !incomingChallenge) return;

        socketRef.current.emit('accept_challenge', {
            challengerWallet: incomingChallenge.challengerWallet,
            tournamentRoomId: joinedRoomId.toString(),
            week: weekNum
        });
        setIncomingChallenge(null);
    };

    const handleDecline = () => {
        setIncomingChallenge(null);
        // Optional: Emit decline event so sender knows
    };


    // Contract stuff remains for Joining
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed && hash) {
            const notifyBackend = async () => {
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
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
                    fetchRoomData();
                } catch (e) {
                    console.error("Backend join notification failed:", e);
                }
            };
            notifyBackend();
        }
    }, [isConfirmed, hash, address, weekNum, fetchRoomData]);

    const handleJoin = () => {
        if (!TOURNAMENT_ADDRESS) return alert('Tournament Contract Address missing!');
        writeContract({
            address: TOURNAMENT_ADDRESS,
            abi: TOURNAMENT_ABI,
            functionName: 'joinTournament',
            value: parseEther('0.001')
        });
    };

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
                                        <div className="flex items-center justify-between">
                                            <div className="p-4 bg-slate-800 rounded-xl border border-white/5 w-full mr-4">
                                                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Room ID</p>
                                                <p className="text-2xl font-mono font-bold text-white">#{joinedRoomId}</p>
                                            </div>

                                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl w-full flex items-center gap-3">
                                                <CheckCircle2 className="text-green-400 w-10 h-10" />
                                                <div>
                                                    <p className="font-bold text-green-100">Lobby Active</p>
                                                    <p className="text-sm text-green-300/80">Challenge players below to start a match.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Leaderboard & Lobby Section */}
                        {isJoined && (
                            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Users className="text-slate-400" />
                                        Room Lobby
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-slate-400">{onlinePlayers.size} Online</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {roomLeaderboard.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 italic">
                                            Waiting for players...
                                        </div>
                                    ) : (
                                        roomLeaderboard
                                            .sort((a, b) => b.score - a.score)
                                            .map((p, i) => {
                                                const isMe = p.wallet?.toLowerCase() === address?.toLowerCase();
                                                const isOnline = onlinePlayers.has(p.wallet?.toLowerCase());

                                                return (
                                                    <div key={p.wallet || i} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isMe ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/50 border-white/5'
                                                        }`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${i === 0 ? 'bg-yellow-500 text-black' :
                                                                i === 1 ? 'bg-slate-300 text-black' :
                                                                    i === 2 ? 'bg-amber-600 text-white' :
                                                                        'bg-slate-700 text-slate-400'
                                                                }`}>
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`font-mono text-sm ${isMe ? 'text-blue-200 font-bold' : 'text-slate-300'}`}>
                                                                        {p.wallet} {isMe && '(You)'}
                                                                    </span>
                                                                    {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Online" />}
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-0.5">{p.score} Points</p>
                                                            </div>
                                                        </div>

                                                        {!isMe && (
                                                            <button
                                                                onClick={() => handleChallenge(p.wallet)}
                                                                disabled={!isOnline || isChallengePending}
                                                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isOnline
                                                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95'
                                                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                {isChallengePending ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Swords className="w-4 h-4" />
                                                                )}
                                                                Challenge
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Challenge Modal */}
                {incomingChallenge && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-24 bg-blue-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

                            <div className="relative text-center">
                                <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-blue-500/10">
                                    <Swords className="w-8 h-8 text-blue-400" />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">Incoming Challenge!</h3>
                                <p className="text-slate-400 mb-8">
                                    <span className="font-mono text-blue-300 font-bold">{incomingChallenge.challengerWallet.slice(0, 6)}...{incomingChallenge.challengerWallet.slice(-4)}</span> wants to battle you.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleDecline}
                                        className="py-3 px-4 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={handleAccept}
                                        className="py-3 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/25 animate-pulse"
                                    >
                                        Accept & Fight
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Debug Footer */}
            <div className="fixed bottom-0 left-0 w-full bg-black/80 text-xs text-green-400 p-1 text-center font-mono pointer-events-none z-[200]">
                MOBILE DEBUG: {debugMsg}
            </div>
        </div>
    );
}
