'use client';

// Golden Pixel Indicator Component - Shows golden pixel status and countdown

import { COLORS, GOLDEN_PIXEL_SPAWN_INTERVAL, GAME_DURATION } from '../lib/constants';
import type { GoldenPixel } from '../types';

interface GoldenPixelIndicatorProps {
    goldenPixel: GoldenPixel | null;
    timeLeft: number;
    lastGoldenPixelSpawn: number;
    isFrenzy: boolean;
    frenzyEndTime: number;
}

export function GoldenPixelIndicator({
    goldenPixel,
    timeLeft,
    lastGoldenPixelSpawn,
    isFrenzy,
    frenzyEndTime,
}: GoldenPixelIndicatorProps) {
    const elapsedTime = GAME_DURATION - timeLeft;
    const timeSinceLastSpawn = elapsedTime - lastGoldenPixelSpawn;
    const nextSpawnIn = Math.max(0, GOLDEN_PIXEL_SPAWN_INTERVAL - timeSinceLastSpawn);
    const frenzyTimeLeft = isFrenzy ? Math.max(0, (frenzyEndTime - Date.now()) / 1000) : 0;

    // Show frenzy mode indicator
    if (isFrenzy) {
        return (
            <div className="golden-indicator frenzy">
                <div className="frenzy-icon">⚡</div>
                <div className="frenzy-text">
                    <span className="frenzy-label">FRENZY!</span>
                    <span className="frenzy-time">{frenzyTimeLeft.toFixed(1)}s</span>
                </div>

                <style jsx>{`
                    .golden-indicator {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                    }

                    .golden-indicator.frenzy {
                        background: linear-gradient(135deg, ${COLORS.frenzy}, #ff9500);
                        color: white;
                        animation: frenzy-glow 0.3s ease-in-out infinite alternate;
                        box-shadow: 0 0 20px rgba(255, 107, 53, 0.6);
                    }

                    @keyframes frenzy-glow {
                        from { transform: scale(1); }
                        to { transform: scale(1.05); }
                    }

                    .frenzy-icon {
                        font-size: 16px;
                        animation: frenzy-pulse 0.2s ease-in-out infinite alternate;
                    }

                    @keyframes frenzy-pulse {
                        from { transform: scale(1); }
                        to { transform: scale(1.2); }
                    }

                    .frenzy-text {
                        display: flex;
                        flex-direction: column;
                        line-height: 1.1;
                    }

                    .frenzy-label {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }

                    .frenzy-time {
                        font-size: 14px;
                        font-weight: 700;
                    }
                `}</style>
            </div>
        );
    }

    // Show active golden pixel
    if (goldenPixel && goldenPixel.active) {
        return (
            <div className="golden-indicator active">
                <div className="golden-icon">🪙</div>
                <span className="golden-text">CAPTURE!</span>

                <style jsx>{`
                    .golden-indicator {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                    }

                    .golden-indicator.active {
                        background: linear-gradient(135deg, ${COLORS.golden}, #ffc107);
                        color: #7c5800;
                        animation: golden-pulse 0.5s ease-in-out infinite alternate;
                        box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
                    }

                    @keyframes golden-pulse {
                        from { transform: scale(1); box-shadow: 0 0 10px rgba(255, 215, 0, 0.4); }
                        to { transform: scale(1.02); box-shadow: 0 0 20px rgba(255, 215, 0, 0.7); }
                    }

                    .golden-icon {
                        font-size: 14px;
                        animation: coin-spin 1s linear infinite;
                    }

                    @keyframes coin-spin {
                        0% { transform: rotateY(0deg); }
                        100% { transform: rotateY(360deg); }
                    }

                    .golden-text {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        font-weight: 700;
                    }
                `}</style>
            </div>
        );
    }

    // Show countdown to next spawn
    return (
        <div className="golden-indicator countdown">
            <div className="countdown-icon">🪙</div>
            <span className="countdown-text">{Math.ceil(nextSpawnIn)}s</span>

            <style jsx>{`
                .golden-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 16px;
                    font-size: 11px;
                    font-weight: 600;
                }

                .golden-indicator.countdown {
                    background: rgba(255, 215, 0, 0.15);
                    color: #a08600;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                }

                .countdown-icon {
                    font-size: 12px;
                    opacity: 0.7;
                }

                .countdown-text {
                    font-variant-numeric: tabular-nums;
                }
            `}</style>
        </div>
    );
}
