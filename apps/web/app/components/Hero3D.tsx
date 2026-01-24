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
        let cells: { r: number; c: number; x: number; y: number; type: number }[] = [];
        let rows = 0;
        let cols = 0;

        // Grid Settings
        const tileWidth = 60;
        const tileHeight = 30; // Isometric 2:1 ratio

        // Grid Data
        let gridState: number[][] = [];

        const initGrid = () => {
            // Handle High DPI displays - Capped at 2x for performance
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

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
                        cells.push({ r, c, x: cx, y: cy, type: 0 });
                    }
                }
            }
        };

        // Initialize
        initGrid();

        let tick = 0;
        let mouseX = width / 2;
        let mouseY = height / 2;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const drawBlock = (x: number, y: number, type: number, zOffset: number) => {
            // Define colors based on Type (Faction)
            let top, right, left;

            if (type === 1) { // Faction A (Dark/Red - The Aggressor)
                top = THEME.primaryDarker;
                right = '#5c1a26';
                left = THEME.primaryDark;
            } else if (type === 2) { // Faction B (Light/White - The Defender)
                top = '#ffffff';
                right = THEME.primaryLight;
                left = '#ffe4e6';
            } else { // Neutral (Base Terrain)
                top = THEME.primary;
                right = THEME.primaryDark;
                left = THEME.primaryDark;
            }

            const blockHeight = 12;
            const topY = y - zOffset;

            ctx.lineWidth = 1;
            ctx.lineJoin = 'round';

            // Top Face (Diamond)
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x + tileWidth / 2, topY + tileHeight / 2);
            ctx.lineTo(x, topY + tileHeight);
            ctx.lineTo(x - tileWidth / 2, topY + tileHeight / 2);
            ctx.closePath();
            ctx.fillStyle = top;
            ctx.fill();

            // Right Face
            ctx.beginPath();
            ctx.moveTo(x + tileWidth / 2, topY + tileHeight / 2);
            ctx.lineTo(x, topY + tileHeight);
            ctx.lineTo(x, topY + tileHeight + blockHeight);
            ctx.lineTo(x + tileWidth / 2, topY + tileHeight / 2 + blockHeight);
            ctx.closePath();
            ctx.fillStyle = right;
            ctx.fill();

            // Left Face
            ctx.beginPath();
            ctx.moveTo(x - tileWidth / 2, topY + tileHeight / 2);
            ctx.lineTo(x, topY + tileHeight);
            ctx.lineTo(x, topY + tileHeight + blockHeight);
            ctx.lineTo(x - tileWidth / 2, topY + tileHeight / 2 + blockHeight);
            ctx.closePath();
            ctx.fillStyle = left;
            ctx.fill();
        };

        const animate = () => {
            // Background clear
            ctx.fillStyle = THEME.bg;
            ctx.fillRect(0, 0, width, height);

            tick++;

            // Logic Update (Spread) - Reduced frequency
            if (tick % 10 === 0) {
                // Optimization: Only try 50 random spread attempts per frame instead of full scan
                // This keeps the "alive" feel without the O(N) cost every 10 frames
                for (let i = 0; i < 50; i++) {
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

            // Draw Loop - Iterate only pre-calced visible cells
            const len = cells.length;
            for (let i = 0; i < len; i++) {
                const cell = cells[i];
                if (!cell) continue;

                const row = gridState[cell.r];
                if (!row) continue;
                const type = row[cell.c];

                // Animate Z
                // We stored r/c, so we can recompute dist efficiently
                const dr = cell.r - rows / 2;
                const dc = cell.c - cols / 2;
                const dist = Math.sqrt(dr * dr + dc * dc);

                let z = Math.sin(dist * 0.2 - tick * 0.05) * 8;

                // Mouse interaction - Optimized distance check
                const dx = cell.x - mouseX;
                // y center adjustment
                const dy = (cell.y + 15) - mouseY;
                const mouseDistSq = dx * dx + dy * dy;

                if (mouseDistSq < 14400) { // 120^2
                    const mouseDist = Math.sqrt(mouseDistSq);
                    z += (120 - mouseDist) * 0.3;
                }

                if (type !== undefined) {
                    drawBlock(cell.x, cell.y, type, z);
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

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
