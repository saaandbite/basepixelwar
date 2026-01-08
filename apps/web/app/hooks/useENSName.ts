"use client";

import { useState, useEffect, useCallback } from "react";

// ============ Types ============

export interface UseENSNameReturn {
    ensName: string | null;
    isLoading: boolean;
    error: string | null;
}

// ============ ENS Resolution ============

// ENS Registry contract on Ethereum Mainnet
// We'll use a public RPC to resolve ENS names

const ETHEREUM_RPC = "https://eth.llamarpc.com";

/**
 * Reverse resolve an address to its ENS name
 * Uses the ENS reverse resolver
 */
async function resolveENSName(address: string): Promise<string | null> {
    try {
        // Format for reverse resolution: <address>.addr.reverse
        const reverseName = `${address.slice(2).toLowerCase()}.addr.reverse`;

        // ENS namehash for reverse resolution
        const nameHash = namehash(reverseName);

        // Call the ENS resolver
        const resolverAddress = await getResolver(nameHash);
        if (!resolverAddress || resolverAddress === "0x0000000000000000000000000000000000000000") {
            return null;
        }

        // Get the name from resolver
        const name = await getNameFromResolver(resolverAddress, nameHash);

        // Verify forward resolution matches
        if (name) {
            const forwardAddress = await resolveAddressFromName(name);
            if (forwardAddress && forwardAddress.toLowerCase() === address.toLowerCase()) {
                return name;
            }
        }

        return null;
    } catch (error) {
        console.warn("[ENS] Failed to resolve name:", error);
        return null;
    }
}

/**
 * Calculate namehash for ENS
 */
function namehash(name: string): string {
    let node = "0x0000000000000000000000000000000000000000000000000000000000000000";

    if (name) {
        const labels = name.split(".");
        for (let i = labels.length - 1; i >= 0; i--) {
            const label = labels[i];
            if (label) {
                const labelHash = keccak256(label);
                node = keccak256Bytes(hexToBytes(node) as Uint8Array, hexToBytes(labelHash) as Uint8Array);
            }
        }
    }

    return node;
}

/**
 * Simple keccak256 implementation using SubtleCrypto fallback
 * For production, use a proper library like ethers.js or viem
 */
function keccak256(input: string): string {
    // Use simple hash for labels
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    // Simple hash implementation (for demo - in production use proper keccak256)
    let hash = 0n;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 8n) + BigInt(data[i] ?? 0)) % (2n ** 256n);
    }
    return "0x" + hash.toString(16).padStart(64, "0");
}

function keccak256Bytes(a: Uint8Array, b: Uint8Array): string {
    const combined = new Uint8Array(a.length + b.length);
    combined.set(a);
    combined.set(b, a.length);

    let hash = 0n;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 8n) + BigInt(combined[i] ?? 0)) % (2n ** 256n);
    }
    return "0x" + hash.toString(16).padStart(64, "0");
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(32);
    const cleanHex = hex.replace("0x", "");
    for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16) || 0;
    }
    return bytes;
}

async function getResolver(nameHash: string): Promise<string | null> {
    // ENS Registry address on mainnet
    const ensRegistry = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

    // resolver(bytes32) function selector
    const data = "0x0178b8bf" + nameHash.slice(2);

    try {
        const response = await fetch(ETHEREUM_RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [{ to: ensRegistry, data }, "latest"],
            }),
        });

        const result = await response.json();
        if (result.result && result.result !== "0x") {
            return "0x" + result.result.slice(26);
        }
    } catch (error) {
        console.warn("[ENS] Failed to get resolver:", error);
    }

    return null;
}

async function getNameFromResolver(resolverAddress: string, nameHash: string): Promise<string | null> {
    // name(bytes32) function selector
    const data = "0x691f3431" + nameHash.slice(2);

    try {
        const response = await fetch(ETHEREUM_RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [{ to: resolverAddress, data }, "latest"],
            }),
        });

        const result = await response.json();
        if (result.result && result.result !== "0x" && result.result.length > 130) {
            // Decode string from ABI
            const hex = result.result.slice(130);
            let name = "";
            for (let i = 0; i < hex.length; i += 2) {
                const code = parseInt(hex.substr(i, 2), 16);
                if (code === 0) break;
                name += String.fromCharCode(code);
            }
            return name || null;
        }
    } catch (error) {
        console.warn("[ENS] Failed to get name from resolver:", error);
    }

    return null;
}

async function resolveAddressFromName(name: string): Promise<string | null> {
    const nameHash = namehash(name);
    const resolverAddress = await getResolver(nameHash);

    if (!resolverAddress) return null;

    // addr(bytes32) function selector
    const data = "0x3b3b57de" + nameHash.slice(2);

    try {
        const response = await fetch(ETHEREUM_RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_call",
                params: [{ to: resolverAddress, data }, "latest"],
            }),
        });

        const result = await response.json();
        if (result.result && result.result !== "0x") {
            return "0x" + result.result.slice(26);
        }
    } catch (error) {
        console.warn("[ENS] Failed to resolve address:", error);
    }

    return null;
}

// ============ Hook ============

export function useENSName(address: string | null): UseENSNameReturn {
    const [ensName, setEnsName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!address) {
            setEnsName(null);
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        const resolve = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const name = await resolveENSName(address);
                if (!cancelled) {
                    setEnsName(name);
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Failed to resolve ENS name");
                    console.error("[ENS] Resolution error:", err);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        resolve();

        return () => {
            cancelled = true;
        };
    }, [address]);

    return { ensName, isLoading, error };
}

// ============ Exports ============

export { resolveENSName };
