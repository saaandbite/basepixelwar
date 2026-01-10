'use client';

// usePvPGame.ts
// Hook untuk mode PvP - menerima game state dari server dan render

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAudio } from './useAudio'; // Import useAudio
import { useGameVault, GameMode } from '../../hooks/useGameVault';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SyncedGameState,
    GameStartData,
    PaymentStatus,
    SettlementResult,
} from '@repo/shared/multiplayer';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Nginx Proxy Setup:
// We return EMPTY string so Socket.io connects to window.location.origin
// This works perfectly with the Nginx reverse proxy Setup ( / -> web, /socket.io -> server )
const getServerUrl = () => {
    // Still respect env var if explicitly set (for dev/testing without nginx)
    if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;

    // In production with Nginx, we want a relative connection
    // Socket.io will automatically append /socket.io to the current URL
    return undefined;
};

const SERVER_URL = getServerUrl();

export interface PvPState {
    // Connection
    isConnected: boolean;
    playerId: string | null;

    // Room
    roomId: string | null;
    myTeam: 'blue' | 'red' | null;
    opponentName: string | null;

    // Game
    isPlaying: boolean;
    countdown: number;

    // Latest game state from server
    gameState: SyncedGameState | null;

    // Scores
    scores: { blue: number; red: number };
    timeLeft: number;

    // Game Over 
    gameOverResult: { winner: 'blue' | 'red' | 'draw', scores: { blue: number; red: number } } | null;

    // Settlement (prize distribution)
    settlementTxHash: string | null;
    settlementSuccess: boolean | null;

    // Payment
    pendingPayment: boolean;
    paymentStatus: PaymentStatus | null;
    isFirstPlayer: boolean;
}

