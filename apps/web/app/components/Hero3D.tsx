"use client";

import React, { useEffect, useRef } from 'react';

// Theme Constants for Canvas Drawing
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

        // Cubes
        const cubes: { x: number; y: number; z: number; size: number; color: string; speed: number }[] = [];
        const colors = ['#6cb2eb', '#e74c3c', '#ffffff', '#6cb2eb', '#e74c3c']; // Blue & Red dominant

        for (let i = 0; i < 50; i++) {
            cubes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                z: Math.random() * 2 + 0.5, // Depth scale
                size: Math.random() * 20 + 10,
                color: colors[Math.floor(Math.random() * colors.length)] || '#ffffff',
                speed: Math.random() * 0.5 + 0.2
            });
        }

        let mouseX = width / 2;
        let mouseY = height / 2;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };
        window.addEventListener('mousemove', handleMouseMove);

        let animationFrameId: number;

        const animate = () => {
            if (!canvas || !ctx) return;

            // Clear with theme background
            // Clear canvas (transparent)
            ctx.clearRect(0, 0, width, height);

            // Draw Grid Floor (Pseudo 3D)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Slightly more visible grid on gradient
            ctx.lineWidth = 1;

            // Static grid lines
            const gridSize = 40;

            // Vertical lines
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Draw Pixel Art Circles (Coins/Balls)
            cubes.forEach((cube) => {
                // Parallax effect based on mouse
                const dx = (mouseX - width / 2) * 0.02 * cube.z;
                const dy = (mouseY - height / 2) * 0.02 * cube.z;

                cube.y -= cube.speed * cube.z;

                // Reset if off screen (top)
                if (cube.y < -cube.size * 2) {
                    cube.y = height + cube.size;
                    cube.x = Math.random() * width;
                }

                const renderX = cube.x + dx;
                const renderY = cube.y + dy;
                const radius = cube.size / 2;

                // Draw White Shadow (Bottom Right)
                ctx.beginPath();
                ctx.arc(renderX + 4, renderY + 4, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // White shadow
                ctx.fill();

                // Draw Main Circle
                ctx.beginPath();
                ctx.arc(renderX, renderY, radius, 0, Math.PI * 2);
                ctx.fillStyle = cube.color;
                ctx.fill();

                // Draw Pixel Highlight (Square shine) to give 8-bit feel
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(renderX - radius / 2, renderY - radius / 2, radius / 2.5, radius / 2.5);

                // Border for pop
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 2;
                ctx.stroke();
            });

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
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            aria-hidden="true"
        />
    );
}
