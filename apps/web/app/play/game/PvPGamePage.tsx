'use client';

// PvP Game Page - Separate from AI mode for cleaner architecture

import React, { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { usePvPGame } from './hooks/usePvPGame';
import { useWallet } from '../../contexts/WalletContext'; // Import useWallet
import { PvPGameCanvas } from './components/PvPGameCanvas';
import { PvPGameNavbar } from './components/PvPGameNavbar';
import { PvPGameControls } from './components/PvPGameControls';
import { PvPGameOverModal } from './components/PvPGameOverModal';
import { GoldenPixelIndicator } from './components/GoldenPixelIndicator';
import { ComboEffect } from './components/ComboEffect';
import { WEAPON_MODES } from './lib/constants';
import './game.css';

export function PvPGamePage() {
    const pvp = usePvPGame();
    const { address: myWallet } = useWallet();
    const [weaponMode, setWeaponMode] = useState<'machineGun' | 'shotgun' | 'inkBomb'>('machineGun');
    const [justUsedInkBomb, setJustUsedInkBomb] = useState(false);
    const [isTournament, setIsTournament] = useState(false);

    // Connect and join queue on mount
    useEffect(() => {
        setIsTournament(sessionStorage.getItem('is_tournament') === 'true');
        pvp.connect();

        // Check for session storage data from /room page (commented out for persistence)
        // const team = sessionStorage.getItem('pvp_team') as 'blue' | 'red' | null;
        // if (team) {... }

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
        // Jika sedang menembak dengan ink bomb, set flag untuk auto-switch
        if (weaponMode === 'inkBomb' && firing) {
            setJustUsedInkBomb(true);
        }

        pvp.sendInput({
            angle,
            firing,
            weaponMode,
            targetPos,
        });
    }, [pvp, weaponMode]);

    // Get My Ink Level
    let myInk = 0;
    let myWeaponStates: Record<'machineGun' | 'shotgun' | 'inkBomb', { usage: number; isOverheated: boolean; cooldownEndTime: number }> | undefined;
    let myIsFrenzy = false;

    if (pvp.gameState && pvp.myTeam) {
        if (pvp.myTeam === 'blue') {
            myInk = pvp.gameState.player1.ink;
            myWeaponStates = pvp.gameState.player1.weaponStates;
            myIsFrenzy = !!pvp.gameState.player1.isFrenzy;
        } else {
            myInk = pvp.gameState.player2.ink;
            myWeaponStates = pvp.gameState.player2.weaponStates;
            myIsFrenzy = !!pvp.gameState.player2.isFrenzy;
        }
    }

    // AUTO-SWITCH WEAPON: Only between Machine Gun and Shotgun (exclude Ink Bomb)
    useEffect(() => {
        if (!myWeaponStates) return;

        // Only auto-switch for machineGun and shotgun
        if (weaponMode === 'inkBomb') return;

        const currentState = myWeaponStates[weaponMode];
        if (!currentState.isOverheated) return;

        // Current weapon is overheated, try to switch to alternate
        const alternateWeapon = weaponMode === 'machineGun' ? 'shotgun' : 'machineGun';
        const alternateState = myWeaponStates[alternateWeapon];
        const alternateInkCost = alternateWeapon === 'machineGun' ? 1 : 5; // From constants
        const hasEnoughInk = myIsFrenzy || myInk >= alternateInkCost;

        if (!alternateState.isOverheated && hasEnoughInk) {
            setWeaponMode(alternateWeapon);
        }
    }, [weaponMode, myWeaponStates, myInk, myIsFrenzy]);

    // AUTO-SWITCH PASCA PENGGUNAAN INK BOMB
    useEffect(() => {
        if (!myWeaponStates || !justUsedInkBomb) return;

        // Cari senjata alternatif yang tersedia (tidak overheat dan cukup ink)
        const availableWeapons = [
            { mode: 'machineGun', state: myWeaponStates.machineGun, config: WEAPON_MODES.machineGun },
            { mode: 'shotgun', state: myWeaponStates.shotgun, config: WEAPON_MODES.shotgun }
        ].filter(item =>
            !item.state.isOverheated &&
            (myIsFrenzy || myInk >= item.config.cost)
        );

        if (availableWeapons.length > 0) {
            // Pilih senjata pertama yang tersedia (bisa dimodifikasi untuk prioritas tertentu)
            const bestWeapon = availableWeapons[0];
            if (bestWeapon) {
                setWeaponMode(bestWeapon.mode as 'machineGun' | 'shotgun');
            }
        }

        // Reset flag setelah switch
        setJustUsedInkBomb(false);
    }, [justUsedInkBomb, myWeaponStates, myInk, myIsFrenzy]);

    // Track Stats
    const [stats, setStats] = useState({ currentTiles: 0, totalCaptured: 0 });
    // Ref to store previous grid state for change detection
    const prevGridRef = React.useRef<string[][] | null>(null);

    // Combo Tracking (Client-Side)
    const [comboStreak, setComboStreak] = useState(0);
    const lastCaptureTimeRef = React.useRef<number>(0);
    const lastComboIncrementTimeRef = React.useRef<number>(0);

    useEffect(() => {
        if (!pvp.gameState || !pvp.myTeam) return;

        const currentGrid = pvp.gameState.grid;
        // Safety check: grid must exist
        if (!currentGrid) return;

        const myTeam = pvp.myTeam;
        const prevGrid = prevGridRef.current;

        // 1. Initialize Ref if first run
        if (!prevGrid) {
            // Create a deep copy for the ref
            // Use safe iteration
            const initialCopy: string[][] = [];
            let initialCount = 0;

            for (let x = 0; x < currentGrid.length; x++) {
                const row = currentGrid[x];
                if (!row) {
                    initialCopy.push([]);
                    continue;
                }

                // Copy row
                initialCopy.push([...row]);

                for (let y = 0; y < row.length; y++) {
                    if (row[y] === myTeam) initialCount++;
                }
            }

            setStats(prev => ({ ...prev, currentTiles: initialCount }));
            prevGridRef.current = initialCopy;
            return;
        }

        // 2. Compare Grids (Calculate Delta & Current)
        let newCaptures = 0;
        let currentCount = 0;

        for (let x = 0; x < currentGrid.length; x++) {
            const currentRow = currentGrid[x];
            if (!currentRow) continue;

            const prevRow = prevGrid[x];

            for (let y = 0; y < currentRow.length; y++) {
                const cellColor = currentRow[y];

                // Count current owned
                if (cellColor === myTeam) {
                    currentCount++;
                }

                // Detect Capture: Was NOT mine, now IS mine
                // explicit check for prevRow existence and element check
                if (prevRow && prevRow[y] !== myTeam && cellColor === myTeam) {
                    newCaptures++;
                }
            }
        }

        // 3. Update State
        setStats(prev => ({
            currentTiles: currentCount,
            totalCaptured: prev.totalCaptured + newCaptures
        }));

        // 3.5 Update Combo Streak
        if (newCaptures > 0) {
            const now = Date.now();
            const timeDiff = now - lastCaptureTimeRef.current;

            if (timeDiff < 1500) { // 1.5s window to keep streak ALIVE
                // But only increment number if enough time passed (Throttle)
                if (now - lastComboIncrementTimeRef.current > 500) {
                    setComboStreak(prev => prev + 1);
                    lastComboIncrementTimeRef.current = now;
                }
            } else {
                // Streak broken or started
                setComboStreak(1);
                lastComboIncrementTimeRef.current = now;
            }
            // Always update last capture time to keep "alive"
            lastCaptureTimeRef.current = now;
        } else if (Date.now() - lastCaptureTimeRef.current > 1500 && comboStreak > 0) {
            // Reset combo if too much time passed (checked on grid update)
            setComboStreak(0);
        }

        // 4. Update Ref (Clone)
        // We can just map safe rows
        prevGridRef.current = currentGrid.map(col => col ? [...col] : []);

    }, [pvp.gameState, pvp.myTeam]);

    // Calculate payment deadline countdown
    const [paymentTimeLeft, setPaymentTimeLeft] = React.useState(60);

    React.useEffect(() => {
        if (!pvp.pendingPayment || !pvp.paymentStatus?.deadline) return;

        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((pvp.paymentStatus!.deadline - Date.now()) / 1000));
            setPaymentTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [pvp.pendingPayment, pvp.paymentStatus?.deadline]);

    // Pay & Play confirmation screen
    if (pvp.pendingPayment && pvp.paymentStatus) {
        const myPaid = pvp.isFirstPlayer ? pvp.paymentStatus.player1Paid : pvp.paymentStatus.player2Paid;

        return (
            <div className="game-container bg-slate-50">
                <div className="flex flex-col items-center justify-center h-screen gap-6 p-4">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                        MATCH FOUND!
                    </h1>

                    <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6 w-full max-w-sm">
                        {/* Opponent Info */}
                        <p className="text-slate-600">
                            Opponent: <span className="font-bold text-slate-800">{pvp.opponentName}</span>
                        </p>

                        {/* Payment Status Indicators */}
                        <div className="flex gap-8 text-center">
                            <div className="flex flex-col items-center">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${pvp.paymentStatus.player1Paid
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-200 text-slate-400'
                                    }`}>
                                    {pvp.paymentStatus.player1Paid ? <Check size={16} /> : '1'}
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    {pvp.isFirstPlayer ? 'You' : 'Opponent'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {pvp.paymentStatus.player1Paid ? 'Paid' : 'Waiting'}
                                </p>
                            </div>

                            <div className="flex items-center text-slate-300 text-2xl">
                                VS
                            </div>

                            <div className="flex flex-col items-center">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${pvp.paymentStatus.player2Paid
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-200 text-slate-400'
                                    }`}>
                                    {pvp.paymentStatus.player2Paid ? '✓' : '2'}
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    {!pvp.isFirstPlayer ? 'You' : 'Opponent'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {pvp.paymentStatus.player2Paid ? 'Paid' : 'Waiting'}
                                </p>
                            </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="text-center">
                            <p className="text-slate-400 text-sm">
                                Time remaining: <span className="font-mono font-bold text-slate-600">{paymentTimeLeft}s</span>
                            </p>
                            {paymentTimeLeft <= 10 && (
                                <p className="text-red-500 text-xs mt-1 animate-pulse">Hurry up!</p>
                            )}
                        </div>

                        {/* Entry Fee Display */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl w-full text-center border border-blue-100">
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Entry Fee</p>
                            <p className="text-2xl font-bold text-slate-800">0.001 ETH</p>
                            <p className="text-slate-500 text-xs mt-1">Winner takes 0.00198 ETH (1% fee)</p>
                        </div>

                        {/* Error Message */}
                        {pvp.paymentError && (
                            <div className="bg-red-50 border border-red-200 p-3 rounded-xl w-full">
                                <p className="text-red-600 text-sm text-center">{pvp.paymentError}</p>
                                <button
                                    onClick={pvp.clearPaymentError}
                                    className="text-red-400 text-xs underline w-full text-center mt-1"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={pvp.cancelPayment}
                                disabled={pvp.isPaymentLoading}
                                className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={pvp.payToPlay}
                                disabled={pvp.isPaymentLoading || myPaid}
                                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${myPaid
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                    } disabled:opacity-70`}
                            >
                                {pvp.isPaymentLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                        Confirming...
                                    </span>
                                ) : myPaid ? (
                                    'Waiting for opponent...'
                                ) : (
                                    'Pay & Play'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Waiting for game (Only if NOT playing AND NOT Game Over AND NOT pending payment)
    if (!pvp.isPlaying && !pvp.gameOverResult) {
        return (
            <div className="game-container bg-slate-50">
                <div className="flex flex-col items-center justify-center h-screen gap-6">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">PIXEL WAR <span className="text-blue-500">BATTLE</span></h1>

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
        sessionStorage.removeItem('is_tournament');

        if (isTournament) {
            window.location.href = '/tournament';
        } else {
            window.location.href = '/room';
        }
    };

    return (
        <div className="game-container bg-slate-50 h-[100dvh] flex flex-col overflow-hidden">
            <div className="max-w-[420px] mx-auto w-full h-full flex flex-col bg-white shadow-2xl relative">

                <PvPGameNavbar
                    scoreBlue={pvp.scores.blue}
                    scoreRed={pvp.scores.red}
                    timeLeft={pvp.timeLeft}
                    myTeam={pvp.myTeam || 'blue'}
                    blueWallet={pvp.myTeam === 'blue' ? myWallet || undefined : pvp.opponentWallet || undefined}
                    redWallet={pvp.myTeam === 'red' ? myWallet || undefined : pvp.opponentWallet || undefined}
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

                    {/* Combo Effect Notification */}
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <ComboEffect show={comboStreak >= 2} comboStreak={comboStreak} />
                    </div>

                    <div className="absolute inset-0">
                        <PvPGameCanvas
                            gameState={pvp.gameState}
                            myTeam={pvp.myTeam || 'blue'}
                            onPlayerInput={handlePlayerInput}
                        />
                    </div>

                    {/* Game Over Modal Overlay */}
                    {pvp.gameOverResult && (
                        <PvPGameOverModal
                            myTeam={pvp.myTeam!}
                            scores={pvp.gameOverResult.scores}
                            stats={{
                                currentTilesOwned: stats.currentTiles,
                                totalTilesCaptured: stats.totalCaptured
                            }}
                            settlementTxHash={pvp.settlementTxHash}
                            onExit={handleExit}
                            isTournament={isTournament}
                        />
                    )}
                </div>

                {/* Controls - Fixed at bottom (hidden when game over) */}
                {!pvp.gameOverResult && (
                    <div className="shrink-0 z-20">
                        <PvPGameControls
                            weaponMode={weaponMode}
                            setWeaponMode={setWeaponMode}
                            inkLevel={myInk}
                            myTeam={pvp.myTeam || 'blue'}
                            weaponStates={
                                pvp.gameState
                                    ? (pvp.myTeam === 'blue' ? pvp.gameState.player1.weaponStates : pvp.gameState.player2.weaponStates)
                                    : undefined
                            }
                            isFrenzy={
                                pvp.gameState
                                    ? (pvp.myTeam === 'blue' ? !!pvp.gameState.player1.isFrenzy : !!pvp.gameState.player2.isFrenzy)
                                    : false
                            }
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
