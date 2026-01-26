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
        let tileWidth = 80; // Larger tiles = fewer cells to draw (Optimization)
        let tileHeight = 40; // Isometric 2:1 ratio
        let spreadChance = 10;
        let spreadCount = 20;
        let blockHeight = 12; // Responsive
        let zAmplitude = 8;   // Responsive
        let waveFrequency = 0.2; // Responsive
        let waveSpeed = 0.05;    // Responsive
        let mouseForce = 0.3;    // Responsive

        // Sprite Cache
        const sprites: Record<number, HTMLCanvasElement> = {};

        // Grid Data
        let gridState: number[][] = [];

        // Helper to create a sprite for a specific block type
        const createSprite = (type: number, tw: number, th: number, bh: number) => {
            const buffer = document.createElement('canvas');
            // Size needs to cover the block: tileWidth x (tileHeight + blockHeight)
            // Add some padding to avoid clipping
            const w = tw;
            const h = th + bh;

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
            const x = w / 2;

            // Colors based on reference image
            let top, right, left;
            if (type === 1) { // Dark Burgundy Tile
                top = '#7d2e40'; // Darker top
                right = '#5c1a26';
                left = '#6b2030';
            } else if (type === 2) { // Light Pink Tile
                top = '#eebbc3';
                right = '#d9acb5';
                left = '#e6b3bc';
            } else { // Neutral Base Pink
                top = '#fa8fa5'; // Vibrant Pink base
                right = '#d66d82'; // Shadow side
                left = '#e87a91';
            }

            bCtx.lineWidth = 0.5; // Thinner lines or no lines
            bCtx.lineJoin = 'round';

            // Top Face (Diamond)
            bCtx.beginPath();
            bCtx.moveTo(x, 0); // Top vertex
            bCtx.lineTo(x + tw / 2, th / 2);
            bCtx.lineTo(x, th);
            bCtx.lineTo(x - tw / 2, th / 2);
            bCtx.closePath();
            bCtx.fillStyle = top;
            bCtx.fill();

            // Right Face
            bCtx.beginPath();
            bCtx.moveTo(x + tw / 2, th / 2);
            bCtx.lineTo(x, th);
            bCtx.lineTo(x, th + bh);
            bCtx.lineTo(x + tw / 2, th / 2 + bh);
            bCtx.closePath();
            bCtx.fillStyle = right;
            bCtx.fill();

            // Left Face
            bCtx.beginPath();
            bCtx.moveTo(x - tw / 2, th / 2);
            bCtx.lineTo(x, th);
            bCtx.lineTo(x, th + bh);
            bCtx.lineTo(x - tw / 2, th / 2 + bh);
            bCtx.closePath();
            bCtx.fillStyle = left;
            bCtx.fill();

            return buffer;
        };

        const initGrid = () => {
            width = window.innerWidth;
            height = window.innerHeight;

            // Handle High DPI displays - Capped at 1x for performance (Aggressive)
            const dpr = Math.min(window.devicePixelRatio || 1, 1);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.resetTransform();
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            // --- RESPONSIVE LOGIC ---
            if (width < 350) {
                // Extra Small Mobile (< 350px)
                tileWidth = 30;    // Much smaller (was 40)
                tileHeight = 15;   // Isometric ratio
                spreadChance = 5;  // Faster color updates (was 30)
                spreadCount = 50;  // More concurrent updates (was 5)
                blockHeight = 6;
                zAmplitude = 6;
                waveFrequency = 0.2; // Higher frequency for density
                waveSpeed = 0.08;  // Very active speed
                mouseForce = 0;
            } else if (width < 500) {
                // Small Mobile (< 500px)
                tileWidth = 30;    // Much smaller (was 50)
                tileHeight = 15;
                spreadChance = 5;  // Faster
                spreadCount = 50;  // More updates
                blockHeight = 6;
                zAmplitude = 6;
                waveFrequency = 0.2;
                waveSpeed = 0.08;
                mouseForce = 0;
            } else if (width < 768) {
                // Standard Mobile (< 768px)
                tileWidth = 60;
                tileHeight = 30;
                spreadChance = 20;
                blockHeight = 8;
                zAmplitude = 5;
                waveFrequency = 0.15;
                waveSpeed = 0.05;
                mouseForce = 0;    // No interaction
            } else if (width < 1200) {
                // Tablet / Small Laptop (< 1200px)
                tileWidth = 70;
                tileHeight = 35;
                spreadChance = 15;
                spreadCount = 15;
                blockHeight = 10;
                zAmplitude = 5;
                waveFrequency = 0.18;
                waveSpeed = 0.04;
                mouseForce = 0; // Decide: No interaction on tablet too? Let's say yes for uniformity on touch.
            } else {
                // DESKTOP (>= 1200px) - Preserve Original High Fidelity
                tileWidth = 80;
                tileHeight = 40;
                spreadChance = 10;
                spreadCount = 20;
                blockHeight = 12; // Match original commit (was 16)
                zAmplitude = 8;   // Restored Wave
                waveFrequency = 0.2; // Restored Frequency
                waveSpeed = 0.05;    // Restored Speed
                mouseForce = 0.3;    // Active interaction
            }

            // Prepare Sprites (regenerate in case dpr changed)
            sprites[0] = createSprite(0, tileWidth, tileHeight, blockHeight);
            sprites[1] = createSprite(1, tileWidth, tileHeight, blockHeight);
            sprites[2] = createSprite(2, tileWidth, tileHeight, blockHeight);

            // Calculate Rows/Cols
            // CRITICAL FIX: On mobile (tall screens), cols must be enough to reach the bottom (since y depends on c+r).
            // Using just width for cols calculation is insufficient when height >> width.
            // We use the larger dimension to ensure the diamond grid covers the rectangular viewport.
            const maxDim = Math.max(width, height);
            cols = Math.ceil(maxDim / tileWidth) * 2 + 10;
            rows = Math.ceil(maxDim / tileHeight) * 2 + 10;

            // Initialize Grid State
            gridState = new Array(rows).fill(0).map(() => new Array(cols).fill(0).map(() => {
                const rand = Math.random();
                if (rand > 0.9) return 1; // Sparse Faction A
                if (rand > 0.8) return 2; // Sparse Faction B
                return 0; // Mostly Neutral
            }));

            // Pre-calculate render coordinates
            cells = [];

            // Adjust start position to ensure center alignment
            // Isometric center (c=0, r=0) is usually at (startX, startY).
            // But we want the center of the grid (c=cols/2, r=rows/2) to be at screen center (width/2, height/2).
            const startX = width / 2;
            const startY = height / 4; // Shift up slightly to cover top
            // Actually, let's keep the existing logic but ensure the grid is large enough.
            // Original: startX = width/2, startY = -height/2.
            // With much larger cols/rows, we need to recenter.

            // Re-evaluating center:
            // Center of grid indices:
            const centerC = cols / 2;
            const centerR = rows / 2;

            // We want the pixel position of (centerC, centerR) to be at (width/2, height/2).
            // px = (c - r) * tw / 2 + offsetX
            // py = (c + r) * th / 2 + offsetY
            // 
            // width/2 = (centerC - centerR) * tw/2 + offsetX
            // height/2 = (centerC + centerR) * th/2 + offsetY

            // If cols approx rows, centerC - centerR approx 0.
            // offsetX = width/2.
            // height/2 = (rows) * th/2 + offsetY -> offsetY = height/2 - rows * th/2.

            // With calculated cols/rows based on maxDim, rows * th/2 will be approx maxDim.
            // offsetY = height/2 - maxDim.
            // This is significantly different from -height/2 if maxDim >> height.
            // Let's use this centering logic for robustness.

            const offsetX = width / 2 - (centerC - centerR) * tileWidth / 2;
            const offsetY = height / 2 - (centerC + centerR) * tileHeight / 2;

            const margin = 200; // Increased margin

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = (c - r) * tileWidth / 2 + offsetX;
                    const cy = (c + r) * tileHeight / 2 + offsetY;

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
            if (tick % spreadChance === 0) {
                // Optimization: Only try spreadCount random spread attempts per frame
                for (let i = 0; i < spreadCount; i++) {
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
            const spriteH = tileHeight + blockHeight; // Dynamic height
            // Since sprite is high-res (dpr scaled), using it in drawImage with W/H will auto-scale?
            // If ctx is scaled by 2, and we draw a 100px image at 0,0 with width 50:
            // It draws 50 logic pixels = 100 physical pixels. Image is 100px. So 1:1 mapping. Perfect.

            for (let i = 0; i < len; i++) {
                const cell = cells[i];
                if (!cell) continue;

                const row = gridState[cell.r];
                if (!row) continue;
                const type = row[cell.c];

                // Animate Z - Responsive Amplitude & Frequency
                // Use pre-calced dist
                // Original Desktop: dist * 0.2 - tick * 0.05
                // Modified Mobile: dist * 0.1 - tick * 0.02
                let z = Math.sin(cell.dist * waveFrequency - tick * waveSpeed) * zAmplitude;

                // Mouse interaction - Optimized distance check
                const dx = cell.x - mouseX;
                // y center adjustment
                const dy = (cell.y + 15) - mouseY;
                const mouseDistSq = dx * dx + dy * dy;

                if (mouseDistSq < 14400 && mouseForce > 0) { // Check mouseForce
                    // Sqrt is expensive but needed here for linear falloff
                    // Could approximate or just accept it for mouse cursor area only
                    const mouseDist = Math.sqrt(mouseDistSq);
                    z += (120 - mouseDist) * mouseForce; // Use dynamic force
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
