'use client';

// Ink Bar Component - Shows player's ink level

import { memo } from 'react';
import { COLORS, INK_MAX, WEAPON_MODES } from '../lib/constants';

interface InkBarProps {
    ink: number;
    maxInk: number;
    isFrenzy: boolean;
    frenzyEndTime: number;
}

const InkBarMemo = memo(InkBarComponent);

export const InkBar = InkBarMemo;

function InkBarComponent({ ink, maxInk, isFrenzy, frenzyEndTime }: InkBarProps) {
    const percentage = (ink / maxInk) * 100;
    const frenzyTimeLeft = isFrenzy ? Math.max(0, (frenzyEndTime - Date.now()) / 1000) : 0;

    return (
        <div className="ink-bar-container">
            <div className="ink-bar-wrapper">
                {/* Ink icon */}
                <div className="ink-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isFrenzy ? COLORS.frenzy : COLORS.ink}>
                        <path d="M12 2C12 2 4 10 4 15C4 19.4 7.6 23 12 23C16.4 23 20 19.4 20 15C20 10 12 2 12 2ZM12 21C8.7 21 6 18.3 6 15C6 11.4 11 5.8 12 4.5C13 5.8 18 11.4 18 15C18 18.3 15.3 21 12 21Z" />
                        <circle cx="12" cy="15" r="4" opacity="0.6" />
                    </svg>
                </div>

                {/* Ink bar */}
                <div className="ink-bar-track">
                    <div
                        className={`ink-bar-fill ${isFrenzy ? 'frenzy' : ''}`}
                        style={{ width: `${isFrenzy ? 100 : percentage}%` }}
                    />

                    {/* Cost markers */}
                    <div className="ink-cost-markers">
                        <div
                            className="ink-cost-marker"
                            style={{ left: `${(WEAPON_MODES.machineGun.cost / maxInk) * 100}%` }}
                            title="Machine Gun: 1"
                        />
                        <div
                            className="ink-cost-marker"
                            style={{ left: `${(WEAPON_MODES.shotgun.cost / maxInk) * 100}%` }}
                            title="Shotgun: 5"
                        />
                        <div
                            className="ink-cost-marker large"
                            style={{ left: `${(WEAPON_MODES.inkBomb.cost / maxInk) * 100}%` }}
                            title="Ink Bomb: 20"
                        />
                    </div>
                </div>

                {/* Ink value */}
                <div className={`ink-value ${isFrenzy ? 'frenzy' : ''}`}>
                    {isFrenzy ? (
                        <span className="frenzy-text">∞ {frenzyTimeLeft.toFixed(1)}s</span>
                    ) : (
                        <span>{Math.floor(ink)}</span>
                    )}
                </div>
            </div>

            <style jsx>{`
                .ink-bar-container {
                    width: 100%;
                    padding: 0 8px;
                }

                .ink-bar-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    padding: 6px 10px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(76, 201, 240, 0.3);
                }

                .ink-icon {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .ink-bar-track {
                    flex: 1;
                    height: 12px;
                    background: linear-gradient(to right, #e2e8f0, #f1f5f9);
                    border-radius: 6px;
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                }

                .ink-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, ${COLORS.ink}, #3b82f6);
                    border-radius: 6px;
                    transition: width 0.1s ease-out;
                    box-shadow: 0 0 8px rgba(76, 201, 240, 0.4);
                }

                .ink-bar-fill.frenzy {
                    background: linear-gradient(90deg, ${COLORS.frenzy}, #ff9500, ${COLORS.frenzy});
                    background-size: 200% 100%;
                    animation: frenzy-pulse 0.5s ease-in-out infinite;
                }

                @keyframes frenzy-pulse {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }

                .ink-cost-markers {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                }

                .ink-cost-marker {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: rgba(255, 255, 255, 0.6);
                }

                .ink-cost-marker.large {
                    width: 3px;
                    background: rgba(255, 255, 255, 0.8);
                }

                .ink-value {
                    flex-shrink: 0;
                    min-width: 36px;
                    text-align: right;
                    font-size: 12px;
                    font-weight: 700;
                    color: #334155;
                    font-variant-numeric: tabular-nums;
                }

                .ink-value.frenzy {
                    color: ${COLORS.frenzy};
                }

                .frenzy-text {
                    font-size: 11px;
                    animation: frenzy-blink 0.3s ease-in-out infinite;
                }

                @keyframes frenzy-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `}</style>
        </div>
    );
}
