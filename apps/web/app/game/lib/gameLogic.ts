// Game Logic Functions

import type { Projectile, Particle, Powerup, TerritoryBatch, Cannon, GoldenPixel, WeaponMode } from '../types';
import { GRID_SIZE, COLORS, BULLET_SPEED, WEAPON_MODES, GOLDEN_PIXEL_SIZE } from './constants';

// Initialize grid with half red (top) and half blue (bottom)
export function initializeGrid(cols: number, rows: number): ('blue' | 'red')[][] {
    const grid: ('blue' | 'red')[][] = [];
    for (let i = 0; i < cols; i++) {
        const column: ('blue' | 'red')[] = [];
        for (let j = 0; j < rows; j++) {
            column.push(j < rows / 2 + 2 ? 'red' : 'blue');
        }
        grid.push(column);
    }
    return grid;
}

// Create a new bullet (legacy - used by enemy AI)
export function createBullet(
    source: Cannon,
    team: 'blue' | 'red',
    spread: number = 0
): Projectile[] {
    const bullets: Projectile[] = [];

    // Regular shot
    const angle = source.angle + (Math.random() - 0.5) * spread;
    bullets.push({
        x: source.x,
        y: source.y,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        team,
        active: true,
        isMeteor: false,
        lifetime: 0,
        paintRadius: 2,
    });

    return bullets;
}

// Create bullets based on weapon mode (INK ECONOMY)
export function createWeaponBullet(
    source: Cannon,
    team: 'blue' | 'red',
    mode: WeaponMode
): Projectile[] {
    const bullets: Projectile[] = [];
    const modeConfig = WEAPON_MODES[mode];

    switch (mode) {
        case 'machineGun': {
            // Single fast bullet, small paint area
            bullets.push({
                x: source.x,
                y: source.y,
                vx: Math.cos(source.angle) * modeConfig.speed,
                vy: Math.sin(source.angle) * modeConfig.speed,
                team,
                active: true,
                isMeteor: false,
                isInkBomb: false,
                lifetime: 0,
                paintRadius: modeConfig.paintRadius,
            });
            break;
        }

        case 'shotgun': {
            // 3-way spread with limited range
            const shotgunConfig = WEAPON_MODES.shotgun;
            shotgunConfig.spreadAngles.forEach((offset) => {
                bullets.push({
                    x: source.x,
                    y: source.y,
                    vx: Math.cos(source.angle + offset) * modeConfig.speed,
                    vy: Math.sin(source.angle + offset) * modeConfig.speed,
                    team,
                    active: true,
                    isMeteor: false,
                    isInkBomb: false,
                    lifetime: 0,
                    maxLifetime: shotgunConfig.maxLifetime,
                    paintRadius: modeConfig.paintRadius,
                });
            });
            break;
        }

        case 'inkBomb': {
            // Arc trajectory bomb - starts with upward velocity for lobbing effect
            const inkBombConfig = WEAPON_MODES.inkBomb;
            const baseVx = Math.cos(source.angle) * modeConfig.speed;
            const baseVy = Math.sin(source.angle) * modeConfig.speed;

            bullets.push({
                x: source.x,
                y: source.y,
                vx: baseVx,
                vy: baseVy - 4, // Strong upward arc boost for lobbing effect
                team,
                active: true,
                isMeteor: false,
                isInkBomb: true,
                lifetime: 0,
                paintRadius: inkBombConfig.paintRadius,
                gravity: inkBombConfig.gravity,
            });
            break;
        }
    }

    return bullets;
}

// Create a Golden Pixel at random center position
export function createGoldenPixel(cols: number, rows: number): GoldenPixel {
    // Spawn in center-ish area (middle 50% of map)
    const marginX = Math.floor(cols * 0.25);
    const marginY = Math.floor(rows * 0.25);

    const x = marginX + Math.floor(Math.random() * (cols - 2 * marginX));
    const y = marginY + Math.floor(Math.random() * (rows - 2 * marginY));

    return {
        x,
        y,
        active: true,
        spawnTime: Date.now(),
        pulsePhase: 0,
    };
}

// Create a meteor projectile
export function createMeteor(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    speed: number = 6
): Projectile {
    const angle = Math.atan2(targetY - startY, targetX - startX);
    return {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        team: 'neutral',
        active: true,
        isMeteor: true,
        target: { x: targetX, y: targetY },
        lifetime: 0,
    };
}

// Paint grid cells in a radius
export function paintGrid(
    grid: ('blue' | 'red')[][],
    gx: number,
    gy: number,
    team: 'blue' | 'red',
    radius: number,
    cols: number,
    rows: number
): { grid: ('blue' | 'red')[][]; cellsChanged: number; affectedPositions: { x: number; y: number }[] } {
    const newGrid = grid.map((col) => [...col]);
    let cellsChanged = 0;
    const affectedPositions: { x: number; y: number }[] = [];

    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            const nx = gx + i;
            const ny = gy + j;
            if (i * i + j * j <= radius * radius) {
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    const column = newGrid[nx];
                    if (column && column[ny] !== team) {
                        column[ny] = team;
                        cellsChanged++;
                        affectedPositions.push({ x: nx, y: ny });
                    }
                }
            }
        }
    }

    return { grid: newGrid, cellsChanged, affectedPositions };
}

