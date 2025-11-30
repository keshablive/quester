/**
 * Quest Hook Interfaces
 * 
 * Contract for quest query and mutation hooks
 */

import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { QuestProgress, CompleteQuestStepInput } from './types';

/**
 * Hook to fetch quest progress for a specific quest
 * 
 * @param questId - The quest ID to fetch progress for
 * @returns TanStack Query result with quest progress data
 * 
 * @example
 * ```tsx
 * const { data: progress, isLoading } = useQuestProgress(questId);
 * const completionPercent = progress?.progress ?? 0;
 * ```
 */
export type UseQuestProgress = (
  questId: string
) => UseQueryResult<QuestProgress, Error>;

/**
 * Optimistic update context for quest step completion
 */
export interface CompleteQuestStepContext {
  previousProgress: QuestProgress | undefined;
}

/**
 * Hook for completing a quest step with optimistic updates
 * 
 * Implements:
 * - FR-006: Optimistic updates for immediate UI feedback
 * - FR-007: Offline queue for sync when online
 * - FR-024: Error toast with manual retry (no auto-retry)
 * 
 * @returns TanStack Mutation result for completing quest steps
 * 
 * @example
 * ```tsx
 * const { mutate: completeStep, isPending } = useCompleteQuestStep();
 * 
 * const handleComplete = (stepId: string) => {
 *   completeStep({ questId, stepId });
 * };
 * ```
 */
export type UseCompleteQuestStep = () => UseMutationResult<
  QuestProgress,
  Error,
  CompleteQuestStepInput,
  CompleteQuestStepContext
>;

/**
 * Configuration for quest hooks
 */
export const QUEST_CONFIG = {
  /** Stale time for quest progress in milliseconds (1 minute - active engagement) */
  progressStaleTime: 1 * 60 * 1000,
  /** Query key prefix */
  queryKeyPrefix: 'quests',
} as const;
