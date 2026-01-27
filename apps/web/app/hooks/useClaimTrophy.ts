'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
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

    const claim = () => {
        if (!TOURNAMENT_ADDRESS || weekNumber === undefined) {
            console.error('[useClaimTrophy] Missing tournament address or week number');
            return;
        }

        const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

        sendCalls({
            calls: [
                {
                    to: TOURNAMENT_ADDRESS,
                    abi: TOURNAMENT_ABI,
                    functionName: 'claimReward',
                    args: [BigInt(weekNumber)],
                },
            ],
            capabilities: {
                paymasterService: {
                    url: paymasterUrl || '',
                },
            },
        });
    };

    // We need to track confirmation. If we don't have `useCallsStatus` easily, we can just rely on manual refresh/polling playerInfo.
    // But let's look at the imports. I'll stick to a simple `useEffect` that checks for `callId` and assumes "processing".

    // For robust UX, let's import `useCallsStatus` from wagmi/experimental as well.
    // I will rewrite the imports in a separate chunk to be safe.

    return {
        canClaim,
        hasClaimed,
        score,
        roomId,
        claim,
        isPending,     // Waiting for wallet signature
        isConfirming,  // Waiting for on-chain confirmation
        isSuccess,     // Confirmed on-chain
        error: writeError || null,
        txHash: callsStatus?.receipts?.[0]?.transactionHash, // Get actual txHash from receipt
    };
}
