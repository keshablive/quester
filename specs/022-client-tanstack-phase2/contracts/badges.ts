/**
 * Badge Hook Interfaces
 * 
 * Contract for useBadges.ts implementation
 */

import type { UseQueryResult } from '@tanstack/react-query';
import type { Badge } from './types';

/**
 * Hook to fetch all available badges
 * 
 * @returns TanStack Query result with all badges (includes isEarned status for current user)
 * 
 * @example
 * ```tsx
 * const { data: badges, isLoading } = useBadges();
 * const earnedBadges = badges?.filter(b => b.isEarned);
 * ```
 */
export type UseBadges = () => UseQueryResult<Badge[], Error>;

/**
 * Hook to fetch badges earned by a specific user
 * 
 * @param userId - The user ID to fetch badges for
 * @returns TanStack Query result with user's earned badges
 * 
 * @example
 * ```tsx
 * const { data: badges } = useUserBadges(profileUserId);
 * ```
 */
export type UseUserBadges = (userId: string) => UseQueryResult<Badge[], Error>;

/**
 * Hook to fetch a single badge by ID
 * 
 * @param badgeId - The badge ID to fetch
 * @returns TanStack Query result with badge detail
 * 
 * @example
 * ```tsx
 * const { data: badge } = useBadge(badgeId);
 * ```
 */
export type UseBadge = (badgeId: string) => UseQueryResult<Badge, Error>;

/**
 * Configuration for badge hooks
 */
export const BADGE_CONFIG = {
  /** Stale time for badge list in milliseconds (10 minutes - catalog rarely changes) */
  listStaleTime: 10 * 60 * 1000,
  /** Stale time for user badges in milliseconds (5 minutes per FR-004) */
  userStaleTime: 5 * 60 * 1000,
  /** Query key prefix */
  queryKeyPrefix: 'badges',
} as const;
