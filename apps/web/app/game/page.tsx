'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from './hooks/useGameState';
import { useAudio } from './hooks/useAudio';
import { GAME_WIDTH, GAME_HEIGHT } from './lib/constants';

import { GameCanvas } from './components/GameCanvas';
import { GameNavbar } from './components/GameNavbar';
import { GameOverModal } from './components/GameOverModal';
import { PowerupIndicator } from './components/PowerupIndicator';
import { PowerupEffect } from './components/PowerupEffect';
import { ComboEffect } from './components/ComboEffect';
import { InkBar } from './components/InkBar';
import { WeaponSelector } from './components/WeaponSelector';
import { GoldenPixelIndicator } from './components/GoldenPixelIndicator';
import { PvPGamePage } from './PvPGamePage';

import './game.css';

// Wrapper component to decide between PvP and AI mode
export default function GamePage() {
    const router = useRouter();
    const [isPvP, setIsPvP] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [hasValidSession, setHasValidSession] = useState(false);

    useEffect(() => {
        const pvpMode = sessionStorage.getItem('pvp_mode') === 'true';
        const roomId = sessionStorage.getItem('pvp_room_id');
        const aiMode = sessionStorage.getItem('ai_mode') === 'true';

        // Session Guard: Must have explicit mode to be here
        if (!pvpMode && !aiMode) {
            // No valid session, redirect to room
            router.push('/room');
            return;
        }

        // Valid session exists
        setHasValidSession(true);

        // PvP Check
        if (pvpMode && roomId) {
            setIsPvP(true);
        } else {
            // Default to AI
            setIsPvP(false);
            // Cleanup PvP flags just in case
            sessionStorage.removeItem('pvp_mode');
            sessionStorage.removeItem('pvp_room_id');
            sessionStorage.removeItem('pvp_team');
        }

        setMounted(true);
    }, [router]);

    // Show loading while checking session or redirecting
    if (!mounted || !hasValidSession) {
        return <div className="game-container flex items-center justify-center h-screen bg-slate-50 text-slate-500">Loading...</div>;
    }

    if (isPvP) {
        return <PvPGamePage />;
    }

    return <AIGamePage />;
}

