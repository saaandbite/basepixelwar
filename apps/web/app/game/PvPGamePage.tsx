'use client';

// PvP Game Page - Separate from AI mode for cleaner architecture

import { useCallback, useEffect, useState } from 'react';
import { usePvPGame } from './hooks/usePvPGame';
import { PvPGameCanvas } from './components/PvPGameCanvas';
import { GameNavbar } from './components/GameNavbar';
import './game.css';

export function PvPGamePage() {
    const pvp = usePvPGame();
    const [weaponMode, setWeaponMode] = useState<'machineGun' | 'shotgun' | 'inkBomb'>('machineGun');

    // Connect and join queue on mount
    useEffect(() => {
        pvp.connect();

        // Check for session storage data from /room page
        const team = sessionStorage.getItem('pvp_team') as 'blue' | 'red' | null;
        if (team) {
            sessionStorage.removeItem('pvp_team');
            sessionStorage.removeItem('pvp_mode');
        }

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
    const handlePlayerInput = useCallback((angle: number, firing: boolean) => {
        pvp.sendInput({
            angle,
            firing,
            weaponMode,
        });
    }, [pvp, weaponMode]);

    // Calculate score percentage
    const score = pvp.scores;
    const myScore = pvp.myTeam === 'blue' ? score.blue : score.red;
    const enemyScore = pvp.myTeam === 'blue' ? score.red : score.blue;

    // Waiting for game
    if (!pvp.isPlaying) {
        return (
            <div className="game-container">
                <div className="flex flex-col items-center justify-center h-screen gap-4">
                    <h1 className="text-2xl font-bold">Chroma Duel PvP</h1>

                    {!pvp.isConnected && (
                        <p>Connecting to server...</p>
                    )}

                    {pvp.isConnected && !pvp.roomId && (
                        <p>Waiting in queue...</p>
                    )}

                    {pvp.roomId && pvp.countdown > 0 && (
                        <div className="text-center">
                            <p>Match found!</p>
                            <p className="text-4xl font-bold">{pvp.countdown}</p>
                        </div>
                    )}

                    {pvp.roomId && pvp.countdown === 0 && !pvp.isPlaying && (
                        <p>Starting game...</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="game-container">
            <div className="game-layout">
                {/* Navbar with scores */}
                <GameNavbar
                    scoreBlue={myScore}
                    scoreRed={enemyScore}
                    timeLeft={pvp.timeLeft}
                />

                {/* PvP Canvas */}
                <div className="game-arena">
                    <PvPGameCanvas
                        gameState={pvp.gameState}
                        myTeam={pvp.myTeam || 'blue'}
                        onPlayerInput={handlePlayerInput}
                    />
                </div>

                {/* Controls */}
                <div className="game-controls p-4">
                    <div className="flex gap-2 justify-center">
                        {(['machineGun', 'shotgun', 'inkBomb'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setWeaponMode(mode)}
                                className={`px-4 py-2 rounded ${weaponMode === mode
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    <div className="text-center mt-2 text-sm text-gray-500">
                        Team: {pvp.myTeam?.toUpperCase()} | Opponent: {pvp.opponentName}
                    </div>
                </div>
            </div>
        </div>
    );
}
