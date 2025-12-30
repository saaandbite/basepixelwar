'use client';

// Chroma Duel Game Page

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAudio } from './hooks/useAudio';

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
        setInkBombPreview,
        updateGame,
        timerTick,

    } = useGameState();

    const { initAudio, playSound, setSoundOn } = useAudio();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasSizeRef = useRef({ width: 400, height: 700 });

    const [isMounted, setIsMounted] = useState(false);
    const [showCombo, setShowCombo] = useState(false);
    const [powerupEffect, setPowerupEffect] = useState<{ show: boolean; type: 'shield'; x: number; y: number } | null>(null);



    // Initial mount hydration safety
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Audio sync
    useEffect(() => {
        setSoundOn(state.isSoundOn);
    }, [state.isSoundOn, setSoundOn]);





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

    // Track powerup collection for effect
    const prevPowerupsRef = useRef(state.player.powerups);
    useEffect(() => {
        const prev = prevPowerupsRef.current;
        const curr = state.player.powerups;

        if (curr && prev) {
            if (curr.shield > (prev.shield || 0)) {
                // Show powerup effect
                setPowerupEffect({ show: true, type: 'shield', x: state.player.x, y: state.player.y });
                setTimeout(() => setPowerupEffect(null), 1000);
            }
        }

        prevPowerupsRef.current = curr;
    }, [state.player.powerups, state.player.x, state.player.y]);

    // Handlers
    const handleStart = useCallback(() => {
        initAudio();
        resetGame(canvasSizeRef.current.width, canvasSizeRef.current.height);
        startGame(playSound);
    }, [initAudio, resetGame, startGame, playSound]);

    const handleRestart = useCallback(() => {
        togglePause();
        setTimeout(() => {
            resetGame(canvasSizeRef.current.width, canvasSizeRef.current.height);
            startGame(playSound);
        }, 100);
    }, [togglePause, resetGame, startGame, playSound]);

    const handlePlayAgain = useCallback(() => {
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

    // Should show control panel? Only during active gameplay (not paused, not game over, not before start)
    const showControlPanel = state.gameStarted && state.gameActive && !state.isPaused;

    return (
        <div className="h-screen flex flex-col items-center justify-center text-text-main font-sans bg-slate-100 overflow-hidden">
            {/* Game Container - Full height when no control panel, shorter when control panel visible */}
            <div className={`flex-1 w-full max-w-[420px] min-h-0 shrink-0 p-2 ${showControlPanel ? 'pb-0 max-h-[75vh]' : 'pb-2'}`}>
                <main className={`relative w-full h-full bg-gradient-to-b from-white/95 to-blue-50 shadow-game border-[6px] border-white/90 flex flex-col overflow-hidden ring-1 ring-slate-200/80 ${showControlPanel ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
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
                                onInkBombPreview={setInkBombPreview}
                                onUpdate={handleUpdate}
                            />

                            {/* In-Game Indicators (Must stay on canvas) */}
                            {state.gameStarted && state.gameActive && (
                                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                    <GoldenPixelIndicator
                                        goldenPixel={state.goldenPixel}
                                        timeLeft={state.timeLeft}
                                        lastGoldenPixelSpawn={state.lastGoldenPixelSpawn}
                                        isFrenzy={state.player.isFrenzy}
                                        frenzyEndTime={state.player.frenzyEndTime}
                                    />
                                </div>
                            )}

                            {/* Effects */}
                            <ComboEffect show={showCombo} comboStreak={state.comboStreak} />

                            {powerupEffect && (
                                <PowerupEffect
                                    show={powerupEffect.show}
                                    type={powerupEffect.type}
                                    x={powerupEffect.x}
                                    y={powerupEffect.y}
                                />
                            )}

                            <PowerupIndicator
                                shield={state.player.powerups?.shield || 0}
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

            {/* Dashboard / Controls Panel - Only visible during active gameplay */}
            {showControlPanel && (
                <div className="w-full max-w-[420px] p-2 pt-0 shrink-0 z-20">
                    <div className="bg-white rounded-b-2xl shadow-lg border-x-[6px] border-b-[6px] border-white/90 p-3 flex flex-col gap-3 ring-1 ring-slate-200/80">
                        {/* 1. Ink Bar (Top) */}
                        <div className="w-full">
                            <InkBar
                                ink={state.player.ink}
                                maxInk={state.player.maxInk}
                                isFrenzy={state.player.isFrenzy}
                                frenzyEndTime={state.player.frenzyEndTime}
                            />
                        </div>

                        {/* 2. Weapon Selector (Middle) */}
                        <div className="w-full flex justify-center">
                            <WeaponSelector
                                currentMode={state.player.weaponMode}
                                ink={state.player.ink}
                                isFrenzy={state.player.isFrenzy}
                                onSelectMode={setWeaponMode}
                            />
                        </div>


                    </div>
                </div>
            )}
        </div>
    );
}
