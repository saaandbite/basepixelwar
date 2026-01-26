'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { Loader2, Trophy, Users, ArrowLeft, Crown, DoorOpen, Ticket, Swords } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

import { TOURNAMENT_ABI } from '@repo/contracts';
import PlayerProfileModal from '../components/PlayerProfileModal';
import { useClaimTrophy } from '../hooks/useClaimTrophy';
import LivingBackground from '../components/LivingBackground'; // Import the new background

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

    // Tab State
    const [activeTab, setActiveTab] = useState<'lobby' | 'rooms'>('lobby');

    // Contract Reads
    const { data: onChainWeek } = useReadContract({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: 'currentWeek',
        query: { refetchInterval: 10000 }
    });

    // Local State
    const [joinedRoomId, setJoinedRoomId] = useState<number>(0);
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

    // Lobby & Room State
    const socketRef = useRef<Socket | null>(null);
    const [roomLeaderboard, setRoomLeaderboard] = useState<{ wallet: string; score: number }[]>([]);
    const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());
    const [roomsList, setRoomsList] = useState<{ roomId: number; playerCount: number }[]>([]);
    const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
    const [expandedRoomPlayers, setExpandedRoomPlayers] = useState<{ wallet: string; score: number }[]>([]);

    // Tournament Phase State
    const [tournamentStatus, setTournamentStatus] = useState<{
        phase: 'registration' | 'point_collection' | 'ended' | 'upcoming';
        countdown: number;
        nextPhaseName: string;
        week: number;
    } | null>(null);

    const tournamentWeek = tournamentStatus?.week ?? 0;
    const isJoined = joinedRoomId > 0;
    const isRegistrationOpen = tournamentStatus?.phase === 'registration';
    const isPointCollectionActive = tournamentStatus?.phase === 'point_collection';

    // Fetch Tournament Status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${getServerUrl()}/api/tournament/status`);
                if (res.ok) {
                    const data = await res.json();
                    setTournamentStatus(data);
                }
            } catch (err) {
                console.error('Failed to fetch tournament status:', err);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Rooms List
    const fetchRoomsList = useCallback(async () => {
        if (tournamentWeek === 0) return;
        try {
            const res = await fetch(`${getServerUrl()}/api/tournament/rooms?week=${tournamentWeek}`);
            if (res.ok) setRoomsList((await res.json()).rooms || []);
        } catch (err) {
            console.error('Failed to fetch rooms list:', err);
        }
    }, [tournamentWeek]);

    useEffect(() => {
        if (tournamentWeek > 0) {
            fetchRoomsList();
            const interval = setInterval(fetchRoomsList, 10000);
            return () => clearInterval(interval);
        }
    }, [tournamentWeek, fetchRoomsList]);

    // Fetch Player's Room Data
    const fetchRoomData = useCallback(async () => {
        if (!address || tournamentWeek === 0) return;
        try {
            const res = await fetch(`${getServerUrl()}/api/tournament/room?wallet=${address}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.location && data.location.week === tournamentWeek) {
                setJoinedRoomId(data.location.roomId);
                if (data.players) {
                    setRoomLeaderboard(data.players.map((p: any) => ({ wallet: p.walletAddress, score: 0 })));
                }
            } else {
                setJoinedRoomId(0); // Not in a room for the current tournament week
            }
        } catch (err) {
            console.error("Failed to fetch room data:", err);
            setJoinedRoomId(0);
        }
    }, [address, tournamentWeek]);

    useEffect(() => {
        if (address && tournamentWeek > 0) {
            fetchRoomData();
        }
    }, [address, tournamentWeek, fetchRoomData]);


    // Fetch Players for an Expanded Room
    const fetchExpandedRoomPlayers = useCallback(async (roomId: number) => {
        if (tournamentWeek === 0) return;
        try {
            const res = await fetch(`${getServerUrl()}/api/tournament/room?week=${tournamentWeek}&roomId=${roomId}`);
            if (res.ok) {
                const data = await res.json();
                setExpandedRoomPlayers(data.players ? data.players.map((p: any) => ({ wallet: p.walletAddress, score: 0 })) : []);
            }
        } catch (err) {
            console.error('Failed to fetch room players:', err);
        }
    }, [tournamentWeek]);

    // WebSocket Connection for Lobby
    useEffect(() => {
        if (!isJoined || !address || !joinedRoomId || !tournamentWeek) return;

        const socket = io(getServerUrl(), { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join_tournament_lobby', {
                week: tournamentWeek,
                roomId: joinedRoomId.toString(),
                walletAddress: address
            });
        });

        const handleLobbyState = (data: { onlinePlayers: string[]; leaderboard: { wallet: string; score: number }[] }) => {
            setOnlinePlayers(new Set(data.onlinePlayers.map(w => w.toLowerCase())));
            if (data.leaderboard) {
                const scoreMap = new Map(data.leaderboard.map(p => [p.wallet.toLowerCase(), p.score]));
                setRoomLeaderboard(prev => {
                    const updated = prev.map(p => ({ ...p, score: scoreMap.get(p.wallet.toLowerCase()) || p.score || 0 }));
                    data.leaderboard.forEach(lbPlayer => {
                        if (!updated.find(p => p.wallet.toLowerCase() === lbPlayer.wallet.toLowerCase())) {
                            updated.push(lbPlayer);
                        }
                    });
                    return updated.sort((a, b) => b.score - a.score);
                });
            }
        };

        socket.on('lobby_state', handleLobbyState);
        socket.on('lobby_leaderboard_update', (data: { wallet: string; score: number }[]) => {
            setRoomLeaderboard(prev => {
                const scoreMap = new Map(data.map(p => [p.wallet.toLowerCase(), p.score]));
                return prev.map(p => ({ ...p, score: scoreMap.get(p.wallet.toLowerCase()) ?? p.score ?? 0 })).sort((a, b) => b.score - a.score);
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [isJoined, address, joinedRoomId, tournamentWeek]);

    // Contract Write for Joining
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed && hash) {
            const notifyBackend = async () => {
                try {
                    await fetch(`${getServerUrl()}/api/tournament/join`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ walletAddress: address, week: tournamentWeek, txHash: hash })
                    });
                    await fetchRoomData();
                    await fetchRoomsList();
                    setActiveTab('rooms');
                } catch (e) {
                    console.error("Backend join notification failed:", e);
                }
            };
            notifyBackend();
        }
    }, [isConfirmed, hash, address, tournamentWeek, fetchRoomData, fetchRoomsList]);

    const handleJoin = () => {
        if (!TOURNAMENT_ADDRESS) return alert('Tournament Contract Address missing!');
        writeContract({
            address: TOURNAMENT_ADDRESS,
            abi: TOURNAMENT_ABI,
            functionName: 'joinTournament',
            value: parseEther('0.001')
        });
    };

    // Trophy Claim Logic
    const sortedLeaderboard = [...roomLeaderboard].sort((a, b) => b.score - a.score);
    const myRank = address ? sortedLeaderboard.findIndex(p => p.wallet.toLowerCase() === address.toLowerCase()) + 1 : 0;
    const isTop3 = myRank >= 1 && myRank <= 3;
    const { claim, isPending: isClaimPending, isConfirming: isClaimConfirming, isSuccess: isClaimSuccess, hasClaimed, error: claimError } = useClaimTrophy(tournamentStatus?.phase === 'ended' ? tournamentWeek : undefined);
    const canShowClaimButton = tournamentStatus?.phase === 'ended' && isTop3 && !hasClaimed;

    const handleExpandRoom = (roomId: number) => {
        if (expandedRoom === roomId) {
            setExpandedRoom(null);
        } else {
            setExpandedRoom(roomId);
            fetchExpandedRoomPlayers(roomId);
        }
    };

    const formatCountdown = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div className="min-h-screen relative flex flex-col font-sans text-white bg-gradient-to-b from-[#5c1a26] to-[#1a0005]">
            <LivingBackground />
            <PlayerProfileModal walletAddress={selectedWallet} onClose={() => setSelectedWallet(null)} isTournamentContext={true} />

            {/* Header */}
            <header className="relative z-10 p-4 md:p-6">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-7 h-7" />
                        </Link>
                        <div className="flex items-center gap-3 font-retro text-2xl md:text-3xl text-white">
                            <Trophy className="w-7 h-7 text-[#ff8ba7]" />
                            <h1 className="hidden sm:inline">TOURNAMENT</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 text-lg bg-black/20 text-white border-2 border-white/20 rounded-full">
                            WEEK #{tournamentWeek}
                        </div>
                        <Wallet>
                            <ConnectWallet className="!font-sans !font-bold !text-base !h-12 !min-h-0 !bg-[#ff8ba7] !text-black !border-2 !border-transparent hover:!bg-white">
                                <Avatar className="h-6 w-6" />
                                <Name />
                            </ConnectWallet>
                            <WalletDropdown className="!font-sans">
                                <Identity className="px-4 py-3" hasCopyAddressOnClick>
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

            <main className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-black/30 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
                        <div className="w-32 h-32 bg-[#ff8ba7] border-4 border-white flex items-center justify-center mb-8 animate-bounce rounded-full shadow-2xl shadow-[#ff8ba7]/30">
                            <Crown className="w-16 h-16 text-black" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-retro text-white mb-4" style={{ textShadow: '3px 3px 0 #000' }}>
                            WEEKLY CHAMPIONSHIP
                        </h1>
                        <p className="text-white/80 text-xl md:text-2xl max-w-2xl mb-12 leading-relaxed">
                            Join the arena. Defeat 9 opponents. Win the <span className="text-[#FFD700] animate-pulse font-bold">GOLDEN TROPHY</span>.
                        </p>
                        <div className="px-6 py-3 bg-black/50 border-2 border-white text-xl rounded-full">
                            PLEASE CONNECT WALLET TO ENTER
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex gap-2 p-2 bg-black/30 border border-white/10 rounded-full">
                            {['lobby', 'rooms'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as 'lobby' | 'rooms')}
                                    className={`flex-1 font-bold text-lg md:text-xl px-6 py-3 flex items-center justify-center gap-3 transition-all rounded-full ${activeTab === tab ? 'bg-[#ff8ba7] text-black' : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {tab === 'lobby' ? <Ticket className="w-6 h-6" /> : <DoorOpen className="w-6 h-6" />}
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'lobby' && (
                            <div className="space-y-8">
                                {tournamentStatus && (
                                    <div className={`p-4 border-2 text-center rounded-2xl bg-black/30 backdrop-blur-sm ${tournamentStatus.phase === 'registration' ? 'border-green-500' : tournamentStatus.phase === 'point_collection' ? 'border-yellow-500' : 'border-gray-600'}`}>
                                        <p className="text-sm mb-2 text-white/70">CURRENT PHASE</p>
                                        <p className={`font-retro text-2xl mb-2 ${tournamentStatus.phase === 'registration' ? 'text-green-400' : tournamentStatus.phase === 'point_collection' ? 'text-yellow-400' : 'text-gray-400'}`}>
                                            {tournamentStatus.phase === 'registration' && '🎟️ REGISTRATION OPEN'}
                                            {tournamentStatus.phase === 'point_collection' && '⚔️ TOURNAMENT ACTIVE'}
                                            {tournamentStatus.phase === 'ended' && '🏁 TOURNAMENT ENDED'}
                                            {tournamentStatus.phase === 'upcoming' && '⏳ COMING SOON'}
                                        </p>
                                        <p className="text-lg text-white/90">
                                            {tournamentStatus.nextPhaseName}: <span className="font-mono text-white">{formatCountdown(tournamentStatus.countdown)}</span>
                                        </p>
                                    </div>
                                )}

                                {!isJoined ? (
                                    <div className="p-8 bg-black/30 backdrop-blur-sm border-2 border-[#ff8ba7] rounded-2xl shadow-2xl shadow-[#ff8ba7]/10">
                                        <h2 className="text-3xl font-retro text-white mb-6 text-center" style={{ textShadow: '2px 2px 0 #000' }}>QUALIFICATION</h2>
                                        <div className="bg-black/50 border-2 border-white/10 rounded-lg p-6 mb-8 text-center">
                                            <p className="text-white/70 mb-2 text-lg font-bold">ENTRY FEE</p>
                                            <p className="font-retro text-5xl text-white mb-4">0.001 ETH</p>
                                            <p className="text-lg text-white/80">PRIZE POOL: <span className="text-yellow-400 font-bold">0.009 ETH + NFT</span></p>
                                        </div>
                                        <button
                                            onClick={handleJoin}
                                            disabled={isPending || isConfirming || !isRegistrationOpen}
                                            className="w-full text-2xl py-5 rounded-full flex items-center justify-center gap-3 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#ff8ba7] text-black hover:bg-white"
                                        >
                                            {isPending || isConfirming ? <><Loader2 className="animate-spin w-8 h-8" /> PROCESSING...</> : !isRegistrationOpen ? "REGISTRATION CLOSED" : <><Ticket className="w-8 h-8" /> JOIN TOURNAMENT</>}
                                        </button>
                                        {writeError && <p className="text-red-400 mt-4 text-center text-sm">Error: {writeError.message.split('Contract Call')[0]}</p>}
                                    </div>
                                ) : (
                                    <div className="p-8 bg-black/30 backdrop-blur-sm border-2 border-green-500 rounded-2xl text-center">
                                        <p className="font-retro text-3xl text-green-400 mb-4">✅ REGISTERED</p>
                                        <p className="text-xl text-white">You are in <span className="font-bold">Room #{joinedRoomId}</span></p>
                                        <p className="text-base text-white/70 mt-2">Check the ROOMS tab to see your competition.</p>
                                    </div>
                                )}

                                {isJoined && (
                                    <div className="p-8 bg-black/30 backdrop-blur-sm border-2 border-white/10 rounded-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-3xl font-retro text-white" style={{ textShadow: '2px 2px 0 #000' }}>ROOM #{joinedRoomId} LOBBY</h2>
                                            <p className="text-lg text-white/80">{onlinePlayers.size} / {roomLeaderboard.length} Players Online</p>
                                        </div>

                                        {canShowClaimButton && (
                                            <div className="mb-6">
                                                <button onClick={() => claim()} disabled={isClaimPending || isClaimConfirming} className="w-full text-2xl py-5 rounded-full flex items-center justify-center gap-3 font-bold transition-all bg-yellow-400 text-black hover:bg-yellow-300">
                                                    {isClaimPending || isClaimConfirming ? <><Loader2 className="animate-spin w-8 h-8" /> CLAIMING...</> : <><Trophy className="w-8 h-8" /> CLAIM YOUR PRIZE (Rank #{myRank})</>}
                                                </button>
                                                {isClaimSuccess && <p className="text-green-400 mt-2 text-center">Prize claimed successfully!</p>}
                                                {claimError && <p className="text-red-400 mt-2 text-center text-sm">Claim Error: {claimError.message.split('Contract Call')[0]}</p>}
                                            </div>
                                        )}

                                        {isPointCollectionActive && (
                                            <div className="bg-yellow-500/10 border-2 border-yellow-500 rounded-lg p-4 mb-6 text-center">
                                                <p className="text-yellow-400 font-bold text-xl flex items-center justify-center gap-3"><Swords /> TOURNAMENT IS LIVE!</p>
                                                <p className="text-white/80 mt-2">Go to the <Link href="/play" className="underline hover:text-white">Play</Link> page and win 1v1 matches to score points.</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {sortedLeaderboard.map((player, index) => (
                                                <div key={player.wallet} className={`flex items-center justify-between p-3 rounded-lg border-2 ${address && player.wallet.toLowerCase() === address.toLowerCase() ? 'bg-[#ff8ba7]/20 border-[#ff8ba7]' : 'bg-black/30 border-transparent'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xl font-mono w-8 text-white/70">#{index + 1}</span>
                                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedWallet(player.wallet)}>
                                                            <div className={`w-3 h-3 rounded-full ${onlinePlayers.has(player.wallet.toLowerCase()) ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                                            <Avatar address={player.wallet as `0x${string}`} className="w-8 h-8 rounded-full" />
                                                            <Name address={player.wallet as `0x${string}`} className="text-lg" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xl font-mono text-yellow-400">{player.score || 0} PTS</span>
                                                        {index < 3 && <Trophy className={`w-6 h-6 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'}`} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'rooms' && (
                            <div className="space-y-4">
                                <h2 className="text-3xl font-retro text-white mb-6" style={{ textShadow: '2px 2px 0 #000' }}>ALL ROOMS ({roomsList.length})</h2>
                                {roomsList.map(room => (
                                    <div key={room.roomId} className="bg-black/30 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-4">
                                        <div className="flex items-center justify-between cursor-pointer" onClick={() => handleExpandRoom(room.roomId)}>
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-2xl font-retro text-[#ff8ba7]">ROOM #{room.roomId}</h3>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Users className="w-5 h-5" />
                                                    <span>{room.playerCount} / 10</span>
                                                </div>
                                            </div>
                                            <button className="p-2 hover:bg-white/10 rounded-full font-bold">{expandedRoom === room.roomId ? 'Hide' : 'View'}</button>
                                        </div>
                                        {expandedRoom === room.roomId && (
                                            <div className="mt-4 pt-4 border-t-2 border-white/10 space-y-2">
                                                {expandedRoomPlayers.length > 0 ? (
                                                    expandedRoomPlayers.map(player => (
                                                        <div key={player.wallet} className="flex items-center gap-3 p-2 bg-black/30 rounded-md">
                                                            <Avatar address={player.wallet as `0x${string}`} className="w-7 h-7 rounded-full" />
                                                            <Name address={player.wallet as `0x${string}`} className="text-base" />
                                                        </div>
                                                    ))
                                                ) : <p className="text-white/50 text-center p-4">Loading players...</p>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
