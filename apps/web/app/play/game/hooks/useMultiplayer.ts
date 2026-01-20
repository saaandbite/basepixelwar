// apps/web/app/game/hooks/useMultiplayer.ts
// Client-side hook untuk PvP multiplayer

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    PvPPlayer,
    GameRoom,
    GameStartData,
    SyncedGameState,
    GameResult,
    PlayerInput,
} from '@repo/shared/multiplayer';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ============================================
// CONNECTION STATE
// ============================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type MatchmakingStatus = 'idle' | 'queue' | 'found' | 'countdown' | 'playing';

export interface MultiplayerState {
    connectionStatus: ConnectionStatus;
    matchmakingStatus: MatchmakingStatus;
    playerId: string | null;
    room: GameRoom | null;
    opponent: PvPPlayer | null;
    myTeam: 'blue' | 'red' | null;
    gameConfig: GameStartData['config'] | null;
    queuePosition: number;
    countdown: number;
    latestGameState: SyncedGameState | null;
    lastGameResult: GameResult | null;
    error: string | null;
    // Payment state
    paymentStatus: import('@repo/shared/multiplayer').PaymentStatus | null;
    isFirstPlayer: boolean;
}

// Nginx Proxy Setup:
// Nginx Proxy Setup:
const getServerUrl = () => {
    // 1. Dynamic Detection (Best for LAN / Mobile Testing)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // If we are accessing via IP (e.g. 192.168.x.x) or special domain, use it!
        // We ignored the Env Var here because it often defaults to localhost in build time
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}:3000`;
        }
    }

    // 2. Fallback to Env Var (Production domain or configured localhost)
    if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL;

    // 3. Last Resort - Nginx Relative or Default Localhost
    return undefined;
};

const SERVER_URL = getServerUrl();

// ============================================
// HOOK
// ============================================

export function useMultiplayer() {
    const socketRef = useRef<GameSocket | null>(null);

    const [state, setState] = useState<MultiplayerState>({
        connectionStatus: 'disconnected',
        matchmakingStatus: 'idle',
        playerId: null,
        room: null,
        opponent: null,
        myTeam: null,
        gameConfig: null,
        queuePosition: 0,
        countdown: 0,
        latestGameState: null,
        lastGameResult: null,
        error: null,
        // Payment
        paymentStatus: null,
        isFirstPlayer: false,
    });

    // Callback ref for opponent input handling
    const opponentInputCallbackRef = useRef<((input: PlayerInput & { team: 'blue' | 'red' }) => void) | null>(null);

    // Connect to server
    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        setState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));
        console.log('[Multiplayer] Connecting to:', SERVER_URL || 'window.location');

        const socket: GameSocket = io(SERVER_URL, {
            transports: ['websocket', 'polling'], // Allow polling as fallback
            autoConnect: true,
            reconnectionAttempts: 5,
            timeout: 30000,
        });

        socketRef.current = socket;

        // ============================================
        // EVENT LISTENERS
        // ============================================

        socket.on('connect', () => {
            console.log('[Multiplayer] Connected to server');
        });

        socket.on('connect_error', (err) => {
            console.error('[Multiplayer] Connection error:', err.message);
            setState(prev => ({ ...prev, connectionStatus: 'disconnected', error: `Connection failed: ${err.message}` }));
        });

        socket.on('connected', (playerId) => {
            console.log('[Multiplayer] Received player ID:', playerId);
            setState(prev => ({
                ...prev,
                connectionStatus: 'connected',
                playerId,
            }));

            // AUTO-REJOIN: If we have a saved room from pending_payment, try to rejoin
            const savedRoomId = sessionStorage.getItem('pending_payment_room_id');
            const savedWallet = sessionStorage.getItem('wallet_address');
            if (savedRoomId && savedWallet) {
                console.log('[Multiplayer] Auto-rejoining pending_payment room:', savedRoomId);
                socket.emit('rejoin_game', savedRoomId, savedWallet);

                // Also send pending payment confirmation if we have one
                const pendingPaymentTx = sessionStorage.getItem('pending_payment_tx');
                if (pendingPaymentTx) {
                    try {
                        const { txHash, onChainGameId } = JSON.parse(pendingPaymentTx);
                        if (txHash && txHash !== 'pending' && onChainGameId) {
                            console.log('[Multiplayer] Sending pending payment confirmation after rejoin:', txHash);
                            // Delay to let server process rejoin first
                            setTimeout(() => {
                                socket.emit('payment_confirmed', { txHash, onChainGameId });
                            }, 1500);
                        }
                    } catch (e) {
                        console.error('[Multiplayer] Failed to parse pending payment:', e);
                    }
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('[Multiplayer] Disconnected from server');
            setState(prev => {
                // PRESERVE STATE: If in pending_payment, don't reset everything
                // This allows reconnection to restore the session
                if (prev.room?.status === 'pending_payment' || prev.paymentStatus) {
                    console.log('[Multiplayer] Disconnect during pending_payment - preserving state for reconnect');
                    // Save room ID to sessionStorage for auto-rejoin on reconnect
                    if (prev.room?.id) {
                        sessionStorage.setItem('pending_payment_room_id', prev.room.id);
                    }
                    return {
                        ...prev,
                        connectionStatus: 'disconnected',
                        // Keep room, opponent, paymentStatus intact for reconnect!
                    };
                }

                // Normal disconnect - reset state
                return {
                    ...prev,
                    connectionStatus: 'disconnected',
                    matchmakingStatus: 'idle',
                    room: null,
                    opponent: null,
                };
            });
        });

        socket.on('queue_status', ({ position, totalInQueue }) => {
            console.log(`[Multiplayer] Queue position: ${position}/${totalInQueue}`);
            setState(prev => ({
                ...prev,
                queuePosition: position,
                matchmakingStatus: position > 0 ? 'queue' : prev.matchmakingStatus,
            }));
        });

        socket.on('match_found', ({ roomId, opponent }) => {
            console.log('[Multiplayer] Match found!', roomId, opponent);
            // Determine my team based on opponent's team
            const inferredTeam: 'blue' | 'red' = opponent.team === 'red' ? 'blue' : 'red';
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'found',
                opponent,
                myTeam: inferredTeam, // Set team early for countdown display
                // Create a minimal room object so we can access roomId
                room: {
                    id: roomId,
                    players: [], // Not critical for this view
                    status: 'waiting',
                    createdAt: Date.now()
                } as unknown as GameRoom
            }));
        });

        socket.on('match_status', (data) => {
            if (data.status === 'requeuing') {
                console.log('[Multiplayer] Re-queuing:', data.message);
                setState(prev => ({
                    ...prev,
                    matchmakingStatus: 'queue',
                    room: null,
                    opponent: null,
                    error: data.message // Display this as info/error
                }));
            }
        });

        // NEW: Handle pending_payment (match found, waiting for blockchain payment)
        socket.on('pending_payment', ({ roomId, opponent, deadline, isFirstPlayer }) => {
            console.log('[Multiplayer] Match found (pending_payment)!', roomId, opponent);

            // PERSIST: Save room ID for reconnection (mobile wallet switching)
            sessionStorage.setItem('pending_payment_room_id', roomId);

            // Determine my team based on opponent's team
            const inferredTeam: 'blue' | 'red' = opponent.team === 'red' ? 'blue' : 'red';
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'found', // Treat as match found for UI purposes
                opponent,
                myTeam: inferredTeam,
                isFirstPlayer,
                paymentStatus: {
                    player1Paid: false,
                    player2Paid: false,
                    deadline,
                },
                // Create a minimal room object so we can access roomId
                room: {
                    id: roomId,
                    players: [],
                    status: 'pending_payment',
                    createdAt: Date.now(),
                    paymentDeadline: deadline,
                } as unknown as GameRoom
            }));
        });

        // Handle payment status updates
        socket.on('payment_status', (status) => {
            console.log('[Multiplayer] Payment status update:', status);
            setState(prev => ({
                ...prev,
                paymentStatus: status,
            }));
        });

        // Handle payment cancelled
        socket.on('payment_cancelled', (reason) => {
            console.log('[Multiplayer] Payment cancelled:', reason);
            // CLEANUP: Clear persisted room ID
            sessionStorage.removeItem('pending_payment_room_id');
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'queue', // Back to queue
                room: null,
                opponent: null,
                paymentStatus: null,
                isFirstPlayer: false,
            }));
        });

        // Handle payment timeout
        socket.on('payment_timeout', () => {
            console.log('[Multiplayer] Payment timeout');
            // CLEANUP: Clear persisted room ID
            sessionStorage.removeItem('pending_payment_room_id');
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'queue', // Back to queue
                room: null,
                opponent: null,
                paymentStatus: null,
                isFirstPlayer: false,
            }));
        });

        // Handle rejoin failed (room no longer exists or player not in room)
        socket.on('rejoin_failed', () => {
            console.log('[Multiplayer] Rejoin failed - clearing saved session');
            // CLEANUP: Clear persisted room ID since rejoin failed
            sessionStorage.removeItem('pending_payment_room_id');
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'idle',
                room: null,
                opponent: null,
                paymentStatus: null,
                isFirstPlayer: false,
            }));
        });

        socket.on('room_created', (room) => {
            console.log('[Multiplayer] Room created:', room.id);
            setState(prev => ({
                ...prev,
                room,
                matchmakingStatus: 'found',
            }));
        });

        socket.on('room_joined', (room) => {
            console.log('[Multiplayer] Joined room:', room.id);
            setState(prev => ({
                ...prev,
                room,
                matchmakingStatus: 'found',
            }));
        });

        socket.on('player_joined', (player) => {
            console.log('[Multiplayer] Player joined:', player.name);
            setState(prev => ({
                ...prev,
                opponent: player,
            }));
        });

        socket.on('player_left', (playerId) => {
            console.log('[Multiplayer] Player left:', playerId);
            setState(prev => ({
                ...prev,
                opponent: null,
                matchmakingStatus: prev.matchmakingStatus === 'playing' ? 'idle' : prev.matchmakingStatus,
            }));
        });

        socket.on('room_error', (message) => {
            console.error('[Multiplayer] Room error:', message);
            setState(prev => ({
                ...prev,
                error: message,
            }));
        });

        socket.on('game_countdown', (seconds) => {
            console.log('[Multiplayer] Countdown:', seconds);
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'countdown',
                countdown: seconds,
            }));
        });

        socket.on('game_start', (data) => {
            console.log('[Multiplayer] Game starting!', data);
            // CLEANUP: Game is starting, clear pending payment session data
            sessionStorage.removeItem('pending_payment_room_id');
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'playing',
                myTeam: data.yourTeam,
                opponent: data.opponent,
                gameConfig: data.config,
                countdown: 0,
                paymentStatus: null, // Clear payment status
            }));
        });

        socket.on('game_state', (gameState) => {
            setState(prev => ({
                ...prev,
                latestGameState: gameState,
            }));
        });

        socket.on('game_over', (result) => {
            console.log('[Multiplayer] Game over!', result);
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'idle',
                lastGameResult: result,
            }));
        });

        // Handle opponent input relay
        socket.on('opponent_input', (input) => {
            if (opponentInputCallbackRef.current) {
                opponentInputCallbackRef.current(input);
            }
        });

    }, []);

    // Disconnect from server
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setState(prev => ({
            ...prev,
            connectionStatus: 'disconnected',
            matchmakingStatus: 'idle',
            room: null,
            opponent: null,
        }));
    }, []);

    // Join matchmaking queue
    const joinQueue = useCallback((walletAddress?: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('join_queue', walletAddress);
            setState(prev => ({ ...prev, matchmakingStatus: 'queue' }));
        }
    }, []);

    // Leave matchmaking queue
    const leaveQueue = useCallback(() => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('leave_queue');
            setState(prev => ({ ...prev, matchmakingStatus: 'idle', queuePosition: 0 }));
        }
    }, []);

    // Signal ready to start
    const setReady = useCallback(() => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('player_ready');
        }
    }, []);

    // Send player input (for game loop)
    const sendInput = useCallback((input: Omit<PlayerInput, 'timestamp' | 'sequence'>) => {
        if (socketRef.current?.connected && state.matchmakingStatus === 'playing') {
            socketRef.current.emit('player_input', {
                ...input,
                timestamp: Date.now(),
                sequence: 0, // TODO: Implement input sequencing
            });
        }
    }, [state.matchmakingStatus]);

    // Set callback for receiving opponent inputs
    const setOpponentInputCallback = useCallback((
        callback: ((input: PlayerInput & { team: 'blue' | 'red' }) => void) | null
    ) => {
        opponentInputCallbackRef.current = callback;
    }, []);

    // Confirm payment (emit to server)
    const confirmPayment = useCallback((txHash: string, onChainGameId: number) => {
        if (socketRef.current?.connected) {
            console.log('[Multiplayer] Confirming payment:', txHash, onChainGameId);
            socketRef.current.emit('payment_confirmed', { txHash, onChainGameId });
        }
    }, []);

    // Cancel payment
    const cancelPayment = useCallback(() => {
        if (socketRef.current?.connected) {
            console.log('[Multiplayer] Cancelling payment');
            socketRef.current.emit('cancel_payment');
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'queue',
                room: null,
                opponent: null,
                paymentStatus: null,
                isFirstPlayer: false,
            }));
        }
    }, []);

    // Auto-disconnect on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return {
        // State
        ...state,
        isConnected: state.connectionStatus === 'connected',
        isInQueue: state.matchmakingStatus === 'queue',
        isPlaying: state.matchmakingStatus === 'playing',

        // Actions
        connect,
        disconnect,
        joinQueue,
        leaveQueue,
        setReady,
        sendInput,
        setOpponentInputCallback,
        // Payment
        confirmPayment,
        cancelPayment,
    };
}
