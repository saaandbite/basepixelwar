"use client";

import { useState, useRef, useEffect } from "react";
import { useBalance } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useWallet, formatAddress } from "../contexts/WalletContext";
import { useNFTInventory } from "../hooks/useNFTInventory";
import { User, LogOut, Copy, Check, ExternalLink, ChevronDown, Wallet, Trophy, Loader2 } from "lucide-react";

interface SmartWalletButtonProps {
    className?: string;
    showBalance?: boolean;
}

/**
 * Smart Wallet Button with Profile View
 * After connection, shows Profile with:
 * - Wallet address
 * - ETH balance
 * - NFT inventory (PixelWar Trophies)
 */
export default function SmartWalletButton({ className = "", showBalance = true }: SmartWalletButtonProps) {
    const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
    const [showDropdown, setShowDropdown] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch ETH balance
    const { data: balance, isLoading: balanceLoading } = useBalance({
        address: address as `0x${string}`,
        chainId: baseSepolia.id,
        query: {
            enabled: !!address,
        }
    });

    // Fetch NFT inventory
    const { nfts, loading: nftsLoading, totalCount } = useNFTInventory(address || undefined);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCopyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDisconnect = () => {
        disconnect();
        setShowDropdown(false);
    };

    // Format balance to 4 decimal places
    const formattedBalance = balance
        ? parseFloat(balance.formatted).toFixed(4)
        : '0.0000';

    // Button base styles
    const baseStyles = "flex items-center gap-2 px-4 py-2 font-terminal text-lg transition-all rounded-lg";
    const connectedStyles = "bg-[var(--pixel-card-bg)] border-2 border-[var(--pixel-card-border)] hover:border-[var(--pixel-blue)] text-white";
    const disconnectedStyles = "bg-[var(--pixel-blue)] border-2 border-[var(--pixel-blue)] hover:bg-[var(--pixel-blue)]/80 text-white";

    if (!isConnected) {
        const handleConnect = async () => {
            console.log('[SmartWalletButton] Connect clicked, isConnecting:', isConnecting);
            if (!isConnecting) {
                await connect();
            }
        };

        return (
            <button
                onClick={handleConnect}
                disabled={isConnecting}
                className={`${baseStyles} ${disconnectedStyles} ${className}`}
            >
                {isConnecting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CONNECTING...</span>
                    </>
                ) : (
                    <>
                        <Wallet className="w-5 h-5" />
                        <span>CONNECT</span>
                    </>
                )}
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`${baseStyles} ${connectedStyles} ${className}`}
            >
                {/* Profile Icon */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--pixel-blue)] to-[var(--pixel-pink)] flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                </div>
                <span>PROFILE</span>
                {/* Balance Badge */}
                {showBalance && (
                    <span className="bg-[var(--pixel-blue)]/20 px-2 py-0.5 rounded text-sm text-[var(--pixel-blue)]">
                        {balanceLoading ? '...' : `${formattedBalance} ETH`}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Modal Overlay */}
            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                    {/* Centered Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div
                            className="w-full max-w-sm bg-[#1a1a2e]/95 backdrop-blur-xl border-2 border-white/20 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header: Wallet Info */}
                            <div className="p-4 border-b border-[var(--pixel-card-border)] bg-gradient-to-r from-[var(--pixel-blue)]/10 to-transparent">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--pixel-blue)] to-[var(--pixel-pink)] flex items-center justify-center">
                                        <User className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-[var(--pixel-fg)] mb-0.5">Connected Wallet</p>
                                        <p className="text-white font-mono text-sm">{formatAddress(address!)}</p>
                                    </div>
                                </div>
                                {/* Balance Display */}
                                <div className="bg-black/30 rounded-lg p-3 mt-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--pixel-fg)] text-sm">Balance</span>
                                        <span className="text-white font-bold text-lg">
                                            {balanceLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                `${formattedBalance} ETH`
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* NFT Inventory Section */}
                            <div className="p-4 border-b border-[var(--pixel-card-border)]">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-[var(--pixel-yellow)]" />
                                        <span className="text-sm font-bold text-white">NFT Trophies</span>
                                    </div>
                                    <span className="text-xs bg-[var(--pixel-yellow)]/20 text-[var(--pixel-yellow)] px-2 py-0.5 rounded-full">
                                        {totalCount}
                                    </span>
                                </div>

                                {nftsLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-6 h-6 animate-spin text-[var(--pixel-blue)]" />
                                    </div>
                                ) : nfts.length === 0 ? (
                                    <div className="text-center py-6 text-[var(--pixel-fg)] text-sm border-2 border-dashed border-white/10 rounded-lg">
                                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p>No trophies yet</p>
                                        <p className="text-xs opacity-50 mt-1">Win tournaments to earn NFTs!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                        {nfts.map((nft) => (
                                            <a
                                                key={nft.tokenId}
                                                href={nft.openSeaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative aspect-square bg-black/30 rounded-lg overflow-hidden border-2 border-white/10 hover:border-[var(--pixel-yellow)] transition-all hover:scale-105"
                                                title={`${nft.name} - Click to view on OpenSea`}
                                            >
                                                {/* NFT Image (SVG) */}
                                                {nft.image ? (
                                                    <img
                                                        src={nft.image}
                                                        alt={nft.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Trophy className="w-8 h-8 text-[var(--pixel-yellow)]" />
                                                    </div>
                                                )}
                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <ExternalLink className="w-5 h-5 text-white" />
                                                </div>
                                                {/* Week Badge */}
                                                <div className="absolute bottom-1 left-1 right-1 text-center">
                                                    <span className="text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-[var(--pixel-yellow)]">
                                                        W{nft.attributes.week}
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-2">
                                <button
                                    onClick={handleCopyAddress}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-[var(--pixel-green)]" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-[var(--pixel-fg)]" />
                                    )}
                                    <span className="text-white">{copied ? "Copied!" : "Copy Address"}</span>
                                </button>

                                <a
                                    href={`https://sepolia.basescan.org/address/${address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <ExternalLink className="w-5 h-5 text-[var(--pixel-fg)]" />
                                    <span className="text-white">View on Basescan</span>
                                </a>

                                <a
                                    href="https://keys.coinbase.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Wallet className="w-5 h-5 text-[var(--pixel-fg)]" />
                                    <span className="text-white">Manage Wallet</span>
                                </a>

                                <hr className="my-2 border-[var(--pixel-card-border)]" />

                                <button
                                    onClick={handleDisconnect}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-500/20 rounded-lg transition-colors text-[var(--pixel-red)]"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Disconnect</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
