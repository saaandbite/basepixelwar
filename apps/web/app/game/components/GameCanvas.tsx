'use client';

// Game Canvas Component

import { useRef, useEffect, useCallback } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { COLORS } from '../lib/constants';
import {
    drawBackground,
    drawGrid,
    drawTerritoryBatches,
    drawPowerups,
    drawProjectiles,
    drawParticles,
    drawCannon,
    drawTrajectory,
    drawScreenFlash,

    drawGoldenPixel,
    drawFrenzyOverlay,
    drawGlobalShieldOverlay,
} from '../lib/renderer';
import type { GameState } from '../types';

interface GameCanvasProps {
    state: GameState;
    onResize: (width: number, height: number) => void;
    onPlayerInput: (angle: number, isFiring: boolean, isDown: boolean) => void;
    onUpdate: () => void;
}

export function GameCanvas({ state, onResize, onPlayerInput, onUpdate }: GameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Canvas resize handler
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current && effectsCanvasRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                canvasRef.current.width = rect.width;
                canvasRef.current.height = rect.height;
                effectsCanvasRef.current.width = rect.width;
                effectsCanvasRef.current.height = rect.height;
                onResize(rect.width, rect.height);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [onResize]);

    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const effectsCanvas = effectsCanvasRef.current;
        if (!canvas || !effectsCanvas) return;

        const ctx = canvas.getContext('2d');
        const effectsCtx = effectsCanvas.getContext('2d');
        if (!ctx || !effectsCtx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear and draw background
        drawBackground(ctx, width, height);

        // Apply screen shake transform
        ctx.save();
        if (state.shakeIntensity > 0) {
            ctx.translate(state.shakeDirection.x, state.shakeDirection.y);
        }

        // Draw grid
        if (state.cols && state.rows) {
            drawGrid(ctx, state.grid, state.cols, state.rows);
        }

        // Draw trajectory (player only)
        if (!state.isPaused && state.gameActive) {
            drawTrajectory(ctx, state.player, width, height);
        }

        // Draw territory batches
        drawTerritoryBatches(ctx, state.territoryBatches);

        // Draw Global Shield Overlay if active
        if (state.globalShield && state.globalShield.active && state.globalShield.team === 'blue') {
            drawGlobalShieldOverlay(effectsCtx, width, height);
        }

        // RED Team Global Shield? (Currently visuals are green for 'active' defense)
        if (state.globalShield && state.globalShield.active && state.globalShield.team === 'red') {
            // Maybe add a red tinted overlay for enemy shield?
            // For now, let's just show the same overlay but maybe rely on the text
            drawGlobalShieldOverlay(effectsCtx, width, height);
        }

        // Draw Golden Pixel (secondary objective)
        if (state.goldenPixel && state.goldenPixel.active) {
            drawGoldenPixel(ctx, state.goldenPixel);
        }

        // Draw powerups
        drawPowerups(ctx, state.powerups);

        // Draw projectiles
        drawProjectiles(ctx, state.projectiles);

        // Draw particles
        drawParticles(ctx, state.particles);

        // Draw cannons
        if (state.cols) {
            drawCannon(ctx, state.player, COLORS.bulletStrokeBlue, true);
            drawCannon(ctx, state.enemy, COLORS.bulletStrokeRed, false);
        }

        // Restore from shake
        ctx.restore();

        // Draw effects overlay
        effectsCtx.clearRect(0, 0, width, height);
        drawScreenFlash(effectsCtx, state.screenFlash, width, height);

        // Draw frenzy mode overlay
        if (state.player.isFrenzy) {
            drawFrenzyOverlay(effectsCtx, width, height, 1);
        }
    }, [state]);

    // Game loop
    useGameLoop(
        useCallback(() => {
            onUpdate();
            draw();
        }, [onUpdate, draw]),
        state.gameActive && !state.isPaused
    );

    // Initial draw for non-active state
    useEffect(() => {
        if (!state.gameActive) {
            draw();
        }
    }, [state.gameActive, draw]);

    // Input handlers
    const handleInput = useCallback(
        (clientX: number, clientY: number, isDown: boolean) => {
            if (!state.gameActive || state.isPaused) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const cx = clientX - rect.left;
            const cy = clientY - rect.top;

            // Prevent shooting into UI areas
            if (cy < 60 || cy > canvas.height - 60) return;

            const dx = cx - state.player.x;
            const dy = cy - state.player.y;
            // const dist = Math.hypot(dx, dy);

            // Calculate angle
            let angle = Math.atan2(dy, dx);

            // Clamp angle (prevent shooting backwards)
            if (angle > 0) angle = angle > Math.PI / 2 ? -Math.PI + 0.2 : 0.2;
            if (angle < -Math.PI) angle = -Math.PI + 0.2;


            onPlayerInput(angle, isDown, isDown);
        },
        [state.gameActive, state.isPaused, state.player.x, state.player.y, onPlayerInput]
    );

    // Mouse events
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            handleInput(e.clientX, e.clientY, true);
            e.preventDefault();
        },
        [handleInput]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (e.buttons === 1) {
                handleInput(e.clientX, e.clientY, true);
            } else if (state.player.isFiring) {
                onPlayerInput(state.player.angle, false, false);
            }
            e.preventDefault();
        },
        [handleInput, state.player.isFiring, state.player.angle, onPlayerInput]
    );

    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            onPlayerInput(state.player.angle, false, false);
            e.preventDefault();
        },
        [state.player.angle, onPlayerInput]
    );

    const handleMouseLeave = useCallback(() => {
        if (state.player.isFiring) {
            onPlayerInput(state.player.angle, false, false);
        }
    }, [state.player.isFiring, state.player.angle, onPlayerInput]);

    // Touch events
    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) {
                handleInput(touch.clientX, touch.clientY, true);
            }
        },
        [handleInput]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) {
                handleInput(touch.clientX, touch.clientY, true);
            }
        },
        [handleInput]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            onPlayerInput(state.player.angle, false, false);
        },
        [state.player.angle, onPlayerInput]
    );

    return (
        <div
            ref={containerRef}
            className="relative flex-grow bg-gradient-to-b from-slate-100 to-slate-200 w-full overflow-hidden"
        >
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{ touchAction: 'none' }}
            />
            <canvas ref={effectsCanvasRef} id="effectsOverlay" />
        </div>
    );
}
