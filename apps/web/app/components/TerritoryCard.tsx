'use client';

import { motion } from 'framer-motion';
import { Users, Lock, Radio } from 'lucide-react';
import { getTerritoryName } from '../utils/formatTerritory';

interface TerritoryCardProps {
    roomId: number;
    playerCount: number;
    maxPlayers?: number;
    onDeploy: (roomId: number) => void;
}

export default function TerritoryCard({
    roomId,
    playerCount,
    maxPlayers = 10,
    onDeploy
}: TerritoryCardProps) {
    const isFull = playerCount >= maxPlayers;
    const status = isFull ? 'LOCKED' : 'OPEN';
    const fillPercentage = (playerCount / maxPlayers) * 100;

    // Color & Visual Logic
    const accentColor = isFull ? 'text-red-600' : 'text-green-500';
    const borderColor = isFull ? 'border-red-900/50' : 'border-green-500/30';
    const glowColor = isFull ? 'shadow-red-900/20' : 'shadow-green-500/20';
    const bgGradient = isFull
        ? 'bg-gradient-to-br from-black/90 to-red-950/20'
        : 'bg-gradient-to-br from-black/90 to-green-950/20';

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isFull ? 0.7 : 1, y: 0 }}
            className={`
        relative group cursor-pointer overflow-hidden
        rounded-sm border ${borderColor} backdrop-blur-md
        ${bgGradient} shadow-lg ${glowColor}
      `}
            onClick={() => !isFull && onDeploy(roomId)}
        >
            {/* Grid Overlay (Low Opacity) */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Content Container */}
            <div className="relative z-10 p-5 flex flex-col gap-4">

                {/* Header: Sector Name & Status */}
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className={`text-xl font-mono tracking-tighter uppercase font-bold text-white group-hover:text-pink-500 transition-colors`}>
                            {getTerritoryName(roomId)}
                        </h3>
                        <p className="text-[10px] text-white/40 font-mono tracking-[0.2em] mt-1">
                            COORDS: #{roomId.toString().padStart(4, '0')}
                        </p>
                    </div>

                    <div className={`
            px-2 py-1 rounded-sm border ${isFull ? 'border-red-500/50 bg-red-900/20' : 'border-green-500/50 bg-green-900/20'}
            text-[10px] font-bold tracking-widest font-mono ${accentColor}
          `}>
                        <span className="animate-pulse mr-1">●</span>
                        {status}
                    </div>
                </div>

                {/* Capacity Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-white/60">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> UNITS</span>
                        <span>{playerCount}/{maxPlayers}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full ${fillPercentage > 80 ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_10px_currentColor]`}
                        />
                    </div>
                </div>

                {/* Action Button Area */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/30 text-xs font-mono">
                        <Radio className={`w-3 h-3 ${!isFull && 'text-green-500 animate-ping'} `} />
                        {isFull ? 'SIGNAL LOST' : 'LINK ESTABLISHED'}
                    </div>

                    <div className={`
                text-sm font-bold font-terminal tracking-wider flex items-center gap-2
                ${isFull ? 'text-white/30' : 'text-green-400 group-hover:text-pink-400 group-hover:underline'}
            `}>
                        {isFull ? (
                            <> <Lock className="w-3 h-3" /> RESTRICTED </>
                        ) : (
                            <> DEPLOY UNIT {'>'} </>
                        )}
                    </div>
                </div>
            </div>

            {/* Decorative Corner Accents */}
            <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${isFull ? 'border-red-800' : 'border-green-800'} opacity-50`} />
            <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${isFull ? 'border-red-800' : 'border-green-800'} opacity-50`} />

        </motion.div>
    );
}
