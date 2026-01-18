// packages/shared/src/multiplayer.ts
// Types untuk PvP Multiplayer System

// ============================================
// PLAYER & ROOM TYPES
// ============================================

export interface PvPPlayer {
    id: string;
    socketId?: string;   // Original socket.id for direct server-side lookup
    name: string;
    team: 'blue' | 'red';
    ready: boolean;
    walletAddress?: string; // Wallet address for smart contract
}

export interface PaymentStatus {
    player1Paid: boolean;
    player2Paid: boolean;
    player1TxHash?: string;
    player2TxHash?: string;
    deadline: number;
    onChainGameId?: number;
}

export interface GameRoom {
    id: string;
    players: PvPPlayer[];
    status: 'waiting' | 'pending_payment' | 'countdown' | 'playing' | 'finished';
    createdAt: number;
    gameStartedAt?: number;
    // Smart contract integration
    onChainGameId?: number;
    paymentDeadline?: number;
    paymentStatus?: PaymentStatus;
}

// ============================================
// CLIENT -> SERVER EVENTS
// ============================================

export type ClientToServerEvents = {
    // Matchmaking
    'join_queue': (walletAddress?: string) => void;
    'leave_queue': () => void;
    'player_ready': () => void;

    // Payment
    'payment_confirmed': (data: { txHash: string; onChainGameId: number }) => void;
    'cancel_payment': () => void;

    // Gameplay
    'player_input': (input: PlayerInput) => void;
    'rejoin_game': (roomId: string, walletAddress?: string) => void;

    // Room
    'create_room': (name: string) => void;
    'join_room': (roomId: string) => void;
    'leave_room': () => void;

    // Tournament
    'join_tournament_lobby': (data: { week: number; roomId: string; walletAddress: string }) => void;
    'challenge_player': (data: { targetWallet: string; tournamentRoomId: string }) => void;
    'accept_challenge': (data: { challengerWallet: string; tournamentRoomId: string; week: number }) => void;
    'lobby_heartbeat': (data: { week: number; roomId: string }) => void;
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
    'rejoin_failed': () => void;

    // Matchmaking
    'queue_status': (data: { position: number; totalInQueue: number }) => void;
    'match_found': (data: { roomId: string; opponent: PvPPlayer }) => void;
    'match_status': (data: { status: 'requeuing'; message: string }) => void;

    // Payment Flow
    'pending_payment': (data: { roomId: string; opponent: PvPPlayer; deadline: number; isFirstPlayer: boolean }) => void;
    'payment_status': (status: PaymentStatus) => void;
    'payment_timeout': () => void;
    'payment_cancelled': (reason: string) => void;

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

    // Settlement (prize distribution)
    'settlement_complete': (data: SettlementResult) => void;

    // PvP Input Relay - Server broadcasts opponent's input to you
    'opponent_input': (input: PlayerInput & { team: 'blue' | 'red' }) => void;

    // Tournament Lobby
    'lobby_state': (data: { roomId: string; onlinePlayers: string[]; leaderboard: { wallet: string; score: number }[] }) => void;
    'lobby_player_update': (data: { walletAddress: string; isOnline: boolean }) => void;
    'lobby_leaderboard_update': (data: { wallet: string; score: number }[]) => void;
    'challenge_received': (data: { challengerWallet: string; tournamentRoomId: string }) => void;
    'challenge_failed': (data: { reason: string }) => void;
    'lobby_join_failed': (data: { reason: 'NOT_REGISTERED' | 'ROOM_MISMATCH' }) => void;
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



export interface SyncedPlayerState {
    x: number;
    y: number;
    angle: number;
    isFiring: boolean;
    ink: number;
    weaponMode: 'machineGun' | 'shotgun' | 'inkBomb';
    frenzyEndTime?: number;
    isFrenzy?: boolean;
    hasShield?: boolean;
    // Per-Weapon Usage System
    weaponStates: Record<'machineGun' | 'shotgun' | 'inkBomb', {
        usage: number;
        isOverheated: boolean;
        cooldownEndTime: number;
    }>;
    lastFireTime: number;
    cooldown: number;
}

// Particle for visual effects
export interface SyncedParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
    glow?: boolean;
}

// Territory batch effect
export interface SyncedTerritoryBatch {
    x: number;
    y: number;
    radius: number;
    color: string;
    opacity: number;
}

// Combo effect
export interface SyncedComboEffect {
    team: 'blue' | 'red';
    streak: number;
    x: number;
    y: number;
}

// Powerup effect
export interface SyncedPowerupEffect {
    type: 'shield' | 'frenzy';
    x: number;
    y: number;
}

export interface SyncedGameState {
    timeLeft: number;

    // Grid State (direct array for simplicity)
    grid?: ('blue' | 'red')[][];

    // Scores
    scores: { blue: number; red: number };

    // Player States
    player1: SyncedPlayerState; // Blue team (bottom)
    player2: SyncedPlayerState; // Red team (top)

    // Projectiles
    projectiles: SyncedProjectile[];

    // Visual Effects (for multiplayer parity with single player)
    particles?: SyncedParticle[];
    territoryBatches?: SyncedTerritoryBatch[];
    comboEffects?: SyncedComboEffect[];
    powerupEffects?: SyncedPowerupEffect[];
    screenFlash?: number;

    // Golden Pixel & Powerups
    goldenPixel: SyncedGoldenPixel | null;
    lastGoldenPixelSpawn: number; // For client-side timer
    powerups: SyncedPowerup[]; // Added powerups
}

export interface SyncedGoldenPixel {
    x: number; // Grid x position
    y: number; // Grid y position
    active: boolean;
    spawnTime: number;
}

export interface SyncedPowerup {
    id: number;
    x: number;
    y: number;
    type: 'shield' | 'frenzy';
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

export interface SettlementResult {
    success: boolean;
    txHash?: string;
    basescanUrl?: string;
    winnerTeam?: 'blue' | 'red';
    winnerAddress?: string;
    error?: string;
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
    walletAddress?: string;
    // Tournament context
    tournamentRoomId?: string;
    week?: number;
}
