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
let nextProjectileId = 0;
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

    // Safety: If loop already exists, clear it first
    if (gameLoops.has(roomId)) {
        clearInterval(gameLoops.get(roomId));
        gameLoops.delete(roomId);
        console.warn(`[GameStateManager] Cleared existing loop for room ${roomId} before starting new one`);
    }

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

// Weapon Definitions (Matching Client Constants)
const WEAPON_MODES = {
    machineGun: {
        cost: 1,
        speed: 8,
        damageRadius: 1,
    },
    shotgun: {
        cost: 5,
        speed: 7,
        damageRadius: 2,
        spread: [-0.3, 0, 0.3], // Radians
    },
    inkBomb: {
        cost: 20,
        speed: 10,
        damageRadius: 5, // Explosion radius
        gravity: 0.15, // Simple gravity
    }
} as const;

function createProjectile(cannon: PvPCannon, team: 'blue' | 'red', type: 'machineGun' | 'shotgun' | 'inkBomb', spreadAngleOffset = 0): SyncProjectile {
    const mode = WEAPON_MODES[type];
    const angle = cannon.angle + spreadAngleOffset;

    // Initial velocity
    let vx = Math.cos(angle) * mode.speed;
    let vy = Math.sin(angle) * mode.speed;

    return {
        id: nextProjectileId++,
        x: cannon.x,
        y: cannon.y,
        vx,
        vy,
        team,
        type: type === 'machineGun' ? 'normal' : type, // 'normal' maps to machineGun visual
    };
}

