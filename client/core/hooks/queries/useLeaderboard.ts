/**
 * Leaderboard Query Hooks
 *
 * TanStack Query hooks for fetching leaderboard data.
 * Leaderboards have a 30-second stale time for real-time competitive data.
 *
 * @module core/hooks/queries/useLeaderboard
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES } from '../../query/constants';
import type { LeaderboardEntry, LeaderboardType, ApiError } from '../../types/query.types';

/**
 * Leaderboard response structure
 */
interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  totalEntries: number;
}

/**
 * Fetch leaderboard data
 *
 * @param type - Leaderboard type (global, friends, weekly, monthly)
 * @param options - Optional TanStack Query options
 * @returns Query result with leaderboard data
 *
 * @example
 * ```tsx
 * function Leaderboard() {
 *   const { data, isLoading } = useLeaderboard('global');
 *
 *   if (isLoading) return <LeaderboardSkeleton />;
 *
 *   return (
 *     <View>
 *       <Text>Your Rank: #{data?.currentUserRank}</Text>
 *       {data?.entries.map(entry => (
 *         <LeaderboardRow key={entry.userId} entry={entry} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLeaderboard(
  type: LeaderboardType = 'global',
  options?: Omit<
    UseQueryOptions<LeaderboardResponse, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<LeaderboardResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.leaderboards.type(type),
    queryFn: () =>
      apiClient.get<LeaderboardResponse>(`/leaderboards/${type}`),
    // 30-second stale time for competitive data
    staleTime: STALE_TIMES.LEADERBOARDS,
    // Refetch frequently for real-time feel
    refetchInterval: 60000, // Refetch every minute when mounted
    ...options,
  });
}

/**
 * Fetch global leaderboard
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with global leaderboard
 */
export function useGlobalLeaderboard(
  options?: Omit<
    UseQueryOptions<LeaderboardResponse, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<LeaderboardResponse, ApiError> {
  return useLeaderboard('global', options);
}

/**
 * Fetch friends leaderboard
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with friends leaderboard
 */
export function useFriendsLeaderboard(
  options?: Omit<
    UseQueryOptions<LeaderboardResponse, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<LeaderboardResponse, ApiError> {
  return useLeaderboard('friends', options);
}

/**
 * Fetch weekly leaderboard
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with weekly leaderboard
 */
export function useWeeklyLeaderboard(
  options?: Omit<
    UseQueryOptions<LeaderboardResponse, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<LeaderboardResponse, ApiError> {
  return useLeaderboard('weekly', options);
}

/**
 * Fetch monthly leaderboard
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with monthly leaderboard
 */
export function useMonthlyLeaderboard(
  options?: Omit<
    UseQueryOptions<LeaderboardResponse, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<LeaderboardResponse, ApiError> {
  return useLeaderboard('monthly', options);
}

/**
 * Fetch course-specific leaderboard
 *
 * @param courseId - The course's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with course leaderboard
 */
export function useCourseLeaderboard(
  courseId: string,
  options?: Omit<
    UseQueryOptions<LeaderboardResponse, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<LeaderboardResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.leaderboards.course(courseId),
    queryFn: () =>
      apiClient.get<LeaderboardResponse>(`/leaderboards/course/${courseId}`),
    staleTime: STALE_TIMES.LEADERBOARDS,
    enabled: !!courseId,
    ...options,
  });
}
