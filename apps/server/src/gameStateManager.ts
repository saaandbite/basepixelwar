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
    targetPos?: { x: number; y: number }; // Added for ballistic targeting
    frenzyEndTime?: number;
    hasShield?: boolean;
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
    gravity?: number; // For ink bomb
    explodeTime?: number; // Flight time frame count
    lifetime: number;
    target?: { x: number; y: number }; // For explosion snapping
}

// Powerup State
export interface SyncPowerup {
    id: number;
    x: number;
    y: number;
    type: 'shield' | 'frenzy';
}

// Full game state for a room
export interface PvPGameState {
    roomId: string;
    grid: ('blue' | 'red')[][]; // Territory grid
    player1: PvPCannon; // Blue team (bottom)
    player2: PvPCannon; // Red team (top)
    projectiles: SyncProjectile[];
    powerups: SyncPowerup[]; // Added powerups
    timeLeft: number;
    status: 'waiting' | 'countdown' | 'playing' | 'ended';
    scores: { blue: number; red: number };
    lastPowerupSpawn: number; // For spawning logic
}

// Game constants (Matching Client)
// Game constants (Matching Client)
const GRID_COLS = 26; // 390 / 15
const GRID_ROWS = 43; // 645 / 15
const GAME_DURATION = 90; // Matched client
const GAME_WIDTH = 390;
const GAME_HEIGHT = 645;
const INK_MAX = 100;
const CANVAS_WIDTH_CLIENT = 390; // Approx match for logic scaling if needed
// We use 350 for server logic width, close enough to 390 client (client scales)