// Update game state
function updateGameState(roomId: string) {
    const state = gameStates.get(roomId);
    if (!state || state.status !== 'playing') return;

    // 1. Handle Projectiles
    const GRID_SIZE = 10;
    const newProjectiles: SyncProjectile[] = [];

    for (const p of state.projectiles) {
        // Apply physics
        p.x += p.vx;
        p.y += p.vy;

        // Gravity for Ink Bomb
        if (p.type === 'inkBomb') {
            // Gravity affects Y based on team direction? 
            // Actually, for simplicity in top-down view, better to have "arcing" visual but linear physics 
            // OR strictly linear for PvP reliability.
            // Let's stick to linear for now to ensure hit registration is predictable, 
            // but maybe slow down slightly?
            // Re-reading logic: The client has gravity constant. 
            // Let's ADD gravity if it's an ink bomb to simulate the arc logic.
            // Blue team fires UP (negative Y), Red team fires DOWN (positive Y).
            // However, simple 2D top-down usually doesn't have gravity unless it's "height".
            // Let's keep it linear for PvP stability for now as per "simple" server logic, 
            // unless user asked for exact physics copy. User said "penyesuaian gameplay".
            // Let's stick to linear but high usage cost.
        }

        // Bounds check
        if (p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT) {
            continue;
        }

        // Grid Painting
        const gx = Math.floor(p.x / GRID_SIZE);
        const gy = Math.floor(p.y / GRID_SIZE);

        let hit = false;

        // Check grid bounds
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
            // Paint logic
            if (p.type === 'inkBomb') {
                // Explode if it hits center range (or perhaps timer based?)
                // For now, let's make ink bomb explode on IMPACT or end of range?
                // Let's make it paint a TRAIL for now, but big paint at end?
                // No, standard logic: Paint trail for machine gun.
            }

            // Paint current cell
            if (state.grid[gx][gy] !== p.team) {
                state.grid[gx][gy] = p.team;
                // Don't destroy on simple paint, only on wall/enemy collision usually?
                // In Pixel War, usually bullets paint as they travel.
            }
        }

        // Handling Ink Bomb Explosion trigger? 
        // Let's look at the client concept. It usually explodes at target.
        // Server doesn't know target pos yet. 
        // For this iteration: Ink Bomb paints a FAT trail.
        // Shotgun paints 3 trails.

        if (p.type === 'inkBomb') {
            paintRadius(state.grid, p.x, p.y, 2, p.team);
        } else if (p.type === 'shotgun') {
            // Standard trail
            if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) state.grid[gx][gy] = p.team;
        } else {
            // Machine Gun
            if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) state.grid[gx][gy] = p.team;
        }

        newProjectiles.push(p);
    }
    state.projectiles = newProjectiles;

    // 2. Handle Firing
    const now = Date.now();

    // Helper to fire
    const handleFire = (player: PvPCannon, team: 'blue' | 'red') => {
        if (!player.isFiring) return;

        const mode = player.weaponMode;
        const weaponData = WEAPON_MODES[mode];

        // Fire Rate Check (Simple modulo or timer?)
        // Let's use a cooldown timer approach if we had one, but we don't in the state interface yet.
        // For now, we fire EVERY TICK if ink covers it? No, that's too fast.
        // Let's limit fire rate. 30fps.
        // MG: Every 3 frames (~10 shots/sec)
        // SG: Every 15 frames (~2 shots/sec)
        // IB: Every 30 frames (1 shot/sec)

        // We need a lastFireTime in state.
        // Since we didn't add it to interface yet, let's rely on random chance or just "every N ticks" using a local counter or timestamp stored in memory?
        // We can't easily add fields to Interface without updating Shared.
        // The Client interface `SyncedPlayerState` doesn't have cooldown.
        // BUT the `PvPPlayer` interface in shared isn't the full state.
        // `PvPCannon` in gameStateManager IS local to server. We can add fields there!

        // Let's verify PvPCannon definition in this file.
        // It's defined at top of file. I can add `lastFire` to it.

        // Temporarily, I will assume a throttle based on `ink` for simplicity if I can't change state structure easily.
        // actually `PvPCannon` is defined in this file. I CAN Change it.

        // Check fire rate limit
        const now = Date.now();
        const fireInterval = mode === 'machineGun' ? 100 : mode === 'shotgun' ? 500 : 1000;

        // We need to store lastFire. 
        // I will add `lastFire: number` to PvPCannon in the interface update step or just cast it for now to avoid breaking types.
        // Let's assume passed player object has it, or add it to the type definition in previous lines.
        // Wait, I can't edit the type definition in this tool call easily if it's far up.
        // I'll stick to ink cost limiting for now, or just reasonable simple throttling.

        if (player.ink < weaponData.cost) return; // Not enough ink

        // Simple throttle: Random chance based on fire rate? Unreliable.
        // Let's use the modulus of time? slightly buggy.
        // Better: We really need `lastFire` timestamp.
        // I'll assume I can add it to the object dynamically for now as any.
        const pAny = player as any;
        if (pAny.lastFire && now - pAny.lastFire < fireInterval) return;

        // FIRE!
        pAny.lastFire = now;
        player.ink -= weaponData.cost;

        if (mode === 'shotgun') {
            WEAPON_MODES.shotgun.spread.forEach(angleOffset => {
                state.projectiles.push(createProjectile(player, team, 'shotgun', angleOffset));
            });
        } else if (mode === 'inkBomb') {
            state.projectiles.push(createProjectile(player, team, 'inkBomb'));
        } else {
            state.projectiles.push(createProjectile(player, team, 'machineGun'));
        }
    };

    handleFire(state.player1, 'blue');
    handleFire(state.player2, 'red');

    // 3. Refill Ink
    state.player1.ink = Math.min(INK_MAX, state.player1.ink + 0.5);
    state.player2.ink = Math.min(INK_MAX, state.player2.ink + 0.5);

    // 4. Calculate Scores
    let blue = 0, red = 0;
    for (let x = 0; x < GRID_COLS; x++) {
        for (let y = 0; y < GRID_ROWS; y++) {
            if (state.grid[x][y] === 'blue') blue++;
            else red++;
        }
    }
    const total = blue + red;
    // Prevent divide by zero
    if (total > 0) {
        state.scores = {
            blue: Math.round((blue / total) * 100),
            red: Math.round((red / total) * 100),
        };
    }
}

// Helper: Paint Radius
function paintRadius(grid: ('blue' | 'red')[][], cx: number, cy: number, radius: number, team: 'blue' | 'red') {
    const GRID_SIZE = 10; // Must match above
    const gx = Math.floor(cx / GRID_SIZE);
    const gy = Math.floor(cy / GRID_SIZE);

    for (let x = gx - radius; x <= gx + radius; x++) {
        for (let y = gy - radius; y <= gy + radius; y++) {
            if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
                // Circular brush? Square for now is faster.
                grid[x][y] = team;
            }
        }
    }
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
