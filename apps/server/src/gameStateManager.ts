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
    cooldown: number; // Frame-based cooldown like single player
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
    paintRadius: number; // Paint radius for impact
    gravity?: number; // For ink bomb
    explodeTime?: number; // Flight time frame count
    lifetime: number;
    target?: { x: number; y: number }; // For explosion snapping
    maxLifetime?: number; // For shotgun short range
}

// Powerup State
export interface SyncPowerup {
    id: number;
    x: number;
    y: number;
    type: 'shield' | 'frenzy';
}

// Particle for visual effects
export interface SyncParticle {
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
export interface SyncTerritoryBatch {
    x: number;
    y: number;
    radius: number;
    color: string;
    opacity: number;
}

// Combo effect
export interface SyncComboEffect {
    team: 'blue' | 'red';
    streak: number;
    x: number;
    y: number;
}

// Powerup effect
export interface SyncPowerupEffect {
    type: 'shield' | 'frenzy';
    x: number;
    y: number;
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

    // Golden Pixel
    goldenPixel: { x: number; y: number; active: boolean; spawnTime: number } | null;
    lastGoldenPixelSpawn: number;

    // Visual Effects (for multiplayer parity with single player)
    particles: SyncParticle[];
    territoryBatches: SyncTerritoryBatch[];
    comboEffects: SyncComboEffect[];
    powerupEffects: SyncPowerupEffect[];
    screenFlash: number;
}

// Game constants (Matching Client)
// Game constants (Matching Client)
const GRID_SIZE = 15;
const GRID_COLS = 26; // 390 / 15
const GRID_ROWS = 43; // 645 / 15
const GAME_DURATION = 90; // Matched client
const GAME_WIDTH = 390;
const GAME_HEIGHT = 645;
const INK_MAX = 100;
const CANVAS_WIDTH_CLIENT = 390; // Approx match for logic scaling if needed
// We use 350 for server logic width, close enough to 390 client (client scales)
const GOLDEN_PIXEL_SPAWN_INTERVAL = 15000;
const GOLDEN_PIXEL_CAPTURE_RADIUS = 20;

// Weapon Definitions (Matching Client Constants - Frame-based like SP)
const WEAPON_MODES = {
    machineGun: {
        cost: 1,
        speed: 6,
        paintRadius: 1,
        fireRate: 5, // 5 frames @ 30fps = ~6 shots/sec (better pacing, not laser-like)
    },
    shotgun: {
        cost: 5,
        speed: 5.5,
        paintRadius: 2,
        fireRate: 8, // ~4 shots/sec at 30fps (matching SP 25 frames @ 60fps)
        spreadAngles: [-0.2, 0, 0.2],
        maxLifetime: 30, // Frames for short range (30fps server)
    },
    inkBomb: {
        cost: 20,
        speed: 9,
        paintRadius: 5,
        fireRate: 15, // ~2 shots/sec at 30fps
        gravity: 0.08,
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
            cooldown: 0,
        },
        player2: {
            x: GAME_WIDTH / 2,
            y: 40,
            angle: Math.PI / 2,
            isFiring: false,
            ink: INK_MAX,
            weaponMode: 'machineGun',
            cooldown: 0,
        },
        projectiles: [],
        powerups: [],
        timeLeft: GAME_DURATION,
        status: 'waiting',
        scores: { blue: 0, red: 0 },
        lastPowerupSpawn: 0,
        goldenPixel: null,
        lastGoldenPixelSpawn: 0,

        // Visual Effects
        particles: [],
        territoryBatches: [],
        comboEffects: [],
        powerupEffects: [],
        screenFlash: 0,
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
        paintRadius: mode.paintRadius,
        gravity,
        explodeTime, // Frames until explosion
        lifetime: 0,
        target: type === 'inkBomb' ? cannon.targetPos : undefined,
        maxLifetime: type === 'shotgun' ? WEAPON_MODES.shotgun.maxLifetime : undefined,
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

        // Grid Coordinates
        const gx = Math.floor(p.x / GRID_SIZE);
        const gy = Math.floor(p.y / GRID_SIZE);

        // === INK BOMB SPECIAL LOGIC ===
        // Ink Bomb flies over territory and only explodes based on:
        // 1. explodeTime (ballistic solver flight time)
        // 2. Falling and on grid (legacy fallback)
        // 3. Hitting floor
        if (p.type === 'inkBomb') {
            const isFalling = p.vy > 0; // Positive vy = moving down
            const isOnGrid = gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS;
            const maxLifetimeReached = p.lifetime > 200;
            const hitFloor = p.y > GAME_HEIGHT - 30;

            let shouldExplode = false;

            if (p.explodeTime) {
                // Ballistic Targeting: Explode when flight time is reached
                if (p.lifetime >= p.explodeTime) {
                    shouldExplode = true;
                }
            } else {
                // Legacy fallback: explode when falling and on grid
                shouldExplode = (isFalling && isOnGrid && p.lifetime > 10) || maxLifetimeReached;
            }

            // Force explode if hitting floor
            if (hitFloor) shouldExplode = true;

            if (shouldExplode) {
                // Explosion center - snap to target if available
                let explosionX = p.x;
                let explosionY = p.y;
                if (p.target) {
                    explosionX = p.target.x;
                    explosionY = p.target.y;
                }

                const explosionGx = Math.floor(explosionX / GRID_SIZE);
                const explosionGy = Math.floor(explosionY / GRID_SIZE);

                // BIG explosion (radius 5 like single player)
                paintRadius(state.grid, explosionX, explosionY, 5, p.team);

                // Visual Effects - explosion particles
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2;
                    const speed = 2 + Math.random() * 3;
                    state.particles.push({
                        x: explosionX,
                        y: explosionY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        size: 4,
                        color: p.team === 'blue' ? '#3B82F6' : '#EF4444',
                        glow: true
                    });
                }

                // Territory Batch Effect (large)
                state.territoryBatches.push({
                    x: explosionGx,
                    y: explosionGy,
                    radius: 8,
                    color: p.team === 'blue' ? '#72C4FF' : '#FF8888',
                    opacity: 1.0
                });

                // Screen Flash (big for ink bomb)
                state.screenFlash = 0.3;

                // Destroy projectile
                continue;
            }

            // Ink bomb keeps flying (NOT destroyed on grid collision)
            newProjectiles.push(p);
            continue;
        }

