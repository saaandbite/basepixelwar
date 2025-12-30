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

export const GRID_SIZE = 12;
export const FIRE_RATE = 8;
export const GAME_DURATION = 90;
export const POWERUP_CHANCE = 0.05; // 5% chance per territory flip
export const MAX_POWERUPS_ON_SCREEN = 3;
export const BULLET_SPEED = 8;
export const GAME_WIDTH = 420;
export const GAME_HEIGHT = 640;


// ============================================
// INK ECONOMY SYSTEM
// ============================================
export const INK_MAX = 100;
export const INK_REFILL_RATE = 10; // per second (refilled each tick)
export const INK_REFILL_PER_FRAME = INK_REFILL_RATE / 60; // ~0.167 per frame at 60fps
export const FRENZY_DURATION = 5000; // 5 seconds in ms

// ============================================
// WEAPON MODES
// ============================================
export type WeaponModeType = 'machineGun' | 'shotgun' | 'inkBomb';

export const WEAPON_MODES = {
    machineGun: {
        cost: 1,
        fireRate: 4,
        paintRadius: 1,
        speed: 10,
        name: 'Machine Gun',
        icon: '🔫',
        description: 'Fast shots, small area',
    },
    shotgun: {
        cost: 5,
        fireRate: 12,
        paintRadius: 2,
        speed: 9,                        // Faster speed
        spreadAngles: [-0.2, 0, 0.2],    // Tighter spread
        maxLifetime: 45,                 // Longer range (was 20)
        name: 'Shotgun',
        icon: '💥',
        description: '3-way spread, medium range',
    },
    inkBomb: {
        cost: 20,
        fireRate: 35,
        paintRadius: 4,                  // 5x5 explosion area
        speed: 8,                        // Moderate speed for good range
        gravity: 0.10,                   // Balanced fall rate
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
