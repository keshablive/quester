/**
 * Achievement Hook Interfaces
 * 
 * Contract for useAchievements.ts implementation
 */

import type { UseQueryResult } from '@tanstack/react-query';
import type { Achievement, AchievementFilters } from './types';

/**
 * Hook to fetch paginated achievements list
 * 
 * @param filters - Optional filters for category, earned status, pagination
 * @returns TanStack Query result with achievements array
 * 
 * @example
 * ```tsx
 * const { data: achievements, isLoading } = useAchievements({ category: 'quest' });
 * ```
 */
export type UseAchievements = (
  filters?: AchievementFilters
) => UseQueryResult<Achievement[], Error>;

/**
 * Hook to fetch achievements for a specific user
 * 
 * @param userId - The user ID to fetch achievements for
 * @returns TanStack Query result with user's achievements
 * 
 * @example
 * ```tsx
 * const { data: achievements } = useUserAchievements(userId);
 * ```
 */
export type UseUserAchievements = (
  userId: string
) => UseQueryResult<Achievement[], Error>;

/**
 * Hook to fetch a single achievement by ID
 * 
 * @param achievementId - The achievement ID to fetch
 * @returns TanStack Query result with achievement detail
 * 
 * @example
 * ```tsx
 * const { data: achievement } = useAchievement(achievementId);
 * ```
 */
export type UseAchievement = (
  achievementId: string
) => UseQueryResult<Achievement, Error>;

/**
 * Configuration for achievement hooks
 */
export const ACHIEVEMENT_CONFIG = {
  /** Stale time in milliseconds (5 minutes per FR-004) */
  staleTime: 5 * 60 * 1000,
  /** Query key prefix */
  queryKeyPrefix: 'achievements',
} as const;