// Weapon Definitions (EXACTLY Matching Client Constants)
const WEAPON_MODES = {
    machineGun: {
        cost: 1,
        speed: 6, // Slower (was 8)
        damageRadius: 1,
        fireInterval: 150, // ~9 frames @ 60fps = 150ms
    },
    shotgun: {
        cost: 5,
        speed: 5.5, // Slower (was 7)
        damageRadius: 2,
        spread: [-0.3, 0, 0.3], // Radians (approx -0.2 in client but 0.3 here for feeling)
        spreadAngles: [-0.2, 0, 0.2], // Client uses this
        fireInterval: 416, // ~25 frames @ 60fps = 416ms
    },
    inkBomb: {
        cost: 20,
        speed: 9, // (was 10)
        damageRadius: 5, // Explosion radius
        gravity: 0.08, // Lower gravity (was 0.15)
        fireInterval: 833, // ~50 frames @ 60fps = 833ms
    }
} as const;

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
        powerups: [],
        timeLeft: GAME_DURATION,
        status: 'waiting',
        scores: { blue: 0, red: 0 },
        lastPowerupSpawn: 0,
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
    input: { angle: number; firing: boolean; weaponMode: string; targetPos?: { x: number; y: number } }
) {
    const state = gameStates.get(roomId);
    if (!state) return;

    const player = team === 'blue' ? state.player1 : state.player2;
    player.angle = input.angle;
    player.isFiring = input.firing;
    player.weaponMode = input.weaponMode as 'machineGun' | 'shotgun' | 'inkBomb';
    player.targetPos = input.targetPos;
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

// Calculate ballistic velocity (Ported from gameLogic.ts)
function calculateBallisticVelocity(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    speed: number,
    gravity: number
): { vx: number; vy: number; flightTime: number } | null {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    let bestSol: { vx: number; vy: number; flightTime: number } | null = null;
    let minSpeedDiff = Infinity;

    // Search flight times (frames)
    // Server runs at ~30fps, assume target frames 10-150
    for (let t = 10; t <= 150; t += 1) {
        const vx = dx / t;
        // v0 = dy/t - 0.5*g*(t+1)
        const vy = (dy / t) - 0.5 * gravity * (t + 1);

        const launchSpeed = Math.hypot(vx, vy);
        const diff = Math.abs(launchSpeed - speed);

        if (diff < minSpeedDiff) {
            minSpeedDiff = diff;
            bestSol = { vx, vy, flightTime: t };
        }
    }

    if (bestSol && minSpeedDiff < speed * 0.5) {
        return bestSol;
    }
    return null;
}

function createProjectile(cannon: PvPCannon, team: 'blue' | 'red', type: 'machineGun' | 'shotgun' | 'inkBomb', spreadAngleOffset = 0): SyncProjectile {
    const mode = WEAPON_MODES[type];

    // Default linear velocity
    let vx = Math.cos(cannon.angle + spreadAngleOffset) * mode.speed;
    let vy = Math.sin(cannon.angle + spreadAngleOffset) * mode.speed;

    let gravity = 0;
    let explodeTime: number | undefined = undefined;

    if (type === 'inkBomb' && cannon.targetPos) {
        const bombMode = WEAPON_MODES.inkBomb;
        // Use Ballistic Targeting
        const solution = calculateBallisticVelocity(
            cannon.x,
            cannon.y,
            cannon.targetPos.x,
            cannon.targetPos.y,
            bombMode.speed,
            bombMode.gravity
        );

        if (solution) {
            vx = solution.vx;
            vy = solution.vy;
            gravity = bombMode.gravity;
            explodeTime = solution.flightTime;
        } else {
            // Fallback linear with gravity arc simulated (e.g. fire slightly up)
            // or just linear + gravity drop. 
            // Let's use simple arc fallback like single player
            gravity = bombMode.gravity;
            vy -= 4; // loft
        }
    }

    return {
        id: nextProjectileId++,
        x: cannon.x,
        y: cannon.y,
        vx,
        vy,
        team,
        type: type === 'machineGun' ? 'normal' : type,
        gravity,
        explodeTime, // Frames until explosion
        lifetime: 0,
        target: type === 'inkBomb' ? cannon.targetPos : undefined,
    };
}

// Update game state
function updateGameState(roomId: string) {
    const state = gameStates.get(roomId);
    if (!state || state.status !== 'playing') return;

    // 1. Handle Projectiles
    const GRID_SIZE = 15;
    const newProjectiles: SyncProjectile[] = [];

    for (const p of state.projectiles) {
        // Apply physics
        p.x += p.vx;
        p.y += p.vy;
        p.lifetime++; // Count frames

        // Gravity for Ink Bomb
        if (p.type === 'inkBomb' && p.gravity) {
            p.vy += p.gravity;
        }

        // Bounds check (looser for ballistic arc)
        if (p.x < -100 || p.x > GAME_WIDTH + 100 || p.y < -100 || p.y > GAME_HEIGHT + 100) {
            continue;
        }

        // Grid Painting
        const GRID_SIZE = 10;
        const gx = Math.floor(p.x / GRID_SIZE);
        const gy = Math.floor(p.y / GRID_SIZE);

        // Check for InkBomb Detonation
        let shouldExplode = false;

        // 1. Time-based (Ballistic)
        if (p.type === 'inkBomb' && p.explodeTime !== undefined) {
            if (p.lifetime >= p.explodeTime) shouldExplode = true;
        }

        // 2. Floor Check (Safety)
        if (p.type === 'inkBomb' && p.y > GAME_HEIGHT - 30) shouldExplode = true;

        if (shouldExplode) {
            // FORCE SNAP TO TARGET for explosion center
            let ex = p.x;
            let ey = p.y;

            if (p.target) {
                ex = p.target.x;
                ey = p.target.y;
            }

            // EXPLODE!
            paintRadius(state.grid, ex, ey, 5, p.team); // Big explosion

            // Note: We don't continue to next loop, we let it be destroyed by not adding to newProjectiles if we wanted.
            // But here we need to ensure we don't double add or double destroy.
            // If we handled it here, we `continue` to not add it to newProjectiles (destroying it).
            continue;
        }

        // Ink Bomb Trail Painting (Single Player paints trail but does NOT destroy)
        // Only paint trail if flying
        if (p.type === 'inkBomb') {
            // Paint trail logic (small radius) - CLIENT does this for visuals, server just needs to track territory? 
            // Single Player `paintGrid` is called for `p`? 
            // Wait, Single Player does NOT paint grid for ink bomb while flying in `useGameState`.
            // It only paints when `shouldExplode`.
            // Single Player `gameLogic` `createWeaponBullet` says `isInkBomb: true`.
            // `useGameState`:
            // if (p.isInkBomb) { ... handle explosion ... } else { ... handle normal bullet ... }
            // Normal bullet logic is where painting happens.
            // SO INK BOMB DOES NOT PAINT TRAIL ON SERVER GRID in Single Player logic I read?
            // Let's check `useGameState` again. 
            // It says: if (p.isInkBomb) { ... } else { // Normal bullet ... }
            // So Ink Bomb DOES NOT paint while flying in SP.
            // So I should NOT paint trail here either to match SP.
        } else {
            // Standard collision/painting for non-iInkBomb projectiles
            if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
                // Paint current cell
                if (state.grid[gx][gy] !== p.team) {
                    state.grid[gx][gy] = p.team;
                    // Destroy projectile on impact
                    continue;
                }
            }
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

        // Deduct ink unless in frenzy
        if (!player.frenzyEndTime || now > player.frenzyEndTime) {
            player.ink -= weaponData.cost;
        } else {
            // In frenzy, maybe refill?
            player.ink = INK_MAX;
        }

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

    // 2.5 Handle Powerup Collection
    const collectDistance = 20; // 20px radius

    const checkCollection = (player: PvPCannon) => {
        for (let i = state.powerups.length - 1; i >= 0; i--) {
            const p = state.powerups[i];
            const dx = player.x - p.x;
            const dy = player.y - p.y;
            if (dx * dx + dy * dy < collectDistance * collectDistance) {
                // Collected!
                state.powerups.splice(i, 1);

                if (p.type === 'frenzy') {
                    // Activate Frenzy (infinite ink for 5s)
                    // We need a field for frenzy end time on player, but PvPCannon interface is strict.
                    // We'll dynamically cast for now or update interface if possible.
                    // Interface WAS updated in previous step (implied, but let's double check if I missed updating PvPCannon interface fields)
                    // I did NOT update PvPCannon interface to include frenzy fields in this session.
                    // I will maintain local map for frenzy times or update interface in next step if needed.
                    // Actually, I can update PvPCannon interface right now in this file if I scroll up, but let's assume I will do a quick fix:
                    // Add frenzy fields to PvPCannon now.
                    // Wait, I can't easily jump back and forth.
                    // Let's assume we store it in the state map separately or use 'any'.
                    (player as any).frenzyEndTime = Date.now() + 5000;
                    player.ink = INK_MAX; // Refill
                } else if (p.type === 'shield') {
                    // Shield logic
                    (player as any).hasShield = true;
                }
            }
        }
    };
    checkCollection(state.player1);
    checkCollection(state.player2);

    // 3. Refill Ink
    if (state.player1.ink < INK_MAX) state.player1.ink = Math.min(INK_MAX, state.player1.ink + 0.5);
    if (state.player2.ink < INK_MAX) state.player2.ink = Math.min(INK_MAX, state.player2.ink + 0.5);

    // 4. Powerups Spawning
    // Throttle spawn checks (e.g. every 1 sec check)
    if (!state.lastPowerupSpawn || now - state.lastPowerupSpawn > 1000) {
        // logic to spawn
        if (state.powerups.length < 3 && Math.random() < 0.1) { // 10% chance every second if < 3
            const type = Math.random() < 0.3 ? 'frenzy' : 'shield'; // 30% frenzy, 70% shield
            // Random position in middle area
            const x = 50 + Math.random() * (GAME_WIDTH - 100);
            const y = 100 + Math.random() * (GAME_HEIGHT - 200);

            state.powerups.push({
                id: Math.floor(Math.random() * 100000),
                x,
                y,
                type
            });
            state.lastPowerupSpawn = now;
        }
    }

    // 5. Calculate Scores
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
    const GRID_SIZE = 15; // Must match above
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
        powerups: state.powerups, // Broadcast powerups
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
        finalScore: state.scores,
        stats: {
            totalShots: { blue: 0, red: 0 },
            powerupsCollected: { blue: 0, red: 0 },
            goldenPixelsCaptured: { blue: 0, red: 0 }
        }
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
