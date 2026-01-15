'use client';

// Room Page - PvP Waiting Room

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '../play/game/hooks/useMultiplayer';
import { useWallet, formatAddress, isCorrectChain } from '../contexts/WalletContext';
import { useGameVault, GameMode } from '../hooks/useGameVault';
import { useENSName } from '../hooks/useENSName';
import { PaintBucket, Zap, Crown, Swords, Loader2, Wallet, AlertTriangle, Edit2, Check, Bot, Search, Trophy, Sparkles } from 'lucide-react';
import styles from './room.module.css';
import '../play/game/game.css';

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
        // Payment from useMultiplayer
        paymentStatus,
        isFirstPlayer,
        confirmPayment,
        cancelPayment,
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
    const gameVault = useGameVault();
    const { isLoading: isTransactionLoading, error: transactionError, getBidAmount } = gameVault;

    // Payment countdown timer
    const [paymentTimeLeft, setPaymentTimeLeft] = useState(90);

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
            router.push('/play/game');
        }
    }, [isPlaying, myTeam, router, room, walletAddress, displayName]);

    // Payment countdown timer
    useEffect(() => {
        if (!paymentStatus?.deadline) return;

        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((paymentStatus.deadline - Date.now()) / 1000));
            setPaymentTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [paymentStatus?.deadline]);

    // Auto ready when NOT in payment flow (legacy flow fallback)
    useEffect(() => {
        if (matchmakingStatus === 'found' && opponent && room?.status !== 'pending_payment' && !paymentStatus) {
            sessionStorage.removeItem('ai_mode');
            setReady();
        }
    }, [matchmakingStatus, opponent, setReady, room?.status, paymentStatus]);

    // Handle Pay & Play
    // Handle Pay & Play
    const handlePayToPlay = useCallback(async () => {
        if (!room?.id || !paymentStatus) {
            console.error('[RoomPage] Cannot pay: no room or payment status');
            return;
        }

        try {
            let txHash: string;
            let onChainGameId: number;

            // Check if a game has already been created on-chain by the other player
            // If paymentStatus.onChainGameId exists, it means someone created it -> WE JOIN
            // If NOT, it means we are the first to pay -> WE CREATE
            const existingGameId = paymentStatus.onChainGameId;

            // CRITICAL: Player 2 MUST wait for Player 1 to create the game first
            // If Player 2 tries to pay before Player 1, they would also call createGame
            // which would create a SEPARATE game, breaking the match.
            if (!isFirstPlayer && !existingGameId) {
                console.log('[RoomPage] Player 2 waiting for Player 1 to create game...');
                // Don't proceed - Player 2 should wait for the onChainGameId to be set
                // The UI should show a "Waiting for opponent..." message
                return;
            }

            if (existingGameId) {
                // Game exists, join it
                console.log('[RoomPage] Joining existing game:', existingGameId);
                onChainGameId = existingGameId;
                txHash = await gameVault.joinGame(onChainGameId);
            } else {
                // No game yet, create it
                console.log('[RoomPage] Creating new game on-chain...');
                console.log('[RoomPage] Creating new game on-chain...');
                const result = await gameVault.createGame(GameMode.OneVsOne);
                txHash = result.txHash;
                onChainGameId = result.gameId;

                console.log('[RoomPage] Game created, gameId:', onChainGameId);
            }

            // Emit payment confirmed to server via useMultiplayer
            confirmPayment(txHash, onChainGameId);
        } catch (error: any) {
            console.error('[RoomPage] Payment failed object:', error);
            console.error('[RoomPage] Payment failed message:', error?.message);
            console.error('[RoomPage] Payment failed code:', error?.code);
            if (typeof error === 'object') {
                try {
                    console.error('[RoomPage] Payment failed JSON:', JSON.stringify(error, null, 2));
                } catch (e) {
                    // ignore circular reference errors
                }
            }
        }
    }, [room?.id, paymentStatus, gameVault, confirmPayment]);

    // Handle cancel payment
    const handleCancelPayment = useCallback(() => {
        cancelPayment();
    }, [cancelPayment]);

    const handleJoinQueue = async () => {
        if (!isWalletConnected) {
            await connectWallet();
            return;
        }

        if (!walletAddress) {
            console.error('[RoomPage] Wallet connected but address missing');
            return;
        }

        if (!isOnCorrectChain) {
            await switchToBase();
            return;
        }

        // Store player name for game
        sessionStorage.setItem('player_name', displayName);
        sessionStorage.setItem('wallet_address', walletAddress);

        console.log('[RoomPage] Joining queue with wallet:', walletAddress);
        joinQueue(walletAddress);
    };

    const handleSaveName = () => {
        setIsEditingName(false);
    };

    const error = multiplayerError || walletError || transactionError;

    // Start of styles insertion for import - moving to top
    // Note: This needs to be done carefully to preserve imports

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGrid} />

            {/* Logo Section */}
            <div className={styles.header}>
                <h1 className={styles.logoTitle}>
                    <span className={styles.pixel}>Pixel</span>
                    <span className={styles.war}>War</span>
                </h1>
                <p className={styles.subtitle}>Player vs Player Arena</p>
            </div>

            {/* Status Badges */}
            <div className={styles.statusContainer}>
                <div className={styles.statusBadge}>
                    <div className={`
                        ${styles.statusDot} 
                        ${connectionStatus === 'connected' ? styles.connected :
                            connectionStatus === 'connecting' ? styles.connecting : styles.offline}
                    `} />
                    <span>Server</span>
                </div>

                <div className={styles.walletBadge}>
                    <Wallet size={14} />
                    <span>{isWalletConnected && walletAddress ? formatAddress(walletAddress) : '0x...'}</span>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 text-red-600 text-sm text-center font-medium max-w-md w-full z-10">
                    {error}
                </div>
            )}

            {/* Main Card */}
            <div className={styles.mainCard}>

                {!isServerConnected ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Loader2 className="animate-spin text-pink-500" size={32} />
                        <p className="text-gray-500">Connecting to server...</p>
                    </div>
                ) : matchmakingStatus === 'idle' ? (
                    <>
                        {/* Player Info Section */}
                        <div className={styles.playerInfoCard}>
                            <span className={styles.playingAsLabel}>Playing as</span>

                            <div className={styles.playerDetails}>
                                <div className={styles.avatar}>
                                    {isWalletConnected ? displayName.slice(0, 2).toUpperCase() : '?'}
                                </div>
                                <div className={styles.playerText}>
                                    <span className={styles.playerName}>
                                        {isWalletConnected ? displayName : 'Connect Wallet'}
                                    </span>
                                    <span className={styles.walletName}>
                                        {isWalletConnected ? 'MetaMask Wallet' : 'No Wallet Connected'}
                                    </span>
                                </div>
                                {isWalletConnected && !isEditingName && (
                                    <Edit2
                                        size={16}
                                        className={styles.editButton}
                                        onClick={() => setIsEditingName(true)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Name Editing Input (if active) */}
                        {isEditingName && (
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder={ensName || (walletAddress ? formatAddress(walletAddress) : '')}
                                    className="flex-1 border-2 border-pink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSaveName}
                                    className="p-2 bg-green-500 hover:bg-green-600 rounded-xl text-white transition-colors"
                                >
                                    <Check size={16} />
                                </button>
                            </div>
                        )}

                        {/* Buttons */}
                        <button
                            onClick={handleJoinQueue}
                            disabled={isWalletConnecting || isTransactionLoading}
                            className={styles.findMatchButton}
                        >
                            {isWalletConnecting ? (
                                <><Loader2 className="animate-spin" size={20} /> Connecting...</>
                            ) : isTransactionLoading ? (
                                <><Loader2 className="animate-spin" size={20} /> Processing...</>
                            ) : !isWalletConnected ? (
                                <><Wallet size={20} /> Connect to Play</>
                            ) : !isOnCorrectChain ? (
                                <><AlertTriangle size={20} /> Switch Network</>
                            ) : (
                                <><Swords size={20} /> Find Match</>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                sessionStorage.removeItem('pvp_mode');
                                sessionStorage.removeItem('pvp_room_id');
                                sessionStorage.removeItem('pvp_team');
                                sessionStorage.setItem('ai_mode', 'true');
                                router.push('/play/game');
                            }}
                            className={styles.playAiButton}
                        >
                            <Bot size={18} />
                            Play vs AI Instead
                        </button>
                    </>
                ) : matchmakingStatus === 'queue' ? (
                    <div className="flex flex-col items-center py-6 gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Search size={28} className="text-pink-500" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-lg text-gray-800">Finding Opponent...</p>
                            <p className="text-gray-500 text-sm mt-1">Queue Position: #{queuePosition}</p>
                        </div>
                        <button
                            onClick={leaveQueue}
                            className="mt-2 text-red-500 hover:text-red-600 text-sm hover:underline font-medium"
                        >
                            Cancel Search
                        </button>
                    </div>
                ) : matchmakingStatus === 'found' && paymentStatus ? (
                    // Payment Flow (Simplified visually for new card)
                    <div className="flex flex-col items-center py-3 gap-3">
                        <p className="text-pink-500 font-bold text-lg flex items-center gap-2">
                            <Sparkles size={20} /> Match Found!
                        </p>

                        {/* Compact Match Info */}
                        <div className="flex items-center gap-4 my-2 w-full justify-center">
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-gray-700">{isFirstPlayer ? 'You' : 'Opponent'}</span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-1 ${paymentStatus.player1Paid ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                                    {paymentStatus.player1Paid ? <Check size={16} /> : '1'}
                                </div>
                            </div>
                            <span className="font-bold text-gray-400">VS</span>
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-gray-700">{!isFirstPlayer ? 'You' : 'Opponent'}</span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-1 ${paymentStatus.player2Paid ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                                    {paymentStatus.player2Paid ? '✓' : '2'}
                                </div>
                            </div>
                        </div>

                        {/* Timer */}
                        <p className="text-gray-500 text-xs">
                            Time: <span className={`font-mono font-bold ${paymentTimeLeft <= 10 ? 'text-red-500' : 'text-gray-800'}`}>{paymentTimeLeft}s</span>
                        </p>

                        {/* Fee Visual */}
                        <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 w-full text-center">
                            <span className="text-xs text-gray-500 uppercase font-bold">Entry Fee</span>
                            <div className="text-xl font-black text-gray-800">{getBidAmount()}</div>
                            <p className="text-pink-500 text-xs font-bold mt-1 flex items-center justify-center gap-1">
                                Winner takes 0.00198 ETH <Trophy size={14} />
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 w-full mt-2">
                            <button
                                onClick={handleCancelPayment}
                                className="flex-1 py-3 border border-gray-200 rounded-full text-gray-500 font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayToPlay}
                                disabled={gameVault.isLoading || (isFirstPlayer ? paymentStatus.player1Paid : paymentStatus.player2Paid) || (!isFirstPlayer && !paymentStatus.onChainGameId)}
                                className="flex-1 py-3 bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {gameVault.isLoading ? (
                                    <><Loader2 className="animate-spin" size={16} /> Confirming...</>
                                ) : (isFirstPlayer ? paymentStatus.player1Paid : paymentStatus.player2Paid) ? (
                                    'Paid & Waiting'
                                ) : (!isFirstPlayer && !paymentStatus.onChainGameId) ? (
                                    <span className="flex items-center gap-1 text-[10px] sm:text-xs">
                                        <Loader2 className="animate-spin shrink-0" size={14} />
                                        Wait for Opponent to Create Game
                                    </span>
                                ) : (
                                    'Pay & Play'
                                )}
                            </button>
                        </div>
                    </div>
                ) : matchmakingStatus === 'found' ? (
                    <div className="flex flex-col items-center py-8 gap-4">
                        <Swords className="text-pink-500 animate-bounce" size={48} />
                        <div className="text-center">
                            <p className="text-pink-500 font-bold text-xl">Match Found!</p>
                            <p className="text-gray-500">Connecting...</p>
                        </div>
                    </div>
                ) : matchmakingStatus === 'countdown' ? (
                    <div className="flex flex-col items-center py-6 gap-4">
                        <p className="text-gray-400 text-sm uppercase font-bold">Game Starting In</p>
                        <div className="text-6xl font-black text-pink-500">{countdown}</div>
                    </div>
                ) : null}
            </div>

            {/* Bottom Features */}
            <div className={styles.featuresGrid}>
                <div className={styles.featureCard}>
                    <PaintBucket className={`${styles.featureIcon} ${styles.blue}`} size={20} />
                    <span className={styles.featureText}>Paint the arena</span>
                </div>
                <div className={styles.featureCard}>
                    <Zap className={styles.featureIcon} size={20} />
                    <span className={styles.featureText}>Use power-ups</span>
                </div>
                <div className={styles.featureCard}>
                    <Crown className={styles.featureIcon} size={20} />
                    <span className={styles.featureText}>Capture golden pixels</span>
                </div>
            </div>
        </div>
    );
}
