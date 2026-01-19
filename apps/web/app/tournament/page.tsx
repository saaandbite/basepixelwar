'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { Loader2, Trophy, Users, AlertCircle, CheckCircle2, Swords, XCircle, ArrowLeft, Crown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

import { TOURNAMENT_ABI } from './abi';
import PlayerProfileModal from '../components/PlayerProfileModal';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

const getServerUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}:3000`;
        }
    }
    if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL;
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
        query: { refetchInterval: 10000 }
    });

    const weekNum = currentWeek ? Number(currentWeek) : 0;

    // Local State
    const [joinedRoomId, setJoinedRoomId] = useState<number>(0);
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

    // Lobby State
    const socketRef = useRef<Socket | null>(null);
    const [roomLeaderboard, setRoomLeaderboard] = useState<{ wallet: string; score: number }[]>([]);
    const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());

    // Challenge State
    const [incomingChallenge, setIncomingChallenge] = useState<{ challengerWallet: string; tournamentRoomId: string } | null>(null);
    const [isChallengePending, setIsChallengePending] = useState(false);

    const isJoined = joinedRoomId > 0;

    // Fetch Room Data
    const fetchRoomData = useCallback(async () => {
        if (!address || weekNum === 0) return;

        try {
            const SERVER_URL = getServerUrl();
            const res = await fetch(`${SERVER_URL}/api/tournament/room?wallet=${address}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (data.location) {
                setJoinedRoomId(data.location.roomId);
                if (data.players) {
                    const initialLeaderboard = data.players.map((p: any) => ({
                        wallet: p.walletAddress,
                        score: 0
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

    useEffect(() => {
        if (address && weekNum > 0) {
            fetchRoomData();
        }
    }, [address, weekNum, fetchRoomData]);

    // Socket Connection
    useEffect(() => {
        if (!isJoined || !address || !joinedRoomId || !weekNum) return;

        const socket = io(getServerUrl(), {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join_tournament_lobby', {
                week: weekNum,
                roomId: joinedRoomId.toString(),
                walletAddress: address
            });
        });

        socket.on('lobby_state', (data: { onlinePlayers: string[]; leaderboard: { wallet: string; score: number }[] }) => {
            setOnlinePlayers(new Set(data.onlinePlayers.map(w => w.toLowerCase())));
            if (data.leaderboard) {
                const scoreMap = new Map(data.leaderboard.map(p => [p.wallet.toLowerCase(), p.score]));
                setRoomLeaderboard(prev => {
                    const updated = prev.map(p => ({
                        ...p,
                        score: scoreMap.get(p.wallet.toLowerCase()) || p.score || 0
                    }));
                    data.leaderboard.forEach(lbPlayer => {
                        if (!updated.find(p => p.wallet.toLowerCase() === lbPlayer.wallet.toLowerCase())) {
                            updated.push(lbPlayer);
                        }
                    });
                    return updated;
                });
            }
        });

        socket.on('lobby_player_update', (data: { walletAddress: string; isOnline: boolean }) => {
            setOnlinePlayers(prev => {
                const next = new Set(prev);
                const w = data.walletAddress.toLowerCase();
                if (data.isOnline) next.add(w);
                else next.delete(w);
                return next;
            });
        });

        socket.on('lobby_leaderboard_update', (data: { wallet: string; score: number }[]) => {
            setRoomLeaderboard(prev => {
                const scoreMap = new Map(data.map(p => [p.wallet.toLowerCase(), p.score]));
                return prev.map(p => ({
                    ...p,
                    score: scoreMap.get(p.wallet.toLowerCase()) ?? p.score ?? 0
                }));
            });
        });

        socket.on('challenge_received', (data: { challengerWallet: string; tournamentRoomId: string }) => {
            setIncomingChallenge(data);
        });

        socket.on('challenge_failed', (data: { reason: string }) => {
            alert(`CHALLENGE FAILED: ${data.reason}`);
            setIsChallengePending(false);
        });

        socket.on('game_start', (data: any) => {
            sessionStorage.setItem('pvp_mode', 'true');
            sessionStorage.setItem('pvp_room_id', data.roomId);
            sessionStorage.setItem('pvp_team', data.yourTeam);
            sessionStorage.setItem('is_tournament', 'true');
            router.push('/play/game');
        });

        return () => {
            socket.disconnect();
        };
    }, [isJoined, address, joinedRoomId, weekNum, router]);

    // Actions
    const handleChallenge = (targetWallet: string) => {
        if (!socketRef.current) return;
        setIsChallengePending(true);
        socketRef.current.emit('challenge_player', {
            targetWallet,
            tournamentRoomId: joinedRoomId.toString()
        });
        setTimeout(() => setIsChallengePending(false), 10000);
    };

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
    };

    // Contract Write
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

    const truncateWallet = (wallet: string) =>
        `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

    return (
        <div className="min-h-screen relative flex flex-col font-terminal text-[24px]">
            <div className="scanline" />
            <div className="fixed inset-0 bg-[var(--pixel-bg)] z-0" />

            <PlayerProfileModal
                walletAddress={selectedWallet}
                onClose={() => setSelectedWallet(null)}
                isTournamentContext={true}
            />

            {/* Header */}
            <header className="relative z-10 p-6 border-b-4 border-[var(--pixel-card-border)] bg-black/90">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/play" className="flex items-center gap-3 hover:text-[var(--pixel-red)] transition-colors">
                            <ArrowLeft className="w-8 h-8" />
                        </Link>
                        <div className="flex items-center gap-3 font-retro text-[var(--pixel-red)]">
                            <Trophy className="w-6 h-6" />
                            <span className="hidden sm:inline text-lg">TOURNAMENT</span>
                        </div>
                        <div className="pixel-badge bg-[var(--pixel-card-bg)] text-[var(--pixel-red)] text-base border-2 border-[var(--pixel-red)]">
                            WEEK #{weekNum}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Wallet>
                            <ConnectWallet className="!font-terminal !text-base !h-10 !min-h-0 !bg-[var(--pixel-red)] !text-white !border-0 hover:!bg-white hover:!text-black">
                                <Avatar className="h-6 w-6" />
                                <Name />
                            </ConnectWallet>
                            <WalletDropdown className="!font-terminal">
                                <Identity className="px-6 py-4" hasCopyAddressOnClick>
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

            <main className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
                {!isConnected ? (
                    /* Not Connected State */
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div className="w-32 h-32 bg-[var(--pixel-red)] border-4 border-white flex items-center justify-center mb-8 animate-bounce shadow-xl">
                            <Crown className="w-16 h-16 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-retro text-white mb-8 text-shadow-hard">
                            WEEKLY CHAMPIONSHIP
                        </h1>
                        <p className="text-[var(--pixel-fg)] text-2xl max-w-2xl mb-12 leading-relaxed">
                            Join the arena. Defeat 9 opponents. Win the <span className="text-[var(--pixel-yellow)] animate-blink">GOLDEN TROPHY</span>.
                        </p>
                        <div className="pixel-box border-4 border-white text-xl">
                            PLEASE CONNECT WALLET TO ENTER
                        </div>
                    </div>
                ) : (
                    /* Connected State */
                    <div className="space-y-8">

                        {!isJoined ? (
                            <div className="pixel-card border-4 border-[var(--pixel-red)]">
                                <h2 className="text-3xl font-retro text-[var(--pixel-red)] mb-8 text-center text-shadow-hard">
                                    QUALIFICATION STAGE
                                </h2>

                                <div className="bg-black border-4 border-[var(--pixel-fg)] p-8 mb-8 text-center">
                                    <p className="text-[var(--pixel-red)] mb-3 text-lg font-bold">ENTRY FEE</p>
                                    <p className="font-retro text-5xl text-white mb-6">0.001 ETH</p>
                                    <p className="text-xl text-[var(--pixel-fg)]">
                                        PRIZE POOL: 0.009 ETH + NFT
                                    </p>
                                </div>

                                <button
                                    onClick={handleJoin}
                                    disabled={isPending || isConfirming}
                                    className="pixel-btn pixel-btn-danger w-full text-2xl py-6 border-4 border-black"
                                >
                                    {(isPending || isConfirming) ? (
                                        <><Loader2 className="animate-spin inline w-6 h-6" /> PROCESSING TX...</>
                                    ) : (
                                        "JOIN TOURNAMENT"
                                    )}
                                </button>
                                {writeError && (
                                    <p className="text-[var(--pixel-red)] mt-6 text-center text-xl font-bold">{writeError.message}</p>
                                )}
                            </div>
                        ) : (
                            /* Lobby View */
                            <div className="space-y-8">
                                {/* Room Info */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="pixel-box border-4 border-[var(--pixel-card-border)]">
                                        <p className="text-[var(--pixel-fg)] text-sm mb-2">ROOM ID</p>
                                        <p className="font-retro text-4xl">#{joinedRoomId}</p>
                                    </div>
                                    <div className="pixel-box border-l-8 border-[var(--pixel-green)]">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[var(--pixel-green)] font-bold text-xl">LOBBY ACTIVE</p>
                                                <p className="text-base">WAITING FOR CHALLENGERS</p>
                                            </div>
                                            <div className="pixel-badge bg-[var(--pixel-green)] text-black animate-pulse text-lg border-2 border-black">
                                                {onlinePlayers.size} ONLINE
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Player List */}
                                <div className="pixel-card bg-black border-4 border-[var(--pixel-red)]">
                                    <h3 className="text-[var(--pixel-fg)] mb-6 flex items-center gap-3 text-xl">
                                        <Users className="w-6 h-6" /> PLAYERS IN ROOM
                                    </h3>

                                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {roomLeaderboard.length === 0 ? (
                                            <div className="text-center py-16 text-[var(--pixel-fg)] opacity-50 text-2xl">
                                                WAITING FOR PLAYERS...
                                            </div>
                                        ) : (
                                            roomLeaderboard
                                                .sort((a, b) => b.score - a.score)
                                                .map((p, i) => {
                                                    const isMe = p.wallet?.toLowerCase() === address?.toLowerCase();
                                                    const isOnline = onlinePlayers.has(p.wallet?.toLowerCase());

                                                    return (
                                                        <div
                                                            key={p.wallet || i}
                                                            className={`flex items-center justify-between p-4 border-2 transition-colors ${isMe ? 'bg-[var(--pixel-red)]/20 border-[var(--pixel-red)]' : 'bg-[var(--pixel-bg)] border-[var(--pixel-card-border)]'
                                                                }`}
                                                        >
                                                            <div
                                                                className="flex items-center gap-4 cursor-pointer group"
                                                                onClick={() => setSelectedWallet(p.wallet)}
                                                            >
                                                                <div className={`w-10 h-10 flex items-center justify-center font-retro text-lg ${i === 0 ? 'bg-[var(--pixel-yellow)] text-black' : 'bg-[var(--pixel-card-bg)] text-white'
                                                                    }`}>
                                                                    {i + 1}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`font-mono text-xl ${isMe ? 'text-[var(--pixel-red)]' : 'text-white group-hover:text-[var(--pixel-red)]'}`}>
                                                                            {truncateWallet(p.wallet)}
                                                                        </span>
                                                                        {isOnline && <span className="w-3 h-3 bg-[var(--pixel-green)] animate-blink rounded-none" />}
                                                                    </div>
                                                                    <p className="text-sm text-[var(--pixel-fg)]">{p.score} PTS</p>
                                                                </div>
                                                            </div>

                                                            {!isMe && (
                                                                <button
                                                                    onClick={() => handleChallenge(p.wallet)}
                                                                    disabled={!isOnline || isChallengePending}
                                                                    className={`pixel-btn !py-2 !px-6 text-lg ${isOnline ? 'pixel-btn-danger' : 'opacity-50 cursor-not-allowed bg-gray-700'}`}
                                                                >
                                                                    {isChallengePending ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                                    ) : (
                                                                        "FIGHT"
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Challenge Modal - "New Challenger" Style - SCALED UP */}
                {incomingChallenge && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
                        <div className="pixel-card w-full max-w-xl bg-[var(--pixel-red)] border-8 border-white animate-bounce-in shadow-[0_0_50px_rgba(239,68,68,0.5)]">

                            <div className="text-center py-10">
                                <h3 className="text-4xl font-retro text-black mb-4 animate-blink font-bold">
                                    ⚠ WARNING ⚠
                                </h3>
                                <p className="text-black font-bold text-3xl mb-8">
                                    NEW CHALLENGER APPROACHING!
                                </p>

                                <div className="bg-black border-4 border-white p-6 mb-10 inline-block transform rotate-2 shadow-xl">
                                    <p className="text-white font-mono text-3xl tracking-widest">
                                        {truncateWallet(incomingChallenge.challengerWallet)}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6 px-10">
                                    <button onClick={handleDecline} className="pixel-btn bg-black text-white hover:bg-gray-900 text-2xl py-4 border-4 border-white">
                                        RUN AWAY
                                    </button>
                                    <button onClick={handleAccept} className="pixel-btn bg-white text-[var(--pixel-red)] hover:bg-gray-100 text-2xl py-4 border-4 border-black animate-pulse font-bold">
                                        FIGHT!
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
