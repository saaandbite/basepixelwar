// Game Logic Functions

import type { Projectile, Particle, Powerup, TerritoryBatch, Cannon, GoldenPixel, WeaponMode } from '../types';
import { GRID_SIZE, COLORS, BULLET_SPEED, WEAPON_MODES } from './constants';

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
        lifetime: 0,
        paintRadius: 2,
    });

    return bullets;
}

// Calculate ballistic velocity to hit a target
// Returns { vx, vy, flightTime } or null if unreachable
export function calculateBallisticVelocity(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    speed: number,
    gravity: number
): { vx: number; vy: number; flightTime: number } | null {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY; // Positive dy is DOWN
    const v2 = speed * speed;
    const x2 = dx * dx;
    const gx = gravity * dx;

    // Safety check for range
    // R_max = v^2 / g (on flat ground, simplified)
    // We solving: y = x * tan(theta) + (g * x^2) / (2 * v^2 * cos^2(theta))
    // But we know v_total is fixed to 'speed' (actually it's not, usually game physics splits vx/vy differently)
    // Wait, the previous logic was: vx = cos(a)*s, vy = sin(a)*s - 4. 
    // That means initial speed is actually variable depending on angle because of the -4 z-boost.
    // Let's assume we want to solve for angle 'theta' such that:
    // vx = S * cos(theta)
    // vy = S * sin(theta) - 4
    // 
    // It's easier to iterate or approximate since the " - 4" makes the math messy for a direct analytic solution.
    // However, to keep "Point and Click" simple and robust:
    // We can assume we want to hit (tx, ty) in 't' frames.
    // x(t) = sx + vx * t
    // y(t) = sy + vy * t + 0.5 * g * t^2
    // 
    // We have constraints: sqrt(vx^2 + (vy+4)^2) = Speed.
    // This is hard to solve exactly in real-time efficiently without iterations.

    // ALTERNATIVE: Ignore the "-4" boost for the solver and just apply the physics required to hit the target.
    // If the required velocity is within the weapon's "power", we use it. 
    // If not, we clamp it.
    // BUT the weapon definition in constants says "speed: 8".
    // If we just calculate the needed vx, vy to hit the target, we might violate the speed constant.

    // Let's try the iterate approach which is robust for this 2D grid:
    // Try different flight times 't'.
    // vx = dx / t
    // vy_needed = (dy - 0.5 * gravity * t * t) / t
    // Check if sqrt(vx^2 + (vy_needed + 4)^2) <= speed * 1.1 (allow some tolerance)
    // Minimizing deviation from 'speed'

    let bestSol: { vx: number; vy: number; flightTime: number } | null = null;
    let minSpeedDiff = Infinity;

    // Search flight times from 20 to 120 frames (approx 0.3s to 2s)
    for (let t = 20; t <= 150; t += 5) {
        const vx = dx / t;
        const net_dy = dy - 0.5 * gravity * t * t;
        const required_vy_initial = net_dy / t; // This is the final vy term needed in the equation y = vy*t + 0.5gt^2

        // In our game physics: newVy = oldVy + gravity.
        // pos += vy. 
        // So y(t) approx sum(vy0 + n*g) = vy0*t + 0.5*g*t^2. Correct.
        // But we add '4' to the stored vy to get the "launch vector".
        // The actual vy used in physics is "baseVy - 4".
        // So if we need required_vy_initial, then baseVy = required_vy_initial + 4.
        // And we check if magnitude of (vx, baseVy) is close to 'speed'.

        const baseVy = required_vy_initial + 4; // Reversing the "-4" boost

        const launchSpeed = Math.hypot(vx, baseVy);
        const diff = Math.abs(launchSpeed - speed);

        if (diff < minSpeedDiff) {
            minSpeedDiff = diff;
            bestSol = { vx, vy: required_vy_initial, flightTime: t };
        }
    }

    // If even the best solution is too far off (unreachable), return null
    // (e.g. trying to shoot across the map with weak gun)
    if (bestSol && minSpeedDiff < speed * 0.5) {
        return bestSol;
    }

    return null;
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
                    isInkBomb: false,
                    lifetime: 0,
                    maxLifetime: shotgunConfig.maxLifetime,
                    paintRadius: modeConfig.paintRadius,
                });
            });
            break;
        }

        case 'inkBomb': {
            // Arc trajectory bomb
            const inkBombConfig = WEAPON_MODES.inkBomb;

            let vx, vy;

            // Use Ballistic Targeting if available
            if (source.targetPos) {
                const solution = calculateBallisticVelocity(
                    source.x,
                    source.y,
                    source.targetPos.x,
                    source.targetPos.y,
                    modeConfig.speed,
                    inkBombConfig.gravity
                );

                if (solution) {
                    vx = solution.vx;
                    vy = solution.vy; // solution.vy is already the initial velocity (without the +4 boost abstraction), see calc
                    // Wait, in my loop I derived: required_vy_initial = net_dy/t.
                    // And I said "baseVy = required_vy_initial + 4".
                    // The old code did: vy = baseVy - 4.
                    // So if I set logic to use vx, vy directly:
                    // I should pass these directly.
                    // BUT wait, createWeaponBullet logic previously calculated baseVx/baseVy from angle.
                    // Now we override them.
                }
            }

            // Fallback if no target or no solution
            if (vx === undefined || vy === undefined) {
                const baseVx = Math.cos(source.angle) * modeConfig.speed;
                const baseVy = Math.sin(source.angle) * modeConfig.speed;
                vx = baseVx;
                vy = baseVy - 4;
            }

            bullets.push({
                x: source.x,
                y: source.y,
                vx: vx,
                vy: vy,
                team,
                active: true,
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
    type: 'blue' | 'red',
    count: number = 3
): Particle[] {
    // Limit particle count for performance
    const actualCount = Math.min(count, 3);
    const particles: Particle[] = [];
    let baseColor = '#FFFFFF';
    const glow = false;

    if (type === 'blue') baseColor = COLORS.bulletStrokeBlue;
    else if (type === 'red') baseColor = COLORS.bulletStrokeRed;

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
