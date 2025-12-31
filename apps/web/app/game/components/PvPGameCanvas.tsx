'use client';

// PvPGameCanvas.tsx
// Simplified canvas that renders server-synced game state

import { useRef, useEffect, useCallback } from 'react';
import { GAME_WIDTH, GAME_HEIGHT, GRID_SIZE, COLORS } from '../lib/constants';
import type { SyncedGameState } from '@repo/shared/multiplayer';

interface PvPGameCanvasProps {
    gameState: SyncedGameState | null;
    myTeam: 'blue' | 'red';
    onPlayerInput: (angle: number, firing: boolean) => void;
}

export function PvPGameCanvas({ gameState, myTeam, onPlayerInput }: PvPGameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isFlipped = myTeam === 'red';

    // Draw function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gameState) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { grid, player1, player2, projectiles } = gameState;

        // Clear
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Apply flip transform for red team
        if (isFlipped) {
            ctx.save();
            ctx.translate(GAME_WIDTH, GAME_HEIGHT);
            ctx.rotate(Math.PI);
        }

        // Draw grid
        if (grid && grid.length > 0) {
            for (let x = 0; x < grid.length; x++) {
                const col = grid[x];
                if (!col) continue;
                for (let y = 0; y < col.length; y++) {
                    const color = col[y] === 'blue' ? COLORS.blue : COLORS.red;
                    ctx.fillStyle = color;
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }

        // Draw projectiles
        for (const p of projectiles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = p.team === 'blue' ? COLORS.bulletStrokeBlue : COLORS.bulletStrokeRed;
            ctx.fill();
        }

        // Draw cannons
        drawCannon(ctx, player1, COLORS.bulletStrokeBlue, true);
        drawCannon(ctx, player2, COLORS.bulletStrokeRed, false);

        if (isFlipped) {
            ctx.restore();
        }
    }, [gameState, isFlipped]);

    // Draw cannon helper
    function drawCannon(
        ctx: CanvasRenderingContext2D,
        cannon: { x: number; y: number; angle: number },
        color: string,
        isBottom: boolean
    ) {
        ctx.save();
        ctx.translate(cannon.x, cannon.y);
        ctx.rotate(cannon.angle);

        // Barrel
        ctx.fillStyle = color;
        ctx.fillRect(0, -6, 30, 12);

        // Base
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = isBottom ? '#3b82f6' : '#ef4444';
        ctx.fill();

        ctx.restore();
    }

    // Animation loop
    useEffect(() => {
        let animationId: number;

        const loop = () => {
            draw();
            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationId);
    }, [draw]);

    // Input handling
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

        // Flip coordinates for red team
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

        onPlayerInput(angle, isDown);
    }, [gameState, myTeam, isFlipped, onPlayerInput]);

    return (
        <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            style={{ touchAction: 'none', width: '100%', maxWidth: GAME_WIDTH }}
            onMouseDown={(e) => handleInput(e, true)}
            onMouseMove={(e) => e.buttons === 1 && handleInput(e, true)}
            onMouseUp={() => onPlayerInput(0, false)}
            onMouseLeave={() => onPlayerInput(0, false)}
            onTouchStart={(e) => { e.preventDefault(); handleInput(e, true); }}
            onTouchMove={(e) => { e.preventDefault(); handleInput(e, true); }}
            onTouchEnd={() => onPlayerInput(0, false)}
        />
    );
}
