// packages/shared/src/multiplayer.ts
// Types untuk PvP Multiplayer System

// ============================================
// PLAYER & ROOM TYPES
// ============================================

export interface PvPPlayer {
    id: string;
    name: string;
    team: 'blue' | 'red';
    ready: boolean;
}

export interface GameRoom {
    id: string;
    players: PvPPlayer[];
    status: 'waiting' | 'countdown' | 'playing' | 'finished';
    createdAt: number;
    gameStartedAt?: number;
}

// ============================================
// CLIENT -> SERVER EVENTS
// ============================================

export type ClientToServerEvents = {
    // Matchmaking
    'join_queue': () => void;
    'leave_queue': () => void;
    'player_ready': () => void;

    // Gameplay
    'player_input': (input: PlayerInput) => void;
    'rejoin_game': (roomId: string) => void;

    // Room
    'create_room': (name: string) => void;
    'join_room': (roomId: string) => void;
    'leave_room': () => void;
};

export interface PlayerInput {
    angle: number;
    firing: boolean;
    weaponMode: 'machineGun' | 'shotgun' | 'inkBomb';
    targetPos?: { x: number; y: number };
    timestamp: number;
    sequence: number; // For input ordering
}

// ============================================
// SERVER -> CLIENT EVENTS
// ============================================

export type ServerToClientEvents = {
    // Connection
    'connected': (playerId: string) => void;

    // Matchmaking
    'queue_status': (data: { position: number; totalInQueue: number }) => void;
    'match_found': (data: { roomId: string; opponent: PvPPlayer }) => void;

    // Room Management
    'room_created': (room: GameRoom) => void;
    'room_joined': (room: GameRoom) => void;
    'player_joined': (player: PvPPlayer) => void;
    'player_left': (playerId: string) => void;
    'room_error': (message: string) => void;

    // Game State
    'game_countdown': (seconds: number) => void;
    'game_start': (data: GameStartData) => void;
    'game_state': (state: SyncedGameState) => void;
    'game_over': (result: GameResult) => void;

    // PvP Input Relay - Server broadcasts opponent's input to you
    'opponent_input': (input: PlayerInput & { team: 'blue' | 'red' }) => void;
};

export interface GameStartData {
    roomId: string;
    yourTeam: 'blue' | 'red';
    opponent: PvPPlayer;
    config: {
        duration: number;
        gridCols: number;
        gridRows: number;
        canvasWidth: number;
        canvasHeight: number;
    };
    startTime: number;
}

export interface SyncedGameState {
    timeLeft: number;

    // Grid State (direct array for simplicity)
    grid: ('blue' | 'red')[][];

    // Scores
    scores: { blue: number; red: number };

    // Player States
    player1: SyncedPlayerState; // Blue team (bottom)
    player2: SyncedPlayerState; // Red team (top)

    // Projectiles
    projectiles: SyncedProjectile[];
}

export interface SyncedPlayerState {
    x: number;
    y: number;
    angle: number;
    isFiring: boolean;
    ink: number;
    weaponMode: 'machineGun' | 'shotgun' | 'inkBomb';
}

export interface SyncedProjectile {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    team: 'blue' | 'red';
    type: 'normal' | 'shotgun' | 'inkBomb';
}

export interface GameResult {
    winner: 'blue' | 'red' | 'draw';
    finalScore: { blue: number; red: number };
    stats: {
        totalShots: { blue: number; red: number };
        powerupsCollected: { blue: number; red: number };
        goldenPixelsCaptured: { blue: number; red: number };
    };
}

// ============================================
// SOCKET.IO TYPE HELPERS
// ============================================

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    playerId: string;
    playerName: string;
    roomId?: string;
}
