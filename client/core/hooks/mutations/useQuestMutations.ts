/**
 * Quest Mutation Hooks
 *
 * TanStack Query mutations for quest progress with
 * cascade invalidation for related stats and achievements.
 *
 * US4: Cascade Invalidation on Quest Complete
 *
 * @module core/hooks/mutations/useQuestMutations
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { invalidateByMutation } from '../../query/invalidation';
import type { Quest, QuestProgress, ApiError } from '../../types/query.types';

/**
 * Quest completion response with rewards
 */
interface QuestCompleteResponse {
  quest: Quest;
  rewards: {
    xp: number;
    coins?: number;
    badges?: string[];
    achievements?: string[];
  };
}

/**
 * Start a quest
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for starting a quest
 *
 * @example
 * ```tsx
 * function QuestCard({ quest }) {
 *   const { mutate: startQuest, isPending } = useStartQuest();
 *
 *   return (
 *     <Card>
 *       <Text>{quest.title}</Text>
 *       <Button
 *         onPress={() => startQuest(quest.id)}
 *         disabled={isPending || quest.status !== 'available'}
 *       >
 *         {isPending ? 'Starting...' : 'Start Quest'}
 *       </Button>
 *     </Card>
 *   );
 * }
 * ```
 */
export function useStartQuest(
  options?: Omit<
    UseMutationOptions<Quest, ApiError, string>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<Quest, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questId: string) =>
      apiClient.post<Quest>(`/quests/${questId}/start`),

    onSuccess: (data, questId) => {
      // Update quest in cache
      queryClient.setQueryData(queryKeys.quests.detail(questId), data);

      // Invalidate quest lists to reflect new status
      queryClient.invalidateQueries({ queryKey: queryKeys.quests.list({ status: 'active' }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quests.daily() });
    },

    ...options,
  });
}

/**
 * Update quest step progress
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for step progress update
 */
export function useUpdateQuestProgress(
  options?: Omit<
    UseMutationOptions<
      QuestProgress,
      ApiError,
      { questId: string; stepId: string; progress: number }
    >,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<
  QuestProgress,
  ApiError,
  { questId: string; stepId: string; progress: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questId, stepId, progress }) =>
      apiClient.patch<QuestProgress>(
        `/quests/${questId}/steps/${stepId}/progress`,
        { progress }
      ),

    onSuccess: (data, { questId }) => {
      // Update progress in cache
      queryClient.setQueryData(queryKeys.quests.progress(questId), data);
    },

    ...options,
  });
}

/**
 * Complete a quest step
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for step completion
 */
export function useCompleteQuestStep(
  options?: Omit<
    UseMutationOptions<
      QuestProgress,
      ApiError,
      { questId: string; stepId: string }
    >,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<
  QuestProgress,
  ApiError,
  { questId: string; stepId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questId, stepId }) =>
      apiClient.post<QuestProgress>(
        `/quests/${questId}/steps/${stepId}/complete`
      ),

    onSuccess: (data, { questId }) => {
      queryClient.setQueryData(queryKeys.quests.progress(questId), data);
      
      // Invalidate quest detail to show updated step status
      queryClient.invalidateQueries({
        queryKey: queryKeys.quests.detail(questId),
      });
    },

    ...options,
  });
}

/**
 * Complete a quest (all steps done)
 *
 * Triggers cascade invalidation for:
 * - User stats (XP, level)
 * - Dashboard stats
 * - Leaderboards
 * - Related course progress (if quest is course-linked)
 * - Achievement notifications
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for quest completion
 *
 * @example
 * ```tsx
 * function CompleteQuestButton({ questId, allStepsComplete }) {
 *   const { mutate: completeQuest, isPending } = useCompleteQuest();
 *
 *   const handleComplete = () => {
 *     completeQuest(questId, {
 *       onSuccess: (data) => {
 *         showRewardsModal(data.rewards);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <Button
 *       onPress={handleComplete}
 *       disabled={!allStepsComplete || isPending}
 *     >
 *       Claim Rewards
 *     </Button>
 *   );
 * }
 * ```
 */
export function useCompleteQuest(
  options?: Omit<
    UseMutationOptions<QuestCompleteResponse, ApiError, string>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<QuestCompleteResponse, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questId: string) =>
      apiClient.post<QuestCompleteResponse>(`/quests/${questId}/complete`),

    onSuccess: (data, questId) => {
      // Update quest in cache
      queryClient.setQueryData(queryKeys.quests.detail(questId), data.quest);

      // Cascade invalidation for all related data
      invalidateByMutation(queryClient, 'quest.completeStep');

      // If badges/achievements were earned, invalidate notifications
      if (data.rewards.badges?.length || data.rewards.achievements?.length) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
      }
    },

    ...options,
  });
}

/**
 * Abandon a quest
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for abandoning quest
 */
export function useAbandonQuest(
  options?: Omit<
    UseMutationOptions<void, ApiError, string>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questId: string) =>
      apiClient.post<void>(`/quests/${questId}/abandon`),

    onSuccess: (_data, questId) => {
      // Remove from active quests, add back to available
      queryClient.invalidateQueries({ queryKey: queryKeys.quests.detail(questId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quests.list({ status: 'active' }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quests.daily() });
    },

    ...options,
  });
}
