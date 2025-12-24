// Game Constants

export const COLORS = {
    blue: '#72C4FF',      // Player Grid
    red: '#FF8888',       // Enemy Grid
    bulletStrokeBlue: '#3B82F6', // Darker Blue Outline
    bulletStrokeRed: '#EF4444',  // Darker Red Outline
    meteor: '#F9C74F',
    meteorTrail: '#FDB813',
    bg: '#E2E8F0',        // Darker Slate for Grid Lines
    powerup: {
        burst: '#9D4EDD',   // Purple
        shield: '#4CAF50',  // Green
        meteor: '#FF9800',  // Orange
    },
} as const;

export const GRID_SIZE = 12;
export const FIRE_RATE = 8;
export const GAME_DURATION = 90;
export const POWERUP_CHANCE = 0.05; // 5% chance per territory flip
export const MAX_POWERUPS_ON_SCREEN = 3;
export const BULLET_SPEED = 8;
export const METEOR_SPEED = 6;
