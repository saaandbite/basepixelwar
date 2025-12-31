'use client';

// Chroma Duel Game Page

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAudio } from './hooks/useAudio';
import { GAME_WIDTH, GAME_HEIGHT } from './lib/constants';

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
        gameStateRef, // Mutable Ref 
        uiState,      // React State (Synced)
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

    const [isMounted, setIsMounted] = useState(false);
    // showCombo is now derived in uiState? No, I added it to uiState interface but didn't fully implement logic to override local state? 
    // Actually simpler to keep showCombo local if we want, OR use the one from uiState?
    // Let's keep local for animation control if uiState update isn't 60fps.
    // However, the `comboStreak` comes from `uiState`.
    const [showCombo, setShowCombo] = useState(false);
    const [powerupEffect, setPowerupEffect] = useState<{ show: boolean; type: 'shield'; x: number; y: number } | null>(null);

    // Initial mount hydration safety
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Audio sync
    useEffect(() => {
        setSoundOn(uiState.isSoundOn);
    }, [uiState.isSoundOn, setSoundOn]);

    // Timer
    const { gameActive, isPaused } = uiState;
    useEffect(() => {
        if (gameActive && !isPaused) {
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
    }, [gameActive, isPaused, timerTick, playSound]);

    // Combo display
    useEffect(() => {
        if (uiState.comboStreak >= 2) {
            setShowCombo(true);
            if (uiState.comboStreak > 2) {
                playSound('combo');
            }
            const timeout = setTimeout(() => setShowCombo(false), 1500);
            return () => clearTimeout(timeout);
        }
    }, [uiState.comboStreak, playSound]);

    // Track powerup collection for effect
    const prevPowerupsRef = useRef(uiState.player.powerups);
    useEffect(() => {
        const prev = prevPowerupsRef.current;
        const curr = uiState.player.powerups;

        if (curr && prev) {
            if (curr.shield > (prev.shield || 0)) {
                // Show powerup effect - Read position from REF for accuracy
                const playerPos = gameStateRef.current.player;
                setPowerupEffect({ show: true, type: 'shield', x: playerPos.x, y: playerPos.y });
                setTimeout(() => setPowerupEffect(null), 1000);
            }
        }

        prevPowerupsRef.current = curr;
    }, [uiState.player.powerups, gameStateRef]); // Removed player.x/y dependency to avoid re-running on move

    // Handlers
    const handleStart = useCallback(() => {
        initAudio();
        resetGame(GAME_WIDTH, GAME_HEIGHT);
        startGame(playSound);
    }, [initAudio, resetGame, startGame, playSound]);

    const handleRestart = useCallback(() => {
        togglePause();
        setTimeout(() => {
            resetGame(GAME_WIDTH, GAME_HEIGHT);
            startGame(playSound);
        }, 100);
    }, [togglePause, resetGame, startGame, playSound]);

    const handlePlayAgain = useCallback(() => {
        resetGame(GAME_WIDTH, GAME_HEIGHT);
        startGame(playSound);
    }, [resetGame, startGame, playSound]);

    const handleResize = useCallback(
        (width: number, height: number) => {
            // No-op for now as we enforce fixed size
        },
        [setCanvasSize]
    );

    const handlePlayerInput = useCallback(
        (angle: number, isFiring: boolean, _isDown: boolean, targetPos?: { x: number; y: number }) => {
            setPlayerAngle(angle, targetPos);
            setPlayerFiring(isFiring);
        },
        [setPlayerAngle, setPlayerFiring]
    );

    const handleUpdate = useCallback(() => {
        updateGame(playSound);
    }, [updateGame, playSound]);

    const handlePause = useCallback(() => {
        if (uiState.gameActive && uiState.gameStarted) {
            togglePause();
        }
    }, [uiState.gameActive, uiState.gameStarted, togglePause]);

    const handleToggleSound = useCallback(() => {
        toggleSound();
    }, [toggleSound]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!uiState.gameActive || uiState.isPaused) return;

            // Weapon switching with number keys
            switch (e.key) {
                case '1':
                    setWeaponMode('machineGun');
                    break;
                case '2':
                    if (uiState.player.isFrenzy || uiState.player.ink >= 5) {
                        setWeaponMode('shotgun');
                    }
                    break;
                case '3':
                    if (uiState.player.isFrenzy || uiState.player.ink >= 20) {
                        setWeaponMode('inkBomb');
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [uiState.gameActive, uiState.isPaused, uiState.player.ink, uiState.player.isFrenzy, setWeaponMode]);

    // Score from UI State (Synced periodically)
    const score = uiState.score;

    // Is game over?
    const isGameOver = uiState.gameStarted && !uiState.gameActive && uiState.timeLeft <= 0;

    // Should show control panel?
    const showControlPanel = uiState.gameStarted && uiState.gameActive && !uiState.isPaused;

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
                                timeLeft={uiState.timeLeft}
                                isSoundOn={uiState.isSoundOn}
                                onPause={handlePause}
                                onToggleSound={handleToggleSound}
                                comboStreak={uiState.comboStreak}
                                showCombo={showCombo}
                            />

                            {/* Game Canvas - Now uses Ref */}
                            <GameCanvas
                                gameStateRef={gameStateRef}
                                onResize={handleResize}
                                onPlayerInput={handlePlayerInput}
                                onInkBombPreview={setInkBombPreview}
                                onUpdate={handleUpdate}
                            />

                            {/* In-Game Indicators (Must stay on canvas) */}
                            {uiState.gameStarted && uiState.gameActive && (
                                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                    <GoldenPixelIndicator
                                        goldenPixel={uiState.goldenPixel}
                                        timeLeft={uiState.timeLeft}
                                        lastGoldenPixelSpawn={uiState.lastGoldenPixelSpawn}
                                        isFrenzy={uiState.player.isFrenzy}
                                        frenzyEndTime={uiState.player.frenzyEndTime}
                                    />
                                </div>
                            )}

                            {/* Effects */}
                            <ComboEffect show={showCombo} comboStreak={uiState.comboStreak} />

                            {powerupEffect && (
                                <PowerupEffect
                                    show={powerupEffect.show}
                                    type={powerupEffect.type}
                                    x={powerupEffect.x}
                                    y={powerupEffect.y}
                                // Note: PowerupEffect might need to know if it's following the player or static? 
                                // It uses absolute positioning.
                                />
                            )}

                            <PowerupIndicator
                                shield={uiState.player.powerups?.shield || 0}
                            />

                            {/* Overlays */}
                            {!uiState.gameStarted && <GameInstructions onStart={handleStart} />}

                            {uiState.isPaused && (
                                <PauseOverlay onResume={togglePause} onRestart={handleRestart} />
                            )}

                            {isGameOver && (
                                <GameOverModal
                                    blueScore={score.blue}
                                    maxCombo={uiState.maxCombo}
                                    powerupsCollected={uiState.totalPowerupsCollected}
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
                                ink={uiState.player.ink}
                                maxInk={uiState.player.maxInk}
                                isFrenzy={uiState.player.isFrenzy}
                                frenzyEndTime={uiState.player.frenzyEndTime}
                            />
                        </div>

                        {/* 2. Weapon Selector (Middle) */}
                        <div className="w-full flex justify-center">
                            <WeaponSelector
                                currentMode={uiState.player.weaponMode}
                                ink={uiState.player.ink}
                                isFrenzy={uiState.player.isFrenzy}
                                onSelectMode={setWeaponMode}
                            />
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
