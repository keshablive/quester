/**
 * Cache Invalidation Map and Utilities
 *
 * Defines relationships between mutations and cache keys
 * for automatic cache invalidation.
 *
 * FR-005: System MUST invalidate related cache entries when mutations occur
 *
 * @module core/query/invalidation
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

/**
 * Mutation types that trigger cache invalidation
 */
export type MutationType =
  | 'user.updateProfile'
  | 'user.updateAvatar'
  | 'user.updateSettings'
  | 'course.enroll'
  | 'course.completeLesson'
  | 'course.submitAssignment'
  | 'quest.accept'
  | 'quest.completeStep'
  | 'quest.abandon'
  | 'social.follow'
  | 'social.unfollow'
  | 'social.block'
  | 'notification.markRead'
  | 'notification.markAllRead';

/**
 * Invalidation map - defines which query keys to invalidate for each mutation
 *
 * Pattern: mutation type -> array of query key prefixes to invalidate
 *
 * The invalidation is hierarchical:
 * - Invalidating ['users'] will invalidate all user-related queries
 * - Invalidating ['users', 'detail', userId] only invalidates that user's data
 */
export const INVALIDATION_MAP: Record<MutationType, readonly (readonly unknown[])[]> = {
  // ═══════════════════════════════════════════════════════════════
  // User Mutations
  // ═══════════════════════════════════════════════════════════════
  'user.updateProfile': [
    queryKeys.users.all,
    queryKeys.dashboard.stats(),
  ],
  'user.updateAvatar': [
    queryKeys.users.all,
  ],
  'user.updateSettings': [
    queryKeys.users.all,
  ],

  // ═══════════════════════════════════════════════════════════════
  // Course Mutations
  // ═══════════════════════════════════════════════════════════════
  'course.enroll': [
    queryKeys.courses.all,
    queryKeys.users.all,
    queryKeys.dashboard.stats(),
  ],
  'course.completeLesson': [
    queryKeys.courses.all,
    queryKeys.users.all,
    queryKeys.leaderboards.all,
    queryKeys.dashboard.all,
  ],
  'course.submitAssignment': [
    queryKeys.courses.all,
    queryKeys.dashboard.activity(),
  ],

  // ═══════════════════════════════════════════════════════════════
  // Quest Mutations
  // ═══════════════════════════════════════════════════════════════
  'quest.accept': [
    queryKeys.quests.all,
    queryKeys.dashboard.quickActions(),
  ],
  'quest.completeStep': [
    queryKeys.quests.all,
    queryKeys.users.all,
    queryKeys.leaderboards.all,
    queryKeys.dashboard.all,
  ],
  'quest.abandon': [
    queryKeys.quests.all,
    queryKeys.dashboard.quickActions(),
  ],

  // ═══════════════════════════════════════════════════════════════
  // Social Mutations
  // ═══════════════════════════════════════════════════════════════
  'social.follow': [
    queryKeys.users.all,
  ],
  'social.unfollow': [
    queryKeys.users.all,
  ],
  'social.block': [
    queryKeys.users.all,
  ],

  // ═══════════════════════════════════════════════════════════════
  // Notification Mutations
  // ═══════════════════════════════════════════════════════════════
  'notification.markRead': [
    queryKeys.notifications.all,
  ],
  'notification.markAllRead': [
    queryKeys.notifications.all,
  ],
};

/**
 * Invalidate cache entries based on mutation type
 *
 * @param queryClient - The QueryClient instance
 * @param mutationType - The type of mutation that occurred
 * @returns Promise that resolves when all invalidations complete
 *
 * @example
 * ```ts
 * // In a mutation's onSuccess handler
 * onSuccess: () => {
 *   invalidateByMutation(queryClient, 'user.updateProfile');
 * }
 * ```
 */
export async function invalidateByMutation(
  queryClient: QueryClient,
  mutationType: MutationType
): Promise<void> {
  const keysToInvalidate = INVALIDATION_MAP[mutationType];

  if (!keysToInvalidate || keysToInvalidate.length === 0) {
    console.warn(`No invalidation keys defined for mutation: ${mutationType}`);
    return;
  }

  // Invalidate all related query keys in parallel
  await Promise.all(
    keysToInvalidate.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey: queryKey as readonly unknown[],
      })
    )
  );
}

/**
 * Invalidate specific user's data
 *
 * @param queryClient - The QueryClient instance
 * @param userId - The user ID whose data should be invalidated
 */
export async function invalidateUser(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.users.detail(userId),
  });
}

/**
 * Invalidate specific course's data
 *
 * @param queryClient - The QueryClient instance
 * @param courseId - The course ID whose data should be invalidated
 */
export async function invalidateCourse(
  queryClient: QueryClient,
  courseId: string
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.courses.detail(courseId),
  });
}

/**
 * Invalidate specific quest's data
 *
 * @param queryClient - The QueryClient instance
 * @param questId - The quest ID whose data should be invalidated
 */
export async function invalidateQuest(
  queryClient: QueryClient,
  questId: string
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.quests.detail(questId),
  });
}

/**
 * Invalidate all dashboard data
 *
 * @param queryClient - The QueryClient instance
 */
export async function invalidateDashboard(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.dashboard.all,
  });
}

/**
 * Invalidate all leaderboard data
 *
 * @param queryClient - The QueryClient instance
 */
export async function invalidateLeaderboards(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.leaderboards.all,
  });
}
