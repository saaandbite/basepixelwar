'use client';

// Room Page - PvP Waiting Room

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '../game/hooks/useMultiplayer';
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md">
                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-glow">
                        ⚔️ Chroma Duel
                    </h1>
                    <p className="text-slate-400">Player vs Player Arena</p>
                </div>

                {/* Connection Status Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                    {/* Status Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                                'bg-red-400'
                            }`} />
                        <span className="text-sm text-slate-300">
                            {connectionStatus === 'connected' ? 'Connected to Server' :
                                connectionStatus === 'connecting' ? 'Connecting...' :
                                    'Disconnected'}
                        </span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-200 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Main Content based on status */}
                    {!isConnected ? (
                        // Not Connected
                        <div className="text-center">
                            <p className="text-slate-400 mb-4">Connecting to game server...</p>
                            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : matchmakingStatus === 'idle' ? (
                        // Ready to Queue
                        <div className="space-y-4">
                            {/* Player Name Input */}
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Your Name (optional)</label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder={`Player_${playerId?.substring(0, 6) || '???'}`}
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition-colors"
                                />
                            </div>

                            {/* Find Match Button */}
                            <button
                                onClick={handleJoinQueue}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-500/25"
                            >
                                🎮 Find Match
                            </button>

                            {/* Or Play Solo */}
                            <button
                                onClick={() => {
                                    // FORCE Clear PvP session data
                                    sessionStorage.removeItem('pvp_mode');
                                    sessionStorage.removeItem('pvp_room_id');
                                    sessionStorage.removeItem('pvp_team');
                                    router.push('/game');
                                }}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-slate-300 py-3 px-6 rounded-xl transition-all"
                            >
                                Play vs AI Instead
                            </button>
                        </div>
                    ) : matchmakingStatus === 'queue' ? (
                        // In Queue
                        <div className="text-center space-y-4">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full" />
                                <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                <div className="absolute inset-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">🔍</span>
                                </div>
                            </div>

                            <div>
                                <p className="text-xl font-semibold text-white">Finding Opponent...</p>
                                <p className="text-slate-400 mt-1">Queue Position: #{queuePosition}</p>
                            </div>

                            <button
                                onClick={leaveQueue}
                                className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
                            >
                                Cancel Search
                            </button>
                        </div>
                    ) : matchmakingStatus === 'found' ? (
                        // Match Found
                        <div className="text-center space-y-4">
                            <div className="text-5xl mb-2">⚔️</div>
                            <p className="text-xl font-bold text-green-400">Match Found!</p>
                            <p className="text-slate-300">
                                Opponent: <span className="font-semibold text-white">{opponent?.name}</span>
                            </p>
                            <p className="text-sm text-slate-400">Starting game...</p>
                        </div>
                    ) : matchmakingStatus === 'countdown' ? (
                        // Countdown
                        <div className="text-center space-y-4">
                            <p className="text-slate-400">Game Starting In</p>
                            <div className="text-7xl font-bold text-white animate-pulse">
                                {countdown}
                            </div>
                            <div className="flex justify-center items-center gap-4 pt-4">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mb-1">
                                        🔵
                                    </div>
                                    <span className="text-xs text-slate-400">You</span>
                                </div>
                                <span className="text-2xl text-slate-500">VS</span>
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white font-bold mb-1">
                                        🔴
                                    </div>
                                    <span className="text-xs text-slate-400">{opponent?.name}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer Info */}
                <div className="text-center mt-6 text-slate-500 text-sm">
                    <p>🎯 Paint the arena • 💣 Use power-ups • 👑 Capture golden pixels</p>
                </div>
            </div>
        </div>
    );
}
