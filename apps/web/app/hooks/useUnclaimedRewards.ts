'use client';

import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { TOURNAMENT_ABI } from '@repo/contracts';

const TOURNAMENT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_ADDRESS as `0x${string}`;

export interface UnclaimedReward {
    week: number;
    roomId: number;
    score: number;
}

interface UseUnclaimedRewardsResult {
    unclaimedRewards: UnclaimedReward[];
    currentWeek: number;
    isLoading: boolean;
    refetch: () => void;
}

/**
 * Hook to fetch ALL unclaimed tournament rewards for a player
 * Scans from week 1 up to (currentWeek - 1)
 */
export function useUnclaimedRewards(): UseUnclaimedRewardsResult {
    const { address } = useAccount();

    // Get current week from contract
    const { data: currentWeekBigInt, isLoading: isLoadingWeek } = useReadContract({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: 'currentWeek',
        query: {
            enabled: !!TOURNAMENT_ADDRESS,
            refetchInterval: 30000
        }
    });

    const currentWeek = currentWeekBigInt ? Number(currentWeekBigInt) : 0;

    // Generate contracts array to read all past weeks
    // We'll check weeks 1 to (currentWeek - 1)
    const weeksToCheck = currentWeek > 1
        ? Array.from({ length: currentWeek - 1 }, (_, i) => i + 1)
        : [];

    // Use multicall to read all playerInfo in one request
    const contracts = weeksToCheck.map(week => ({
        address: TOURNAMENT_ADDRESS,
        abi: TOURNAMENT_ABI,
        functionName: 'playerInfo',
        args: address ? [BigInt(week), address] : undefined,
    }));

    const { data: playerInfoResults, isLoading: isLoadingInfo, refetch } = useReadContracts({
        contracts: contracts as any,
        query: {
            enabled: !!TOURNAMENT_ADDRESS && !!address && weeksToCheck.length > 0,
            refetchInterval: 10000
        }
    });

    // Build unclaimed rewards array
    const unclaimedRewards: UnclaimedReward[] = [];

    if (playerInfoResults && weeksToCheck.length > 0) {
        weeksToCheck.forEach((week, index) => {
            const result = playerInfoResults[index];

            if (result && result.status === 'success' && result.result) {
                const data = result.result as [bigint, bigint, boolean];
                const score = Number(data[0]);
                const roomId = Number(data[1]);
                const hasClaimed = Boolean(data[2]);

                // Player participated (roomId > 0), has score, and hasn't claimed yet
                if (roomId > 0 && score > 0 && !hasClaimed) {
                    unclaimedRewards.push({
                        week,
                        roomId,
                        score,
                    });
                }
            }
        });
    }

    // Sort by week descending (newest first)
    unclaimedRewards.sort((a, b) => b.week - a.week);

    return {
        unclaimedRewards,
        currentWeek,
        isLoading: isLoadingWeek || isLoadingInfo,
        refetch
    };
}
