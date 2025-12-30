'use client';

// Game Canvas Component

import { useRef, useEffect, useCallback } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { COLORS, WEAPON_MODES } from '../lib/constants';
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
    drawInkBombPreview,

    drawGoldenPixel,
    drawFrenzyOverlay,
    drawGlobalShieldOverlay,
} from '../lib/renderer';
import { calculateBallisticVelocity } from '../lib/gameLogic';
import type { GameState } from '../types';

interface GameCanvasProps {
    state: GameState;
    onResize: (width: number, height: number) => void;
    onPlayerInput: (angle: number, isFiring: boolean, isDown: boolean, targetPos?: { x: number; y: number }) => void;
    onInkBombPreview: (x: number, y: number, active: boolean) => void;
    onUpdate: () => void;
}

export function GameCanvas({ state, onResize, onPlayerInput, onInkBombPreview, onUpdate }: GameCanvasProps) {
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

        // Draw inkBomb preview if active
        if (state.player.weaponMode === 'inkBomb' && state.inkBombPreview) {
            drawInkBombPreview(ctx, state.inkBombPreview, WEAPON_MODES.inkBomb.paintRadius); // Using the inkBomb paint radius
        }

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
            if (!canvasRef.current || !state.gameActive || state.isPaused) return;

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();

            // Handle scale (in case canvas display size differs from internal resolution)
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const cx = (clientX - rect.left) * scaleX;
            const cy = (clientY - rect.top) * scaleY;

            // Also clamp to canvas bounds to prevent weird off-screen targeting
            const clampedCx = Math.max(0, Math.min(canvas.width, cx));
            const clampedCy = Math.max(0, Math.min(canvas.height, cy));

            const dx = clampedCx - state.player.x;
            const dy = clampedCy - state.player.y;
            // const dist = Math.hypot(dx, dy);

            // Calculate angle
            let angle = Math.atan2(dy, dx);

            // Clamp angle (prevent shooting backwards)
            if (angle > 0) angle = angle > Math.PI / 2 ? -Math.PI + 0.2 : 0.2;
            if (angle < -Math.PI) angle = -Math.PI + 0.2;

            let targetPos = undefined;

            // Update inkBomb preview if inkBomb weapon is selected
            if (state.player.weaponMode === 'inkBomb') {
                const modeConfig = WEAPON_MODES.inkBomb;
                const inkBombConfig = WEAPON_MODES.inkBomb; // Use specific config for gravity

                // Ballistic Targeting Logic
                // 1. Calculate trajectory to hit the cursor position
                const solution = calculateBallisticVelocity(
                    state.player.x,
                    state.player.y,
                    clampedCx, // Target X
                    clampedCy, // Target Y
                    modeConfig.speed,
                    inkBombConfig.gravity
                );

                if (solution) {
                    // Reachable!
                    onInkBombPreview(clampedCx, clampedCy, true);
                    targetPos = { x: clampedCx, y: clampedCy };

                    // We should update the visual angle of the cannon to match the launch angle
                    // The solution gives us vx, vy.
                    // The angle is atan2(vy, vx).
                    // HOWEVER, the `solution.vy` is the `initial_vy_required`.
                    // The cannon visual usually represents the "aim direction".
                    // In our physics abstraction (vy - 4), the "launch vector" is what matters.
                    // Let's use the velocity vector to set the angle.
                    const launchVy = solution.vy + 4; // visual vy (reverse of the -4 boost)
                    angle = Math.atan2(launchVy, solution.vx);
                } else {
                    // Not reachable (out of range)
                    // Show max range or hide? Let's hide for now or pin to max range.
                    // For 'Point and Click', if they click outside, it might be better to show nothing or red.
                    onInkBombPreview(0, 0, false);
                }

            } else {
                // Hide preview if not using inkBomb
                onInkBombPreview(0, 0, false);
            }

            onPlayerInput(angle, isDown, isDown, targetPos);
        },
        [state.gameActive, state.isPaused, state.player.x, state.player.y, state.player.weaponMode, onPlayerInput, onInkBombPreview]
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
        // Hide inkBomb preview when mouse leaves
        onInkBombPreview(0, 0, false);
    }, [state.player.isFiring, state.player.angle, onPlayerInput, onInkBombPreview]);

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
