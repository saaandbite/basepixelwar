"use client";

import React, { useEffect, useRef } from 'react';

// --- Colors & Theme ---
const THEME = {
    primary: '#ff8ba7',
    primaryLight: '#ffc6c7',
    primaryLighter: '#ffe4e6',
    primaryDark: '#c44569',
    primaryDarker: '#903749',
    bg: '#ff8ba7',
    fg: '#FFFFFF',
};

// Types for pre-calculated data
interface Cell {
    r: number;
    c: number;
    x: number; // grid x center
    y: number; // grid y center
    dist: number; // distance from center (pre-calced)
    type: number;
}

export default function Hero3D() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let animationFrameId: number;
        let cells: Cell[] = [];
        let rows = 0;
        let cols = 0;

        // Grid Settings
        const tileWidth = 80; // Larger tiles = fewer cells to draw (Optimization)
        const tileHeight = 40; // Isometric 2:1 ratio

        // Sprite Cache
        const sprites: Record<number, HTMLCanvasElement> = {};

        // Grid Data
        let gridState: number[][] = [];

        // Helper to create a sprite for a specific block type
        const createSprite = (type: number) => {
            const buffer = document.createElement('canvas');
            // Size needs to cover the block: tileWidth x (tileHeight + blockHeight)
            // Add some padding to avoid clipping
            const blockHeight = 12;
            const w = tileWidth;
            const h = tileHeight + blockHeight;

            // buffer size might need to be slightly larger or scaled?
            // Actually, for simplicity, let's keep it exact match to draw logic,
            // but we need to account for dpr in the main loop, so here we assume 1x logical size
            // and we will scale drawing if needed, OR we can pre-scale sprites.
            // Let's pre-scale sprites by DPR for crispness.
            const dpr = Math.min(window.devicePixelRatio || 1, 1); // Cap at 1x for performance (Aggressive)
            buffer.width = w * dpr;
            buffer.height = h * dpr;

            const bCtx = buffer.getContext('2d');
            if (!bCtx) return buffer;

            bCtx.scale(dpr, dpr);

            // Draw logic ported from original drawBlock
            // Note: coordinates 0,0 is top-left.
            // The diamond top needs to be centered.
            // In drawBlock originally: (x, y) was center.
            // Here, let's draw at relative coordinates.
            // Top point of diamond: (w/2, 0)
            const x = w / 2;
            const y = 0; // The actual "y" center in world space corresponds to tileHeight/2 down.
            // But we want to draw the whole block starting from 0.
            // Let's align it so the top diamond's top vertex is at 0 y-offset relative to drawing.
            // In original code: topY = y - zOffset.
            // Here we are baking the static shape (zOffset handled by drawImage dy).

            // Colors
            let top, right, left;
            if (type === 1) { // Faction A
                top = THEME.primaryDarker;
                right = '#5c1a26';
                left = THEME.primaryDark;
            } else if (type === 2) { // Faction B
                top = '#d9acb5ff';
                right = THEME.primaryLight;
                left = '#eddce0ff';
            } else { // Neutral
                top = THEME.primary;
                right = THEME.primaryDark;
                left = THEME.primaryDark;
            }

            bCtx.lineWidth = 1;
            bCtx.lineJoin = 'round';

            // Top Face (Diamond)
            bCtx.beginPath();
            bCtx.moveTo(x, 0); // Top vertex
            bCtx.lineTo(x + tileWidth / 2, tileHeight / 2);
            bCtx.lineTo(x, tileHeight);
            bCtx.lineTo(x - tileWidth / 2, tileHeight / 2);
            bCtx.closePath();
            bCtx.fillStyle = top;
            bCtx.fill();

            // Right Face
            bCtx.beginPath();
            bCtx.moveTo(x + tileWidth / 2, tileHeight / 2);
            bCtx.lineTo(x, tileHeight);
            bCtx.lineTo(x, tileHeight + blockHeight);
            bCtx.lineTo(x + tileWidth / 2, tileHeight / 2 + blockHeight);
            bCtx.closePath();
            bCtx.fillStyle = right;
            bCtx.fill();

            // Left Face
            bCtx.beginPath();
            bCtx.moveTo(x - tileWidth / 2, tileHeight / 2);
            bCtx.lineTo(x, tileHeight);
            bCtx.lineTo(x, tileHeight + blockHeight);
            bCtx.lineTo(x - tileWidth / 2, tileHeight / 2 + blockHeight);
            bCtx.closePath();
            bCtx.fillStyle = left;
            bCtx.fill();

            return buffer;
        };

        const initGrid = () => {
            // Handle High DPI displays - Capped at 1x for performance (Aggressive)
            const dpr = Math.min(window.devicePixelRatio || 1, 1);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            // We do NOT scale the context here because we will use drawImage with pre-scaled sprites
            // Or we can scale context and draw low-res sprites.
            // Better strategy: Scale context so math is logical pixels, but sprites need to be correct.
            ctx.resetTransform(); // clear old transforms
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            // Prepare Sprites (regenerate in case dpr changed)
            sprites[0] = createSprite(0);
            sprites[1] = createSprite(1);
            sprites[2] = createSprite(2);

            // Calculate Rows/Cols
            cols = Math.ceil(width / tileWidth) * 2 + 10;
            rows = Math.ceil(height / tileHeight) * 2 + 10;

            // Initialize Grid State
            gridState = new Array(rows).fill(0).map(() => new Array(cols).fill(0).map(() => {
                const rand = Math.random();
                if (rand > 0.9) return 1; // Sparse Faction A
                if (rand > 0.8) return 2; // Sparse Faction B
                return 0; // Mostly Neutral
            }));

            // Pre-calculate render coordinates
            cells = [];
            const startX = width / 2;
            const startY = -height / 2;
            const margin = 100;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = (c - r) * tileWidth / 2 + startX;
                    const cy = (c + r) * tileHeight / 2 + startY;

                    // Bounds check optimization (static)
                    if (cx >= -margin && cx <= width + margin && cy >= -margin && cy <= height + margin) {
                        // Pre-calc distance for wave effect
                        const dr = r - rows / 2;
                        const dc = c - cols / 2;
                        const dist = Math.sqrt(dr * dr + dc * dc);

                        cells.push({ r, c, x: cx, y: cy, dist, type: 0 });
                    }
                }
            }
        };

        // Initialize
        initGrid();

        let tick = 0;
        let mouseX = width / 2;
        let mouseY = height / 2;
        let lastTime = 0; // For FPS capping

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const animate = (time: number) => {
            animationFrameId = requestAnimationFrame(animate);

            // Cap FPS at ~30 (33.33ms per frame)
            const delta = time - lastTime;
            if (delta < 33) return;
            lastTime = time;

            // Background clear
            ctx.fillStyle = THEME.bg;
            ctx.fillRect(0, 0, width, height);

            tick++;

            // Logic Update (Spread) - Reduced frequency
            if (tick % 10 === 0) {
                // Optimization: Only try 20 random spread attempts per frame
                for (let i = 0; i < 20; i++) {
                    if (cells.length > 0) {
                        const cell = cells[Math.floor(Math.random() * cells.length)];
                        if (!cell) continue;
                        const { r, c } = cell;

                        const row = gridState[r];
                        if (!row) continue;
                        const type = row[c];

                        if (type !== 0 && Math.random() > 0.5) {
                            const dr = Math.floor(Math.random() * 3) - 1;
                            const dc = Math.floor(Math.random() * 3) - 1;
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                                const targetRow = gridState[nr];
                                if (targetRow && typeof type === 'number') {
                                    targetRow[nc] = type;
                                }
                            }
                        }
                    }
                }
            }

            // Draw Loop
            const len = cells.length;
            const spriteW = tileWidth;
            const spriteH = tileHeight + 12; // + blockHeight
            // Since sprite is high-res (dpr scaled), using it in drawImage with W/H will auto-scale?
            // If ctx is scaled by DPR, and we drawImage a 2xDPR image into WxH box:
            // Standard canvas behavior: yes, it draws into the rect.
            // Wait, if ctx is scaled by 2, and we draw a 100px image at 0,0 with width 50:
            // It draws 50 logic pixels = 100 physical pixels. Image is 100px. So 1:1 mapping. Perfect.

            for (let i = 0; i < len; i++) {
                const cell = cells[i];
                if (!cell) continue;

                const row = gridState[cell.r];
                if (!row) continue;
                const type = row[cell.c];

                // Animate Z
                // Use pre-calced dist
                let z = Math.sin(cell.dist * 0.2 - tick * 0.05) * 8;

                // Mouse interaction - Optimized distance check
                const dx = cell.x - mouseX;
                // y center adjustment
                const dy = (cell.y + 15) - mouseY;
                const mouseDistSq = dx * dx + dy * dy;

                if (mouseDistSq < 14400) { // 120^2
                    // Sqrt is expensive but needed here for linear falloff
                    // Could approximate or just accept it for mouse cursor area only
                    const mouseDist = Math.sqrt(mouseDistSq);
                    z += (120 - mouseDist) * 0.3;
                }

                if (type !== undefined) {
                    const sprite = sprites[type];
                    if (sprite) {
                        // Position logic:
                        // cell.x is center X. cell.y is center Y.
                        // Sprite top-left relative to its "center" point defined in createSprite:
                        // The top diamond tip of sprite is at relative (w/2, 0)
                        // In world space, we want that top tip to be at (cell.x, cell.y - z)  <-- Wait
                        // Original drawBlock: moveTo(x, topY). topY = y - z.
                        // So top tip is at (x, y - z).
                        // So we place sprite such that its top-center (w/2, 0) aligns with (x, y-z).
                        // Sprite X draw pos = x - w/2
                        // Sprite Y draw pos = (y - z)
                        ctx.drawImage(sprite, cell.x - spriteW / 2, cell.y - z, spriteW, spriteH);
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate(0);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            initGrid();
        };

        let resizeTimeout: NodeJS.Timeout;
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 100);
        };
        window.addEventListener('resize', debouncedResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', debouncedResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
                className="absolute inset-0 z-0 pointer-events-none"
            />
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at center, transparent 0%, rgba(144, 55, 73, 0.2) 100%)',
                pointerEvents: 'none',
                zIndex: 1
            }} />
        </>
    );
}
