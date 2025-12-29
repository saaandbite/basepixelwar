// Game Types

import type { WeaponModeType } from './lib/constants';

export type WeaponMode = WeaponModeType;

export interface Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    team: 'blue' | 'red' | 'neutral';
    active: boolean;
    isMeteor: boolean;
    isInkBomb?: boolean;
    target?: { x: number; y: number };
    lifetime: number;
    maxLifetime?: number; // For shotgun short range
    paintRadius?: number; // Paint radius on impact
    gravity?: number; // For ink bomb arc
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
    type: 'shield';
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

export interface GoldenPixel {
    x: number; // Grid x position
    y: number; // Grid y position
    active: boolean;
    spawnTime: number;
    pulsePhase: number;
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
        shield: number;
        shieldTimer?: number; // Timestamp when shield was collected
    };
    lastFireTime?: number;
    longDragAngle?: number;
    // Ink Economy
    ink: number;
    maxInk: number;
    weaponMode: WeaponMode;
    isFrenzy: boolean;
    frenzyEndTime: number;
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
    // Golden Pixel
    goldenPixel: GoldenPixel | null;
    lastGoldenPixelSpawn: number;
}

export type GameAction =
    | { type: 'START_GAME' }
    | { type: 'RESET_GAME' }
    | { type: 'TOGGLE_PAUSE' }
    | { type: 'TOGGLE_SOUND' }
    | { type: 'TICK' }
    | { type: 'UPDATE_PLAYER_ANGLE'; angle: number }
    | { type: 'SET_PLAYER_FIRING'; firing: boolean }
    | { type: 'SET_WEAPON_MODE'; mode: WeaponMode }
    | { type: 'FIRE_PLAYER' }
    | { type: 'FIRE_ENEMY' }
    | { type: 'UPDATE_PROJECTILES' }
    | { type: 'UPDATE_PARTICLES' }
    | { type: 'UPDATE_POWERUPS' }
    | { type: 'UPDATE_ENEMY_AI' }
    | { type: 'TRIGGER_METEOR' }
    | { type: 'COLLECT_POWERUP'; powerup: Powerup }
    | { type: 'ACTIVATE_FRENZY' }
    | { type: 'END_GAME' }
    | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
    | { type: 'GAME_LOOP_UPDATE'; deltaTime: number };

