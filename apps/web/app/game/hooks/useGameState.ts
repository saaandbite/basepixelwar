// Game State Hook

import { useReducer, useCallback } from 'react';
import type { GameState, Projectile, Particle, WeaponMode } from '../types';
import {
    GRID_SIZE,
    FIRE_RATE,
    GAME_DURATION,
    MAX_POWERUPS_ON_SCREEN,
    COLORS,
    INK_MAX,
    INK_REFILL_PER_FRAME,
    WEAPON_MODES,
    FRENZY_DURATION,
    GOLDEN_PIXEL_SPAWN_INTERVAL,
    GOLDEN_PIXEL_CAPTURE_RADIUS,
} from '../lib/constants';
import {
    initializeGrid,
    createBullet,
    createWeaponBullet,
    paintGrid,
    findLargestTerritory,
    createParticles,
    createPowerup,
    createTerritoryBatch,
    createGoldenPixel,
} from '../lib/gameLogic';
import { clearGridCache } from '../lib/renderer';

function createInitialState(width: number, height: number): GameState {
    const cols = Math.ceil(width / GRID_SIZE) || 35;
    const rows = Math.ceil(height / GRID_SIZE) || 55;

    return {
        grid: initializeGrid(cols, rows),
        cols,
        rows,
        projectiles: [],
        particles: [],

        powerups: [],
        territoryBatches: [],
        player: {
            x: width / 2 || 200,
            y: height - 40 || 600,
            angle: -Math.PI / 2,
            isFiring: false,
            cooldown: 0,
            powerups: {
                shield: 0,
            },

            lastFireTime: 0,
            // Ink Economy
            ink: INK_MAX,
            maxInk: INK_MAX,
            weaponMode: 'machineGun' as WeaponMode,
            isFrenzy: false,
            frenzyEndTime: 0,
            inkBombInFlight: false,
        },
        enemy: {
            x: width / 2 || 200,
            y: 40,
            angle: Math.PI / 2,
            targetAngle: Math.PI / 2,
            cooldown: 0,
            moveTimer: 0,
            difficulty: 0.3,
            powerups: {
                shield: 0,
            },

            // Ink Economy for enemy (for fairness)
            ink: INK_MAX,
            maxInk: INK_MAX,
            weaponMode: 'machineGun' as WeaponMode,
            isFrenzy: false,
            frenzyEndTime: 0,
            inkBombInFlight: false,
        },
        timeLeft: GAME_DURATION,
        gameActive: false,
        isPaused: false,
        isSoundOn: true,
        gameStarted: false,
        comboStreak: 0,
        maxCombo: 0,
        totalPowerupsCollected: 0,
        lastTerritoryFlip: 0,
        shakeIntensity: 0,
        shakeDirection: { x: 0, y: 0 },
        screenFlash: 0,

        // Golden Pixel
        goldenPixel: null,
        lastGoldenPixelSpawn: 0,
        // Global Shield
        globalShield: null,
        // Shield Powerup Cooldown (shared for creation)
        lastShieldPowerupTime: 0,
        // InkBomb preview position
        inkBombPreview: { x: 0, y: 0, active: false },
    };
}

