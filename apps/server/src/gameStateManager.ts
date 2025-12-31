// apps/server/src/gameStateManager.ts
// Manages game state for PvP rooms

import type { Server } from 'socket.io';

// PvP Cannon state
export interface PvPCannon {
    x: number;
    y: number;
    angle: number;
    isFiring: boolean;
    ink: number;
    weaponMode: 'machineGun' | 'shotgun' | 'inkBomb';
}

// Projectile for sync
export interface SyncProjectile {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    team: 'blue' | 'red';
    type: 'normal' | 'shotgun' | 'inkBomb';
}

// Full game state for a room
export interface PvPGameState {
    roomId: string;
    grid: ('blue' | 'red')[][]; // Territory grid
    player1: PvPCannon; // Blue team (bottom)
    player2: PvPCannon; // Red team (top)
    projectiles: SyncProjectile[];
    timeLeft: number;
    status: 'waiting' | 'countdown' | 'playing' | 'ended';
    scores: { blue: number; red: number };
}

// Game constants
const GRID_COLS = 35;
const GRID_ROWS = 55;
const GAME_DURATION = 120;
const GAME_WIDTH = 350;
const GAME_HEIGHT = 700;
const INK_MAX = 100;

// Active game states per room
const gameStates = new Map<string, PvPGameState>();

// Intervals for game loops
const gameLoops = new Map<string, NodeJS.Timeout>();

let ioInstance: Server | null = null;

// Initialize with socket.io instance
export function initGameStateManager(io: Server) {
    ioInstance = io;
}

// Create initial game state for a room
export function createGameState(roomId: string): PvPGameState {
    // Initialize grid (50/50 split)
    const grid: ('blue' | 'red')[][] = [];
    for (let x = 0; x < GRID_COLS; x++) {
        grid[x] = [];
        for (let y = 0; y < GRID_ROWS; y++) {
            // Bottom half blue, top half red
            grid[x][y] = y > GRID_ROWS / 2 ? 'blue' : 'red';
        }
    }

    const state: PvPGameState = {
        roomId,
        grid,
        player1: {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT - 40,
            angle: -Math.PI / 2,
            isFiring: false,
            ink: INK_MAX,
            weaponMode: 'machineGun',
        },
        player2: {
            x: GAME_WIDTH / 2,
            y: 40,
            angle: Math.PI / 2,
            isFiring: false,
            ink: INK_MAX,
            weaponMode: 'machineGun',
        },
        projectiles: [],
        timeLeft: GAME_DURATION,
        status: 'waiting',
        scores: { blue: 0, red: 0 },
    };

    gameStates.set(roomId, state);
    return state;
}

// Get game state for a room
export function getGameState(roomId: string): PvPGameState | undefined {
    return gameStates.get(roomId);
}

// Update player input
export function updatePlayerInput(
    roomId: string,
    team: 'blue' | 'red',
    input: { angle: number; firing: boolean; weaponMode: string }
) {
    const state = gameStates.get(roomId);
    if (!state) return;

    const player = team === 'blue' ? state.player1 : state.player2;
    player.angle = input.angle;
    player.isFiring = input.firing;
    player.weaponMode = input.weaponMode as 'machineGun' | 'shotgun' | 'inkBomb';
}

// Start game loop for a room
export function startGameLoop(roomId: string) {
    const state = gameStates.get(roomId);
    if (!state || !ioInstance) return;

    state.status = 'playing';

    // Game loop runs at ~30fps (33ms)
    const loopInterval = setInterval(() => {
        updateGameState(roomId);
        broadcastGameState(roomId);
    }, 33);

    gameLoops.set(roomId, loopInterval);

    // Timer tick every second
    const timerInterval = setInterval(() => {
        const s = gameStates.get(roomId);
        if (!s) {
            clearInterval(timerInterval);
            return;
        }
        s.timeLeft--;
        if (s.timeLeft <= 0) {
            endGame(roomId);
            clearInterval(timerInterval);
        }
    }, 1000);

    console.log(`[GameStateManager] Game loop started for room ${roomId}`);
}

// Update game state (simplified - just sync)
function updateGameState(roomId: string) {
    const state = gameStates.get(roomId);
    if (!state || state.status !== 'playing') return;

    // Update projectiles (simplified physics)
    const GRID_SIZE = 10;
    const newProjectiles: SyncProjectile[] = [];

    for (const p of state.projectiles) {
        p.x += p.vx;
        p.y += p.vy;

        // Bounds check
        if (p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT) {
            continue;
        }

        // Paint grid on impact/trail
        const gx = Math.floor(p.x / GRID_SIZE);
        const gy = Math.floor(p.y / GRID_SIZE);
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
            state.grid[gx][gy] = p.team;
        }

        newProjectiles.push(p);
    }

    state.projectiles = newProjectiles;

    // Fire bullets for players who are firing
    const now = Date.now();

    if (state.player1.isFiring && state.player1.ink >= 1) {
        state.projectiles.push(createBullet(state.player1, 'blue', now));
        state.player1.ink = Math.max(0, state.player1.ink - 0.5);
    }

    if (state.player2.isFiring && state.player2.ink >= 1) {
        state.projectiles.push(createBullet(state.player2, 'red', now));
        state.player2.ink = Math.max(0, state.player2.ink - 0.5);
    }

    // Refill ink
    state.player1.ink = Math.min(INK_MAX, state.player1.ink + 0.3);
    state.player2.ink = Math.min(INK_MAX, state.player2.ink + 0.3);

    // Calculate scores
    let blue = 0, red = 0;
    for (let x = 0; x < GRID_COLS; x++) {
        for (let y = 0; y < GRID_ROWS; y++) {
            if (state.grid[x][y] === 'blue') blue++;
            else red++;
        }
    }
    const total = blue + red;
    state.scores = {
        blue: Math.round((blue / total) * 100),
        red: Math.round((red / total) * 100),
    };
}

let nextProjectileId = 0;

function createBullet(cannon: PvPCannon, team: 'blue' | 'red', _now: number): SyncProjectile {
    const speed = 8;
    return {
        id: nextProjectileId++,
        x: cannon.x,
        y: cannon.y,
        vx: Math.cos(cannon.angle) * speed,
        vy: Math.sin(cannon.angle) * speed,
        team,
        type: 'normal',
    };
}

// Broadcast game state to room
function broadcastGameState(roomId: string) {
    const state = gameStates.get(roomId);
    if (!state || !ioInstance) return;

    ioInstance.to(roomId).emit('game_state', {
        grid: state.grid,
        player1: state.player1,
        player2: state.player2,
        projectiles: state.projectiles,
        timeLeft: state.timeLeft,
        scores: state.scores,
    });
}

// End game
function endGame(roomId: string) {
    const state = gameStates.get(roomId);
    if (!state || !ioInstance) return;

    state.status = 'ended';

    // Stop game loop
    const loop = gameLoops.get(roomId);
    if (loop) {
        clearInterval(loop);
        gameLoops.delete(roomId);
    }

    // Broadcast result
    ioInstance.to(roomId).emit('game_over', {
        winner: state.scores.blue > state.scores.red ? 'blue' :
            state.scores.red > state.scores.blue ? 'red' : 'draw',
        scores: state.scores,
    });

    console.log(`[GameStateManager] Game ended for room ${roomId}`);
}

// Cleanup room
export function cleanupRoom(roomId: string) {
    const loop = gameLoops.get(roomId);
    if (loop) {
        clearInterval(loop);
        gameLoops.delete(roomId);
    }
    gameStates.delete(roomId);
}
