'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import SmartWalletButton from '../components/SmartWalletButton';
import { Loader2, Trophy, Users, ArrowLeft, Crown, DoorOpen, Ticket, Swords } from 'lucide-react';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

import { TOURNAMENT_ABI } from '@repo/contracts';
import PlayerProfileModal from '../components/PlayerProfileModal';
import { useClaimTrophy } from '../hooks/useClaimTrophy';

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
        <div className="min-h-screen relative flex flex-col font-terminal text-white overflow-x-hidden"
            style={{
                background: 'linear-gradient(180deg, #ff8ba7 0%, #903749 100%)'
            }}>

            {/* Background Pattern Overlay */}
            <div className="fixed inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                }}
            />

            <PlayerProfileModal walletAddress={selectedWallet} onClose={() => setSelectedWallet(null)} isTournamentContext={true} />

            {/* Header */}
            <header className="w-full flex justify-center py-6 relative z-10 px-4">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Back Pill */}
                    <Link href="/play" className="group flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/20 backdrop-blur-sm text-white font-sans text-sm font-bold tracking-wider hover:bg-white/10 hover:border-white/40 transition-all skew-x-[-10deg] w-full md:w-auto">
                        <div className="skew-x-[10deg] flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>BACK TO LOBBY</span>
                        </div>
                    </Link>

                    {/* Week Info Pill */}
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/20 backdrop-blur-sm text-white font-sans text-sm font-bold tracking-wider skew-x-[-10deg] w-full md:w-auto">
                        <div className="skew-x-[10deg] flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span>WEEK #{tournamentWeek}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <SmartWalletButton className="!font-terminal !text-base !h-10 !min-h-0 !bg-[var(--pixel-red)] !text-white !border-0 hover:!bg-white hover:!text-black !rounded-lg !px-4" />
                    </div>
                </div>
            </header>

            <main className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-4xl flex-1">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm relative overflow-hidden group">
                        {/* Corner Pixels */}
                        <div className="absolute top-0 left-0 w-2 h-2 bg-white box-content border-t-2 border-l-2 border-white/50" />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-white box-content border-t-2 border-r-2 border-white/50" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-white box-content border-b-2 border-l-2 border-white/50" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-white box-content border-b-2 border-r-2 border-white/50" />

                        <div className="w-32 h-32 bg-white/10 border-4 border-white/20 flex items-center justify-center mb-8 animate-bounce rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                            <Crown className="w-16 h-16 text-yellow-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-retro text-white mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
                            WEEKLY CHAMPIONSHIP
                        </h1>
                        <p className="text-white/80 text-xl font-terminal max-w-2xl mb-12 leading-relaxed">
                            Join the arena. Defeat 9 opponents. Win the <span className="text-yellow-400 animate-pulse font-bold tracking-wider">GOLDEN TROPHY</span>.
                        </p>
                        <div className="px-8 py-4 bg-black/40 border border-white/20 text-white font-retro text-xl rounded-sm">
                            CONNECT WALLET TO ENTER
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Tab Switcher */}
                        <div className="flex gap-4 p-1">
                            {['lobby', 'rooms'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as 'lobby' | 'rooms')}
                                    className={`flex-1 font-bold font-retro text-lg md:text-xl px-6 py-4 flex items-center justify-center gap-3 transition-all clip-path-polygon ${activeTab === tab
                                        ? 'bg-white text-black drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]'
                                        : 'bg-black/20 text-white/50 hover:bg-black/40 hover:text-white'}`}
                                    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                                >
                                    {tab === 'lobby' ? <Ticket className="w-5 h-5" /> : <DoorOpen className="w-5 h-5" />}
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'lobby' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {tournamentStatus && (
                                    <div className={`p-6 border text-center rounded-sm bg-white/5 backdrop-blur-md relative overflow-hidden ${tournamentStatus.phase === 'registration' ? 'border-green-400/50' : tournamentStatus.phase === 'point_collection' ? 'border-yellow-400/50' : 'border-white/20'}`}>
                                        <div className={`absolute top-0 left-0 w-full h-1 ${tournamentStatus.phase === 'registration' ? 'bg-green-400' : tournamentStatus.phase === 'point_collection' ? 'bg-yellow-400' : 'bg-slate-400'}`} />

                                        <p className="text-xs tracking-[0.2em] mb-2 text-white/50 uppercase font-sans font-bold">CURRENT PHASE</p>
                                        <p className={`font-retro text-3xl mb-2 drop-shadow-md ${tournamentStatus.phase === 'registration' ? 'text-green-400' : tournamentStatus.phase === 'point_collection' ? 'text-yellow-400' : 'text-slate-400'}`}>
                                            {tournamentStatus.phase === 'registration' && 'REGISTRATION OPEN'}
                                            {tournamentStatus.phase === 'point_collection' && 'TOURNAMENT ACTIVE'}
                                            {tournamentStatus.phase === 'ended' && 'TOURNAMENT ENDED'}
                                            {tournamentStatus.phase === 'upcoming' && 'COMING SOON'}
                                        </p>
                                        <p className="text-lg text-white/80 font-mono">
                                            {tournamentStatus.nextPhaseName}: <span className="text-white font-bold">{formatCountdown(tournamentStatus.countdown)}</span>
                                        </p>
                                    </div>
                                )}

                                {!isJoined ? (
                                    <div className="p-8 bg-black/20 border border-white/20 backdrop-blur-sm rounded-sm relative overflow-hidden">
                                        {/* Decorative Corners */}
                                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-400" />
                                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-400" />
                                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-400" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-400" />

                                        <h3 className="
                                            text-sm 
                                            sm:text-lg 
                                            md:text-xl 
                                            lg:text-2xl 
                                            font-retro 
                                            text-white 
                                            mb-6 sm:mb-8 
                                            text-center 
                                            drop-shadow-sm
                                            break-all
                                            ">
                                            QUALIFICATION
                                        </h3>


                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                            <div className="bg-white/5 p-6 text-center border border-white/10">
                                                <p className="text-white/50 mb-2 text-sm font-bold tracking-widest uppercase">ENTRY FEE</p>
                                                <p className="font-retro text-4xl text-white">0.001 ETH</p>
                                            </div>
                                            <div className="bg-white/5 p-6 text-center border border-white/10">
                                                <p className="text-white/50 mb-2 text-sm font-bold tracking-widest uppercase">PRIZE POOL</p>
                                                <p className="font-retro text-2xl text-yellow-400">0.009 ETH + NFT</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleJoin}
                                            disabled={isPending || isConfirming || !isRegistrationOpen}
                                            className="w-full text-xl py-4 flex items-center justify-center gap-3 font-bold font-retro transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.01] active:scale-[0.99] border-b-4 border-blue-800"
                                        >
                                            {isPending || isConfirming ? <><Loader2 className="animate-spin w-6 h-6" /> PROCESSING...</> : !isRegistrationOpen ? "REGISTRATION CLOSED" : <><Ticket className="w-6 h-6" /> JOIN TOURNAMENT</>}
                                        </button>
                                        {writeError && <p className="text-red-400 mt-4 text-center text-sm font-mono bg-red-900/20 p-2 border border-red-500/30">Error: {writeError.message.split('Contract Call')[0]}</p>}
                                    </div>
                                ) : (
                                    <div className="p-8 bg-green-900/20 border border-green-500/30 backdrop-blur-sm rounded-sm text-center relative">
                                        <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
                                        <p className="font-retro text-3xl text-green-400 mb-2 drop-shadow-sm">REGISTERED</p>
                                        <p className="text-xl text-white">You are in <span className="font-bold text-green-300">Room #{joinedRoomId}</span></p>
                                        <p className="text-sm text-white/50 mt-2 font-mono">Check the ROOMS tab to see your competition.</p>
                                    </div>
                                )}

                                {isJoined && (
                                    <div className="bg-black/20 border border-white/10 backdrop-blur-md rounded-sm overflow-hidden">
                                        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-black/20">
                                            <h2 className="text-2xl font-retro text-white">ROOM #{joinedRoomId} LOBBY</h2>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-sm">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-white/80">{onlinePlayers.size} Online</span>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            {canShowClaimButton && (
                                                <div className="mb-8">
                                                    <button onClick={() => claim()} disabled={isClaimPending || isClaimConfirming} className="w-full text-xl py-4 rounded-sm flex items-center justify-center gap-3 font-bold font-retro transition-all bg-yellow-400 text-black hover:bg-yellow-300 border-b-4 border-yellow-600">
                                                        {isClaimPending || isClaimConfirming ? <><Loader2 className="animate-spin w-6 h-6" /> CLAIMING...</> : <><Trophy className="w-6 h-6" /> CLAIM PRIZE (Rank #{myRank})</>}
                                                    </button>
                                                    {isClaimSuccess && <p className="text-green-400 mt-2 text-center font-bold">PRIZE CLAIMED SUCCESSFULLY!</p>}
                                                    {claimError && <p className="text-red-400 mt-2 text-center text-sm font-mono">Error: {claimError.message.split('Contract Call')[0]}</p>}
                                                </div>
                                            )}

                                            {isPointCollectionActive && (
                                                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-sm p-4 mb-6 text-center">
                                                    <p className="text-yellow-400 font-bold text-lg flex items-center justify-center gap-3 font-retro"><Swords className="w-5 h-5" /> TOURNAMENT IS LIVE!</p>
                                                    <p className="text-white/70 mt-1 text-sm">Go to <Link href="/play" className="text-white underline hover:text-yellow-200">Play</Link> and win 1v1 matches to score points.</p>
                                                </div>
                                            )}

                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {sortedLeaderboard.map((player, index) => (
                                                    <div key={player.wallet} className={`flex items-center justify-between p-3 rounded-sm border transition-colors ${address && player.wallet.toLowerCase() === address.toLowerCase() ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <span className={`text-lg font-mono w-8 ${index < 3 ? 'text-yellow-400 font-bold' : 'text-white/30'}`}>#{index + 1}</span>
                                                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedWallet(player.wallet)}>
                                                                <div className={`w-2 h-2 rounded-full ${onlinePlayers.has(player.wallet.toLowerCase()) ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-white/20'}`} />
                                                                <Avatar address={player.wallet as `0x${string}`} className="w-8 h-8 rounded-full border border-white/20 group-hover:border-white transition-colors" />
                                                                <Name address={player.wallet as `0x${string}`} className="text-white font-sans font-bold group-hover:text-blue-300 transition-colors" />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xl font-mono text-white/90">{player.score || 0} PTS</span>
                                                            {index < 3 && <Trophy className={`w-5 h-5 ${index === 0 ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : index === 1 ? 'text-slate-300' : 'text-amber-600'}`} />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'rooms' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-retro text-white mb-4 sm:mb-6 drop-shadow-sm">
                                    ALL ROOMS ({roomsList.length})
                                </h3>

                                {roomsList.map(room => (
                                    <div key={room.roomId} className="bg-black/20 border border-white/10 backdrop-blur-sm rounded-sm transition-all hover:bg-white/5">
                                        <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => handleExpandRoom(room.roomId)}>
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-xl font-retro text-blue-400">ROOM #{room.roomId}</h3>
                                                <div className="flex items-center gap-2 text-white/50 text-sm font-mono">
                                                    <Users className="w-4 h-4" />
                                                    <span>{room.playerCount} / 10</span>
                                                </div>
                                            </div>
                                            <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded uppercase tracking-wider transition-colors">
                                                {expandedRoom === room.roomId ? 'Close' : 'View'}
                                            </button>
                                        </div>
                                        {expandedRoom === room.roomId && (
                                            <div className="p-4 border-t border-white/10 bg-black/20">
                                                {expandedRoomPlayers.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {expandedRoomPlayers.map(player => (
                                                            <div key={player.wallet} className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/5">
                                                                <Avatar address={player.wallet as `0x${string}`} className="w-6 h-6 rounded-full" />
                                                                <Name address={player.wallet as `0x${string}`} className="text-sm text-white/80" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-white/30 text-center py-2 text-sm italic">Accessing database...</p>}
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
