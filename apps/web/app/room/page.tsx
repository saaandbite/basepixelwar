'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMultiplayer } from '../play/game/hooks/useMultiplayer';
import { useWallet, formatAddress, isCorrectChain } from '../contexts/WalletContext';
import { useGameVault, GameMode } from '../hooks/useGameVault';
import { useENSName } from '../hooks/useENSName';
import {
    Loader2, Wallet, AlertTriangle, Edit2, Check, Bot, Search,
    Trophy, Sparkles, ArrowLeft, Swords, Zap, Target, Crown, Clock
} from 'lucide-react';

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

    // Auto-reconnect wallet when returning from wallet app during pending payment
    useEffect(() => {
        // If we have pending payment but wallet is disconnected, try to reconnect
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

    // Auto ready (legacy flow)
    useEffect(() => {
        if (matchmakingStatus === 'found' && opponent && room?.status !== 'pending_payment' && !paymentStatus) {
            sessionStorage.removeItem('ai_mode');
            setReady();
        }
    }, [matchmakingStatus, opponent, setReady, room?.status, paymentStatus]);

    // Payment handlers
    const handlePayToPlay = useCallback(async () => {
        if (!room?.id || !paymentStatus) return;

        // Ensure wallet is connected before attempting payment
        if (!isWalletConnected) {
            console.log('[RoomPage] Wallet not connected, connecting first...');
            await connectWallet();
            // Give wagmi a moment to update state
            await new Promise(resolve => setTimeout(resolve, 500));
            // Check again after connect attempt
            if (!walletAddress) {
                console.error('[RoomPage] Failed to connect wallet for payment');
                return;
            }
        }

        try {
            let txHash: string;
            let onChainGameId: number;
            const existingGameId = paymentStatus.onChainGameId;

            if (!isFirstPlayer && !existingGameId) {
                return; // Wait for Player 1
            }

            console.log('[RoomPage] Starting payment...', { existingGameId, isFirstPlayer, walletAddress });

            if (existingGameId) {
                onChainGameId = existingGameId;
                txHash = await gameVault.joinGame(onChainGameId);
            } else {
                const result = await gameVault.createGame(GameMode.OneVsOne);
                txHash = result.txHash;
                onChainGameId = result.gameId;
            }

            console.log('[RoomPage] Payment successful:', { txHash, onChainGameId });
            confirmPayment(txHash, onChainGameId);
        } catch (error) {
            console.error('[RoomPage] Payment failed:', error);
        }
    }, [room?.id, paymentStatus, gameVault, confirmPayment, isFirstPlayer, isWalletConnected, connectWallet, walletAddress]);

    const handleCancelPayment = useCallback(() => {
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
        <div className="min-h-screen relative flex flex-col font-terminal text-[24px]">
            <div className="scanline" />
            <div className="fixed inset-0 bg-[var(--pixel-bg)] z-0" />

            {/* Header */}
            <header className="relative z-10 p-6 border-b-4 border-[var(--pixel-card-border)] bg-black/90">
                <div className="container mx-auto flex items-center justify-between">
                    <Link href="/play" className="flex items-center gap-3 hover:text-[var(--pixel-blue)] transition-colors">
                        <ArrowLeft className="w-8 h-8" />
                        <span className="font-bold">EXIT</span>
                    </Link>

                    <div className="flex items-center gap-6 text-base md:text-lg">
                        {/* Server Status */}
                        <div className="flex items-center gap-3 pixel-badge text-[var(--pixel-fg)] bg-black border-2 border-[var(--pixel-fg)]">
                            <div className={`w-4 h-4 ${connectionStatus === 'connected' ? 'bg-[var(--pixel-green)] animate-blink' :
                                connectionStatus === 'connecting' ? 'bg-[var(--pixel-yellow)]' : 'bg-[var(--pixel-red)]'
                                }`} />
                            <span>NET: {connectionStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>

                        {/* Wallet */}
                        <div className="flex items-center gap-3 pixel-badge text-[var(--pixel-fg)] bg-black border-2 border-[var(--pixel-fg)]">
                            <Wallet className="w-5 h-5" />
                            <span>{isWalletConnected && walletAddress ? formatAddress(walletAddress) : 'NO_DATA'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">

                {/* Error Box */}
                {error && (
                    <div className="pixel-box w-full max-w-2xl mb-12 bg-black border-4 border-[var(--pixel-red)] animate-shake text-center">
                        <h3 className="text-[var(--pixel-red)] mb-4 text-3xl font-retro">⚠ ERROR ⚠</h3>
                        <p className="text-xl">{error}</p>
                    </div>
                )}

                {/* Matchmaking Interface - The "Cabinet" */}
                <div className="pixel-card w-full max-w-2xl bg-[#13131f] relative border-4 border-white rounded-[2rem] shadow-2xl">

                    {/* Decorative Header */}
                    <div className="bg-[var(--pixel-blue)] text-center py-3 mb-8 -mx-7 -mt-7 rounded-t-[1.5rem] border-b-4 border-white text-white font-retro text-lg tracking-widest shadow-md">
                        BATTLE LOBBY - SYSTEM v2.0
                    </div>

                    {/* Reconnecting during pending_payment - special UI */}
                    {!isServerConnected && (paymentStatus || room?.status === 'pending_payment') ? (
                        <div className="flex flex-col items-center py-16 gap-6">
                            <Loader2 className="w-16 h-16 text-[var(--pixel-yellow)] animate-spin" />
                            <p className="text-[var(--pixel-yellow)] text-2xl animate-blink">RECONNECTING...</p>
                            <p className="text-[var(--pixel-fg)] text-lg opacity-70">Match in progress, please wait...</p>
                        </div>

                    ) : !isServerConnected ? (
                        <div className="flex flex-col items-center py-16 gap-6">
                            <Loader2 className="w-16 h-16 text-[var(--pixel-blue)] animate-spin" />
                            <p className="text-[var(--pixel-fg)] text-2xl animate-blink">CONNECTING TO SERVER...</p>
                        </div>

                    ) : matchmakingStatus === 'idle' ? (
                        <div className="space-y-8">
                            {/* Player Status Panel - BLUE THEME */}
                            <div className="bg-[var(--pixel-bg)] border-4 border-[var(--pixel-blue)] p-6 relative">
                                <div className="absolute -top-4 left-6 bg-[var(--pixel-blue)] px-3 py-1 text-base text-white border-2 border-white">
                                    PLAYER 1 (YOU)
                                </div>
                                <div className="flex items-center gap-6 mt-4">
                                    <div className="w-24 h-24 bg-[var(--pixel-blue)] border-4 border-white flex items-center justify-center font-retro text-4xl text-white shadow-lg">
                                        {isWalletConnected ? displayName.slice(0, 1).toUpperCase() : '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {isEditingName ? (
                                                <div className="flex gap-4 w-full">
                                                    <input
                                                        type="text"
                                                        value={customName}
                                                        onChange={(e) => setCustomName(e.target.value)}
                                                        placeholder="ENTER NAME"
                                                        className="pixel-input text-2xl !p-2 flex-1"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => setIsEditingName(false)} className="pixel-btn pixel-btn-success !py-2 !px-4">
                                                        OK
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-[var(--pixel-green)] text-3xl font-bold truncate tracking-wider">
                                                        {isWalletConnected ? displayName : 'INSERT COIN'}
                                                    </span>
                                                    {isWalletConnected && (
                                                        <button onClick={() => setIsEditingName(true)} className="hover:text-white p-2">
                                                            <Edit2 className="w-6 h-6 opacity-50 hover:opacity-100" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xl text-[var(--pixel-fg)] mt-2 opacity-80">
                                            {isWalletConnected ? 'READY TO BATTLE' : 'WALLET DISCONNECTED'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-6 pt-4">
                                <button
                                    onClick={handleJoinQueue}
                                    disabled={isWalletConnecting || isTransactionLoading}
                                    className="pixel-btn pixel-btn-primary w-full text-2xl py-6 group shadow-xl"
                                >
                                    {isWalletConnecting ? (
                                        <span className="animate-blink">CONNECTING...</span>
                                    ) : !isWalletConnected ? (
                                        <><Wallet className="inline-block mr-3 w-8 h-8" /> LINK WALLET</>
                                    ) : !isOnCorrectChain ? (
                                        <><AlertTriangle className="inline-block mr-3 w-8 h-8 text-[var(--pixel-yellow)]" /> WRONG NETWORK</>
                                    ) : (
                                        <><Swords className="inline-block mr-3 w-8 h-8 group-hover:rotate-45 transition-transform" /> FIND MATCH</>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        sessionStorage.setItem('ai_mode', 'true');
                                        router.push('/play/game');
                                    }}
                                    className="pixel-btn pixel-btn-outline w-full text-xl py-4 opacity-70 hover:opacity-100"
                                >
                                    <Bot className="inline-block mr-3 w-6 h-6" /> PRACTICE MODE (AI)
                                </button>
                            </div>
                        </div>

                    ) : matchmakingStatus === 'queue' ? (
                        <div className="flex flex-col items-center py-12 gap-8">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <div className="absolute inset-0 border-8 border-[var(--pixel-fg)] opacity-30" />
                                <div className="absolute inset-0 border-8 border-t-[var(--pixel-blue)] border-r-[var(--pixel-blue)] animate-spin" />
                                <Search className="w-16 h-16 text-[var(--pixel-blue)] animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="text-[var(--pixel-blue)] animate-blink text-2xl mb-4 font-bold">SCANNING FOR OPPONENT...</p>
                                <div className="pixel-badge text-[var(--pixel-fg)] text-lg px-6 py-2">
                                    QUEUE POS: #{queuePosition}
                                </div>
                            </div>
                            <button onClick={leaveQueue} className="pixel-btn pixel-btn-danger mt-8 text-lg w-full max-w-xs">
                                CANCEL SEARCH
                            </button>
                        </div>

                    ) : matchmakingStatus === 'found' && paymentStatus ? (
                        <div className="space-y-8">
                            <div className="text-center animate-bounce text-[var(--pixel-green)]">
                                <h3 className="text-4xl font-retro">OPPONENT FOUND!</h3>
                            </div>

                            {/* VS Screen */}
                            <div className="flex items-center justify-between px-8 py-6 bg-[var(--pixel-bg)] border-4 border-white">
                                <div className="text-center relative">
                                    <div className={`w-24 h-24 border-4 mx-auto mb-4 flex items-center justify-center ${paymentStatus.player1Paid ? 'bg-[var(--pixel-green)] border-white' : 'border-[var(--pixel-fg)] bg-black'
                                        }`}>
                                        {paymentStatus.player1Paid ? <Check className="w-12 h-12 text-black" /> : <span className="text-4xl font-retro text-[var(--pixel-blue)]">P1</span>}
                                    </div>
                                    <span className="text-lg font-bold text-[var(--pixel-blue)]">{isFirstPlayer ? 'YOU' : 'OPP'}</span>
                                </div>

                                <div className="font-retro text-6xl text-[var(--pixel-red)] animate-pulse px-4">VS</div>

                                <div className="text-center relative">
                                    <div className={`w-24 h-24 border-4 mx-auto mb-4 flex items-center justify-center ${paymentStatus.player2Paid ? 'bg-[var(--pixel-green)] border-white' : 'border-[var(--pixel-fg)] bg-black'
                                        }`}>
                                        {paymentStatus.player2Paid ? <Check className="w-12 h-12 text-black" /> : <span className="text-4xl font-retro text-[var(--pixel-red)]">P2</span>}
                                    </div>
                                    <span className="text-lg font-bold text-[var(--pixel-red)]">{!isFirstPlayer ? 'YOU' : 'OPP'}</span>
                                </div>
                            </div>

                            {/* Stakes Panel */}
                            <div className="bg-[var(--pixel-bg)] border-4 border-[var(--pixel-yellow)] p-6 text-center shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                                <div className="text-[var(--pixel-yellow)] text-xl mb-2 uppercase font-bold tracking-widest">Battle Stake</div>
                                <div className="font-retro text-3xl text-white mb-4">{getBidAmount()}</div>
                                <div className="text-lg text-[var(--pixel-green)] flex items-center justify-center gap-2">
                                    <Trophy className="w-6 h-6" /> WINNER: 0.00198 ETH
                                </div>
                            </div>

                            {/* Timer */}
                            <div className="text-center flex items-center justify-center gap-3 text-[var(--pixel-red)] text-2xl font-bold bg-black border-2 border-[var(--pixel-red)] py-2">
                                <Clock className="w-6 h-6 animate-pulse" />
                                <span>TIME: {paymentTimeLeft}s</span>
                            </div>

                            <div className="flex gap-6">
                                <button onClick={handleCancelPayment} className="pixel-btn pixel-btn-danger flex-1 text-xl">
                                    EXIT
                                </button>
                                <button
                                    onClick={handlePayToPlay}
                                    disabled={gameVault.isLoading || (isFirstPlayer ? paymentStatus.player1Paid : paymentStatus.player2Paid) || (!isFirstPlayer && !paymentStatus.onChainGameId)}
                                    className="pixel-btn pixel-btn-success flex-[2] text-xl font-bold"
                                >
                                    {gameVault.isLoading ? (
                                        <><Loader2 className="w-6 h-6 animate-spin inline" /> PROCESSING</>
                                    ) : (isFirstPlayer ? paymentStatus.player1Paid : paymentStatus.player2Paid) ? (
                                        'WAITING OPPONENT...'
                                    ) : (!isFirstPlayer && !paymentStatus.onChainGameId) ? (
                                        <><Loader2 className="w-6 h-6 animate-spin inline" /> WAIT P1</>
                                    ) : (
                                        'PAY & FIGHT'
                                    )}
                                </button>
                            </div>
                        </div>

                    ) : matchmakingStatus === 'found' ? (
                        <div className="text-center py-16">
                            <Swords className="w-24 h-24 mx-auto text-[var(--pixel-blue)] animate-bounce mb-6" />
                            <h2 className="text-4xl font-retro text-white mb-2">MATCH FOUND!</h2>
                            <p className="text-[var(--pixel-fg)] text-xl animate-pulse">INITIALIZING BATTLEGROUND...</p>
                        </div>

                    ) : matchmakingStatus === 'countdown' ? (
                        <div className="text-center py-16">
                            <p className="font-retro text-3xl text-[var(--pixel-yellow)] mb-8">GET READY</p>
                            <p className="font-retro text-9xl text-white animate-pulse scale-150">{countdown}</p>
                        </div>

                    ) : null}
                </div>

                {/* Footer Info */}
                <div className="mt-12 flex gap-12 text-[var(--pixel-fg)] text-lg opacity-60">
                    <div className="flex items-center gap-3">
                        <Target className="w-5 h-5" /> 1VS1 STANDARD
                    </div>
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5" /> ON-CHAIN SETTLEMENT
                    </div>
                </div>
            </main>
        </div>
    );
}
