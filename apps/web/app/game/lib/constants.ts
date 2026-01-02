// Game Constants

export const COLORS = {
    blue: '#72C4FF',      // Player Grid
    red: '#FF8888',       // Enemy Grid
    bulletStrokeBlue: '#3B82F6', // Darker Blue Outline
    bulletStrokeRed: '#EF4444',  // Darker Red Outline

    bg: '#E2E8F0',        // Darker Slate for Grid Lines
    powerup: {
        shield: '#4CAF50',  // Green

    },
    ink: '#4CC9F0',       // Ink bar color
    inkBomb: '#7B2CBF',   // Ink bomb color
    golden: '#FFD700',    // Golden pixel color
    frenzy: '#FF6B35',    // Frenzy mode color
} as const;

export const GRID_SIZE = 15;

export const TARGET_FPS = 60; // Reverted to 60 for smoothness, slowing down via per-frame constants instead
export const FIRE_RATE = 8;
export const GAME_DURATION = 90;
export const POWERUP_CHANCE = 0.05; // 5% chance per territory flip
export const MAX_POWERUPS_ON_SCREEN = 3;
export const BULLET_SPEED = 5; // Reduced global baseline

export const GAME_WIDTH = 380;
export const GAME_HEIGHT = 640;


// ============================================
// INK ECONOMY SYSTEM
// ============================================
export const INK_MAX = 100;
export const INK_REFILL_RATE = 10; // per second (refilled each tick)
export const INK_REFILL_PER_FRAME = INK_REFILL_RATE / TARGET_FPS; // refilled each tick based on actual update rate
export const FRENZY_DURATION = 5000; // 5 seconds in ms


// ============================================
// WEAPON MODES
// ============================================
export type WeaponModeType = 'machineGun' | 'shotgun' | 'inkBomb';

export const WEAPON_MODES = {
    machineGun: {
        cost: 1,
        fireRate: 9,        // Slower fire rate (was 6) -> ~6.6 shots/sec
        paintRadius: 1,
        speed: 6,           // Slower speed (was 10) -> 360px/sec
        name: 'Machine Gun',
        icon: '🔫',
        description: 'Fast shots, small area',
    },
    shotgun: {
        cost: 5,
        fireRate: 25,       // Slower fire rate (was 18) -> ~2.4 shots/sec
        paintRadius: 2,
        speed: 5.5,         // Slower speed (was 9)
        spreadAngles: [-0.2, 0, 0.2],
        maxLifetime: 60,    // Need longer lifetime to cover same distance at slower speed
        name: 'Shotgun',
        icon: '💥',
        description: '3-way spread, medium range',
    },
    inkBomb: {
        cost: 20,
        fireRate: 50,       // Slower fire rate (was 35) -> ~1.2 shots/sec
        paintRadius: 4,
        speed: 9,           // Increased speed (was 5) to allow full map range
        gravity: 0.08,      // Lower gravity for floatier arc at slower speed (was 0.10)
        name: 'Ink Bomb',
        icon: '💣',
        description: 'Arc shot, massive explosion',
    },

} as const;

// ============================================
// GOLDEN PIXEL (Secondary Objective)
// ============================================
export const GOLDEN_PIXEL_SPAWN_INTERVAL = 30; // seconds
export const GOLDEN_PIXEL_SIZE = 3; // grid cells radius for visual
export const GOLDEN_PIXEL_CAPTURE_RADIUS = 2; // grid cells for capture detection
