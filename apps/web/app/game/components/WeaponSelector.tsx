'use client';

// Weapon Selector Component - Lets player switch between weapon modes

import { memo } from 'react';
import { COLORS, WEAPON_MODES, type WeaponModeType } from '../lib/constants';
import type { WeaponMode } from '../types';

interface WeaponSelectorProps {
    currentMode: WeaponMode;
    ink: number;
    isFrenzy: boolean;
    onSelectMode: (mode: WeaponMode) => void;
}

const WEAPON_LIST: { mode: WeaponModeType; key: string }[] = [
    { mode: 'machineGun', key: '1' },
    { mode: 'shotgun', key: '2' },
    { mode: 'inkBomb', key: '3' },
];

const WeaponSelectorMemo = memo(WeaponSelectorComponent);

export const WeaponSelector = WeaponSelectorMemo;

function WeaponSelectorComponent({ currentMode, ink, isFrenzy, onSelectMode }: WeaponSelectorProps) {
    return (
        <div className="weapon-selector">
            {WEAPON_LIST.map(({ mode, key }) => {
                const config = WEAPON_MODES[mode];
                const canAfford = isFrenzy || ink >= config.cost;
                const isActive = currentMode === mode;

                return (
                    <button
                        key={mode}
                        className={`weapon-btn ${isActive ? 'active' : ''} ${!canAfford ? 'disabled' : ''}`}
                        onClick={() => canAfford && onSelectMode(mode)}
                        disabled={!canAfford}
                        title={`${config.name} - ${config.cost} ink\n${config.description}`}
                    >
                        <span className="weapon-icon">{config.icon}</span>
                        <span className="weapon-cost">{config.cost}</span>
                        <span className="weapon-key">{key}</span>
                    </button>
                );
            })}

            <style jsx>{`
                .weapon-selector {
                    display: flex;
                    gap: 6px;
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 16px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                }

                .weapon-btn {
                    position: relative;
                    width: 52px;
                    height: 52px;
                    border-radius: 12px;
                    border: 2px solid #e2e8f0;
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                    cursor: pointer;
                    transition: all 0.15s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                }

                .weapon-btn:hover:not(.disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border-color: ${COLORS.ink};
                }

                .weapon-btn:active:not(.disabled) {
                    transform: translateY(0);
                }

                .weapon-btn.active {
                    border-color: ${COLORS.ink};
                    background: linear-gradient(180deg, rgba(76, 201, 240, 0.15) 0%, rgba(76, 201, 240, 0.25) 100%);
                    box-shadow: 0 0 0 3px rgba(76, 201, 240, 0.2), 0 4px 12px rgba(76, 201, 240, 0.3);
                }

                .weapon-btn.disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    filter: grayscale(0.8);
                }

                .weapon-icon {
                    font-size: 20px;
                    line-height: 1;
                }

                .weapon-cost {
                    font-size: 10px;
                    font-weight: 700;
                    color: #64748b;
                    background: rgba(0, 0, 0, 0.05);
                    padding: 1px 4px;
                    border-radius: 4px;
                }

                .weapon-btn.active .weapon-cost {
                    color: ${COLORS.ink};
                    background: rgba(76, 201, 240, 0.2);
                }

                .weapon-key {
                    position: absolute;
                    top: 2px;
                    right: 4px;
                    font-size: 9px;
                    font-weight: 600;
                    color: #94a3b8;
                    opacity: 0.7;
                }
            `}</style>
        </div>
    );
}
