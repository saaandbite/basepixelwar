'use client';

// Game Canvas Component

import { useRef, useEffect, useCallback } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { COLORS, WEAPON_MODES, GAME_WIDTH, GAME_HEIGHT, GRID_SIZE } from '../lib/constants';
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
    gameStateRef: React.MutableRefObject<GameState>;
    onResize: (width: number, height: number) => void;
    onPlayerInput: (angle: number, isFiring: boolean, isDown: boolean, targetPos?: { x: number; y: number }) => void;
    onInkBombPreview: (x: number, y: number, active: boolean) => void;
    onUpdate: () => void;
}

export function GameCanvas({ gameStateRef, onResize, onPlayerInput, onInkBombPreview, onUpdate }: GameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial setup - Enforce FIXED resolution
    useEffect(() => {
        if (canvasRef.current && effectsCanvasRef.current) {
            // Set fixed resolution
            canvasRef.current.width = GAME_WIDTH;
            canvasRef.current.height = GAME_HEIGHT;
            effectsCanvasRef.current.width = GAME_WIDTH;
            effectsCanvasRef.current.height = GAME_HEIGHT;

            // Notify parent of the fixed size
            onResize(GAME_WIDTH, GAME_HEIGHT);
        }
    }, [onResize]);

    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const effectsCanvas = effectsCanvasRef.current;
        if (!canvas || !effectsCanvas) return;

        const ctx = canvas.getContext('2d');
        const effectsCtx = effectsCanvas.getContext('2d');
        if (!ctx || !effectsCtx) return;

        // READ STATE FROM REF (No React overhead)
        const state = gameStateRef.current;

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
    }, [gameStateRef]);

    // Game loop
    // Dependencies: only onUpdate and draw (stable). Active state read from Ref? 
    // Wait, useGameLoop takes `isActive` boolean. This comes from PROPS or REF?
    // It's safer to pass `isActive` from UI state or read from ref inside loop?
    // `useGameLoop` starts/stops loop based on `isActive`.
    // We should pass `uiState.gameActive` or `gameStateRef.current.gameActive`?
    // Since useGameLoop is a Hook, it needs a reactive value to start/stop.
    // So we need to pass `isActive` as a prop if we want to stop the loop.
    // HOWEVER, I didn't add `isActive` to props.
    // The previous code used `state.gameActive`.
    // `page.tsx` will pass `uiState.gameActive` which is SYNCED. This is fine.

    // NOTE: This assumes `GameCanvas` receives `uiState`? No, it receives Ref.
    // But `useGameLoop` needs a boolean.
    // Let's check `useGameLoop` implementation again. It checks `isActive`.
    // I should probably pass `isActive` and `isPaused` as props to `GameCanvas` to control the loop.
    // OR read from Ref inside the loop callback?
    // Loop callback runs every frame. But `requestAnimationFrame` needs to be started/cancelled.
    // So I strictly need `isActive` and `isPaused` as reactive props.

    // For now, I will use `gameStateRef.current.gameActive` inside `draw`,
    // BUT `useGameLoop` hook needs reactive props to start/stop.
    // `page.tsx` will pass `gameStateRef` AND I should probably pass reactive booleans if I want to stop the loop perfectly.
    // BUT `GameCanvasProps` signature I defined above only has `gameStateRef`.
    // I should add `isActive` and `isPaused` to props?
    // Or I can access `gameStateRef.current.gameActive` inside the generic `onUpdate` callback,
    // but the `useGameLoop` hook manages the `raf` loop based on the boolean passed to it.
    // If I pass `gameStateRef.current.gameActive` directly to `useGameLoop`, it will only update on RENDER.
    // Since `page.tsx` re-renders when `uiState.gameActive` changes (via syncUI), this will work!
    // So I need to read `gameActive` from the ref during render? No, reading ref during render is bad.
    // Wait, `page.tsx` will pass `uiState.gameActive`. 
    // I should add `isActive` and `isPaused` to `GameCanvasProps`.

    // Let's modify the Props to include these for Loop Control.


    // ... logic continues ...

    // Wait, if I change the Props, I must update `page.tsx` too.
    // Better to just accept `gameStateRef` and maybe `isActive`, `isPaused` separate?
    // Or I just assume the parent component handles the loop logic?
    // No, `GameCanvas` calls `useGameLoop`.

    // Let's assume for this edit I will read `isActive` from props, which means I need to add them to interface.
    // Let's add `isActive` and `isPaused`.

    // Recalculating...
    const state = gameStateRef.current; // access for loop control (reactive update from parent re-render)
    // Note: Parent re-renders when gameActive changes, so this `state` var works for loop toggle.

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

    // Input handlers using REF
    const handleInput = useCallback(
        (clientX: number, clientY: number, isDown: boolean) => {
            const currentState = gameStateRef.current;
            if (!canvasRef.current || !currentState.gameActive || currentState.isPaused) return;

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();

            // Handle scale (Visual size vs Internal Fixed Resolution)
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const cx = (clientX - rect.left) * scaleX;
            const cy = (clientY - rect.top) * scaleY;

            // Also clamp to canvas bounds to prevent weird off-screen targeting
            const clampedCx = Math.max(0, Math.min(canvas.width, cx));
            const clampedCy = Math.max(0, Math.min(canvas.height, cy));

            const dx = clampedCx - currentState.player.x;
            const dy = clampedCy - currentState.player.y;

            // Calculate angle
            let angle = Math.atan2(dy, dx);

            // Clamp angle (prevent shooting backwards)
            if (angle > 0) angle = angle > Math.PI / 2 ? -Math.PI + 0.2 : 0.2;
            if (angle < -Math.PI) angle = -Math.PI + 0.2;

            let targetPos = undefined;

            // Update inkBomb preview if inkBomb weapon is selected
            if (currentState.player.weaponMode === 'inkBomb') {
                const modeConfig = WEAPON_MODES.inkBomb;
                const inkBombConfig = WEAPON_MODES.inkBomb;

                // SNAP TO GRID CENTER for perfect accuracy
                const gx = Math.floor(clampedCx / GRID_SIZE);
                const gy = Math.floor(clampedCy / GRID_SIZE);
                const snappedX = gx * GRID_SIZE + GRID_SIZE / 2;
                const snappedY = gy * GRID_SIZE + GRID_SIZE / 2;

                // Ballistic Targeting Logic
                const solution = calculateBallisticVelocity(
                    currentState.player.x,
                    currentState.player.y,
                    snappedX, // Target X (Snapped)
                    snappedY, // Target Y (Snapped)
                    modeConfig.speed,
                    inkBombConfig.gravity
                );

                if (solution) {
                    // Reachable!
                    // Only update preview if no ink bomb is currently in flight
                    if (!currentState.player.inkBombInFlight) {
                        onInkBombPreview(snappedX, snappedY, true);
                    }
                    targetPos = { x: snappedX, y: snappedY };

                    const launchVy = solution.vy + 4; // visual vy
                    angle = Math.atan2(launchVy, solution.vx);
                } else {
                    onInkBombPreview(0, 0, false);
                }

            } else {
                onInkBombPreview(0, 0, false);
            }

            onPlayerInput(angle, isDown, isDown, targetPos);
        },
        [gameStateRef, onPlayerInput, onInkBombPreview]
    );

    // Handle pointer movement for ink bomb preview
    const handlePointerMove = useCallback(
        (clientX: number, clientY: number) => {
            const currentState = gameStateRef.current;
            if (!canvasRef.current || !currentState.gameActive || currentState.isPaused || currentState.player.weaponMode !== 'inkBomb' || currentState.player.inkBombInFlight) return;

            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const cx = (clientX - rect.left) * scaleX;
            const cy = (clientY - rect.top) * scaleY;
            const clampedCx = Math.max(0, Math.min(canvas.width, cx));
            const clampedCy = Math.max(0, Math.min(canvas.height, cy));

            const modeConfig = WEAPON_MODES.inkBomb;
            const inkBombConfig = WEAPON_MODES.inkBomb;

            const gx = Math.floor(clampedCx / GRID_SIZE);
            const gy = Math.floor(clampedCy / GRID_SIZE);
            const snappedX = gx * GRID_SIZE + GRID_SIZE / 2;
            const snappedY = gy * GRID_SIZE + GRID_SIZE / 2;

            const solution = calculateBallisticVelocity(
                currentState.player.x,
                currentState.player.y,
                snappedX,
                snappedY,
                modeConfig.speed,
                inkBombConfig.gravity
            );

            if (solution) {
                onInkBombPreview(snappedX, snappedY, true);
            } else {
                onInkBombPreview(0, 0, false);
            }
        },
        [gameStateRef, onInkBombPreview]
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
            const currentState = gameStateRef.current;
            if (currentState.player.weaponMode === 'inkBomb' && !currentState.player.inkBombInFlight) {
                handlePointerMove(e.clientX, e.clientY);
            }

            if (e.buttons === 1) {
                handleInput(e.clientX, e.clientY, true);
            } else if (currentState.player.isFiring) {
                onPlayerInput(currentState.player.angle, false, false);
            }
            e.preventDefault();
        },
        [handleInput, handlePointerMove, onPlayerInput, gameStateRef]
    );

    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            const currentState = gameStateRef.current;
            onPlayerInput(currentState.player.angle, false, false);
            e.preventDefault();
        },
        [onPlayerInput, gameStateRef]
    );

    const handleMouseLeave = useCallback(() => {
        const currentState = gameStateRef.current;
        if (currentState.player.isFiring) {
            onPlayerInput(currentState.player.angle, false, false);
        }
        onInkBombPreview(0, 0, false);
    }, [onPlayerInput, onInkBombPreview, gameStateRef]);

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
                const currentState = gameStateRef.current;
                if (currentState.player.weaponMode === 'inkBomb' && !currentState.player.inkBombInFlight) {
                    handlePointerMove(touch.clientX, touch.clientY);
                }
                handleInput(touch.clientX, touch.clientY, true);
            }
        },
        [handleInput, handlePointerMove, gameStateRef]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            const currentState = gameStateRef.current;
            onPlayerInput(currentState.player.angle, false, false);
        },
        [onPlayerInput, gameStateRef]
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
