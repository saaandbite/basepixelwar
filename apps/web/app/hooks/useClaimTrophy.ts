'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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

    // 2. Setup write contract for claim
    const {
        writeContract,
        data: txHash,
        isPending,
        error: writeError,
    } = useWriteContract();

    // 3. Wait for transaction confirmation
    const {
        isLoading: isConfirming,
        isSuccess,
        error: confirmError
    } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // Parse player info
    const score = playerInfo ? Number((playerInfo as any)[0]) : 0;
    const roomId = playerInfo ? Number((playerInfo as any)[1]) : 0;
    const hasClaimed = playerInfo ? Boolean((playerInfo as any)[2]) : false;

    // Determine if player can claim:
    // - Must have a score > 0 (participated)
    // - Must not have claimed yet
    // - Must be the room winner (highest score in room - this is validated by contract)
    const canClaim = score > 0 && !hasClaimed;

    // Claim function
    const claim = () => {
        if (!TOURNAMENT_ADDRESS || weekNumber === undefined) {
            console.error('[useClaimTrophy] Missing tournament address or week number');
            return;
        }

        writeContract({
            address: TOURNAMENT_ADDRESS,
            abi: TOURNAMENT_ABI,
            functionName: 'claimReward',
            args: [BigInt(weekNumber)],
        });
    };

    // Refetch player info after successful claim
    if (isSuccess && !hasClaimed) {
        refetchPlayerInfo();
    }

    return {
        canClaim,
        hasClaimed,
        score,
        roomId,
        claim,
        isPending,
        isConfirming,
        isSuccess,
        error: writeError || confirmError || null,
        txHash,
    };
}
