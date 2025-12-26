// Game State Hook

import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { GameState, Projectile, Particle, Powerup, TerritoryBatch, Cannon } from '../types';
import {
    GRID_SIZE,
    FIRE_RATE,
    GAME_DURATION,
    POWERUP_CHANCE,
    MAX_POWERUPS_ON_SCREEN,
    COLORS,
} from '../lib/constants';
import {
    initializeGrid,
    createBullet,
    createMeteor,
    paintGrid,
    explodeMeteor,
    calculateScore,
    findLargestTerritory,
    createParticles,
    createPowerup,
    createTerritoryBatch,
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
        meteors: [],
        powerups: [],
        territoryBatches: [],
        player: {
            x: width / 2 || 200,
            y: height - 40 || 600,
            angle: -Math.PI / 2,
            isFiring: false,
            cooldown: 0,
            powerups: {
                burstShot: 0,
                shield: 0,
                callMeteor: 0,
            },
            lastFireTime: 0,
        },
        enemy: {
            x: width / 2 || 200,
            y: 40,
            angle: Math.PI / 2,
            targetAngle: Math.PI / 2,
            cooldown: 0,
            moveTimer: 0,
            difficulty: 0.3,
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
        showMeteorIndicator: false,
        meteorTarget: null,
    };
}

