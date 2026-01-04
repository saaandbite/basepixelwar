'use client';

// PvP Game Page - Separate from AI mode for cleaner architecture

import { useCallback, useEffect, useState } from 'react';
import { usePvPGame } from './hooks/usePvPGame';
import { PvPGameCanvas } from './components/PvPGameCanvas';
import { PvPGameNavbar } from './components/PvPGameNavbar';
import { PvPGameControls } from './components/PvPGameControls';
import { PvPGameOverModal } from './components/PvPGameOverModal';
import { GoldenPixelIndicator } from './components/GoldenPixelIndicator';
import './game.css';

export function PvPGamePage() {
    const pvp = usePvPGame();
    const [weaponMode, setWeaponMode] = useState<'machineGun' | 'shotgun' | 'inkBomb'>('machineGun');

    // Connect and join queue on mount
    useEffect(() => {
        pvp.connect();

        // Check for session storage data from /room page
        // Check for session storage data from /room page (commented out for persistence)
        // const team = sessionStorage.getItem('pvp_team') as 'blue' | 'red' | null;
        // if (team) { ... }

        // Small delay then set ready
        const readyTimeout = setTimeout(() => {
            pvp.setReady();
        }, 500);

        return () => {
            clearTimeout(readyTimeout);
            pvp.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle player input
    const handlePlayerInput = useCallback((angle: number, firing: boolean, targetPos?: { x: number; y: number }) => {
        pvp.sendInput({
            angle,
            firing,
            weaponMode,
            targetPos,
        });
    }, [pvp, weaponMode]);

    // Get My Ink Level
    let myInk = 0;
    if (pvp.gameState && pvp.myTeam) {
        if (pvp.myTeam === 'blue') myInk = pvp.gameState.player1.ink;
        else myInk = pvp.gameState.player2.ink;
    }

    // Waiting for game (Only if NOT playing AND NOT Game Over)
    if (!pvp.isPlaying && !pvp.gameOverResult) {
        return (
            <div className="game-container bg-slate-50">
                <div className="flex flex-col items-center justify-center h-screen gap-6">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">CHROMA DUEL <span className="text-blue-500">PVP</span></h1>

                    <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4 w-80">
                        {!pvp.isConnected && (
                            <>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <p className="text-slate-500 font-medium">Connecting to server...</p>
                            </>
                        )}

                        {pvp.isConnected && !pvp.roomId && (
                            <>
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                                </div>
                                <p className="text-slate-500 font-medium">Searching for opponent...</p>
                            </>
                        )}

                        {pvp.roomId && pvp.countdown > 0 && (
                            <div className="text-center">
                                <p className="text-slate-400 font-bold uppercase text-xs mb-2">Match Found</p>
                                <div className="text-6xl font-black text-slate-800 tabular-nums mb-2">{pvp.countdown}</div>
                                <p className="text-slate-500">Get Ready!</p>
                            </div>
                        )}

                        {pvp.roomId && pvp.countdown === 0 && !pvp.isPlaying && (
                            <p className="text-slate-500">Starting game...</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const handleExit = () => {
        // Clear session and return to room selection
        sessionStorage.removeItem('pvp_mode');
        sessionStorage.removeItem('pvp_room_id');
        sessionStorage.removeItem('pvp_team');
        window.location.href = '/room';
    };

    return (
        <div className="game-container bg-slate-50 h-[100dvh] flex flex-col overflow-hidden">
            <div className="max-w-[420px] mx-auto w-full h-full flex flex-col bg-white shadow-2xl relative">

                <PvPGameNavbar
                    scoreBlue={pvp.scores.blue}
                    scoreRed={pvp.scores.red}
                    timeLeft={pvp.timeLeft}
                    myTeam={pvp.myTeam || 'blue'}
                />

                {/* Game Area - Flex Grow to take available space */}
                <div className="flex-1 relative bg-slate-100 overflow-hidden">
                    {/* Golden Pixel / Frenzy Indicator */}
                    <div className="absolute top-4 right-4 z-10 pointer-events-none">
                        {pvp.gameState && (
                            <GoldenPixelIndicator
                                goldenPixel={pvp.gameState.goldenPixel ? { ...pvp.gameState.goldenPixel, pulsePhase: 0 } : null}
                                timeLeft={pvp.timeLeft}
                                lastGoldenPixelSpawn={pvp.gameState.lastGoldenPixelSpawn || 0}
                                isFrenzy={
                                    (pvp.myTeam === 'blue' && !!pvp.gameState.player1.isFrenzy) ||
                                    (pvp.myTeam === 'red' && !!pvp.gameState.player2.isFrenzy)
                                }
                                frenzyEndTime={
                                    (pvp.myTeam === 'blue' ? pvp.gameState.player1.frenzyEndTime : pvp.gameState.player2.frenzyEndTime) || 0
                                }
                                enemyFrenzy={
                                    (pvp.myTeam === 'blue' && !!pvp.gameState.player2.isFrenzy) ||
                                    (pvp.myTeam === 'red' && !!pvp.gameState.player1.isFrenzy)
                                }
                                enemyFrenzyEndTime={
                                    (pvp.myTeam === 'blue' ? pvp.gameState.player2.frenzyEndTime : pvp.gameState.player1.frenzyEndTime) || 0
                                }
                            />
                        )}
                    </div>

                    <div className="absolute inset-0">
                        <PvPGameCanvas
                            gameState={pvp.gameState}
                            myTeam={pvp.myTeam || 'blue'}
                            onPlayerInput={handlePlayerInput}
                            localAngle={pvp.localAngle}
                        />
                    </div>

                    {/* Game Over Modal Overlay */}
                    {pvp.gameOverResult && (
                        <PvPGameOverModal
                            myTeam={pvp.myTeam!}
                            scores={pvp.gameOverResult.scores}
                            onExit={handleExit}
                        />
                    )}
                </div>

                {/* Controls - Fixed at bottom */}
                <div className="shrink-0 z-20">
                    <PvPGameControls
                        weaponMode={weaponMode}
                        setWeaponMode={setWeaponMode}
                        inkLevel={myInk}
                        myTeam={pvp.myTeam || 'blue'}
                    />
                </div>
            </div>
        </div>
    );
}