// Explode meteor and flip territory
export function explodeMeteor(
    grid: ('blue' | 'red')[][],
    x: number,
    y: number,
    cols: number,
    rows: number
): ('blue' | 'red')[][] {
    const newGrid = grid.map((col) => [...col]);
    const gx = Math.floor(x / GRID_SIZE);
    const gy = Math.floor(y / GRID_SIZE);
    const radius = 9;

    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            const nx = gx + i;
            const ny = gy + j;
            if (i * i + j * j <= radius * radius) {
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    const column = newGrid[nx];
                    if (column) {
                        const currentCell = column[ny];
                        if (currentCell !== undefined) {
                            column[ny] = currentCell === 'blue' ? 'red' : 'blue';
                        }
                    }
                }
            }
        }
    }

    return newGrid;
}

// Calculate score percentages
export function calculateScore(
    grid: ('blue' | 'red')[][],
    cols: number,
    rows: number
): { blue: number; red: number } {
    let blue = 0;
    const total = cols * rows;

    for (let i = 0; i < cols; i++) {
        const column = grid[i];
        if (column) {
            for (let j = 0; j < rows; j++) {
                if (column[j] === 'blue') blue++;
            }
        }
    }

    const bluePercent = Math.round((blue / total) * 100);
    return { blue: bluePercent, red: 100 - bluePercent };
}

// Find largest territory cluster (OPTIMIZED - uses sampling instead of full DFS)
// Cache for territory finding
let cachedTerritoryResult: { x: number; y: number } | null = null;
let lastTerritoryCalcTime = 0;
const TERRITORY_CACHE_MS = 500; // Only recalculate every 500ms

export function findLargestTerritory(
    grid: ('blue' | 'red')[][],
    team: 'blue' | 'red',
    cols: number,
    rows: number
): { x: number; y: number } | null {
    const now = Date.now();

    // Return cached result if recent enough
    if (cachedTerritoryResult && now - lastTerritoryCalcTime < TERRITORY_CACHE_MS) {
        return cachedTerritoryResult;
    }

    // Fast sampling approach - check grid in larger steps
    let bestX = 0;
    let bestY = 0;
    let bestCount = 0;

    const step = 4; // Check every 4th cell
    const sampleRadius = 3;

    for (let i = step; i < cols - step; i += step) {
        const column = grid[i];
        if (!column) continue;

        for (let j = step; j < rows - step; j += step) {
            if (column[j] !== team) continue;

            // Count nearby cells of same team
            let count = 0;
            for (let di = -sampleRadius; di <= sampleRadius; di++) {
                const sampleCol = grid[i + di];
                if (!sampleCol) continue;
                for (let dj = -sampleRadius; dj <= sampleRadius; dj++) {
                    if (sampleCol[j + dj] === team) count++;
                }
            }

            if (count > bestCount) {
                bestCount = count;
                bestX = i;
                bestY = j;
            }
        }
    }

    if (bestCount > 0) {
        cachedTerritoryResult = { x: bestX, y: bestY };
    } else {
        // Fallback to any cell of the team
        for (let i = 0; i < cols; i += 5) {
            const column = grid[i];
            if (!column) continue;
            for (let j = 0; j < rows; j += 5) {
                if (column[j] === team) {
                    cachedTerritoryResult = { x: i, y: j };
                    break;
                }
            }
            if (cachedTerritoryResult) break;
        }
    }

    lastTerritoryCalcTime = now;
    return cachedTerritoryResult;
}

// Create particles for explosion effect (OPTIMIZED - reduced count for performance)
export function createParticles(
    x: number,
    y: number,
    type: 'blue' | 'red' | 'meteor',
    count: number = 3
): Particle[] {
    // Limit particle count for performance
    const actualCount = Math.min(count, type === 'meteor' ? 8 : 3);
    const particles: Particle[] = [];
    let baseColor = '#FFFFFF';
    let glow = false;

    if (type === 'blue') baseColor = COLORS.bulletStrokeBlue;
    else if (type === 'red') baseColor = COLORS.bulletStrokeRed;
    else if (type === 'meteor') {
        baseColor = COLORS.meteor;
        glow = true;
    }

    for (let i = 0; i < actualCount; i++) {
        const angle = (i / actualCount) * Math.PI * 2; // Even distribution
        const speed = 2 + Math.random() * 2;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6,
            size: glow ? 3 : 4,
            color: baseColor,
            glow,
        });
    }

    return particles;
}

// Create powerup at position
export function createPowerup(gx: number, gy: number): Powerup {
    return {
        x: gx * GRID_SIZE + GRID_SIZE / 2 + (Math.random() - 0.5) * 20,
        y: gy * GRID_SIZE + GRID_SIZE / 2 - 30,
        vy: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        type: 'shield',
        collected: false,
        color: COLORS.powerup.shield,
        glowColor: 'rgba(76, 175, 80, 0.6)',
    };
}

// Create territory batch effect
export function createTerritoryBatch(
    gx: number,
    gy: number,
    team: 'blue' | 'red'
): TerritoryBatch {
    return {
        x: gx,
        y: gy,
        radius: 5,
        color: team === 'blue' ? COLORS.blue : COLORS.red,
        opacity: 1.0,
    };
}

// Shade color utility
export function shadeColor(color: string, percent: number): string {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.max(0, Math.min(255, R + percent));
    G = Math.max(0, Math.min(255, G + percent));
    B = Math.max(0, Math.min(255, B + percent));

    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}