type GameAction =
    | { type: 'START_GAME' }
    | { type: 'RESET_ENTITIES'; width: number; height: number }
    | { type: 'TOGGLE_PAUSE' }
    | { type: 'TOGGLE_SOUND' }
    | { type: 'SET_PLAYER_ANGLE'; angle: number }
    | { type: 'SET_PLAYER_FIRING'; firing: boolean }
    | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
    | { type: 'GAME_UPDATE'; playSound: (name: string) => void }
    | { type: 'TIMER_TICK'; playSound: (name: string) => void }
    | { type: 'END_GAME' }
    | { type: 'CALL_PLAYER_METEOR'; playSound: (name: string) => void }
    | { type: 'USE_SHIELD'; playSound: (name: string) => void }
    | { type: 'SHOW_METEOR_WARNING'; targetX: number; targetY: number }
    | { type: 'LAUNCH_METEOR'; targetX: number; targetY: number }
    | { type: 'HIDE_METEOR_WARNING' };

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_GAME': {
            return {
                ...state,
                gameActive: true,
                isPaused: false,
                gameStarted: true,
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
            };
        }

        case 'TOGGLE_SOUND': {
            return {
                ...state,
                isSoundOn: !state.isSoundOn,
            };
        }

        case 'SET_PLAYER_ANGLE': {
            return {
                ...state,
                player: { ...state.player, angle: action.angle },
            };
        }

        case 'SET_PLAYER_FIRING': {
            return {
                ...state,
                player: {
                    ...state.player,
                    isFiring: action.firing,
                    lastFireTime: action.firing ? Date.now() : state.player.lastFireTime,
                },
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
            };
        }

        case 'GAME_UPDATE': {
            if (!state.gameActive || state.isPaused) return state;

            let newState = { ...state };

            // Shake disabled for performance

            // Screen flash disabled for performance
            // if (newState.screenFlash > 0) {
            //     newState.screenFlash *= 0.9;
            //     if (newState.screenFlash < 0.05) newState.screenFlash = 0;
            // }

            // Player shooting
            if (newState.player.isFiring && newState.player.cooldown <= 0) {
                const bullets = createBullet(newState.player, 'blue');
                newState.projectiles = [...newState.projectiles, ...bullets];
                newState.player = {
                    ...newState.player,
                    cooldown: FIRE_RATE,
                    powerups: {
                        ...newState.player.powerups!,
                        burstShot: bullets.length > 1
                            ? newState.player.powerups!.burstShot - 1
                            : newState.player.powerups!.burstShot,
                    },
                };
                // Shake disabled
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
                const bullets = createBullet({ ...newState.enemy, powerups: undefined }, 'red', 0.2);
                newState.projectiles = [...newState.projectiles, ...bullets];
                newState.enemy.cooldown = FIRE_RATE - Math.floor(newState.enemy.difficulty! * 3);
                action.playSound('shoot');
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
            let screenFlash = newState.screenFlash;

            for (const p of newState.projectiles) {
                // Update projectile position without gravity
                const updatedP = {
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy,
                    lifetime: p.lifetime + 1,
                };

                if (p.isMeteor && p.target) {
                    const dist = Math.hypot(updatedP.x - p.target.x, updatedP.y - p.target.y);
                    if (dist < 15 || updatedP.y > canvasHeight) {
                        // Explode meteor
                        newGrid = explodeMeteor(newGrid, updatedP.x, updatedP.y, newState.cols, newState.rows);
                        newParticles.push(...createParticles(updatedP.x, updatedP.y, 'meteor', 50));
                        newTerritoryBatches.push({
                            x: Math.floor(updatedP.x / GRID_SIZE),
                            y: Math.floor(updatedP.y / GRID_SIZE),
                            radius: 10,
                            color: COLORS.meteor,
                            opacity: 1.0,
                        });
                        // Shake disabled for performance
                        action.playSound('meteor');
                    } else {
                        newProjectiles.push(updatedP);
                    }
                } else {
                    // Normal bullet
                    if (updatedP.x < 0 || updatedP.x > canvasWidth || updatedP.y < 0 || updatedP.y > canvasHeight) {
                        // Out of bounds
                    } else {
                        const gx = Math.floor(updatedP.x / GRID_SIZE);
                        const gy = Math.floor(updatedP.y / GRID_SIZE);

                        if (
                            gx >= 0 &&
                            gx < newState.cols &&
                            gy >= 0 &&
                            gy < newState.rows &&
                            updatedP.lifetime > 5 &&
                            newGrid[gx] !== undefined
                        ) {
                            const gridCell = newGrid[gx][gy];
                            if (gridCell !== updatedP.team) {
                                const result = paintGrid(
                                    newGrid,
                                    gx,
                                    gy,
                                    updatedP.team as 'blue' | 'red',
                                    2,
                                    newState.cols,
                                    newState.rows
                                );
                                newGrid = result.grid;

                                // Combo tracking
                                if (updatedP.team === 'blue') {
                                    if (Date.now() - lastTerritoryFlip < 800) {
                                        comboStreak++;
                                        if (comboStreak > maxCombo) maxCombo = comboStreak;
                                        if (comboStreak >= 3 && Math.random() < 0.3 && newPowerups.length < MAX_POWERUPS_ON_SCREEN) {
                                            newPowerups.push(createPowerup(gx, gy));
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
                            } else {
                                newProjectiles.push(updatedP);
                            }
                        } else {
                            newProjectiles.push(updatedP);
                        }
                    }
                }
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
            const playerX = newState.player.x;
            const playerY = newState.player.y;
            let playerPowerups = { ...newState.player.powerups! };
            let totalPowerupsCollected = newState.totalPowerupsCollected;

            const updatedPowerups = newPowerups
                .map((pu) => {
                    if (pu.collected) return pu;

                    const dx = playerX - pu.x;
                    const dy = playerY - pu.y;
                    const dist = Math.hypot(dx, dy);

                    // Magnet effect
                    const speed = 5 + dist * 0.05;
                    const angle = Math.atan2(dy, dx);

                    const newPu = {
                        ...pu,
                        x: pu.x + Math.cos(angle) * speed,
                        y: pu.y + Math.sin(angle) * speed,
                        rotation: pu.rotation + 0.3,
                    };

                    // Check collision
                    if (Math.hypot(playerX - newPu.x, playerY - newPu.y) < 50) {
                        // Collect powerup
                        switch (pu.type) {
                            case 'burst':
                                playerPowerups.burstShot = Math.min(playerPowerups.burstShot + 2, 5);
                                break;
                            case 'shield':
                                playerPowerups.shield = Math.min(playerPowerups.shield + 1, 2);
                                break;
                            case 'meteor':
                                playerPowerups.callMeteor = Math.min(playerPowerups.callMeteor + 1, 3);
                                break;
                        }
                        totalPowerupsCollected++;
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
                player: {
                    ...newState.player,
                    powerups: playerPowerups,
                },
            };
        }

        case 'TIMER_TICK': {
            if (!state.gameActive || state.isPaused) return state;

            const newTimeLeft = state.timeLeft - 1;

            // Check for meteor spawn
            if ([60, 40, 20].includes(newTimeLeft)) {
                // Will be handled by component
            }

            // Random powerup drop
            if (
                newTimeLeft % 15 === 0 &&
                state.powerups.length < MAX_POWERUPS_ON_SCREEN &&
                Math.random() < 0.7
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
            };
        }

        case 'END_GAME': {
            return {
                ...state,
                gameActive: false,
            };
        }

        case 'SHOW_METEOR_WARNING': {
            return {
                ...state,
                showMeteorIndicator: true,
                meteorTarget: { x: action.targetX, y: action.targetY },
            };
        }

        case 'HIDE_METEOR_WARNING': {
            return {
                ...state,
                showMeteorIndicator: false,
            };
        }

        case 'LAUNCH_METEOR': {
            const startX = Math.random() * (state.cols * GRID_SIZE);
            const startY = -50;
            const speed = 6 + Math.random() * 2;

            return {
                ...state,
                showMeteorIndicator: false,
                projectiles: [
                    ...state.projectiles,
                    createMeteor(startX, startY, action.targetX, action.targetY, speed),
                ],
            };
        }

        case 'CALL_PLAYER_METEOR': {
            if (!state.player.powerups || state.player.powerups.callMeteor <= 0) return state;

            const largestRed = findLargestTerritory(state.grid, 'red', state.cols, state.rows);
            let tx: number, ty: number;

            if (largestRed) {
                tx = largestRed.x * GRID_SIZE + GRID_SIZE / 2;
                ty = largestRed.y * GRID_SIZE + GRID_SIZE / 2;
            } else {
                tx = Math.random() * (state.cols * GRID_SIZE);
                ty = 40 + Math.random() * ((state.rows * GRID_SIZE) / 3);
            }

            action.playSound('meteor');

            return {
                ...state,
                player: {
                    ...state.player,
                    powerups: {
                        ...state.player.powerups,
                        callMeteor: state.player.powerups.callMeteor - 1,
                    },
                },
                projectiles: [
                    ...state.projectiles,
                    createMeteor(state.player.x, state.player.y, tx, ty, 8),
                ],
                // shakeIntensity: 10, // Disabled
                meteorTarget: { x: tx, y: ty },
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
                // shakeIntensity: 5, // Disabled
            };
        }

        default:
            return state;
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

    const setPlayerAngle = useCallback((angle: number) => {
        dispatch({ type: 'SET_PLAYER_ANGLE', angle });
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

    const showMeteorWarning = useCallback((targetX: number, targetY: number) => {
        dispatch({ type: 'SHOW_METEOR_WARNING', targetX, targetY });
    }, []);

    const hideMeteorWarning = useCallback(() => {
        dispatch({ type: 'HIDE_METEOR_WARNING' });
    }, []);

    const launchMeteor = useCallback((targetX: number, targetY: number) => {
        dispatch({ type: 'LAUNCH_METEOR', targetX, targetY });
    }, []);

    const callPlayerMeteor = useCallback((playSound: (name: string) => void) => {
        dispatch({ type: 'CALL_PLAYER_METEOR', playSound });
    }, []);

    const useShield = useCallback((playSound: (name: string) => void) => {
        dispatch({ type: 'USE_SHIELD', playSound });
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
        updateGame,
        timerTick,
        showMeteorWarning,
        hideMeteorWarning,
        launchMeteor,
        callPlayerMeteor,
        useShield,
    };
}
