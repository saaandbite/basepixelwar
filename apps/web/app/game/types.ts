// Game Types

export interface Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    team: 'blue' | 'red' | 'neutral';
    active: boolean;
    isMeteor: boolean;
    target?: { x: number; y: number };
    lifetime: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
    glow?: boolean;
}

export interface Powerup {
    x: number;
    y: number;
    vy: number;
    rotation: number;
    type: 'burst' | 'shield' | 'meteor';
    collected: boolean;
    color: string;
    glowColor: string;
}

export interface TerritoryBatch {
    x: number;
    y: number;
    radius: number;
    color: string;
    opacity: number;
}

export interface Cannon {
    x: number;
    y: number;
    angle: number;
    isFiring?: boolean;
    cooldown: number;
    targetAngle?: number;
    moveTimer?: number;
    difficulty?: number;
    powerups?: {
        burstShot: number;
        shield: number;
        callMeteor: number;
    };
    lastFireTime?: number;
    longDragAngle?: number;
}

export interface GameState {
    grid: ('blue' | 'red')[][];
    cols: number;
    rows: number;
    projectiles: Projectile[];
    particles: Particle[];
    meteors: Projectile[];
    powerups: Powerup[];
    territoryBatches: TerritoryBatch[];
    player: Cannon;
    enemy: Cannon;
    timeLeft: number;
    gameActive: boolean;
    isPaused: boolean;
    isSoundOn: boolean;
    gameStarted: boolean;
    comboStreak: number;
    maxCombo: number;
    totalPowerupsCollected: number;
    lastTerritoryFlip: number;
    shakeIntensity: number;
    shakeDirection: { x: number; y: number };
    screenFlash: number;
    showMeteorIndicator: boolean;
    meteorTarget: { x: number; y: number } | null;
}

export type GameAction =
    | { type: 'START_GAME' }
    | { type: 'RESET_GAME' }
    | { type: 'TOGGLE_PAUSE' }
    | { type: 'TOGGLE_SOUND' }
    | { type: 'TICK' }
    | { type: 'UPDATE_PLAYER_ANGLE'; angle: number }
    | { type: 'SET_PLAYER_FIRING'; firing: boolean }
    | { type: 'FIRE_PLAYER' }
    | { type: 'FIRE_ENEMY' }
    | { type: 'UPDATE_PROJECTILES' }
    | { type: 'UPDATE_PARTICLES' }
    | { type: 'UPDATE_POWERUPS' }
    | { type: 'UPDATE_ENEMY_AI' }
    | { type: 'TRIGGER_METEOR' }
    | { type: 'CALL_PLAYER_METEOR' }
    | { type: 'COLLECT_POWERUP'; powerup: Powerup }
    | { type: 'END_GAME' }
    | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
    | { type: 'GAME_LOOP_UPDATE'; deltaTime: number };