type GameAction =
    | { type: 'START_GAME' }
    | { type: 'RESET_ENTITIES'; width: number; height: number }
    | { type: 'TOGGLE_PAUSE' }
    | { type: 'TOGGLE_SOUND' }
    | { type: 'SET_PLAYER_ANGLE'; angle: number; targetPos?: { x: number; y: number } }
    | { type: 'SET_PLAYER_FIRING'; firing: boolean }
    | { type: 'SET_WEAPON_MODE'; mode: WeaponMode }
    | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
    | { type: 'SET_INKBOMB_PREVIEW'; x: number; y: number; active: boolean }
    | { type: 'GAME_UPDATE'; playSound: (name: string) => void }
    | { type: 'TIMER_TICK'; playSound: (name: string) => void }
    | { type: 'END_GAME' }
    | { type: 'USE_SHIELD'; playSound: (name: string) => void }

    | { type: 'ACTIVATE_FRENZY'; team: 'blue' | 'red'; playSound: (name: string) => void };

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_GAME': {
            return {
                ...state,
                gameActive: true,
                isPaused: false,
                gameStarted: true,
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'RESET_ENTITIES': {
            // Clear grid cache for fresh rendering
            clearGridCache();

            const cols = Math.ceil(action.width / GRID_SIZE);
            const rows = Math.ceil(action.height / GRID_SIZE);
            return {
                ...createInitialState(action.width, action.height),
                cols,
                rows,
                grid: initializeGrid(cols, rows),
                isSoundOn: state.isSoundOn,
            };
        }

        case 'TOGGLE_PAUSE': {
            return {
                ...state,
                isPaused: !state.isPaused,
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'TOGGLE_SOUND': {
            return {
                ...state,
                isSoundOn: !state.isSoundOn,
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'SET_PLAYER_ANGLE': {
            return {
                ...state,
                player: { ...state.player, angle: action.angle, targetPos: action.targetPos },
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'SET_PLAYER_FIRING': {
            return {
                ...state,
                player: {
                    ...state.player,
                    isFiring: action.firing,
                    lastFireTime: action.firing ? Date.now() : state.player.lastFireTime,
                    // Set inkBombInFlight when firing and using ink bomb weapon
                    inkBombInFlight: action.firing && state.player.weaponMode === 'inkBomb' ? true : state.player.inkBombInFlight,
                },
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'SET_WEAPON_MODE': {
            return {
                ...state,
                player: {
                    ...state.player,
                    weaponMode: action.mode,
                    cooldown: 0, // Reset cooldown when switching weapons
                },
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'SET_INKBOMB_PREVIEW': {
            return {
                ...state,
                inkBombPreview: {
                    x: action.x,
                    y: action.y,
                    active: action.active,
                },
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'SET_CANVAS_SIZE': {
            const cols = Math.ceil(action.width / GRID_SIZE);
            const rows = Math.ceil(action.height / GRID_SIZE);

            // Only update if not yet started
            if (!state.gameStarted) {
                return {
                    ...state,
                    cols,
                    rows,
                    grid: initializeGrid(cols, rows),
                    player: {
                        ...state.player,
                        x: action.width / 2,
                        y: action.height - 40,
                    },
                    enemy: {
                        ...state.enemy,
                        x: action.width / 2,
                    },
                    lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
                };
            }

            return {
                ...state,
                player: {
                    ...state.player,
                    x: action.width / 2,
                    y: action.height - 40,
                },
                enemy: {
                    ...state.enemy,
                    x: action.width / 2,
                },
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'GAME_UPDATE': {
            if (!state.gameActive || state.isPaused) return state;

            const newState = { ...state };
            const now = Date.now();

            // Shake disabled for performance

            // Screen flash disabled for performance
            // if (newState.screenFlash > 0) {
            //     newState.screenFlash *= 0.9;
            //     if (newState.screenFlash < 0.05) newState.screenFlash = 0;
            // }

            // Check and end frenzy mode
            if (newState.player.isFrenzy && now > newState.player.frenzyEndTime) {
                newState.player = { ...newState.player, isFrenzy: false };
            }
            if (newState.enemy.isFrenzy && now > newState.enemy.frenzyEndTime) {
                newState.enemy = { ...newState.enemy, isFrenzy: false };
            }

            // Ink refill (both player and enemy)
            if (newState.player.ink < newState.player.maxInk && !newState.player.isFrenzy) {
                newState.player = {
                    ...newState.player,
                    ink: Math.min(newState.player.maxInk, newState.player.ink + INK_REFILL_PER_FRAME),
                };
            }
            if (newState.enemy.ink < newState.enemy.maxInk && !newState.enemy.isFrenzy) {
                newState.enemy = {
                    ...newState.enemy,
                    ink: Math.min(newState.enemy.maxInk, newState.enemy.ink + INK_REFILL_PER_FRAME),
                };
            }

            // Player shooting with INK ECONOMY
            const weaponConfig = WEAPON_MODES[newState.player.weaponMode];
            const inkCost = newState.player.isFrenzy ? 0 : weaponConfig.cost;
            const hasEnoughInk = newState.player.isFrenzy || newState.player.ink >= inkCost;

            // Check if we should fire (either currently firing and cooldown ready, or buffered shot)
            const shouldFire = (newState.player.isFiring && newState.player.cooldown <= 0 && hasEnoughInk) ||
                              (!newState.player.isFiring && newState.player.cooldown <= 0 && hasEnoughInk && newState.player.lastFireTime > 0 && (Date.now() - newState.player.lastFireTime) < 100); // Allow firing within 100ms of releasing fire button

            if (shouldFire) {
                const bullets = createWeaponBullet(newState.player, 'blue', newState.player.weaponMode);
                newState.projectiles = [...newState.projectiles, ...bullets];
                newState.player = {
                    ...newState.player,
                    cooldown: weaponConfig.fireRate,
                    ink: newState.player.ink - inkCost,
                    lastFireTime: Date.now(),
                };
                action.playSound('shoot');
            }

            if (newState.player.cooldown > 0) {
                newState.player = { ...newState.player, cooldown: newState.player.cooldown - 1 };
            }



            // Enemy AI
            newState.enemy = { ...newState.enemy, moveTimer: (newState.enemy.moveTimer || 0) + 1 };
            newState.enemy.difficulty = Math.min(
                0.3 + ((GAME_DURATION - newState.timeLeft) / GAME_DURATION) * 0.5,
                0.9
            );

            if (newState.enemy.moveTimer! > 30 - newState.enemy.difficulty! * 20) {
                const blueTerritory = findLargestTerritory(
                    newState.grid,
                    'blue',
                    newState.cols,
                    newState.rows
                );
                if (blueTerritory && Math.random() < newState.enemy.difficulty!) {
                    const tx = blueTerritory.x * GRID_SIZE + GRID_SIZE / 2 + (Math.random() - 0.5) * 60;
                    const ty = blueTerritory.y * GRID_SIZE + GRID_SIZE / 2 + (Math.random() - 0.5) * 60;
                    const dx = tx - newState.enemy.x;
                    const dy = ty - newState.enemy.y;
                    newState.enemy.targetAngle = Math.atan2(dy, dx);
                } else {
                    const tx = Math.random() * (newState.cols * GRID_SIZE);
                    const ty = (newState.rows * GRID_SIZE) / 2 + Math.random() * ((newState.rows * GRID_SIZE) / 3);
                    const dx = tx - newState.enemy.x;
                    const dy = ty - newState.enemy.y;
                    newState.enemy.targetAngle = Math.atan2(dy, dx);
                }
                newState.enemy.moveTimer = 0;
            }

            // Smooth rotation
            const rotationSpeed = 0.05 + newState.enemy.difficulty! * 0.1;
            newState.enemy.angle += (newState.enemy.targetAngle! - newState.enemy.angle) * rotationSpeed;

            // Enemy fire
            newState.enemy.cooldown--;
            if (newState.enemy.cooldown <= 0) {
                const bullets = createBullet(newState.enemy, 'red', 0.2);
                newState.projectiles = [...newState.projectiles, ...bullets];

                newState.enemy = {
                    ...newState.enemy,
                    cooldown: FIRE_RATE - Math.floor(newState.enemy.difficulty! * 3),
                };
                action.playSound('shoot');
            }

            // Enemy Special Powerup Usage AI
            const enemyPowerups = newState.enemy.powerups!;

            // Use Shield if projectile is close
            if (enemyPowerups.shield > 0) {
                const incomingBullet = newState.projectiles.find(p =>
                    p.team === 'blue' && Math.hypot(p.x - newState.enemy.x, p.y - newState.enemy.y) < 150
                );

                if (incomingBullet) {
                    newState.enemy.powerups!.shield--;
                    action.playSound('powerup');

                    // Activate GLOBAL SHIELD for enemy
                    newState.globalShield = {
                        active: true,
                        endTime: Date.now() + 5000,
                        team: 'red'
                    };

                    // Create enemy shield activation particles
                    const shieldParticles: Particle[] = [];
                    for (let i = 0; i < 30; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 2 + Math.random() * 4;
                        shieldParticles.push({
                            x: newState.enemy.x,
                            y: newState.enemy.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: 1.0,
                            size: 4,
                            color: COLORS.powerup.shield,
                        });
                    }
                    newState.particles = [...newState.particles, ...shieldParticles];
                }
            }

            // Update projectiles
            const canvasWidth = newState.cols * GRID_SIZE;
            const canvasHeight = newState.rows * GRID_SIZE;
            const newProjectiles: Projectile[] = [];
            const newParticles: Particle[] = [...newState.particles];
            let newGrid = newState.grid;
            const newTerritoryBatches = [...newState.territoryBatches];
            const newPowerups = [...newState.powerups];
            let comboStreak = newState.comboStreak;
            let maxCombo = newState.maxCombo;
            let lastTerritoryFlip = newState.lastTerritoryFlip;
            const screenFlash = newState.screenFlash;
            let goldenPixel = newState.goldenPixel;
            let activateFrenzyFor: 'blue' | 'red' | null = null;

            for (const p of newState.projectiles) {
                // Apply gravity for ink bombs
                const gravity = p.gravity || 0;
                const newVy = p.vy + gravity;

                // Update projectile position
                const updatedP = {
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + newVy,
                    vy: newVy,
                    lifetime: p.lifetime + 1,
                };

                // Check max lifetime (for shotgun short range)
                if (updatedP.maxLifetime && updatedP.lifetime >= updatedP.maxLifetime) {
                    // Shotgun bullet expires - paint where it is
                    const gx = Math.floor(updatedP.x / GRID_SIZE);
                    const gy = Math.floor(updatedP.y / GRID_SIZE);
                    if (gx >= 0 && gx < newState.cols && gy >= 0 && gy < newState.rows) {
                        const result = paintGrid(
                            newGrid, gx, gy,
                            updatedP.team as 'blue' | 'red',
                            updatedP.paintRadius || 1,
                            newState.cols, newState.rows
                        );
                        newGrid = result.grid;
                        newParticles.push(...createParticles(updatedP.x, updatedP.y, updatedP.team as 'blue' | 'red', 3));
                        newTerritoryBatches.push(createTerritoryBatch(gx, gy, updatedP.team as 'blue' | 'red'));
                    }
                    continue;
                }

                if (p.isInkBomb) {
                    // Ink bomb - mortar-style arc projectile
                    const gx = Math.floor(updatedP.x / GRID_SIZE);
                    const gy = Math.floor(updatedP.y / GRID_SIZE);

                    // Ink bomb explodes when:
                    // 1. Falling (vy > 0) AND on valid grid position, OR
                    // 2. Near/past bottom of screen, OR
                    // 3. Max lifetime reached (failsafe)
                    // Ink bomb explosion logic
                    const isFalling = newVy > 0;  // y increases downward, so vy > 0 = falling
                    const isOnGrid = gx >= 0 && gx < newState.cols && gy >= 0 && gy < newState.rows;
                    const maxLifetimeReached = updatedP.lifetime > 60;

                    let shouldExplode = false;

                    if (updatedP.explodeTime) {
                        // Ballistic Targeting: Explode when flight time is reached
                        // We add a tiny buffer (e.g. >=) or logic to ensure it hits ground if target is ground
                        if (updatedP.lifetime >= updatedP.explodeTime) {
                            shouldExplode = true;
                        }
                    } else {
                        // Legacy logic (fallback)
                        shouldExplode = (isFalling && isOnGrid && updatedP.lifetime > 10) ||
                            updatedP.y > canvasHeight - 30 ||
                            maxLifetimeReached;
                    }

                    // Always explode if hitting floor, regardless of timing (safety)
                    if (updatedP.y > canvasHeight - 30) {
                        shouldExplode = true;
                    }

                    // FORCE SNAP TO TARGET for explosion center
                    // This fixes the issue where physics drift causes the explosion to be offset from the preview
                    let explosionX = updatedP.x;
                    let explosionY = updatedP.y;

                    // If we have a locked target from the ballistic solver, use THAT as the explosion center
                    if (shouldExplode && updatedP.target) {
                        explosionX = updatedP.target.x;
                        explosionY = updatedP.target.y;
                    }

                    const explosionGx = Math.floor(explosionX / GRID_SIZE);
                    const explosionGy = Math.floor(explosionY / GRID_SIZE);

                    if (shouldExplode && explosionGx >= 0 && explosionGx < newState.cols && explosionGy >= 0 && explosionGy < newState.rows) {
                        // Large explosion!
                        const result = paintGrid(
                            newGrid, explosionGx, explosionGy,
                            updatedP.team as 'blue' | 'red',
                            updatedP.paintRadius || 4,
                            newState.cols, newState.rows
                        );
                        newGrid = result.grid;
                        newParticles.push(...createParticles(explosionX, explosionY, updatedP.team as 'blue' | 'red', 20));
                        newTerritoryBatches.push({
                            x: explosionGx,
                            y: explosionGy,
                            radius: 8,
                            color: updatedP.team === 'blue' ? COLORS.blue : COLORS.red,
                            opacity: 1.0,
                        });

                        // Clear ink bomb preview when bomb explodes (only for player's bombs)
                        if (updatedP.team === 'blue' && updatedP.isInkBomb) {
                            // Reset ink bomb preview when player's bomb explodes
                            newState.inkBombPreview = { x: 0, y: 0, active: false };
                            // Clear the ink bomb in flight flag
                            newState.player = { ...newState.player, inkBombInFlight: false };
                        }

                        action.playSound('explosion');
                    } else if (updatedP.x >= 0 && updatedP.x <= canvasWidth && !maxLifetimeReached) {
                        // Keep flying
                        newProjectiles.push(updatedP);
                    } else {
                        // Projectile went out of bounds - clear preview if it was a player's ink bomb
                        if (updatedP.team === 'blue' && updatedP.isInkBomb) {
                            newState.inkBombPreview = { x: 0, y: 0, active: false };
                            // Clear the ink bomb in flight flag
                            newState.player = { ...newState.player, inkBombInFlight: false };
                        }
                    }
                } else {
                    // Normal bullet
                    if (updatedP.x < 0 || updatedP.x > canvasWidth || updatedP.y < 0 || updatedP.y > canvasHeight) {
                        // Out of bounds - clear preview if it was a player's ink bomb that went out of bounds without exploding
                        if (updatedP.team === 'blue' && updatedP.isInkBomb) {
                            newState.inkBombPreview = { x: 0, y: 0, active: false };
                            // Clear the ink bomb in flight flag
                            newState.player = { ...newState.player, inkBombInFlight: false };
                        }
                    } else {
                        const gx = Math.floor(updatedP.x / GRID_SIZE);
                        const gy = Math.floor(updatedP.y / GRID_SIZE);

                        // Check golden pixel capture
                        if (goldenPixel && goldenPixel.active) {
                            const gpDist = Math.hypot(gx - goldenPixel.x, gy - goldenPixel.y);
                            if (gpDist <= GOLDEN_PIXEL_CAPTURE_RADIUS) {
                                // Captured! Activate frenzy for the team that hit it
                                activateFrenzyFor = updatedP.team as 'blue' | 'red';
                                goldenPixel = { ...goldenPixel, active: false };
                                action.playSound('powerup');
                            }
                        }

                        if (
                            gx >= 0 &&
                            gx < newState.cols &&
                            gy >= 0 &&
                            gy < newState.rows &&
                            updatedP.lifetime > 2 &&
                            newGrid[gx] !== undefined
                        ) {
                            const gridCell = newGrid[gx][gy];

                            // Check if this grid position is protected by GLOBAL SHIELD
                            const isProtected = newState.globalShield &&
                                newState.globalShield.active &&
                                newState.globalShield.endTime > Date.now() &&
                                newState.globalShield.team !== updatedP.team; // Protected regarding specific team (the one who used shield)

                            if (gridCell !== updatedP.team) {
                                if (isProtected) {
                                    // Blocked by GLOBAL SHIELD - destroy projectile and show effect
                                    action.playSound('powerup'); // Use powerup sound for shield hit
                                    for (let i = 0; i < 8; i++) {
                                        const angle = Math.random() * Math.PI * 2;
                                        const speed = 1 + Math.random() * 3;
                                        newParticles.push({
                                            x: updatedP.x,
                                            y: updatedP.y,
                                            vx: Math.cos(angle) * speed,
                                            vy: Math.sin(angle) * speed,
                                            life: 0.6,
                                            size: 3,
                                            color: COLORS.powerup.shield,
                                        });
                                    }
                                    // Projectile destroyed (not added to newProjectiles)

                                    // Clear preview if this was a player's ink bomb that hit shield
                                    if (updatedP.team === 'blue' && updatedP.isInkBomb) {
                                        newState.inkBombPreview = { x: 0, y: 0, active: false };
                                        // Clear the ink bomb in flight flag
                                        newState.player = { ...newState.player, inkBombInFlight: false };
                                    }
                                } else {
                                    const result = paintGrid(
                                        newGrid,
                                        gx,
                                        gy,
                                        updatedP.team as 'blue' | 'red',
                                        updatedP.paintRadius || 2,
                                        newState.cols,
                                        newState.rows
                                    );
                                    newGrid = result.grid;

                                    // Combo tracking
                                    if (updatedP.team === 'blue') {
                                        if (Date.now() - lastTerritoryFlip < 800) {
                                            comboStreak++;
                                            if (comboStreak > maxCombo) maxCombo = comboStreak;
                                            if (comboStreak >= 3 &&
                                                Math.random() < 0.3 &&
                                                newPowerups.length < MAX_POWERUPS_ON_SCREEN &&
                                                Date.now() - state.lastShieldPowerupTime >= 15000) { // 15 second cooldown
                                                newPowerups.push(createPowerup(gx, gy));
                                                // Update last shield powerup time when creating a shield
                                                newState.lastShieldPowerupTime = Date.now();
                                            }
                                        } else {
                                            comboStreak = 1;
                                        }
                                        lastTerritoryFlip = Date.now();
                                    }

                                    newParticles.push(
                                        ...createParticles(updatedP.x, updatedP.y, updatedP.team as 'blue' | 'red', comboStreak > 2 ? 10 : 5)
                                    );
                                    newTerritoryBatches.push(createTerritoryBatch(gx, gy, updatedP.team as 'blue' | 'red'));
                                    action.playSound('explosion');

                                    // Clear preview if this was a player's ink bomb that hit a territory
                                    if (updatedP.team === 'blue' && updatedP.isInkBomb) {
                                        newState.inkBombPreview = { x: 0, y: 0, active: false };
                                        // Clear the ink bomb in flight flag
                                        newState.player = { ...newState.player, inkBombInFlight: false };
                                    }
                                }
                            } else {
                                newProjectiles.push(updatedP);
                            }
                        } else {
                            newProjectiles.push(updatedP);
                        }
                    }
                }
            }

            // Check for shield blocking of projectiles
            // Player shield blocks enemy projectiles


            // Enemy shield blocks player projectiles


            // Activate frenzy if golden pixel was captured
            if (activateFrenzyFor === 'blue') {
                newState.player = {
                    ...newState.player,
                    isFrenzy: true,
                    frenzyEndTime: Date.now() + FRENZY_DURATION,
                    ink: INK_MAX,
                };
            } else if (activateFrenzyFor === 'red') {
                newState.enemy = {
                    ...newState.enemy,
                    isFrenzy: true,
                    frenzyEndTime: Date.now() + FRENZY_DURATION,
                    ink: INK_MAX,
                };
            }

            // Remove expired territory shields

            // Disable expired global shield
            if (newState.globalShield && newState.globalShield.endTime <= now) {
                newState.globalShield = null;
            }

            // Update particles (optimized - faster decay, limited count)
            const MAX_PARTICLES = 30;
            const updatedParticles = newParticles
                .slice(-MAX_PARTICLES) // Keep only last N particles
                .map((pt) => ({
                    ...pt,
                    x: pt.x + pt.vx,
                    y: pt.y + pt.vy,
                    life: pt.life - 0.1, // Faster decay
                    size: pt.size * 0.9, // Faster shrink
                }))
                .filter((pt) => pt.life > 0);

            // Update powerups
            const playerPowerups = { ...newState.player.powerups! };
            let totalPowerupsCollected = newState.totalPowerupsCollected;

            const updatedPowerups = newPowerups
                .map((pu) => {
                    if (pu.collected) return pu;

                    // Check which cannon is closer (magnet effect)
                    const distToPlayer = Math.hypot(newState.player.x - pu.x, newState.player.y - pu.y);
                    const distToEnemy = Math.hypot(newState.enemy.x - pu.x, newState.enemy.y - pu.y);

                    const targetX = distToPlayer < distToEnemy ? newState.player.x : newState.enemy.x;
                    const targetY = distToPlayer < distToEnemy ? newState.player.y : newState.enemy.y;
                    const isPlayerTarget = distToPlayer < distToEnemy;
                    const dist = isPlayerTarget ? distToPlayer : distToEnemy;

                    // Magnet effect
                    const speed = 5 + dist * 0.05;
                    const angle = Math.atan2(targetY - pu.y, targetX - pu.x);

                    const newPu = {
                        ...pu,
                        x: pu.x + Math.cos(angle) * speed,
                        y: pu.y + Math.sin(angle) * speed,
                        rotation: pu.rotation + 0.3,
                    };

                    // Check collision
                    if (dist < 50) {
                        // Collect powerup
                        const targetPowerups = isPlayerTarget ? playerPowerups : newState.enemy.powerups!;

                        switch (pu.type) {
                            case 'shield':
                                // Activate Global Territory Shield
                                if (isPlayerTarget) {
                                    newState.globalShield = {
                                        active: true,
                                        endTime: Date.now() + 5000, // 5 seconds
                                        team: 'blue'
                                    };

                                    // Visual flair for activation
                                    const shieldParticles: Particle[] = [];
                                    for (let i = 0; i < 40; i++) {
                                        const angle = Math.random() * Math.PI * 2;
                                        const speed = 2 + Math.random() * 5;
                                        shieldParticles.push({
                                            x: pu.x,
                                            y: pu.y,
                                            vx: Math.cos(angle) * speed,
                                            vy: Math.sin(angle) * speed,
                                            life: 1.2,
                                            size: 4,
                                            color: COLORS.powerup.shield,
                                        });
                                    }
                                    newState.particles = [...newState.particles, ...shieldParticles];

                                    action.playSound('powerup');
                                } else {
                                    // For enemy, just add to their inventory (they use it via AI logic)
                                    targetPowerups.shield = Math.min(targetPowerups.shield + 1, 2);
                                }
                                break;
                        }

                        if (isPlayerTarget) {
                            totalPowerupsCollected++;
                        }

                        action.playSound('powerup');
                        return { ...newPu, collected: true };
                    }

                    return newPu;
                })
                .filter((pu) => !pu.collected);

            // Update territory batches (optimized - faster decay, limited count)
            const MAX_BATCHES = 10;
            const updatedBatches = newTerritoryBatches
                .slice(-MAX_BATCHES) // Keep only last N batches
                .map((tb) => ({
                    ...tb,
                    radius: tb.radius + 1.5, // Faster expansion
                    opacity: tb.opacity - 0.08, // Faster fade
                }))
                .filter((tb) => tb.opacity > 0);

            return {
                ...newState,
                grid: newGrid,
                projectiles: newProjectiles,
                particles: updatedParticles,
                powerups: updatedPowerups,
                territoryBatches: updatedBatches,
                comboStreak,
                maxCombo,
                lastTerritoryFlip,
                screenFlash,
                totalPowerupsCollected,
                goldenPixel,
                lastShieldPowerupTime: newState.lastShieldPowerupTime,
                player: {
                    ...newState.player,
                    powerups: playerPowerups,
                },
            };
        }

        case 'TIMER_TICK': {
            if (!state.gameActive || state.isPaused) return state;

            const newTimeLeft = state.timeLeft - 1;
            let newGoldenPixel = state.goldenPixel;
            let lastGoldenPixelSpawn = state.lastGoldenPixelSpawn;



            // Golden Pixel spawn every 30 seconds
            const timeSinceLastSpawn = GAME_DURATION - newTimeLeft - lastGoldenPixelSpawn;
            if (timeSinceLastSpawn >= GOLDEN_PIXEL_SPAWN_INTERVAL && (!newGoldenPixel || !newGoldenPixel.active)) {
                newGoldenPixel = createGoldenPixel(state.cols, state.rows);
                lastGoldenPixelSpawn = GAME_DURATION - newTimeLeft;
                action.playSound('powerup');
            }

            // Random powerup drop
            if (
                newTimeLeft % 15 === 0 &&
                state.powerups.length < MAX_POWERUPS_ON_SCREEN &&
                Math.random() < 0.7 &&
                Date.now() - state.lastShieldPowerupTime >= 15000 // 15 second cooldown
            ) {
                // Find border positions
                const borderPositions: { x: number; y: number }[] = [];
                for (let i = 1; i < state.cols - 1; i++) {
                    for (let j = 1; j < state.rows - 1; j++) {
                        const currentRow = state.grid[i];
                        const prevRow = state.grid[i - 1];
                        const nextRow = state.grid[i + 1];
                        if (!currentRow || !prevRow || !nextRow) continue;

                        const current = currentRow[j];
                        const neighbors = [
                            prevRow[j],
                            nextRow[j],
                            currentRow[j - 1],
                            currentRow[j + 1],
                        ].filter((n): n is 'blue' | 'red' => n !== undefined);

                        if (neighbors.some((n) => n !== current)) {
                            borderPositions.push({ x: i, y: j });
                        }
                    }
                }

                if (borderPositions.length > 0) {
                    const pos = borderPositions[Math.floor(Math.random() * borderPositions.length)];
                    if (pos) {
                        return {
                            ...state,
                            timeLeft: newTimeLeft,
                            powerups: [...state.powerups, createPowerup(pos.x, pos.y)],
                            lastShieldPowerupTime: Date.now(), // Update last shield powerup time
                            goldenPixel: newGoldenPixel,
                            lastGoldenPixelSpawn,
                        };
                    }
                }
            }

            if (newTimeLeft <= 0) {
                action.playSound('gameOver');
                return {
                    ...state,
                    timeLeft: 0,
                    gameActive: false,
                };
            }

            return {
                ...state,
                timeLeft: newTimeLeft,
                goldenPixel: newGoldenPixel,
                lastGoldenPixelSpawn,
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }

        case 'END_GAME': {
            return {
                ...state,
                gameActive: false,
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
        }



        case 'USE_SHIELD': {
            if (!state.player.powerups || state.player.powerups.shield <= 0) return state;

            action.playSound('powerup');

            // Create shield particles
            const shieldParticles: Particle[] = [];
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 2;
                shieldParticles.push({
                    x: state.player.x,
                    y: state.player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0,
                    size: 3,
                    color: COLORS.powerup.shield,
                });
            }

            return {
                ...state,
                player: {
                    ...state.player,
                    powerups: {
                        ...state.player.powerups,
                        shield: state.player.powerups.shield - 1,
                    },
                },
                particles: [...state.particles, ...shieldParticles],
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
                // shakeIntensity: 5, // Disabled
            };
        }

        default:
            return {
                ...state,
                lastShieldPowerupTime: state.lastShieldPowerupTime, // Preserve shield cooldown
            };
    }
}

export function useGameState(initialWidth: number = 400, initialHeight: number = 700) {
    const [state, dispatch] = useReducer(gameReducer, createInitialState(initialWidth, initialHeight));

    const startGame = useCallback((playSound: (name: string) => void) => {
        dispatch({ type: 'START_GAME' });
        playSound('powerup');
    }, []);

    const resetGame = useCallback((width: number, height: number) => {
        dispatch({ type: 'RESET_ENTITIES', width, height });
    }, []);

    const setCanvasSize = useCallback((width: number, height: number) => {
        dispatch({ type: 'SET_CANVAS_SIZE', width, height });
    }, []);

    const togglePause = useCallback(() => {
        dispatch({ type: 'TOGGLE_PAUSE' });
    }, []);

    const toggleSound = useCallback(() => {
        dispatch({ type: 'TOGGLE_SOUND' });
    }, []);

    const setPlayerAngle = useCallback((angle: number, targetPos?: { x: number; y: number }) => {
        dispatch({ type: 'SET_PLAYER_ANGLE', angle, targetPos });
    }, []);

    const setPlayerFiring = useCallback((firing: boolean) => {
        dispatch({ type: 'SET_PLAYER_FIRING', firing });
    }, []);

    const updateGame = useCallback((playSound: (name: string) => void) => {
        dispatch({ type: 'GAME_UPDATE', playSound });
    }, []);

    const timerTick = useCallback((playSound: (name: string) => void) => {
        dispatch({ type: 'TIMER_TICK', playSound });
    }, []);



    const activateShield = useCallback((playSound: (name: string) => void) => {
        dispatch({ type: 'USE_SHIELD', playSound });
    }, []);

    const setWeaponMode = useCallback((mode: WeaponMode) => {
        dispatch({ type: 'SET_WEAPON_MODE', mode });
    }, []);

    const setInkBombPreview = useCallback((x: number, y: number, active: boolean) => {
        dispatch({ type: 'SET_INKBOMB_PREVIEW', x, y, active });
    }, []);

    return {
        state,
        startGame,
        resetGame,
        setCanvasSize,
        togglePause,
        toggleSound,
        setPlayerAngle,
        setPlayerFiring,
        setWeaponMode,
        setInkBombPreview,
        updateGame,
        timerTick,

        activateShield,
    };
}
