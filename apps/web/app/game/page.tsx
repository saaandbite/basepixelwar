'use client';

// Chroma Duel Game Page

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAudio } from './hooks/useAudio';
import { GRID_SIZE, GAME_DURATION } from './lib/constants';
import { calculateScore, findLargestTerritory } from './lib/gameLogic';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { GameInstructions } from './components/GameInstructions';
import { PauseOverlay } from './components/PauseOverlay';
import { GameOverModal } from './components/GameOverModal';
import { PowerupIndicator } from './components/PowerupIndicator';
import { PowerupEffect } from './components/PowerupEffect';
import { ComboEffect } from './components/ComboEffect';
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
        updateGame,
        timerTick,
        showMeteorWarning,
        hideMeteorWarning,
        launchMeteor,
        callPlayerMeteor,
        useShield,
    } = useGameState();

    const { initAudio, playSound, setSoundOn } = useAudio();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasSizeRef = useRef({ width: 400, height: 700 });

    const [showCombo, setShowCombo] = useState(false);
    const [footerStatus, setFooterStatus] = useState<{ name: string; icon: string; color: string } | null>(null);
    const [footerTimeout, setFooterTimeout] = useState<NodeJS.Timeout | null>(null);
    const [powerupEffect, setPowerupEffect] = useState<{ show: boolean; type: 'burst' | 'shield' | 'meteor'; x: number; y: number } | null>(null);

    // Audio sync
    useEffect(() => {
        setSoundOn(state.isSoundOn);
    }, [state.isSoundOn, setSoundOn]);

    // Timer
    useEffect(() => {
        if (state.gameActive && !state.isPaused) {
            timerRef.current = setInterval(() => {
                timerTick(playSound);

                // Check for meteor triggers
                const newTimeLeft = state.timeLeft - 1;
                if ([60, 40, 20].includes(newTimeLeft)) {
                    triggerMeteor();
                }
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [state.gameActive, state.isPaused, state.timeLeft, timerTick, playSound]);

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
            if (curr.burstShot > (prev.burstShot || 0)) {
                showFooterStatus('BURST SHOT', 'auto_awesome', 'text-purple-500');
                // Show powerup effect
                setPowerupEffect({ show: true, type: 'burst', x: state.player.x, y: state.player.y });
                setTimeout(() => setPowerupEffect(null), 1000);
            } else if (curr.shield > (prev.shield || 0)) {
                showFooterStatus('SHIELD', 'shield', 'text-green-500');
                // Show powerup effect
                setPowerupEffect({ show: true, type: 'shield', x: state.player.x, y: state.player.y });
                setTimeout(() => setPowerupEffect(null), 1000);
            } else if (curr.callMeteor > (prev.callMeteor || 0)) {
                showFooterStatus('METEOR STRIKE', 'radioactive', 'text-orange-500');
                // Show powerup effect
                setPowerupEffect({ show: true, type: 'meteor', x: state.player.x, y: state.player.y });
                setTimeout(() => setPowerupEffect(null), 1000);
            }
        }

        prevPowerupsRef.current = curr;
    }, [state.player.powerups, state.player.x, state.player.y]);

    const showFooterStatus = (name: string, icon: string, color: string) => {
        if (footerTimeout) clearTimeout(footerTimeout);
        setFooterStatus({ name, icon, color });
        const timeout = setTimeout(() => setFooterStatus(null), 3000);
        setFooterTimeout(timeout);
    };

    // Meteor trigger
    const triggerMeteor = useCallback(() => {
        const { grid, cols, rows } = state;
        const largestBlue = findLargestTerritory(grid, 'blue', cols, rows);
        let tx: number, ty: number;

        if (largestBlue && Math.random() < 0.8) {
            tx = largestBlue.x * GRID_SIZE + GRID_SIZE / 2 + (Math.random() - 0.5) * 30;
            ty = largestBlue.y * GRID_SIZE + GRID_SIZE / 2 + (Math.random() - 0.5) * 30;
        } else {
            tx = Math.random() * canvasSizeRef.current.width;
            ty = canvasSizeRef.current.height / 2 + Math.random() * (canvasSizeRef.current.height / 3);
        }

        showMeteorWarning(tx, ty);

        setTimeout(() => {
            launchMeteor(tx, ty);
        }, 2500);
    }, [state, showMeteorWarning, launchMeteor]);

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
            canvasSizeRef.current = { width, height };
            setCanvasSize(width, height);
        },
        [setCanvasSize]
    );

    const handlePlayerInput = useCallback(
        (angle: number, isFiring: boolean, isDown: boolean) => {
            setPlayerAngle(angle);
            setPlayerFiring(isFiring);
        },
        [setPlayerAngle, setPlayerFiring]
    );

    // Special handler for shield activation
    const handleShieldActivation = useCallback(() => {
        if (state.player.powerups?.shield && state.player.powerups.shield > 0) {
            useShield(playSound);
        }
    }, [state.player.powerups?.shield, useShield, playSound]);

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

            if (e.key === 'w' && state.player.powerups?.callMeteor && state.player.powerups.callMeteor > 0) {
                e.preventDefault();
                callPlayerMeteor(playSound);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [state.gameActive, state.isPaused, state.player.powerups, callPlayerMeteor, playSound]);

    // Calculate score (memoized for performance)
    const score = useMemo(
        () => calculateScore(state.grid, state.cols, state.rows),
        [state.grid, state.cols, state.rows]
    );

    // Is game over?
    const isGameOver = state.gameStarted && !state.gameActive && state.timeLeft <= 0;

    return (
        <div className="h-screen flex flex-col items-center justify-center text-text-main font-sans">
            <main className="relative w-full max-w-[420px] h-[95vh] max-h-[880px] bg-gradient-to-b from-white/95 to-blue-50 rounded-2xl shadow-game border-[6px] border-white/90 flex flex-col overflow-hidden ring-1 ring-slate-200/80">
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
                    burstShot={state.player.powerups?.burstShot || 0}
                    shield={state.player.powerups?.shield || 0}
                    callMeteor={state.player.powerups?.callMeteor || 0}
                    showMeteorWarning={state.showMeteorIndicator}
                    meteorTarget={state.meteorTarget}
                    footerStatus={footerStatus}
                />

                {/* Instructions Overlay */}
                {!state.gameStarted && <GameInstructions onStart={handleStart} />}

                {/* Pause Overlay */}
                {state.isPaused && (
                    <PauseOverlay onResume={togglePause} onRestart={handleRestart} />
                )}

                {/* Game Over Modal */}
                {isGameOver && (
                    <GameOverModal
                        blueScore={score.blue}
                        maxCombo={state.maxCombo}
                        powerupsCollected={state.totalPowerupsCollected}
                        onPlayAgain={handlePlayAgain}
                    />
                )}
            </main>
        </div>
    );
}
