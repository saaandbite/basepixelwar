'use client';

// Chroma Duel Game Page

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAudio } from './hooks/useAudio';
import { GRID_SIZE } from './lib/constants';
import { calculateScore } from './lib/gameLogic';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { GameInstructions } from './components/GameInstructions';
import { PauseOverlay } from './components/PauseOverlay';
import { GameOverModal } from './components/GameOverModal';
import { PowerupIndicator } from './components/PowerupIndicator';
import { PowerupEffect } from './components/PowerupEffect';
import { ComboEffect } from './components/ComboEffect';
import { InkBar } from './components/InkBar';
import { WeaponSelector } from './components/WeaponSelector';
import { GoldenPixelIndicator } from './components/GoldenPixelIndicator';
import type { WeaponMode } from './types';
import './game.css';

export default function GamePage() {
    const {
        state,
        startGame,
        resetGame,
        setCanvasSize,
        togglePause,
        toggleSound,
        setPlayerAngle,
        setPlayerFiring,
        setWeaponMode,
        updateGame,
        timerTick,
        showMeteorWarning,
        launchMeteor,
        activateShield,
    } = useGameState();

    const { initAudio, playSound, setSoundOn } = useAudio();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasSizeRef = useRef({ width: 400, height: 700 });

    const [isMounted, setIsMounted] = useState(false);
    const [showCombo, setShowCombo] = useState(false);
    const [footerStatus, setFooterStatus] = useState<{ name: string; icon: string; color: string } | null>(null);
    const [footerTimeout, setFooterTimeout] = useState<NodeJS.Timeout | null>(null);
    const [powerupEffect, setPowerupEffect] = useState<{ show: boolean; type: 'shield' | 'meteor'; x: number; y: number } | null>(null);

    // Refs to track meteor triggers to prevent duplicates
    const triggeredMeteorsRef = useRef<Set<number>>(new Set());

    // Initial mount hydration safety
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Audio sync
    useEffect(() => {
        setSoundOn(state.isSoundOn);
    }, [state.isSoundOn, setSoundOn]);

    const showFooterStatus = useCallback((name: string, icon: string, color: string) => {
        if (footerTimeout) clearTimeout(footerTimeout);
        setFooterStatus({ name, icon, color });
        const timeout = setTimeout(() => setFooterStatus(null), 3000);
        setFooterTimeout(timeout);
    }, [footerTimeout]);

    // Meteor trigger
    const triggerMeteor = useCallback(() => {
        const { cols, rows } = state;

        // Randomly target either player area or enemy area
        const isTargetingEnemy = Math.random() < 0.5;
        let tx: number, ty: number;

        if (isTargetingEnemy) {
            // Target enemy area (top half)
            tx = Math.random() * (cols * GRID_SIZE);
            ty = Math.random() * (rows * GRID_SIZE * 0.4); // Top 40%
        } else {
            // Target player area (bottom half)
            tx = Math.random() * (cols * GRID_SIZE);
            ty = (rows * GRID_SIZE) - Math.random() * (rows * GRID_SIZE * 0.4); // Bottom 40%
        }

        showMeteorWarning(tx, ty);

        setTimeout(() => {
            launchMeteor(tx, ty);
        }, 2500);
    }, [showMeteorWarning, launchMeteor]); // Removed state from dependency to prevent infinite loop

    // Timer
    useEffect(() => {
        if (state.gameActive && !state.isPaused) {
            timerRef.current = setInterval(() => {
                timerTick(playSound);
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [state.gameActive, state.isPaused, timerTick, playSound]);

    // Separate effect for meteor triggers to avoid timer recreation
    useEffect(() => {
        // Check for meteor triggers based on current timeLeft
        if (state.gameActive && !state.isPaused && [60, 40, 20].includes(state.timeLeft)) {
            // Only trigger if we haven't already triggered for this time
            if (!triggeredMeteorsRef.current.has(state.timeLeft)) {
                triggeredMeteorsRef.current.add(state.timeLeft);
                triggerMeteor();
            }
        }
    }, [state.timeLeft, state.gameActive, state.isPaused, triggerMeteor]);

    // Combo display
    useEffect(() => {
        if (state.comboStreak >= 2) {
            setShowCombo(true);
            if (state.comboStreak > 2) {
                playSound('combo');
            }
            const timeout = setTimeout(() => setShowCombo(false), 1500);
            return () => clearTimeout(timeout);
        }
    }, [state.comboStreak, playSound]);

    // Track powerup collection for footer
    const prevPowerupsRef = useRef(state.player.powerups);
    useEffect(() => {
        const prev = prevPowerupsRef.current;
        const curr = state.player.powerups;

        if (curr && prev) {
            if (curr.shield > (prev.shield || 0)) {
                showFooterStatus('SHIELD', 'shield', 'text-green-500');
                // Show powerup effect
                setPowerupEffect({ show: true, type: 'shield', x: state.player.x, y: state.player.y });
                setTimeout(() => setPowerupEffect(null), 1000);
            }
        }

        prevPowerupsRef.current = curr;
    }, [state.player.powerups, state.player.x, state.player.y, showFooterStatus]);

    // Handlers
    const handleStart = useCallback(() => {
        initAudio();
        // Reset the triggered meteors when starting a new game
        triggeredMeteorsRef.current.clear();
        resetGame(canvasSizeRef.current.width, canvasSizeRef.current.height);
        startGame(playSound);
    }, [initAudio, resetGame, startGame, playSound]);

    const handleRestart = useCallback(() => {
        togglePause();
        setTimeout(() => {
            // Reset the triggered meteors when restarting the game
            triggeredMeteorsRef.current.clear();
            resetGame(canvasSizeRef.current.width, canvasSizeRef.current.height);
            startGame(playSound);
        }, 100);
    }, [togglePause, resetGame, startGame, playSound]);

    const handlePlayAgain = useCallback(() => {
        // Reset the triggered meteors when playing again
        triggeredMeteorsRef.current.clear();
        resetGame(canvasSizeRef.current.width, canvasSizeRef.current.height);
        startGame(playSound);
    }, [resetGame, startGame, playSound]);

    const handleResize = useCallback(
        (width: number, height: number) => {
            // Avoid extreme sensitivity
            if (Math.abs(canvasSizeRef.current.width - width) < 2 && Math.abs(canvasSizeRef.current.height - height) < 2) return;

            canvasSizeRef.current = { width, height };
            setCanvasSize(width, height);
        },
        [setCanvasSize]
    );

    const handlePlayerInput = useCallback(
        (angle: number, isFiring: boolean) => {
            setPlayerAngle(angle);
            setPlayerFiring(isFiring);
        },
        [setPlayerAngle, setPlayerFiring]
    );

    // Special handler for shield activation
    const handleShieldActivation = useCallback(() => {
        if (state.player.powerups?.shield && state.player.powerups.shield > 0) {
            activateShield(playSound);
        }
    }, [state.player.powerups?.shield, activateShield, playSound]);

    const handleUpdate = useCallback(() => {
        updateGame(playSound);
    }, [updateGame, playSound]);

    const handlePause = useCallback(() => {
        if (state.gameActive && state.gameStarted) {
            togglePause();
        }
    }, [state.gameActive, state.gameStarted, togglePause]);

    const handleToggleSound = useCallback(() => {
        toggleSound();
    }, [toggleSound]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!state.gameActive || state.isPaused) return;

            // Weapon switching with number keys
            switch (e.key) {
                case '1':
                    setWeaponMode('machineGun');
                    break;
                case '2':
                    if (state.player.isFrenzy || state.player.ink >= 5) {
                        setWeaponMode('shotgun');
                    }
                    break;
                case '3':
                    if (state.player.isFrenzy || state.player.ink >= 20) {
                        setWeaponMode('inkBomb');
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.gameActive, state.isPaused, state.player.ink, state.player.isFrenzy, setWeaponMode]);

    const score = useMemo(
        () => calculateScore(state.grid, state.cols, state.rows),
        [state.grid, state.cols, state.rows]
    );

    // Is game over?
    const isGameOver = state.gameStarted && !state.gameActive && state.timeLeft <= 0;

    return (
        <div className="h-screen flex flex-col items-center justify-center text-text-main font-sans">
            <main className="relative w-full max-w-[420px] h-[95vh] max-h-[880px] bg-gradient-to-b from-white/95 to-blue-50 rounded-2xl shadow-game border-[6px] border-white/90 flex flex-col overflow-hidden ring-1 ring-slate-200/80">
                {isMounted ? (
                    <>
                        {/* HUD */}
                        <GameHUD
                            scoreBlue={score.blue}
                            scoreRed={score.red}
                            timeLeft={state.timeLeft}
                            isSoundOn={state.isSoundOn}
                            onPause={handlePause}
                            onToggleSound={handleToggleSound}
                            comboStreak={state.comboStreak}
                            showCombo={showCombo}
                        />

                        {/* Game Canvas */}
                        <GameCanvas
                            state={state}
                            onResize={handleResize}
                            onPlayerInput={handlePlayerInput}
                            onShieldActivation={handleShieldActivation}
                            onUpdate={handleUpdate}
                        />

                        {/* Ink Economy UI - Only show when game is active */}
                        {state.gameStarted && state.gameActive && (
                            <>
                                {/* Ink Bar */}
                                <div className="absolute bottom-24 left-0 right-0 px-3 z-20 pointer-events-none">
                                    <InkBar
                                        ink={state.player.ink}
                                        maxInk={state.player.maxInk}
                                        isFrenzy={state.player.isFrenzy}
                                        frenzyEndTime={state.player.frenzyEndTime}
                                    />
                                </div>

                                {/* Weapon Selector */}
                                <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20">
                                    <WeaponSelector
                                        currentMode={state.player.weaponMode}
                                        ink={state.player.ink}
                                        isFrenzy={state.player.isFrenzy}
                                        onSelectMode={setWeaponMode}
                                    />
                                </div>

                                {/* Golden Pixel Indicator */}
                                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
                                    <GoldenPixelIndicator
                                        goldenPixel={state.goldenPixel}
                                        timeLeft={state.timeLeft}
                                        lastGoldenPixelSpawn={state.lastGoldenPixelSpawn}
                                        isFrenzy={state.player.isFrenzy}
                                        frenzyEndTime={state.player.frenzyEndTime}
                                    />
                                </div>
                            </>
                        )}

                        {/* Combo Effect */}
                        <ComboEffect show={showCombo} comboStreak={state.comboStreak} />

                        {/* Powerup Effect */}
                        {powerupEffect && (
                            <PowerupEffect
                                show={powerupEffect.show}
                                type={powerupEffect.type}
                                x={powerupEffect.x}
                                y={powerupEffect.y}
                            />
                        )}

                        {/* Powerup Indicator & Footer */}
                        <PowerupIndicator
                            shield={state.player.powerups?.shield || 0}
                            showMeteorWarning={state.showMeteorIndicator}
                            footerStatus={footerStatus}
                        />

                        {/* Overlays */}
                        {!state.gameStarted && <GameInstructions onStart={handleStart} />}

                        {state.isPaused && (
                            <PauseOverlay onResume={togglePause} onRestart={handleRestart} />
                        )}

                        {isGameOver && (
                            <GameOverModal
                                blueScore={score.blue}
                                maxCombo={state.maxCombo}
                                powerupsCollected={state.totalPowerupsCollected}
                                onPlayAgain={handlePlayAgain}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {/* Static Skeleton for LCP & FCP */}
                        <div className="w-full h-16 p-3 bg-white/95 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div className="w-11 h-11 bg-slate-50/80 rounded-xl"></div>
                            <div className="flex-1 max-w-24 h-8 bg-slate-100/50 rounded-lg mx-auto"></div>
                            <div className="w-11 h-11 bg-slate-50/80 rounded-xl"></div>
                        </div>
                        <div className="flex-grow bg-slate-100/30"></div>
                        {/* SSR the instructions since they are the LCP candidate */}
                        <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
                            <GameInstructions onStart={handleStart} />
                        </div>
                        <footer className="h-14 bg-white/95 border-t border-slate-100/80"></footer>
                    </>
                )}
            </main>
        </div>
    );
}