export function usePvPGame() {
    const socketRef = useRef<GameSocket | null>(null);

    // Audio
    const { playSound, initAudio } = useAudio();
    const lastGameStateRef = useRef<SyncedGameState | null>(null);

    // Game Vault (Smart Contract)
    const gameVault = useGameVault();

    const [state, setState] = useState<PvPState>({
        isConnected: false,
        playerId: null,
        roomId: null,
        myTeam: null,
        opponentName: null,
        isPlaying: false,
        countdown: 0,
        gameState: null,
        scores: { blue: 50, red: 50 },
        timeLeft: 120,
        gameOverResult: null,
        // Settlement
        settlementTxHash: null,
        settlementSuccess: null,
        // Payment
        pendingPayment: false,
        paymentStatus: null,
        isFirstPlayer: false,
    });

    // Connect to server
    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        initAudio(); // Initialize audio context on connection start (user action) or assume called from UI

        const socket: GameSocket = io(SERVER_URL, {
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('[PvP] Connected to server');
            setState(prev => ({ ...prev, isConnected: true }));
        });

        socket.on('connected', (playerId) => {
            setState(prev => ({ ...prev, playerId }));

            // Try to rejoin if roomId is in session
            const storedRoomId = sessionStorage.getItem('pvp_room_id');
            if (storedRoomId) {
                console.log('[PvP] Attempting to rejoin room:', storedRoomId);
                socket.emit('rejoin_game', storedRoomId);
            }
        });

        socket.on('rejoin_failed', () => {
            console.log('[PvP] Rejoin failed, redirecting to room');
            sessionStorage.removeItem('pvp_mode');
            sessionStorage.removeItem('pvp_room_id');
            sessionStorage.removeItem('pvp_team');
            window.location.href = '/room';
        });

        // Original match_found (kept for backwards compatibility, but won't be used with payment flow)
        socket.on('match_found', ({ roomId, opponent }) => {
            // Determine my team based on opponent's team
            const inferredTeam: 'blue' | 'red' = opponent.team === 'red' ? 'blue' : 'red';
            setState(prev => ({
                ...prev,
                roomId,
                opponentName: opponent.name,
                myTeam: inferredTeam, // Set team early for countdown display
                gameOverResult: null, // Reset previous game over
            }));
            playSound('powerup');
        });

        // NEW: Pending payment (match found, waiting for payment)
        socket.on('pending_payment', ({ roomId, opponent, deadline, isFirstPlayer }) => {
            console.log('[PvP] Match found, pending payment');
            const inferredTeam: 'blue' | 'red' = opponent.team === 'red' ? 'blue' : 'red';
            setState(prev => ({
                ...prev,
                roomId,
                opponentName: opponent.name,
                myTeam: inferredTeam,
                pendingPayment: true,
                isFirstPlayer,
                paymentStatus: {
                    player1Paid: false,
                    player2Paid: false,
                    deadline,
                },
                gameOverResult: null,
            }));
            playSound('powerup');
        });

        // Payment status update
        socket.on('payment_status', (status) => {
            console.log('[PvP] Payment status update:', status);
            setState(prev => ({
                ...prev,
                paymentStatus: status,
            }));
        });

        // Payment cancelled
        socket.on('payment_cancelled', (reason) => {
            console.log('[PvP] Payment cancelled:', reason);
            setState(prev => ({
                ...prev,
                roomId: null,
                pendingPayment: false,
                paymentStatus: null,
                isFirstPlayer: false,
            }));
        });

        // Payment timeout
        socket.on('payment_timeout', () => {
            console.log('[PvP] Payment timeout');
            setState(prev => ({
                ...prev,
                roomId: null,
                pendingPayment: false,
                paymentStatus: null,
                isFirstPlayer: false,
            }));
        });

        socket.on('game_countdown', (seconds) => {
            setState(prev => ({
                ...prev,
                countdown: seconds,
                gameOverResult: null,
                pendingPayment: false, // Clear payment state when countdown starts
            }));
            if (seconds > 0 && seconds <= 3) playSound('shoot'); // Simple beep for countdown
        });

        socket.on('game_start', (data: GameStartData) => {
            console.log('[PvP] Game started (Rejoin/Start)', data);
            setState(prev => ({
                ...prev,
                roomId: data.roomId, // IMPORTANT: Ensure roomId is set!
                myTeam: data.yourTeam,
                isPlaying: true,
                countdown: 0,
                opponentName: data.opponent.name,
                gameOverResult: null,
                pendingPayment: false,
                paymentStatus: null,
                scores: { blue: 50, red: 50 }, // Reset scores
            }));
            playSound('combo'); // Game start sound
        });

        // Main game state sync from server
        socket.on('game_state', (gameState) => {
            // Audio Triggers based on State Diff
            // Cast to any because shared types might be outdated regarding FX fields
            const current = gameState as any;
            const prev = lastGameStateRef.current as any;

            if (prev) {
                // Check for new projectiles (Shooting sound)
                if (current.projectiles && prev.projectiles && current.projectiles.length > prev.projectiles.length) {
                    playSound('shoot');
                }

                // Check for explosions (Territory Batches / Particles)
                if (current.screenFlash !== undefined && prev.screenFlash !== undefined) {
                    if (current.screenFlash > 0.1 && prev.screenFlash <= 0.1) {
                        playSound('explosion');
                    }
                }
                // Fallback: check territory batches
                else if (current.territoryBatches && prev.territoryBatches && current.territoryBatches.length > prev.territoryBatches.length) {
                    // Check if it's a significant batch (likely explosion)
                    playSound('explosion');
                }

                // Powerup collected
                if (current.powerups && prev.powerups && current.powerups.length < prev.powerups.length) {
                    playSound('powerup');
                }
            }
            // Optimization: If grid is missing (throttled), use previous grid
            const incomingState = gameState as any; // Cast to access potentially missing properties if types are strict
            const newGrid = incomingState.grid || prev?.grid || [];

            const fullGameState = {
                ...gameState,
                grid: newGrid
            };

            lastGameStateRef.current = fullGameState;

            setState(prev => ({
                ...prev,
                gameState: fullGameState,
                scores: gameState.scores,
                timeLeft: gameState.timeLeft,
            }));
        });

        socket.on('game_over', (result) => {
            console.log('[PvP] Game over', result);
            playSound('gameOver');
            setState(prev => ({
                ...prev,
                // Keep isPlaying TRUE so we see the canvas under the modal!
                // isPlaying: false, 
                gameOverResult: {
                    winner: result.winner as 'blue' | 'red' | 'draw',
                    scores: result.finalScore
                },
                scores: result.finalScore,
                // Reset settlement state
                settlementTxHash: null,
                settlementSuccess: null,
            }));
        });

        // Settlement complete (prize distributed)
        socket.on('settlement_complete', (data: SettlementResult) => {
            console.log('[PvP] Settlement complete:', data);
            if (data.success && data.txHash) {
                setState(prev => ({
                    ...prev,
                    settlementTxHash: data.txHash!,
                    settlementSuccess: true,
                }));
            } else {
                console.error('[PvP] Settlement failed:', data.error);
                setState(prev => ({
                    ...prev,
                    settlementTxHash: null,
                    settlementSuccess: false,
                }));
            }
        });

        socket.on('disconnect', () => {
            console.log('[PvP] Disconnected');
            setState(prev => ({ ...prev, isConnected: false }));
        });

        socketRef.current = socket;
    }, [playSound, initAudio]);

    // Disconnect
    const disconnect = useCallback(() => {
        socketRef.current?.disconnect();
        socketRef.current = null;
        setState({
            isConnected: false,
            playerId: null,
            roomId: null,
            myTeam: null,
            opponentName: null,
            isPlaying: false,
            countdown: 0,
            gameState: null,
            scores: { blue: 50, red: 50 },
            timeLeft: 120,
            gameOverResult: null,
            settlementTxHash: null,
            settlementSuccess: null,
            pendingPayment: false,
            paymentStatus: null,
            isFirstPlayer: false,
        });
    }, []);

    // Join matchmaking queue
    const joinQueue = useCallback(() => {
        socketRef.current?.emit('join_queue');
        initAudio(); // Ensure audio context is ready
    }, [initAudio]);

    // Leave queue
    const leaveQueue = useCallback(() => {
        socketRef.current?.emit('leave_queue');
    }, []);

    // Set player ready
    const setReady = useCallback(() => {
        socketRef.current?.emit('player_ready');
        initAudio(); // Ensure audio context is ready
    }, [initAudio]);

    // Send player input to server
    const sendInput = useCallback((input: {
        angle: number;
        firing: boolean;
        weaponMode: 'machineGun' | 'shotgun' | 'inkBomb';
        targetPos?: { x: number; y: number };
    }) => {
        socketRef.current?.emit('player_input', {
            ...input,
            timestamp: Date.now(),
            sequence: 0,
        });
    }, []);

    // ============================================
    // PAYMENT FUNCTIONS
    // ============================================

    // Pay and confirm
    const payToPlay = useCallback(async () => {
        if (!state.roomId || !state.paymentStatus) {
            console.error('[PvP] Cannot pay: no room or payment status');
            return;
        }

        try {
            let txHash: string;
            let onChainGameId: number;

            if (state.isFirstPlayer) {
                // First player creates game on-chain
                console.log('[PvP] Creating game on-chain...');
                const result = await gameVault.createGame(GameMode.OneVsOne);
                txHash = result.txHash;
                onChainGameId = result.gameId;

                console.log('[PvP] Game created on-chain, gameId:', onChainGameId);
            } else {
                // Second player joins existing game
                onChainGameId = state.paymentStatus.onChainGameId!;
                if (!onChainGameId) {
                    console.error('[PvP] No onChainGameId available for second player');
                    return;
                }
                console.log('[PvP] Joining on-chain game:', onChainGameId);
                txHash = await gameVault.joinGame(onChainGameId);
                console.log('[PvP] Game joined on-chain');
            }

            // Notify server of successful payment
            socketRef.current?.emit('payment_confirmed', { txHash, onChainGameId });
        } catch (error) {
            console.error('[PvP] Payment failed:', error);
            // Error is already set in gameVault hook
        }
    }, [state.roomId, state.paymentStatus, state.isFirstPlayer, gameVault]);

    // Cancel payment (return to queue)
    const cancelPayment = useCallback(() => {
        socketRef.current?.emit('cancel_payment');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    return {
        ...state,
        connect,
        disconnect,
        joinQueue,
        leaveQueue,
        setReady,
        sendInput,
        // Payment
        payToPlay,
        cancelPayment,
        isPaymentLoading: gameVault.isLoading,
        paymentError: gameVault.error,
        clearPaymentError: gameVault.clearError,
    };
}

