// Canvas Rendering Functions

import type { Projectile, Particle, Powerup, TerritoryBatch, Cannon, GoldenPixel } from '../types';
import { GRID_SIZE, COLORS, GOLDEN_PIXEL_SIZE } from './constants';
import { shadeColor } from './gameLogic';

// Grid cache for performance optimization
let gridCacheCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let gridCacheCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
let lastGridHash: string | null = null;
let lastCols = 0;
let lastRows = 0;

// Initialize grid cache canvas
function initGridCache(width: number, height: number): void {
    if (typeof OffscreenCanvas !== 'undefined') {
        gridCacheCanvas = new OffscreenCanvas(width, height);
    } else {
        gridCacheCanvas = document.createElement('canvas');
        gridCacheCanvas.width = width;
        gridCacheCanvas.height = height;
    }
    gridCacheCtx = gridCacheCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

// Fast hash for grid state (checks only boundaries for speed)
function computeGridHash(grid: ('blue' | 'red')[][], cols: number, rows: number): string {
    // Sample strategic points instead of hashing entire grid
    let hash = '';
    const samplePoints = [
        [0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1],
        [Math.floor(cols / 2), Math.floor(rows / 2)],
        [Math.floor(cols / 4), Math.floor(rows / 4)],
        [Math.floor(cols * 3 / 4), Math.floor(rows * 3 / 4)],
    ];

    for (const [x, y] of samplePoints) {
        const col = grid[x!];
        if (col && y! < rows) {
            hash += col[y!] === 'blue' ? 'B' : 'R';
        }
    }

    // Also include count approximation
    let blueCount = 0;
    for (let i = 0; i < cols; i += 5) {
        const col = grid[i];
        if (col) {
            for (let j = 0; j < rows; j += 5) {
                if (col[j] === 'blue') blueCount++;
            }
        }
    }
    hash += blueCount.toString();

    return hash;
}

// Draw background gradient
export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#dbeafe');
    gradient.addColorStop(1, '#bfdbfe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

// Draw grid with caching for performance
export function drawGrid(
    ctx: CanvasRenderingContext2D,
    grid: ('blue' | 'red')[][],
    cols: number,
    rows: number,
    forceRedraw: boolean = false
): void {
    const width = cols * GRID_SIZE;
    const height = rows * GRID_SIZE;

    // Initialize cache if needed
    if (!gridCacheCanvas || !gridCacheCtx || cols !== lastCols || rows !== lastRows) {
        initGridCache(width, height);
        lastCols = cols;
        lastRows = rows;
        lastGridHash = null;
    }

    // Check if grid changed
    const currentHash = computeGridHash(grid, cols, rows);
    const needsRedraw = forceRedraw || lastGridHash !== currentHash;

    if (needsRedraw && gridCacheCtx) {
        // Redraw to cache
        drawGridDirect(gridCacheCtx as CanvasRenderingContext2D, grid, cols, rows);
        lastGridHash = currentHash;
    }

    // Blit cached grid to main canvas
    if (gridCacheCanvas) {
        ctx.drawImage(gridCacheCanvas as CanvasImageSource, 0, 0);
    }
}

// Direct grid drawing (used for cache)
function drawGridDirect(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    grid: ('blue' | 'red')[][],
    cols: number,
    rows: number
): void {
    // Clear cache
    ctx.clearRect(0, 0, cols * GRID_SIZE, rows * GRID_SIZE);

    // Batch draw by color for better performance
    ctx.fillStyle = COLORS.blue;
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
        const column = grid[i];
        if (!column) continue;
        for (let j = 0; j < rows; j++) {
            if (column[j] === 'blue') {
                ctx.rect(i * GRID_SIZE, j * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
            }
        }
    }
    ctx.fill();

    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
        const column = grid[i];
        if (!column) continue;
        for (let j = 0; j < rows; j++) {
            if (column[j] === 'red') {
                ctx.rect(i * GRID_SIZE, j * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
            }
        }
    }
    ctx.fill();

    // Draw borders between territories
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < cols; i++) {
        const column = grid[i];
        if (!column) continue;
        const nextColumn = grid[i + 1];

        for (let j = 0; j < rows; j++) {
            const current = column[j];

            // Check right neighbor
            if (i + 1 < cols && nextColumn && nextColumn[j] !== current) {
                ctx.moveTo((i + 1) * GRID_SIZE - 0.5, j * GRID_SIZE);
                ctx.lineTo((i + 1) * GRID_SIZE - 0.5, (j + 1) * GRID_SIZE);
            }

            // Check bottom neighbor
            if (j + 1 < rows && column[j + 1] !== current) {
                ctx.moveTo(i * GRID_SIZE, (j + 1) * GRID_SIZE - 0.5);
                ctx.lineTo((i + 1) * GRID_SIZE, (j + 1) * GRID_SIZE - 0.5);
            }
        }
    }
    ctx.stroke();
}

// Force clear grid cache (call when game resets)
export function clearGridCache(): void {
    lastGridHash = null;
    lastCols = 0;
    lastRows = 0;
}

// Draw territory batch effects (expanding circles)
export function drawTerritoryBatches(
    ctx: CanvasRenderingContext2D,
    batches: TerritoryBatch[]
): void {
    batches.forEach((tb) => {
        ctx.save();
        ctx.translate(tb.x * GRID_SIZE + GRID_SIZE / 2, tb.y * GRID_SIZE + GRID_SIZE / 2);

        // Pulsing glow
        const glowSize = tb.radius * 1.5;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, `${tb.color}80`);
        gradient.addColorStop(1, `${tb.color}00`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Growing circle
        ctx.strokeStyle = tb.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = tb.opacity;
        ctx.beginPath();
        ctx.arc(0, 0, tb.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    });
}

// Draw powerups
export function drawPowerups(ctx: CanvasRenderingContext2D, powerups: Powerup[]): void {
    powerups.forEach((pu) => {
        if (pu.collected) return;

        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.rotate(pu.rotation);

        // Glow effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        gradient.addColorStop(0, pu.glowColor);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        // Powerup symbol based on type - using simple shapes instead of emojis
        ctx.strokeStyle = pu.color;
        ctx.lineWidth = 2.5;

        switch (pu.type) {
            case 'shield':
                // Shield shape
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(8, -6);
                ctx.lineTo(8, 4);
                ctx.quadraticCurveTo(8, 10, 0, 12);
                ctx.quadraticCurveTo(-8, 10, -8, 4);
                ctx.lineTo(-8, -6);
                ctx.closePath();
                ctx.stroke();
                ctx.fillStyle = pu.color + '40';
                ctx.fill();
                break;
        }

        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    });
}

// Draw projectiles
export function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
    projectiles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.isMeteor) {
            // Meteor with trail
            ctx.fillStyle = COLORS.meteor;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();

            // Glowing edge
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Heat trail
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-p.vx * 3, -p.vy * 3);
            ctx.strokeStyle = COLORS.meteorTrail;
            ctx.lineWidth = 4;
            ctx.stroke();

            // Fire particles
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 15;
                const size = 2 + Math.random() * 3;

                ctx.fillStyle = `rgba(249, 199, 79, ${0.7 - i * 0.2})`;
                ctx.beginPath();
                ctx.arc(
                    -p.vx * i * 0.5 + Math.cos(angle) * dist,
                    -p.vy * i * 0.5 + Math.sin(angle) * dist,
                    size,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        } else {
            // Bullet with glow
            const bulletColor = p.team === 'blue' ? COLORS.bulletStrokeBlue : COLORS.bulletStrokeRed;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
            gradient.addColorStop(0, bulletColor);
            gradient.addColorStop(1, `${bulletColor}40`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
}

// Draw particles (OPTIMIZED - simple circles instead of gradients)
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    if (particles.length === 0) return;

    // Batch by approximate alpha levels for fewer state changes
    const alphaGroups: Map<number, Particle[]> = new Map();

    for (const p of particles) {
        // Round alpha to nearest 0.2 for batching
        const alphaKey = Math.round(p.life * 5) / 5;
        if (!alphaGroups.has(alphaKey)) {
            alphaGroups.set(alphaKey, []);
        }
        alphaGroups.get(alphaKey)!.push(p);
    }

    for (const [alpha, group] of alphaGroups) {
        ctx.globalAlpha = alpha;

        for (const p of group) {
            // Simple filled circle instead of expensive gradient
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.globalAlpha = 1.0;
}

// Draw cannon
export function drawCannon(
    ctx: CanvasRenderingContext2D,
    cannon: Cannon,
    color: string,
    isPlayer: boolean
): void {
    ctx.save();
    ctx.translate(cannon.x, cannon.y);
    ctx.rotate(cannon.angle);

    // Cannon shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cannon base gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(1, '#F1F5F9');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Cannon barrel with gradient
    const barrelGradient = ctx.createLinearGradient(0, -12, 40, -12);
    barrelGradient.addColorStop(0, color);
    barrelGradient.addColorStop(1, shadeColor(color, -20));

    ctx.fillStyle = barrelGradient;
    ctx.beginPath();
    ctx.roundRect(-5, -12, 45, 24, 8);
    ctx.fill();

    // Cannon details
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player indicator
    if (isPlayer) {
        ctx.fillStyle = '#60A5FA';
        ctx.beginPath();
        ctx.arc(30, 0, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Powerup indicators for player
    if (isPlayer && cannon.powerups) {
        const { shield } = cannon.powerups;
        if (shield > 0) {
            ctx.save();
            ctx.rotate(-cannon.angle); // Unrotate for proper positioning

            let indicatorX = 25;
            if (shield > 0) {
                ctx.fillStyle = COLORS.powerup.shield;
                ctx.beginPath();
                ctx.arc(indicatorX, -25, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(shield), indicatorX, -25);
            }

            ctx.restore();
        }
    }

    ctx.restore();
}

// Draw trajectory line
export function drawTrajectory(
    ctx: CanvasRenderingContext2D,
    player: Cannon,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (player.cooldown > 0) return;

    const steps = 15;
    let x = player.x;
    let y = player.y;
    const vx = Math.cos(player.angle) * 8;
    const vy = Math.sin(player.angle) * 8;

    ctx.beginPath();
    ctx.moveTo(x, y);

    let currentVx = vx;
    let currentVy = vy;

    for (let i = 0; i < steps; i++) {
        x += currentVx;
        y += currentVy;

        // Check for boundary collisions
        if (x < 0 || x > canvasWidth) currentVx *= -0.8;
        if (y < 0 || y > canvasHeight) currentVy *= -0.8;

        ctx.lineTo(x, y);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Draw screen flash effect
export function drawScreenFlash(
    ctx: CanvasRenderingContext2D,
    flash: number,
    width: number,
    height: number
): void {
    if (flash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.3})`;
        ctx.fillRect(0, 0, width, height);
    }
}

// Draw target marker for meteor
export function drawTargetMarker(
    ctx: CanvasRenderingContext2D,
    targetX: number,
    targetY: number
): void {
    ctx.save();

    // Outer dashed circle
    ctx.beginPath();
    ctx.arc(targetX, targetY, 40, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(249, 199, 79, 0.4)';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.stroke();

    // Inner pulsating circle
    const pulse = 0.5 + 0.3 * Math.sin(Date.now() / 200);
    ctx.beginPath();
    ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(249, 199, 79, ${0.2 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.restore();
}

// Draw meteor warning pulse
export function drawMeteorWarning(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    const pulse = 0.05 + Math.sin(Date.now() / 100) * 0.03;
    ctx.fillStyle = `rgba(249, 199, 79, ${pulse})`;
    ctx.fillRect(0, 0, width, height);
}

// Draw Golden Pixel (secondary objective)
export function drawGoldenPixel(
    ctx: CanvasRenderingContext2D,
    goldenPixel: GoldenPixel
): void {
    if (!goldenPixel || !goldenPixel.active) return;

    const x = goldenPixel.x * GRID_SIZE + GRID_SIZE / 2;
    const y = goldenPixel.y * GRID_SIZE + GRID_SIZE / 2;
    const baseRadius = GOLDEN_PIXEL_SIZE * GRID_SIZE;

    // Pulsing effect
    const time = Date.now();
    const pulse = 1 + Math.sin(time / 200) * 0.15;
    const glowPulse = 0.4 + Math.sin(time / 150) * 0.2;

    ctx.save();
    ctx.translate(x, y);

    // Outer glow rings
    for (let i = 3; i >= 1; i--) {
        const ringRadius = baseRadius * (1 + i * 0.3) * pulse;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ringRadius);
        gradient.addColorStop(0, `rgba(255, 215, 0, ${0.1 / i})`);
        gradient.addColorStop(0.7, `rgba(255, 215, 0, ${0.05 / i})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Main golden circle
    const mainGradient = ctx.createRadialGradient(0, -5, 2, 0, 5, baseRadius * pulse);
    mainGradient.addColorStop(0, '#fff7cc');
    mainGradient.addColorStop(0.3, COLORS.golden);
    mainGradient.addColorStop(0.7, '#cc9900');
    mainGradient.addColorStop(1, '#996600');

    ctx.fillStyle = mainGradient;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner shine
    ctx.fillStyle = `rgba(255, 255, 255, ${glowPulse})`;
    ctx.beginPath();
    ctx.arc(-baseRadius * 0.3, -baseRadius * 0.3, baseRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Coin symbol
    ctx.fillStyle = 'rgba(153, 102, 0, 0.6)';
    ctx.font = `bold ${baseRadius}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 2);

    // Sparkle particles
    const sparkleCount = 4;
    for (let i = 0; i < sparkleCount; i++) {
        const angle = (time / 500 + i * Math.PI / 2) % (Math.PI * 2);
        const dist = baseRadius * 1.5 + Math.sin(time / 100 + i) * 5;
        const sparkleX = Math.cos(angle) * dist;
        const sparkleY = Math.sin(angle) * dist;
        const sparkleSize = 2 + Math.sin(time / 50 + i) * 1;

        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - i * 0.15})`;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Draw Frenzy Mode overlay
export function drawFrenzyOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
): void {
    if (intensity <= 0) return;

    const time = Date.now();
    const pulse = 0.1 + Math.sin(time / 100) * 0.05;

    // Orange tint overlay
    ctx.fillStyle = `rgba(255, 107, 53, ${pulse * intensity})`;
    ctx.fillRect(0, 0, width, height);

    // Border glow
    const borderWidth = 8 + Math.sin(time / 80) * 4;
    ctx.strokeStyle = `rgba(255, 107, 53, ${0.4 * intensity})`;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
}

// Draw global territory shield overlay
export function drawGlobalShieldOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    team: 'blue' | 'red'
): void {
    const time = Date.now();
    const pulse = 0.5 + 0.3 * Math.sin(time / 300);

    // Shield color (Green for "Protection")
    const shieldColor = '#22c55e'; // Green-500

    ctx.save();

    // 1. Draw glowing border
    ctx.strokeStyle = `rgba(34, 197, 94, ${0.6 * pulse})`;
    ctx.lineWidth = 6 + 2 * Math.sin(time / 200);
    ctx.strokeRect(0, 0, width, height);

    // 2. Draw subtle hexagonal grid overlay
    ctx.globalAlpha = 0.05 * pulse;
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = 1;

    const hexSize = 40;
    const hexHeight = hexSize * Math.sqrt(3);
    const hexWidth = hexSize * 2;
    const xStep = hexWidth * 0.75;
    const yStep = hexHeight;

    // Simple grid pattern
    ctx.beginPath();
    for (let x = 0; x < width + hexSize; x += xStep) {
        for (let y = 0; y < height + hexSize; y += yStep) {
            const shiftY = (Math.floor(x / xStep) % 2) * (hexHeight / 2);
            ctx.moveTo(x + hexSize * Math.cos(0), y + shiftY + hexSize * Math.sin(0));
            for (let i = 1; i <= 6; i++) {
                ctx.lineTo(x + hexSize * Math.cos(i * Math.PI / 3), y + shiftY + hexSize * Math.sin(i * Math.PI / 3));
            }
        }
    }
    ctx.stroke();

    // 3. Status Text
    ctx.fillStyle = shieldColor;
    ctx.globalAlpha = 0.8 * pulse;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('TERRITORY PROTECTION ACTIVE', width / 2, 20);

    ctx.restore();
}
