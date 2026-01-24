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
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        // Handle High DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Grid Settings
        const tileWidth = 60;
        const tileHeight = 30; // Isometric 2:1 ratio

        // Calculate Rows/Cols to cover screen + buffer
        const cols = Math.ceil(width / tileWidth) * 2 + 10;
        const rows = Math.ceil(height / tileHeight) * 2 + 10;

        // Grid State: 0 = Neutral, 1 = Faction A (Dark), 2 = Faction B (Light)
        // Initial random distribution centered
        const grid = new Array(rows).fill(0).map(() => new Array(cols).fill(0).map(() => {
            const rand = Math.random();
            if (rand > 0.9) return 1; // Sparse Faction A
            if (rand > 0.8) return 2; // Sparse Faction B
            return 0; // Mostly Neutral
        }));

        let tick = 0;
        let mouseX = width / 2;
        let mouseY = height / 2;
        let animationFrameId: number;

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
                left = THEME.primaryDark; // Slightly darker for depth
            }

            // Height of the block extrusion
            const blockHeight = 12;

            ctx.lineWidth = 1;
            ctx.lineJoin = 'round';

            // Calculate Vertices
            const topY = y - zOffset;

            // Top Face (Diamond)
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x + tileWidth / 2, topY + tileHeight / 2);
            ctx.lineTo(x, topY + tileHeight);
            ctx.lineTo(x - tileWidth / 2, topY + tileHeight / 2);
            ctx.closePath();
            ctx.fillStyle = top;
            ctx.fill();

            // Subtle border for grid definition
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.stroke();

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

            // Isometric Transformation Center
            const startX = width / 2;
            const startY = -height / 2; // Start high to fill down

            for (let r = 0; r < rows; r++) {
                const row = grid[r];
                if (!row) continue;

                for (let c = 0; c < cols; c++) {
                    // Convert Grid(r,c) to Screen(x,y)
                    const cx = (c - r) * tileWidth / 2 + startX;
                    const cy = (c + r) * tileHeight / 2 + startY;

                    // Optimization: Check bounds
                    // Expand bounds slightly to account for tile size and wave height
                    const margin = 100;
                    if (cx < -margin || cx > width + margin || cy < -margin || cy > height + margin) {
                        continue;
                    }

                    // Dynamic Logic: "Conquer" neighbors randomly
                    if (tick % 10 === 0 && Math.random() > 0.999) {
                        const type = row[c];
                        if (type !== undefined && type !== 0) {
                            // Try to spread to a random neighbor
                            const dr = Math.floor(Math.random() * 3) - 1;
                            const dc = Math.floor(Math.random() * 3) - 1;
                            const nr = r + dr;
                            const nc = c + dc;

                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                                const neighborRow = grid[nr];
                                if (neighborRow) {
                                    neighborRow[nc] = type;
                                }
                            }
                        }
                    }

                    // Animation: Wave height
                    // Dist from center for wave
                    const dist = Math.sqrt((r - rows / 2) ** 2 + (c - cols / 2) ** 2);
                    let z = Math.sin(dist * 0.2 - tick * 0.05) * 8; // Gentle breathing wave

                    // Mouse Interaction: Lift tiles near cursor
                    // Approx screen pos check
                    const dx = cx - mouseX;
                    const dy = (cy + tileHeight / 2) - mouseY;
                    const mouseDist = Math.sqrt(dx * dx + dy * dy);

                    if (mouseDist < 120) {
                        z += (120 - mouseDist) * 0.3; // Lift up
                    }

                    const tileType = row[c];
                    if (tileType !== undefined) {
                        drawBlock(cx, cy, tileType, z);
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
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
