'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMultiplayer } from '../play/game/hooks/useMultiplayer';
import { useWallet, formatAddress, isCorrectChain } from '../contexts/WalletContext';
import { useGameVault, GameMode } from '../hooks/useGameVault';
import { useENSName } from '../hooks/useENSName';
import {
    Loader2, Wallet, AlertTriangle, Edit2, Bot, Search,
    ArrowLeft, Swords, Check, Clock, Trophy
} from 'lucide-react';
import styles from './room.module.css';

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
        paymentStatus,
        isFirstPlayer,
        confirmPayment,
        cancelPayment,
    } = useMultiplayer();

    const {
        address: walletAddress,
        isConnected: isWalletConnected,
        isConnecting: isWalletConnecting,
        chainId,
        error: walletError,
        connect: connectWallet,
        switchToBase,
    } = useWallet();

    const { ensName } = useENSName(walletAddress);
    const gameVault = useGameVault();
    const { isLoading: isTransactionLoading, error: transactionError, getBidAmount } = gameVault;

    const [paymentTimeLeft, setPaymentTimeLeft] = useState(90);
    const [customName, setCustomName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);

    const isOnCorrectChain = isCorrectChain(chainId);

    const getDisplayName = () => {
        if (customName.trim()) return customName.trim();
        if (ensName) return ensName;
        if (walletAddress) return formatAddress(walletAddress);
        return 'PLAYER_1';
    };

    const displayName = getDisplayName();

    // Auto-connect to server
    useEffect(() => {
        connectToServer();
        return () => disconnectFromServer();
    }, [connectToServer, disconnectFromServer]);

    // Auto-reconnect wallet
    useEffect(() => {
        if (paymentStatus && !isWalletConnected && !isWalletConnecting) {
            const savedWallet = sessionStorage.getItem('wallet_address');
            if (savedWallet) {
                console.log('[RoomPage] Pending payment detected, auto-reconnecting wallet...');
                connectWallet();
            }
        }
    }, [paymentStatus, isWalletConnected, isWalletConnecting, connectWallet]);

    // Redirect to game
    useEffect(() => {
        if (isPlaying) {
            if (room?.id) {
                sessionStorage.setItem('pvp_room_id', room.id);
            }
            sessionStorage.setItem('pvp_team', myTeam || 'blue');
            sessionStorage.setItem('pvp_mode', 'true');
            sessionStorage.setItem('player_name', displayName);
            if (walletAddress) {
                sessionStorage.setItem('wallet_address', walletAddress);
            }
            router.push('/play/game');
        }
    }, [isPlaying, myTeam, router, room, walletAddress, displayName]);

    // Payment timer
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

    // Auto ready
    useEffect(() => {
        if (matchmakingStatus === 'found' && opponent && room?.status !== 'pending_payment' && !paymentStatus) {
            sessionStorage.removeItem('ai_mode');
            setReady();
        }
    }, [matchmakingStatus, opponent, setReady, room?.status, paymentStatus]);

    useEffect(() => {
        if (matchmakingStatus === 'idle') {
            sessionStorage.removeItem('pending_payment_tx');
        }
    }, [matchmakingStatus]);

    const handlePayToPlay = useCallback(async () => {
        if (!room?.id || !paymentStatus) return;
        if (!isWalletConnected) {
            await connectWallet();
            return;
        }

        try {
            let txHash: string;
            let onChainGameId: number;
            const existingGameId = paymentStatus.onChainGameId;

            if (!isFirstPlayer && !existingGameId) return;

            if (existingGameId) {
                onChainGameId = existingGameId;
                txHash = await gameVault.joinGame(onChainGameId);
            } else {
                const result = await gameVault.createGame(GameMode.OneVsOne);
                txHash = result.txHash;
                onChainGameId = result.gameId;
            }
            confirmPayment(txHash, onChainGameId);
        } catch (error) {
            console.error('[RoomPage] Payment failed:', error);
        }
    }, [room?.id, paymentStatus, gameVault, confirmPayment, isFirstPlayer, isWalletConnected, connectWallet]);

    const handleCancelPayment = useCallback(() => {
        sessionStorage.removeItem('pending_payment_tx');
        cancelPayment();
    }, [cancelPayment]);

    const handleJoinQueue = async () => {
        if (!isWalletConnected) {
            await connectWallet();
            return;
        }
        if (!walletAddress) return;
        if (!isOnCorrectChain) {
            await switchToBase();
            return;
        }
        sessionStorage.setItem('player_name', displayName);
        sessionStorage.setItem('wallet_address', walletAddress);
        joinQueue(walletAddress);
    };

    const error = multiplayerError || walletError || transactionError;

    return (
        <div className={styles.container}>
            {/* Background Noise */}
            <div className={styles.scanlineOverlay} />

            <header className={`${styles.header} w-full flex justify-center`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/play" className={`${styles.statusPill} !gap-2 !px-4 hover:text-[#ff8ba7] hover:border-[#ff8ba7] transition-colors`}>
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-bold">BACK TO LOBBY</span>
                        </Link>

                        {/* Server Status Pill */}
                        <div className={styles.statusPill}>
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-[#26de81]' :
                                connectionStatus === 'connecting' ? 'bg-[#f9ca24]' : 'bg-[#e74c3c]'
                                }`} />
                            <span>SERVER: {connectionStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>

                        {/* Wallet Pill */}
                        <div className={styles.statusPill}>
                            {isWalletConnected ? (
                                <>
                                    <Wallet className="w-4 h-4 text-[#26de81]" />
                                    <span>{formatAddress(walletAddress || '')}</span>
                                </>
                            ) : (
                                <>
                                    <Wallet className="w-4 h-4 text-slate-400" />
                                    <span>NO LINK</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 w-full flex flex-col items-center justify-center">

                {/* Error Box */}
                {error && (
                    <div className="w-full max-w-[520px] mb-6 p-4 bg-red-900/20 border border-red-500/50 backdrop-blur-sm shadow-sm text-center">
                        <p className="text-red-400 font-terminal text-sm border-l-2 border-red-500 pl-4">{error}</p>
                    </div>
                )}

                {/* Main Card / HUD Container */}
                <div className={styles.hudContainer}>
                    {/* Decorative Elements */}
                    <div className={styles.hudTopBar} />
                    <div className={`${styles.pixelCorner} ${styles.tl}`} />
                    <div className={`${styles.pixelCorner} ${styles.tr}`} />
                    <div className={`${styles.pixelCorner} ${styles.bl}`} />
                    <div className={`${styles.pixelCorner} ${styles.br}`} />

                    {!isServerConnected && (paymentStatus || room?.status === 'pending_payment') ? (
                        <div className="flex flex-col items-center py-12 gap-6">
                            <div className={styles.techSpinner} />
                            <p className="text-[#ff8ba7] font-retro animate-pulse">RECONNECTING...</p>
                        </div>
                    ) : !isServerConnected ? (
                        <div className="flex flex-col items-center py-12 gap-6">
                            <div className={styles.techSpinner} />
                            <p className="text-white/80 font-terminal">ESTABLISHING UPLINK...</p>
                        </div>
                    ) : matchmakingStatus === 'idle' ? (
                        <div className="space-y-8">
                            {/* Player Info */}
                            <div className={styles.playerCard}>
                                <div className={styles.playerAvatar}>
                                    {isWalletConnected ? displayName.slice(0, 1).toUpperCase() : '?'}
                                </div>
                                <div className="flex-1 min-w-0 playerInfo">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="!text-xs uppercase tracking-widest !text-[#ff8ba7]">Operator ID</p>
                                        {isWalletConnected && (
                                            <button onClick={() => setIsEditingName(!isEditingName)} className="text-white/50 hover:text-white transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {isEditingName ? (
                                        <input
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            className={styles.techInput}
                                            autoFocus
                                            onBlur={() => setIsEditingName(false)}
                                        />
                                    ) : (
                                        <h3 className="text-white truncate">
                                            {displayName}
                                        </h3>
                                    )}
                                    <p className="mt-1 font-terminal text-xs text-white/50">
                                        {isWalletConnected ? 'STATUS: ACTIVE' : 'STATUS: OFFLINE'}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-4">
                                <button
                                    onClick={handleJoinQueue}
                                    disabled={isWalletConnecting || isTransactionLoading}
                                    className={`${styles.techButton} ${styles.techButtonPrimary}`}
                                >
                                    {isWalletConnecting ? (
                                        <>CONNECTING...</>
                                    ) : !isWalletConnected ? (
                                        <div className="flex items-center justify-center gap-3"><Wallet className="w-5 h-5" /> LINK WALLET</div>
                                    ) : !isOnCorrectChain ? (
                                        <div className="flex items-center justify-center gap-3 text-yellow-400"><AlertTriangle className="w-5 h-5" /> WRONG NET</div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-3"><Swords className="w-5 h-5" /> INITIALIZE COMBAT</div>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        sessionStorage.setItem('ai_mode', 'true');
                                        router.push('/play/game');
                                    }}
                                    className={`${styles.techButton} ${styles.techButtonSecondary}`}
                                >
                                    <div className="flex items-center justify-center gap-3"><Bot className="w-5 h-5" /> SIMULATION MODE (AI)</div>
                                </button>
                            </div>
                        </div>
                    ) : matchmakingStatus === 'queue' ? (
                        <div className="flex flex-col items-center py-12 gap-8 text-center">
                            <div className={styles.techSpinner} />

                            <div className="space-y-2">
                                <h3 className="text-2xl font-retro text-[#ff8ba7] animate-pulse">SCANNING SECTOR...</h3>
                                <p className="text-white/70 font-terminal">QUEUE POS: #{queuePosition}</p>
                            </div>

                            <button onClick={leaveQueue} className="text-white font-sans font-bold border border-white/50 hover:bg-white/10 hover:border-white transition-all px-8 py-2 rounded-full mt-4 bg-black/20 text-sm tracking-wide">
                                ABORT SCAN
                            </button>
                        </div>
                    ) : matchmakingStatus === 'found' && paymentStatus ? (
                        <div className="space-y-8 text-center">
                            <div className="space-y-2">
                                <Swords className="w-12 h-12 text-[#26de81] mx-auto animate-bounce" />
                                <h3 className="text-3xl font-retro text-white">TARGET ACQUIRED</h3>
                                <p className="text-white/50 font-terminal">AWAITING CONFIRMATION</p>
                            </div>

                            {/* Players */}
                            <div className="flex items-center justify-between px-4 py-4 bg-white/5 border border-white/10 relative">
                                <div className="absolute top-0 left-0 w-2 h-2 bg-white/20" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/20" />

                                <div className="text-center">
                                    <div className={`w-16 h-16 border-2 flex items-center justify-center mb-2 transition-all ${paymentStatus.player1Paid ? 'border-[#26de81] text-[#26de81]' : 'border-white/30 text-white/30'
                                        }`}>
                                        {paymentStatus.player1Paid ? <Check className="w-8 h-8" /> : <span className="font-retro text-xl">P1</span>}
                                    </div>
                                    <span className="text-xs font-bold text-white/50">{isFirstPlayer ? 'YOU' : 'OPP'}</span>
                                </div>

                                <div className="text-4xl font-retro text-[#903749] animate-pulse">VS</div>

                                <div className="text-center">
                                    <div className={`w-16 h-16 border-2 flex items-center justify-center mb-2 transition-all ${paymentStatus.player2Paid ? 'border-[#26de81] text-[#26de81]' : 'border-white/30 text-white/30'
                                        }`}>
                                        {paymentStatus.player2Paid ? <Check className="w-8 h-8" /> : <span className="font-retro text-xl">P2</span>}
                                    </div>
                                    <span className="text-xs font-bold text-white/50">{!isFirstPlayer ? 'YOU' : 'OPP'}</span>
                                </div>
                            </div>

                            {/* Stake Info */}
                            <div className="border border-[#ff8ba7]/30 bg-[#ff8ba7]/10 p-4 relative">
                                <p className="text-xs uppercase tracking-widest text-[#ff8ba7] font-bold mb-1">STAKE AMOUNT</p>
                                <p className="text-2xl font-retro text-white">{getBidAmount()}</p>
                                <div className="flex items-center justify-center gap-2 mt-2 text-[#26de81] text-xs font-terminal">
                                    <Trophy className="w-3 h-3" />
                                    <span>REWARD: 0.00198 ETH</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[#e74c3c] font-retro text-sm border border-[#e74c3c]/50 py-2">
                                <Clock className="w-4 h-4 animate-pulse" />
                                <span>TIMEOUT: {paymentTimeLeft}s</span>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handlePayToPlay}
                                    disabled={gameVault.isLoading || (isFirstPlayer ? paymentStatus.player1Paid : paymentStatus.player2Paid) || (!isFirstPlayer && !paymentStatus.onChainGameId)}
                                    className={`${styles.techButton} ${styles.techButtonPrimary} !bg-[#26de81] !text-black !text-sm border-none`}
                                >
                                    {gameVault.isLoading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> PROCESSING TX</>
                                    ) : (isFirstPlayer ? paymentStatus.player1Paid : paymentStatus.player2Paid) ? (
                                        'WAITING FOR OPPONENT...'
                                    ) : (!isFirstPlayer && !paymentStatus.onChainGameId) ? (
                                        'WAITING FOR PLAYER 1...'
                                    ) : (
                                        'CONFIRM ENTRY FEE'
                                    )}
                                </button>
                                <button onClick={handleCancelPayment} className="w-full py-3 text-white/50 hover:text-white font-terminal text-sm border border-transparent hover:border-white/20 transition-all">
                                    CANCEL OPERATION
                                </button>
                            </div>
                        </div>
                    ) : matchmakingStatus === 'found' ? (
                        <div className="flex flex-col items-center py-12 gap-6 text-center">
                            <Swords className="w-16 h-16 text-[#ff8ba7] animate-bounce" />
                            <h3 className="text-3xl font-retro text-white">MATCH CONFIRMED</h3>
                            <p className="text-white/70 font-terminal">ENTERING BATTLEFIELD...</p>
                        </div>
                    ) : matchmakingStatus === 'countdown' ? (
                        <div className="flex flex-col items-center py-12 gap-6 text-center">
                            <p className="text-xl font-retro text-[#f9ca24]">PREPARE FOR BATTLE</p>
                            <p className="text-9xl font-retro text-white animate-pulse">{countdown}</p>
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
