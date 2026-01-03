'use client';

// usePvPGame.ts
// Hook untuk mode PvP - menerima game state dari server dan render

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    SyncedGameState,
    GameStartData,
} from '@repo/shared/multiplayer';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';

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
}

export function usePvPGame() {
    const socketRef = useRef<GameSocket | null>(null);

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
    });

    // Connect to server
    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

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

        socket.on('match_found', ({ roomId, opponent }) => {
            setState(prev => ({
                ...prev,
                roomId,
                opponentName: opponent.name,
                gameOverResult: null, // Reset previous game over
            }));
        });

        socket.on('game_countdown', (seconds) => {
            setState(prev => ({ ...prev, countdown: seconds, gameOverResult: null }));
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
                scores: { blue: 50, red: 50 }, // Reset scores
            }));
        });

        // Main game state sync from server
        socket.on('game_state', (gameState) => {
            setState(prev => ({
                ...prev,
                gameState,
                scores: gameState.scores,
                timeLeft: gameState.timeLeft,
            }));
        });

        socket.on('game_over', (result) => {
            console.log('[PvP] Game over', result);
            setState(prev => ({
                ...prev,
                // Keep isPlaying TRUE so we see the canvas under the modal!
                // isPlaying: false, 
                gameOverResult: {
                    winner: result.winner as 'blue' | 'red' | 'draw',
                    scores: result.finalScore
                },
                scores: result.finalScore,
            }));
        });

        socket.on('disconnect', () => {
            console.log('[PvP] Disconnected');
            setState(prev => ({ ...prev, isConnected: false }));
        });

        socketRef.current = socket;
    }, []);

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
        });
    }, []);

    // Join matchmaking queue
    const joinQueue = useCallback(() => {
        socketRef.current?.emit('join_queue');
    }, []);

    // Leave queue
    const leaveQueue = useCallback(() => {
        socketRef.current?.emit('leave_queue');
    }, []);

    // Set player ready
    const setReady = useCallback(() => {
        socketRef.current?.emit('player_ready');
    }, []);

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
    };
}
