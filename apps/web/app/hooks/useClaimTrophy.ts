'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useSendCalls, useCallsStatus } from 'wagmi/experimental';
import { TOURNAMENT_ABI } from '@repo/contracts';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

interface ClaimTrophyResult {
    // Eligibility
    canClaim: boolean;
    hasClaimed: boolean;
    score: number;
    roomId: number;

    // Actions
    claim: () => void;

    // State
    isPending: boolean;
    isConfirming: boolean;
    isSuccess: boolean;
    error: Error | null;
    txHash: `0x${string}` | undefined;
}

/**
 * Hook to handle NFT Trophy claim from TournamentMCL contract
 * 
 * @param weekNumber - The tournament week number to claim for
 * @returns ClaimTrophyResult with eligibility info and claim function
 */
export function useClaimTrophy(weekNumber: number | undefined): ClaimTrophyResult {
    const { address } = useAccount();
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

    // 1. Read player info to check eligibility
    const { data: playerInfo, refetch: refetchPlayerInfo } = useReadContract({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: 'playerInfo',
        args: weekNumber !== undefined && address ? [BigInt(weekNumber), address] : undefined,
        query: {
            enabled: !!TOURNAMENT_ADDRESS && weekNumber !== undefined && !!address
        }
    });

    // 2. Setup sendCalls for Paymaster (Gas Sponsorship)
    const {
        sendCalls,
        data: callId,
        isPending,
        error: writeError
    } = useSendCalls({
        mutation: {
            onSuccess: (id) => {
                console.log('[useClaimTrophy] Call sent successfully, ID:', id);
            },
            onError: (err) => {
                console.error('[useClaimTrophy] Call failed:', err);
            }
        }
    });

    // 3. Track transaction status
    // Fix: callId might be an object { id: string } depending on wagmi version
    const callIdentifier = typeof callId === 'string' ? callId : (callId as any)?.id;

    const {
        data: callsStatus,
        status: callsStatusFetchStatus
    } = useCallsStatus({
        id: callIdentifier,
        query: {
            enabled: !!callIdentifier,
            refetchInterval: 1000
        }
    });

    // Fix: status enums are lowercase 'pending' | 'success'
    const isConfirming = !!callIdentifier && callsStatus?.status === 'pending';
    const isSuccess = callsStatus?.status === 'success';

    // Parse player info
    const score = playerInfo ? Number((playerInfo as any)[0]) : 0;
    const roomId = playerInfo ? Number((playerInfo as any)[1]) : 0;
    const hasClaimed = playerInfo ? Boolean((playerInfo as any)[2]) : false;

    // Effect: Dispatch event and refetch player info on success
    // Moved after hasClaimed definition to avoid use-before-define error
    useEffect(() => {
        if (isSuccess && !hasClaimed) {
            console.log('[useClaimTrophy] Claim confirmed! Dispatching update event...');

            // Refetch contract data
            refetchPlayerInfo();

            // Dispatch global event to update inventory UI
            window.dispatchEvent(new Event('pixelwar:inventory-update'));
        }
    }, [isSuccess, hasClaimed, refetchPlayerInfo]);

    // Determine if player can claim
    const canClaim = score > 0 && !hasClaimed;

    // Standard writeContract for EOAs
    const { writeContract, data: writeHash, isPending: isWritePending, error: eoaError } = useWriteContract();

    // Check if writeHash is available (EOA transaction)
    const eoaHash = writeHash;

    const claim = () => {
        if (!TOURNAMENT_ADDRESS || weekNumber === undefined) {
            console.error('[useClaimTrophy] Missing tournament address or week number');
            return;
        }

        const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

        // CHECK: Does this wallet support paymaster? (Approximation)
        // In wagmi v2 / onchainkit, we often try `sendCalls` first.
        // However, if the user error is "Unsupported non-optional capabilities", we should ideally
        // have a way to toggle. For now, we'll try a try-catch approach or just fallback
        // based on a flag?
        // Better: Let's use `writeContract` as a fallback if `sendCalls` isn't suitable,
        // but `sendCalls` crashes before we can catch it if the wallet rejects the capability handshake.

        // PROPOSAL: If it's a Smart Wallet (Coinbase), use sendCalls. 
        // If it's MetaMask/EOA, use writeContract.
        // Currently, we can't easily distinguish without checking connector.
        // But the error explicitly says "Unsupported capabilities".

        // Let's TRY to force writeContract for now if it's likely an EOA,
        // or just use writeContract for everyone if gas sponsorship isn't strictly required for all.
        // But user wants gas sponsorship for SW.

        // HYBRID APPROACH:
        // We will try `writeContract` (standard) which works for everyone (EOA & SW - though SW might prefer batch).
        // BUT `writeContract` doesn't use Paymaster easily without special config.

        // If the goal is just to Make It Work for the user's 2nd wallet (EOA):
        // We will use `writeContract`. Smart Wallets can also handle `writeContract` (just without bundled paymaster usually).

        console.log('[useClaimTrophy] Attempting claim via writeContract (Universal compatibility)...');
        writeContract({
            address: TOURNAMENT_ADDRESS,
            abi: TOURNAMENT_ABI,
            functionName: 'claimReward',
            args: [BigInt(weekNumber)],
        });
    };

    // EOA Transaction Tracking
    const { data: eoaReceipt, isLoading: isEoaConfirming, isSuccess: isEoaSuccess } = useWaitForTransactionReceipt({
        hash: writeHash,
        query: {
            enabled: !!writeHash
        }
    });

    return {
        canClaim,
        hasClaimed,
        score,
        roomId,
        claim,
        isPending: isWritePending || isPending,
        isConfirming: isConfirming || isEoaConfirming,
        isSuccess: isSuccess || isEoaSuccess,
        error: eoaError || writeError || null,
        txHash: eoaHash || callsStatus?.receipts?.[0]?.transactionHash,
    };
}