// AI Game Page (original single-player vs AI)
function AIGamePage() {
    const {
        gameStateRef, // Mutable Ref 
        uiState,      // React State (Synced)
        startGame,
        resetGame,

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
    // Actually simpler to keep local for animation control if uiState update isn't 60fps.
    // However, the `comboStreak` comes from `uiState`.
    const [showCombo, setShowCombo] = useState(false);
    const [powerupEffect, setPowerupEffect] = useState<{ show: boolean; type: 'shield'; x: number; y: number } | null>(null);

    // Initial mount hydration safety
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Auto-start game when mounted (skip instructions overlay)
    useEffect(() => {
        if (isMounted && !uiState.gameStarted && !uiState.gameActive) {
            initAudio();
            resetGame(GAME_WIDTH, GAME_HEIGHT);
            startGame(playSound);
        }
    }, [isMounted, uiState.gameStarted, uiState.gameActive, initAudio, resetGame, startGame, playSound]);

    // Audio sync
    useEffect(() => {
        setSoundOn(uiState.isSoundOn);
    }, [uiState.isSoundOn, setSoundOn]);

    // Timer
    const { gameActive } = uiState;
    useEffect(() => {
        if (gameActive) {
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
    }, [gameActive, timerTick, playSound]);

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

    const handlePlayAgain = useCallback(() => {
        resetGame(GAME_WIDTH, GAME_HEIGHT);
        startGame(playSound);
    }, [resetGame, startGame, playSound]);

    const handleExit = useCallback(() => {
        // Clear session and return to room selection
        sessionStorage.removeItem('ai_mode');
        sessionStorage.removeItem('pvp_mode');
        sessionStorage.removeItem('pvp_room_id');
        sessionStorage.removeItem('pvp_team');
        window.location.href = '/room';
    }, []);

    const handleResize = useCallback(
        () => {
            // No-op for now as we enforce fixed size
        },
        []
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



    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!uiState.gameActive) return;

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
    }, [uiState.gameActive, uiState.player.ink, uiState.player.isFrenzy, setWeaponMode]);

    // Score from UI State (Synced periodically)
    const score = uiState.score;

    // Is game over?
    const isGameOver = uiState.gameStarted && !uiState.gameActive && uiState.timeLeft <= 0;

    // Should show control panel? Always show it so it's visible under blur
    const showControlPanel = isMounted;

    return (
        <div className="game-container bg-slate-50 h-[100dvh] flex flex-col overflow-hidden">
            {/* Unified Game Card - Matches PvP layout */}
            <div className="max-w-[420px] mx-auto w-full h-full flex flex-col bg-white shadow-2xl relative">

                {isMounted ? (
                    <>
                        {/* 1. Navbar (Top of Card) */}
                        <div className="shrink-0 relative">
                            <GameNavbar
                                scoreBlue={score.blue}
                                scoreRed={score.red}
                                timeLeft={uiState.timeLeft}
                                goldenPixel={uiState.goldenPixel}
                                lastGoldenPixelSpawn={uiState.lastGoldenPixelSpawn}
                                isFrenzy={uiState.player.isFrenzy}
                                frenzyEndTime={uiState.player.frenzyEndTime}
                            />
                        </div>

                        {/* 2. Game Canvas (Middle of Card) */}
                        <div className="flex-1 relative bg-slate-100 overflow-hidden">
                            {/* Wrapper to hold the canvas and overlays */}
                            <GameCanvas
                                gameStateRef={gameStateRef}
                                onResize={handleResize}
                                onPlayerInput={handlePlayerInput}
                                onInkBombPreview={setInkBombPreview}
                                onUpdate={handleUpdate}
                            />

                            {/* Golden Timer Overlay */}
                            {uiState.gameActive && (
                                <div className="absolute top-2 right-2 z-20 pointer-events-none">
                                    <GoldenPixelIndicator
                                        goldenPixel={uiState.goldenPixel}
                                        timeLeft={uiState.timeLeft}
                                        lastGoldenPixelSpawn={uiState.lastGoldenPixelSpawn}
                                        isFrenzy={uiState.player.isFrenzy}
                                        frenzyEndTime={uiState.player.frenzyEndTime}
                                    />
                                </div>
                            )}

                            {/* Effects Layer */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                                <ComboEffect show={showCombo} comboStreak={uiState.comboStreak} />

                                {powerupEffect && (
                                    <PowerupEffect
                                        show={powerupEffect.show}
                                        type={powerupEffect.type}
                                        x={powerupEffect.x}
                                        y={powerupEffect.y}
                                    />
                                )}
                            </div>

                            <PowerupIndicator
                                shield={uiState.player.powerups?.shield || 0}
                            />
                        </div>

                        {/* 3. Control Panel (Bottom of Card) - No gaps */}
                        {showControlPanel && (
                            <div className="shrink-0 bg-white border-t border-slate-100">
                                <div className="px-3 py-3 flex flex-col gap-2">
                                    <InkBar
                                        ink={uiState.player.ink}
                                        maxInk={uiState.player.maxInk}
                                        isFrenzy={uiState.player.isFrenzy}
                                        frenzyEndTime={uiState.player.frenzyEndTime}
                                    />

                                    <WeaponSelector
                                        currentMode={uiState.player.weaponMode}
                                        ink={uiState.player.ink}
                                        isFrenzy={uiState.player.isFrenzy}
                                        onSelectMode={setWeaponMode}
                                        weaponStates={uiState.player.weaponStates}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Game Over Overlay */}

                        {isGameOver && (
                            <div className="absolute inset-0 z-[100]">
                                <GameOverModal
                                    blueScore={score.blue}
                                    maxCombo={uiState.maxCombo}
                                    powerupsCollected={uiState.totalPowerupsCollected}
                                    onPlayAgain={handlePlayAgain}
                                    onExit={handleExit}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-96 flex items-center justify-center text-slate-400">Loading...</div>
                )}
            </div>
        </div>
    );
}

