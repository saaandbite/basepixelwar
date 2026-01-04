'use client';

// Room Page - PvP Waiting Room

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '../game/hooks/useMultiplayer';
import { PaintBucket, Zap, Crown, Swords, Loader2 } from 'lucide-react';
import '../game/game.css';

export default function RoomPage() {
    const router = useRouter();
    const {
        connectionStatus,
        matchmakingStatus,
        playerId,
        opponent,
        queuePosition,
        countdown,
        myTeam,
        error,
        isConnected,
        isPlaying,
        connect,
        disconnect,
        joinQueue,
        leaveQueue,
        setReady,
        room,
    } = useMultiplayer();

    const [playerName, setPlayerName] = useState('');

    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    // Redirect to game when match starts
    useEffect(() => {
        if (isPlaying) {
            console.log('[RoomPage] Game started, redirecting...');
            // Store team info in sessionStorage for game page
            if (room?.id) {
                console.log('[RoomPage] Saving roomId:', room.id);
                sessionStorage.setItem('pvp_room_id', room.id);
            } else {
                console.error('[RoomPage] Room ID missing during redirect!');
            }
            sessionStorage.setItem('pvp_team', myTeam || 'blue');
            sessionStorage.setItem('pvp_mode', 'true');
            router.push('/game');
        }
    }, [isPlaying, myTeam, router, room]);

    // Auto ready when match found
    useEffect(() => {
        if (matchmakingStatus === 'found' && opponent) {
            setReady();
        }
    }, [matchmakingStatus, opponent, setReady]);

    const handleJoinQueue = () => {
        if (playerName.trim()) {
            sessionStorage.setItem('player_name', playerName);
        }
        joinQueue();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 to-violet-950 flex flex-col items-center justify-center p-6 bg-grid-pattern">
            <div className="max-w-md w-full relative z-10">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <Swords className="text-emerald-400" size={32} />
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">PixelWar</h1>
                    </div>
                    <p className="text-purple-200 text-center text-sm sm:text-base">Player vs Player Arena</p>
                </div>

                {/* Server Status */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${connectionStatus === 'connected' ? 'bg-emerald-400' :
                            connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                    <span className="text-purple-300 text-sm">
                        {connectionStatus === 'connected' ? 'Connected to Server' :
                            connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </span>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-red-300 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Input & Buttons (Main Card) */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-purple-700 shadow-2xl">

                    {!isConnected ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <Loader2 className="animate-spin text-purple-300" size={32} />
                            <p className="text-purple-200">Connecting to server...</p>
                        </div>
                    ) : matchmakingStatus === 'idle' ? (
                        <>
                            <div className="mb-4">
                                <label className="block text-purple-300 text-sm mb-1">Your Name (optional)</label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder={`Player_${playerId?.substring(0, 6) || '???'}`}
                                    className="w-full bg-purple-800/50 border border-purple-700 rounded-lg px-4 py-2 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition-all"
                                />
                            </div>

                            <button
                                onClick={handleJoinQueue}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl mb-3 flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                            >
                                <Zap className="text-yellow-300" size={20} />
                                <span className="text-sm sm:text-base">Find Match</span>
                            </button>

                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('pvp_mode');
                                    sessionStorage.removeItem('pvp_room_id');
                                    sessionStorage.removeItem('pvp_team');
                                    router.push('/game');
                                }}
                                className="w-full border-2 border-purple-500 hover:border-emerald-400 text-purple-300 hover:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                            >
                                <Crown size={20} />
                                <span className="text-sm sm:text-base">Play vs AI Instead</span>
                            </button>
                        </>
                    ) : matchmakingStatus === 'queue' ? (
                        <div className="flex flex-col items-center py-6 gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl">🔍</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium text-lg">Finding Opponent...</p>
                                <p className="text-purple-300 text-sm mt-1">Queue Position: #{queuePosition}</p>
                            </div>
                            <button
                                onClick={leaveQueue}
                                className="mt-2 text-red-400 hover:text-red-300 text-sm hover:underline transition-colors"
                            >
                                Cancel Search
                            </button>
                        </div>
                    ) : matchmakingStatus === 'found' ? (
                        <div className="flex flex-col items-center py-6 gap-4">
                            <Swords className="text-emerald-400 animate-bounce" size={48} />
                            <div className="text-center">
                                <p className="text-emerald-400 font-bold text-xl">Match Found!</p>
                                <p className="text-purple-200 mt-2">
                                    Opponent: <span className="text-white font-semibold">{opponent?.name || 'Unknown'}</span>
                                </p>
                            </div>
                        </div>
                    ) : matchmakingStatus === 'countdown' ? (
                        <div className="flex flex-col items-center py-4 gap-4">
                            <p className="text-purple-300 text-sm uppercase tracking-widest">Game Starting In</p>
                            <div className="text-7xl font-extrabold text-white animate-pulse drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                {countdown}
                            </div>
                            <div className="flex items-center gap-6 mt-4 opacity-80">
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${myTeam === 'blue' ? 'bg-blue-500' : 'bg-red-500'} text-white`}>
                                        {myTeam === 'blue' ? 'YOU' : 'VS'}
                                    </div>
                                    <span className="text-xs text-purple-300">You</span>
                                </div>
                                <Swords size={24} className="text-purple-400" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${myTeam === 'blue' ? 'bg-red-500' : 'bg-blue-500'} text-white`}>
                                        {myTeam === 'blue' ? 'VS' : 'YOU'}
                                    </div>
                                    <span className="text-xs text-purple-300">{opponent?.name}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Game Features */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center p-3 rounded-xl hover:bg-white/5 transition-colors duration-300">
                        <PaintBucket className="text-blue-400 mb-2 drop-shadow-md" size={24} />
                        <span className="text-purple-300 text-xs sm:text-sm font-medium">Paint the arena</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-xl hover:bg-white/5 transition-colors duration-300">
                        <Zap className="text-yellow-400 mb-2 drop-shadow-md" size={24} />
                        <span className="text-purple-300 text-xs sm:text-sm font-medium">Use power-ups</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-xl hover:bg-white/5 transition-colors duration-300">
                        <Crown className="text-amber-400 mb-2 drop-shadow-md" size={24} />
                        <span className="text-purple-300 text-xs sm:text-sm font-medium">Capture golden pixels</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
