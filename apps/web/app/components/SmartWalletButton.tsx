"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet, formatAddress } from "../contexts/WalletContext";
import { Wallet, LogOut, Copy, Check, ExternalLink, ChevronDown } from "lucide-react";

interface SmartWalletButtonProps {
    className?: string;
    showBalance?: boolean;
}

/**
 * Custom Smart Wallet Connect Button
 * Uses wagmi's Smart Wallet connector (passkey/biometrics)
 * No wallet extension or app installation required
 */
export default function SmartWalletButton({ className = "", showBalance = false }: SmartWalletButtonProps) {
    const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
    const [showDropdown, setShowDropdown] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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
                {/* Avatar placeholder */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--pixel-blue)] to-[var(--pixel-red)]" />
                <span>{formatAddress(address!)}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--pixel-card-bg)] border-2 border-[var(--pixel-card-border)] rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* Wallet Info */}
                    <div className="p-4 border-b border-[var(--pixel-card-border)]">
                        <p className="text-sm text-[var(--pixel-fg)] mb-1">Connected Wallet</p>
                        <p className="text-white font-mono text-sm break-all">{address}</p>
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
            )}
        </div>
    );
}
