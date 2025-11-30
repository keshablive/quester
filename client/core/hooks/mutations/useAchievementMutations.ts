/**
 * Achievement Mutations
 *
 * TanStack Query mutations for achievement-related actions.
 * Provides optimistic updates and cache invalidation for claim actions.
 *
 * US1: Instant Achievement Display with Cache
 *
 * @module core/hooks/mutations/useAchievementMutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsService } from '../../api/services/gamification.service';
import { queryKeys } from '../../query/keys';
import type { Achievement } from '../../types/query.types';

// ============================================================================
// Types
// ============================================================================

interface ClaimAchievementContext {
  previousAchievements?: Achievement[];
  previousAchievement?: Achievement;
}

// ============================================================================
// useClaimAchievement
// ============================================================================

/**
 * useClaimAchievement
 *
 * Mutation for claiming achievement rewards with optimistic updates.
 * Updates the achievement's claimedAt field immediately in cache.
 *
 * FR-024: Error toast with retry button on mutation failure
 *
 * @example
 * ```tsx
 * function AchievementCard({ achievement }) {
 *   const claimMutation = useClaimAchievement();
 *
 *   return (
 *     <Button
 *       onPress={() => claimMutation.mutate(achievement.id)}
 *       disabled={claimMutation.isPending}
 *     >
 *       {claimMutation.isPending ? 'Claiming...' : 'Claim Reward'}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useClaimAchievement(options?: {
  onSuccess?: (achievementId: string) => void;
  onError?: (error: Error, achievementId: string) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, ClaimAchievementContext>({
    mutationFn: (achievementId: string) =>
      achievementsService.claimAchievement(achievementId),

    // Optimistic update
    onMutate: async (achievementId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.achievements.all });
      await queryClient.cancelQueries({
        queryKey: queryKeys.achievements.detail(achievementId),
      });

      // Snapshot current state
      const previousAchievements = queryClient.getQueryData<Achievement[]>(
        queryKeys.achievements.list()
      );
      const previousAchievement = queryClient.getQueryData<Achievement>(
        queryKeys.achievements.detail(achievementId)
      );

      // Optimistically update to claimed state
      const claimedAt = new Date().toISOString();

      // Update list cache
      if (previousAchievements) {
        queryClient.setQueryData<Achievement[]>(
          queryKeys.achievements.list(),
          (old) =>
            old?.map((a) =>
              a.id === achievementId ? { ...a, claimedAt } : a
            )
        );
      }

      // Update detail cache
      if (previousAchievement) {
        queryClient.setQueryData<Achievement>(
          queryKeys.achievements.detail(achievementId),
          (old) => (old ? { ...old, claimedAt } : old)
        );
      }

      // Update user achievements cache
      const userAchievements = queryClient.getQueryData<Achievement[]>(
        queryKeys.achievements.user()
      );
      if (userAchievements) {
        queryClient.setQueryData<Achievement[]>(
          queryKeys.achievements.user(),
          (old) =>
            old?.map((a) =>
              a.id === achievementId ? { ...a, claimedAt } : a
            )
        );
      }

      return { previousAchievements, previousAchievement };
    },

    // Rollback on error
    onError: (error, achievementId, context) => {
      // Restore previous state
      if (context?.previousAchievements) {
        queryClient.setQueryData(
          queryKeys.achievements.list(),
          context.previousAchievements
        );
      }
      if (context?.previousAchievement) {
        queryClient.setQueryData(
          queryKeys.achievements.detail(achievementId),
          context.previousAchievement
        );
      }

      // Call custom error handler
      options?.onError?.(error, achievementId);

      // FR-024: Error toast would be shown by consumer
      console.error('Failed to claim achievement:', error);
    },

    // Refetch on success to ensure consistency
    onSettled: (_, __, achievementId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.achievements.detail(achievementId),
      });
      // Also invalidate user stats if they track claimed achievements
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
    },

    onSuccess: (_, achievementId) => {
      options?.onSuccess?.(achievementId);
    },
  });
}

export default useClaimAchievement;
