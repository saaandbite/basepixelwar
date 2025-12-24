// Game Loop Hook with Performance Optimization

import { useCallback, useRef, useEffect } from 'react';

// Target 60 FPS
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
const MAX_DELTA = FRAME_TIME * 3; // Cap delta to prevent spiral of death

// Performance tracking
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 60;

export function getGameFPS(): number {
    return currentFps;
}

export function useGameLoop(
    callback: (deltaTime: number) => void,
    isActive: boolean
) {
    const requestRef = useRef<number | null>(null);
    const previousTimeRef = useRef<number | null>(null);
    const accumulatedTimeRef = useRef<number>(0);

    const animate = useCallback(
        (time: number) => {
            if (previousTimeRef.current !== null) {
                // Calculate delta time
                let deltaTime = time - previousTimeRef.current;

                // Cap delta time to prevent huge jumps after tab switch
                if (deltaTime > MAX_DELTA) {
                    deltaTime = FRAME_TIME;
                }

                // Update FPS counter
                frameCount++;
                if (time - lastFpsUpdate >= 1000) {
                    currentFps = frameCount;
                    frameCount = 0;
                    lastFpsUpdate = time;
                }

                // Accumulate time for fixed timestep
                accumulatedTimeRef.current += deltaTime;

                // Process at fixed timestep rate
                while (accumulatedTimeRef.current >= FRAME_TIME) {
                    callback(FRAME_TIME);
                    accumulatedTimeRef.current -= FRAME_TIME;
                }
            }
            previousTimeRef.current = time;
            requestRef.current = requestAnimationFrame(animate);
        },
        [callback]
    );

    useEffect(() => {
        if (isActive) {
            previousTimeRef.current = null;
            accumulatedTimeRef.current = 0;
            frameCount = 0;
            lastFpsUpdate = performance.now();
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current !== null) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        }

        return () => {
            if (requestRef.current !== null) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isActive, animate]);
}
