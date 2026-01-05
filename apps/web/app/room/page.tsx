'use client';

// Room Page - PvP Waiting Room

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '../game/hooks/useMultiplayer';
import { useWallet, formatAddress, isCorrectChain } from '../contexts/WalletContext';
import { useGameVault } from '../hooks/useGameVault';
import { useENSName } from '../hooks/useENSName';
import { PaintBucket, Zap, Crown, Swords, Loader2, Wallet, AlertTriangle, Edit2, Check } from 'lucide-react';
import '../game/game.css';

export default function RoomPage() {
    const router = useRouter();
    const {
        connectionStatus,
        matchmakingStatus,
        opponent,
        queuePosition,
        countdown,
        myTeam,
        error: multiplayerError,
        isConnected: isServerConnected,
        isPlaying,
        connect: connectToServer,
        disconnect: disconnectFromServer,
        joinQueue,
        leaveQueue,
        setReady,
        room,
    } = useMultiplayer();

    // Wallet state
    const {
        address: walletAddress,
        isConnected: isWalletConnected,
        isConnecting: isWalletConnecting,
        chainId,
        error: walletError,
        connect: connectWallet,
        switchToBase,
    } = useWallet();

    // ENS Name resolution
    const { ensName, isLoading: isLoadingENS } = useENSName(walletAddress);

    // Game vault for transactions
    const {
        isLoading: isTransactionLoading,
        error: transactionError,
        getBidAmount,
    } = useGameVault();

    const isOnCorrectChain = isCorrectChain(chainId);

    // Player name state - priority: custom > ENS > wallet address
    const [customName, setCustomName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);

    // Determine display name
    const getDisplayName = () => {
        if (customName.trim()) return customName.trim();
        if (ensName) return ensName;
        if (walletAddress) return formatAddress(walletAddress);
        return 'Unknown Player';
    };

    const displayName = getDisplayName();

    // Auto-connect to server on mount
    useEffect(() => {
        connectToServer();
        return () => disconnectFromServer();
    }, [connectToServer, disconnectFromServer]);

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
            // Store player name and wallet address for in-game display
            sessionStorage.setItem('player_name', displayName);
            if (walletAddress) {
                sessionStorage.setItem('wallet_address', walletAddress);
            }
            router.push('/game');
        }
    }, [isPlaying, myTeam, router, room, walletAddress, displayName]);

    // Auto ready when match found
    useEffect(() => {
        if (matchmakingStatus === 'found' && opponent) {
            setReady();
        }
    }, [matchmakingStatus, opponent, setReady]);

    const handleJoinQueue = async () => {
        if (!isWalletConnected) {
            await connectWallet();
            return;
        }

        if (!isOnCorrectChain) {
            await switchToBase();
            return;
        }

        // Store player name for game
        sessionStorage.setItem('player_name', displayName);

        // Store wallet address for game
        if (walletAddress) {
            sessionStorage.setItem('wallet_address', walletAddress);
        }

        joinQueue();
    };

    const handleSaveName = () => {
        setIsEditingName(false);
    };

    const error = multiplayerError || walletError || transactionError;

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

                {/* Wallet Status */}
                <div className="flex items-center justify-center gap-4 mb-4">
                    {/* Server Status */}
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${connectionStatus === 'connected' ? 'bg-emerald-400' :
                            connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                        <span className="text-purple-300 text-xs">
                            {connectionStatus === 'connected' ? 'Server' :
                                connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                        </span>
                    </div>

                    {/* Wallet Status */}
                    <div className="flex items-center gap-2">
                        <Wallet className={`w-4 h-4 ${isWalletConnected ? 'text-emerald-400' : 'text-red-400'}`} />
                        <span className="text-purple-300 text-xs">
                            {isWalletConnected && walletAddress
                                ? formatAddress(walletAddress)
                                : 'Not Connected'}
                        </span>
                    </div>
                </div>

                {/* Chain Warning */}
                {isWalletConnected && !isOnCorrectChain && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
                        <AlertTriangle className="text-yellow-400 flex-shrink-0" size={20} />
                        <div className="flex-1">
                            <p className="text-yellow-300 text-sm">Wrong network detected</p>
                            <button
                                onClick={switchToBase}
                                className="text-yellow-400 hover:text-yellow-300 text-xs underline mt-1"
                            >
                                Switch to Base
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-red-300 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Input & Buttons (Main Card) */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-purple-700 shadow-2xl">

                    {!isServerConnected ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <Loader2 className="animate-spin text-purple-300" size={32} />
                            <p className="text-purple-200">Connecting to server...</p>
                        </div>
                    ) : matchmakingStatus === 'idle' ? (
                        <>
                            {/* Wallet Connection Required Notice */}
                            {!isWalletConnected && (
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Wallet className="text-purple-400" size={20} />
                                        <span className="text-purple-200 font-medium text-sm">Wallet Required</span>
                                    </div>
                                    <p className="text-purple-300 text-xs">
                                        Connect your wallet to play and earn rewards. Entry fee: {getBidAmount()}
                                    </p>
                                </div>
                            )}

                            {/* Player Name Section */}
                            {isWalletConnected && walletAddress && (
                                <div className="mb-4 bg-purple-800/30 border border-purple-600/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-purple-300 text-xs">Playing as</label>
                                        {!isEditingName && (
                                            <button
                                                onClick={() => setIsEditingName(true)}
                                                className="text-purple-400 hover:text-purple-300 transition-colors"
                                                title="Edit name"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {isEditingName ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={customName}
                                                onChange={(e) => setCustomName(e.target.value)}
                                                placeholder={ensName || formatAddress(walletAddress)}
                                                className="flex-1 bg-purple-900/50 border border-purple-600 rounded-lg px-3 py-2 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleSaveName}
                                                className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white transition-colors"
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                {displayName.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-semibold">{displayName}</p>
                                                <p className="text-purple-400 text-xs">
                                                    {isLoadingENS ? (
                                                        <span className="flex items-center gap-1">
                                                            <Loader2 className="animate-spin" size={10} />
                                                            Checking ENS...
                                                        </span>
                                                    ) : ensName ? (
                                                        `ENS: ${ensName}`
                                                    ) : customName ? (
                                                        `Wallet: ${formatAddress(walletAddress)}`
                                                    ) : (
                                                        'MetaMask Wallet'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleJoinQueue}
                                disabled={isWalletConnecting || isTransactionLoading}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl mb-3 flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isWalletConnecting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span className="text-sm sm:text-base">Connecting Wallet...</span>
                                    </>
                                ) : isTransactionLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span className="text-sm sm:text-base">Processing...</span>
                                    </>
                                ) : !isWalletConnected ? (
                                    <>
                                        <Wallet size={20} />
                                        <span className="text-sm sm:text-base">Connect Wallet to Play</span>
                                    </>
                                ) : !isOnCorrectChain ? (
                                    <>
                                        <AlertTriangle size={20} />
                                        <span className="text-sm sm:text-base">Switch to Base Network</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap className="text-yellow-300" size={20} />
                                        <span className="text-sm sm:text-base">Find Match</span>
                                    </>
                                )}
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
                                <p className="text-emerald-400 text-xs mt-2">
                                    Playing as: {displayName}
                                </p>
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
                                        {displayName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs text-purple-300">{displayName}</span>
                                </div>
                                <Swords size={24} className="text-purple-400" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${myTeam === 'blue' ? 'bg-red-500' : 'bg-blue-500'} text-white`}>
                                        {opponent?.name?.slice(0, 2).toUpperCase() || 'VS'}
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
