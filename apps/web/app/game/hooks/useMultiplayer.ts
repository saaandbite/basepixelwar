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

const getServerUrl = () => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol;
        return `${protocol}//${window.location.hostname}:3000`;
    }
    return 'http://localhost:3000';
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

        const socket: GameSocket = io(SERVER_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        socketRef.current = socket;

        // ============================================
        // EVENT LISTENERS
        // ============================================

        socket.on('connect', () => {
            console.log('[Multiplayer] Connected to server');
        });

        socket.on('connected', (playerId) => {
            console.log('[Multiplayer] Received player ID:', playerId);
            setState(prev => ({
                ...prev,
                connectionStatus: 'connected',
                playerId,
            }));
        });

        socket.on('disconnect', () => {
            console.log('[Multiplayer] Disconnected from server');
            setState(prev => ({
                ...prev,
                connectionStatus: 'disconnected',
                matchmakingStatus: 'idle',
                room: null,
                opponent: null,
            }));
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

        // NEW: Handle pending_payment (match found, waiting for blockchain payment)
        socket.on('pending_payment', ({ roomId, opponent, deadline, isFirstPlayer }) => {
            console.log('[Multiplayer] Match found (pending_payment)!', roomId, opponent);
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
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'queue', // Back to queue
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
            setState(prev => ({
                ...prev,
                matchmakingStatus: 'playing',
                myTeam: data.yourTeam,
                opponent: data.opponent,
                gameConfig: data.config,
                countdown: 0,
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