        // === NORMAL BULLETS (machineGun, shotgun) ===

        // Check shotgun maxLifetime for short range (like single player)
        if (p.maxLifetime && p.lifetime >= p.maxLifetime) {
            // Shotgun bullet expires - paint where it is
            if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
                const radius = p.paintRadius || 1;
                paintRadius(state.grid, p.x, p.y, radius, p.team);

                // Visual effects
                for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 2;
                    state.particles.push({
                        x: p.x,
                        y: p.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.4,
                        size: 2,
                        color: p.team === 'blue' ? '#3B82F6' : '#EF4444',
                        glow: false
                    });
                }

                state.territoryBatches.push({
                    x: gx,
                    y: gy,
                    radius: radius + 1,
                    color: p.team === 'blue' ? '#72C4FF' : '#FF8888',
                    opacity: 0.8
                });
            }
            continue; // Destroy projectile
        }

        // Check collision with grid (enemy territory)
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
            const currentCellColor = state.grid[gx][gy];

            // If we hit enemy territory, explode and stop
            if (currentCellColor !== p.team) {
                // Impact!

                // 1. Paint Grid (using paintRadius from projectile)
                const radius = p.paintRadius || 1;
                paintRadius(state.grid, p.x, p.y, radius, p.team);

                // 2. Visual Effects (Explosion)
                const particleCount = p.type === 'shotgun' ? 8 : 4;
                for (let i = 0; i < particleCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 2;
                    state.particles.push({
                        x: p.x,
                        y: p.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.5,
                        size: 3,
                        color: p.team === 'blue' ? '#3B82F6' : '#EF4444',
                        glow: false
                    });
                }

                // Territory Batch Effect
                state.territoryBatches.push({
                    x: gx,
                    y: gy,
                    radius: radius + 2,
                    color: p.team === 'blue' ? '#72C4FF' : '#FF8888',
                    opacity: 1.0
                });

                // Screen Flash (small)
                if (state.screenFlash < 0.1) state.screenFlash = 0.1;

                // 3. Destroy Projectile
                continue;
            }
        }

        newProjectiles.push(p);
    }
    state.projectiles = newProjectiles;

    // 2. Handle Firing (Frame-based cooldown like single player)
    const now = Date.now();

    // Helper to handle weapon firing
    const handleFire = (player: PvPCannon, team: 'blue' | 'red') => {
        const mode = player.weaponMode;
        const weaponData = WEAPON_MODES[mode];

        // Decrement cooldown each tick (runs at 30fps)
        if (player.cooldown > 0) {
            player.cooldown--;
        }

        // Check if firing and can fire
        if (!player.isFiring) return;
        if (player.cooldown > 0) return;

        // Check ink (unless in frenzy)
        const isFrenzy = player.frenzyEndTime && now < player.frenzyEndTime;
        const inkCost = isFrenzy ? 0 : weaponData.cost;

        if (player.ink < inkCost) return; // Not enough ink

        // FIRE!
        // Set cooldown based on weapon fireRate
        player.cooldown = weaponData.fireRate;

        // Deduct ink
        if (!isFrenzy) {
            player.ink -= weaponData.cost;
        } else {
            // In frenzy, keep ink full
            player.ink = INK_MAX;
        }

        // Create projectiles based on weapon type
        if (mode === 'shotgun') {
            WEAPON_MODES.shotgun.spreadAngles.forEach((angleOffset: number) => {
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

                    // Add powerup effect
                    state.powerupEffects.push({
                        type: 'frenzy',
                        x: player.x,
                        y: player.y,
                    });
                } else if (p.type === 'shield') {
                    // Shield logic
                    (player as any).hasShield = true;

                    // Add powerup effect
                    state.powerupEffects.push({
                        type: 'shield',
                        x: player.x,
                        y: player.y,
                    });
                }
            }
        }
    };
    checkCollection(state.player1);
    checkCollection(state.player2);

    // 3. Refill Ink
    if (state.player1.ink < INK_MAX) state.player1.ink = Math.min(INK_MAX, state.player1.ink + 0.5);
    if (state.player2.ink < INK_MAX) state.player2.ink = Math.min(INK_MAX, state.player2.ink + 0.5);

    // 4. Powerups & Golden Pixel Spawning
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

    // Golden Pixel Spawning
    if (!state.goldenPixel && (!state.lastGoldenPixelSpawn || now - state.lastGoldenPixelSpawn > GOLDEN_PIXEL_SPAWN_INTERVAL)) {
        // Spawn in center-ish area (middle 50% of map)
        const marginX = GAME_WIDTH * 0.25;
        const marginY = GAME_HEIGHT * 0.25;
        const x = marginX + Math.random() * (GAME_WIDTH - 2 * marginX);
        const y = marginY + Math.random() * (GAME_HEIGHT - 2 * marginY);

        state.goldenPixel = {
            x: Math.floor(x / GRID_SIZE), // Store grid coord or pixel? Client uses grid. But server SyncPixel needs pixel?
            // Client gameLogic `createGoldenPixel` returns grid coords (x,y) as integers.
            // Client `useGameState` renders it using `gx - goldenPixel.x`.
            // So we should store GRID coordinates.
            y: Math.floor(y / GRID_SIZE),
            active: true,
            spawnTime: now
        };
        state.lastGoldenPixelSpawn = now;
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

    // 6. Update particles (decay life)
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const particle = state.particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.1; // Decay rate

        if (particle.life <= 0) {
            state.particles.splice(i, 1);
        }
    }

    // 7. Update territory batches (decay radius and opacity)
    for (let i = state.territoryBatches.length - 1; i >= 0; i--) {
        const batch = state.territoryBatches[i];
        batch.radius += 1.5; // Expand
        batch.opacity -= 0.08; // Fade out

        if (batch.opacity <= 0) {
            state.territoryBatches.splice(i, 1);
        }
    }

    // 8. Update screen flash (decay)
    if (state.screenFlash > 0) {
        state.screenFlash *= 0.9; // Decay quickly
        if (state.screenFlash < 0.05) {
            state.screenFlash = 0;
        }
    }

    // 9. Clear combo effects (they're temporary)
    state.comboEffects = [];

    // 10. Clear powerup effects (they're temporary)
    state.powerupEffects = [];
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
        goldenPixel: state.goldenPixel, // Broadcast Golden Pixel
        timeLeft: state.timeLeft,
        scores: state.scores,

        // Visual Effects
        particles: state.particles,
        territoryBatches: state.territoryBatches,
        comboEffects: state.comboEffects,
        powerupEffects: state.powerupEffects,
        screenFlash: state.screenFlash,
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
