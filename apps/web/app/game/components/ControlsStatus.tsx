'use client';

// Controls & Status Component - Shows control hints and powerup status

import { memo } from 'react';

interface ControlsStatusProps {
    shield: number;
    globalShield?: { active: boolean; team: 'blue' | 'red'; endTime: number } | null;
    footerStatus: { name: string; icon: string; color: string } | null;
}

const ControlsStatusMemo = memo(ControlsStatusComponent);

export const ControlsStatus = ControlsStatusMemo;

function ControlsStatusComponent({
    shield,
    footerStatus,
    globalShield,
}: ControlsStatusProps) {
    const renderFooterIcon = (iconName: string) => {
        switch (iconName) {
            case 'auto_awesome':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                );
            case 'shield':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                    </svg>
                );
            case 'radioactive':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3-3M15.5 14.5A2.5 2.5 0 0 1 13 12c0-1.38.5-2 1-3 1.072-2.143 2.072-2.143 3-3" />
                        <path d="M12 12h.01" />
                        <path d="M12 2a10 10 0 1 0 10 10" />
                        <path d="M22 12h-2" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full flex justify-between items-center px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-200/50">
            {/* Controls Hint (LEFT) */}
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Controls</span>
                <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2c0 .667-1 2-1 3.5s2 1.833 2 2.5c0 1.667-1.333 2-2 2H8.5c-.667 0-1.333-.333-2-1-.667-.667-1.5-3-2.5-3S3 6.5 3 7.5s1.333 5.5 3 6 1.333.5 2 1.5 2 2 3.5 2 2-.333 3.5-1.5 1-2.5 1-4-.5-4-1-5S14 1.333 14 2Z" />
                    </svg>
                    <span className="text-xs font-medium">Hold & drag to shoot</span>
                </div>
            </div>

            {/* Status (RIGHT) */}
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                <div className="mt-0.5">
                    {footerStatus ? (
                        <div className={`flex items-center gap-1 ${footerStatus.color} animate-pulse`}>
                            {renderFooterIcon(footerStatus.icon)}
                            <span className="text-xs font-bold">{footerStatus.name}</span>
                        </div>
                    ) : shield > 0 ? (
                        <div className="flex items-center gap-1 text-green-500">
                            {renderFooterIcon('shield')}
                            <span className="text-xs font-bold">Shield x{shield}</span>
                        </div>
                    ) : globalShield?.active && globalShield.team === 'blue' ? (
                        <div className="flex items-center gap-1 text-green-500 animate-pulse">
                            {renderFooterIcon('shield')}
                            <span className="text-xs font-bold">Protected</span>
                        </div>
                    ) : (
                        <span className="text-xs text-slate-300 font-medium">No boosters</span>
                    )}
                </div>
            </div>
        </div>
    );
}
