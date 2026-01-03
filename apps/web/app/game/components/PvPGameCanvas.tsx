'use client';

// PvPGameCanvas.tsx
// Simplified canvas that renders server-synced game state

import { useRef, useEffect, useCallback } from 'react';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, INK_MAX } from '../lib/constants';
import type { SyncedGameState } from '@repo/shared/multiplayer';
import type { Projectile, Cannon, Particle, TerritoryBatch } from '../types';
import {
    drawBackground,
    drawGrid,
    drawProjectiles,
    drawCannon,
    drawParticles,
    drawTerritoryBatches,
    drawScreenFlash,
    drawGoldenPixel,
    drawFrenzyOverlay,
} from '../lib/renderer';

interface PvPGameCanvasProps {
    gameState: SyncedGameState | null;
    myTeam: 'blue' | 'red';
    onPlayerInput: (angle: number, firing: boolean, targetPos?: { x: number; y: number }) => void;
    localAngle: number | null; // New prop for client-side prediction
}

export function PvPGameCanvas({ gameState, myTeam, onPlayerInput, localAngle }: PvPGameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastAngleRef = useRef<number>(0); // Track last angle for mouseUp/Leave

    const isFlipped = myTeam === 'red';

    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameState) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { grid, player1, player2, projectiles, particles, territoryBatches, screenFlash, goldenPixel } = gameState as any;

        // Clear canvas
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Apply flip transform for red team
        ctx.save();
        if (isFlipped) {
            ctx.translate(GAME_WIDTH, GAME_HEIGHT);
            ctx.rotate(Math.PI);
        }

        // 1. Draw Background
        drawBackground(ctx, GAME_WIDTH, GAME_HEIGHT);

        // 2. Draw Grid
        // Grid from server is simple array. drawGrid expects ('blue' | 'red')[][]
        if (grid && grid.length > 0 && grid[0]) {
            // Need forceRedraw=true often because we don't cache grid hash in pvp component yet,
            // or let renderer handle caching (it has internal cache).
            // But renderer cache depends on "lastCols" etc.
            drawGrid(ctx, grid as ('blue' | 'red')[][], grid.length, grid[0].length);
        }

        // 3. Draw Projectiles
        // Map SyncedProjectile to Projectile compatible object
        // Synced: { id, x, y, vx, vy, team, type }
        // Renderer: { x, y, team, type, ... }
        const renderProjectiles: Projectile[] = projectiles.map(p => ({
            ...p,
            active: true,
            lifetime: 1.0, // Default lifetime for rendering
        }));
        drawProjectiles(ctx, renderProjectiles);

        // 4. Draw Particles (Visual Effects)
        if (particles && particles.length > 0) {
            // Map SyncedParticle to Particle
            const renderParticles: Particle[] = particles.map(p => ({
                ...p,
                glow: p.glow || false,
            }));
            drawParticles(ctx, renderParticles);
        }

        // 5. Draw Territory Batches (Visual Effects)
        if (territoryBatches && territoryBatches.length > 0) {
            // Map SyncedTerritoryBatch to TerritoryBatch
            const renderTerritoryBatches: TerritoryBatch[] = territoryBatches.map(tb => ({
                ...tb,
                color: tb.color,
                opacity: tb.opacity,
            }));
            drawTerritoryBatches(ctx, renderTerritoryBatches);
        }

        // 6. Draw Screen Flash (Visual Effects)
        if (screenFlash && screenFlash > 0) {
            drawScreenFlash(ctx, screenFlash, GAME_WIDTH, GAME_HEIGHT);
        }

        // 7. Draw Golden Pixel
        if (gameState.goldenPixel) {
            drawGoldenPixel(ctx, gameState.goldenPixel);
        }

        // 8. Draw Cannons
        // Client-side prediction: Override angle for my cannon
        const p1Angle = myTeam === 'blue' && localAngle !== null ? localAngle : player1.angle;
        const p2Angle = myTeam === 'red' && localAngle !== null ? localAngle : player2.angle;

        const p1Cannon: Cannon = {
            ...player1,
            angle: p1Angle,
            cooldown: 0,
            powerups: { shield: 0 },
            isFrenzy: false,
            frenzyEndTime: 0,
            lastFireTime: 0,
            maxInk: INK_MAX,
        };
        const p2Cannon: Cannon = {
            ...player2,
            angle: p2Angle,
            cooldown: 0,
            powerups: { shield: 0 },
            isFrenzy: false,
            frenzyEndTime: 0,
            lastFireTime: 0,
            maxInk: INK_MAX,
        };

        drawCannon(ctx, p1Cannon, COLORS.bulletStrokeBlue, true); // Player 1 is Blue (server-side constant)
        drawCannon(ctx, p2Cannon, COLORS.bulletStrokeRed, false); // Player 2 is Red

        // Restore context (remove flip)
        ctx.restore();

    }, [gameState, isFlipped]);

    // Animation loop uses draw...
    useEffect(() => {
        let animationId: number;
        const loop = () => {
            draw();
            animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationId);
    }, [draw]);

    // Input handling ...
    const handleInput = useCallback((e: React.MouseEvent | React.TouchEvent, isDown: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0]?.clientX ?? 0;
            clientY = e.touches[0]?.clientY ?? 0;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        let cx = (clientX - rect.left) * scaleX;
        let cy = (clientY - rect.top) * scaleY;

        // Flip coordinates for red team input
        if (isFlipped) {
            cx = GAME_WIDTH - cx;
            cy = GAME_HEIGHT - cy;
        }

        // Get my cannon position
        const myCannon = myTeam === 'blue'
            ? (gameState?.player1 ?? { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 40 })
            : (gameState?.player2 ?? { x: GAME_WIDTH / 2, y: 40 });

        const dx = cx - myCannon.x;
        const dy = cy - myCannon.y;
        const angle = Math.atan2(dy, dx);

        // Save angle for use in mouseUp/Leave events
        lastAngleRef.current = angle;

        onPlayerInput(angle, isDown, { x: cx, y: cy });
    }, [gameState, myTeam, isFlipped, onPlayerInput]);

    return (
        <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            style={{
                touchAction: 'none',
                width: '100%',
                maxWidth: '420px', // Match standard game width constraint
                display: 'block',
                margin: '0 auto',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            onMouseDown={(e) => handleInput(e, true)}
            onMouseMove={(e) => {
                const isFiring = e.buttons === 1;
                handleInput(e, isFiring);
            }}
            onMouseUp={() => onPlayerInput(lastAngleRef.current, false, undefined)}
            onMouseLeave={() => onPlayerInput(lastAngleRef.current, false, undefined)}
            onTouchStart={(e) => { e.preventDefault(); handleInput(e, true); }}
            onTouchMove={(e) => { e.preventDefault(); handleInput(e, true); }}
            onTouchEnd={() => onPlayerInput(lastAngleRef.current, false, undefined)}
        />
    );
}
