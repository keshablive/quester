/**
 * useLeaderboard Hook (T050)
 * 
 * React Query hook for leaderboard data management.
 * Provides caching, automatic refetching, and real-time updates.
 * 
 * Features:
 * - Automatic caching with React Query
 * - Background refetch on window focus
 * - Pagination support
 * - Filtering by type, period, category
 * - User position tracking
 * - Optimistic updates for real-time feel
 * - Auto-refresh every 2 minutes for live rankings
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueries, UseQueryOptions, QueryClient } from '@tanstack/react-query';
import * as LeaderboardAPI from '../api/leaderboards';
import type {
  LeaderboardType,
  LeaderboardPeriod,
  GetLeaderboardParams,
  GetUserPositionParams,
  LeaderboardEntry,
  UserLeaderboardPosition,
} from '../api/leaderboards';

// Query Keys
export const leaderboardKeys = {
  all: ['leaderboards'] as const,
  lists: () => [...leaderboardKeys.all, 'list'] as const,
  list: (params: GetLeaderboardParams) => [...leaderboardKeys.lists(), params] as const,
  userPositions: (userId: string) => [...leaderboardKeys.all, 'user', userId, 'positions'] as const,
  userPosition: (userId: string, params: Omit<GetUserPositionParams, 'userId'>) =>
    [...leaderboardKeys.all, 'user', userId, 'position', params] as const,
};

// Hook Options
export interface UseLeaderboardOptions extends Omit<UseQueryOptions<LeaderboardAPI.GetLeaderboardResponse>, 'queryKey' | 'queryFn'> {
  params: GetLeaderboardParams;
  refreshInterval?: number; // Auto-refresh interval in ms (default: 2 minutes)
}

export interface UseUserPositionOptions extends Omit<UseQueryOptions<LeaderboardAPI.GetUserPositionResponse>, 'queryKey' | 'queryFn'> {
  params: GetUserPositionParams;
  refreshInterval?: number; // Auto-refresh interval in ms (default: 2 minutes)
}

/**
 * Fetch leaderboard entries
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useLeaderboard({
 *   params: {
 *     type: 'global',
 *     period: 'monthly',
 *     page: 1,
 *     limit: 20,
 *   },
 * });
 * 
 * if (isLoading) return <LeaderboardRowSkeleton />;
 * if (error) return <Error message={error.message} />;
 * 
 * return <LeaderboardList entries={data.data.entries} />;
 * ```
 */
export function useLeaderboard(options: UseLeaderboardOptions) {
  const { params, refreshInterval = 2 * 60 * 1000, ...queryOptions } = options;

  return useQuery({
    queryKey: leaderboardKeys.list(params),
    queryFn: () => LeaderboardAPI.getLeaderboard(params),
    staleTime: 1 * 60 * 1000, // 1 minute - fresh data is important for rankings
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    refetchInterval: refreshInterval, // Auto-refresh every 2 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to app
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Fetch user's position in a leaderboard
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUserPosition({
 *   params: {
 *     userId: currentUser.id,
 *     type: 'global',
 *     period: 'alltime',
 *   },
 * });
 * 
 * if (isLoading) return <UserRankCardSkeleton />;
 * 
 * return <UserRankCard data={data.data} username={currentUser.username} />;
 * ```
 */
export function useUserPosition(options: UseUserPositionOptions) {
  const { params, refreshInterval = 2 * 60 * 1000, ...queryOptions } = options;

  return useQuery({
    queryKey: leaderboardKeys.userPosition(params.userId, params),
    queryFn: () => LeaderboardAPI.getUserPosition(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: refreshInterval, // Auto-refresh every 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Fetch all leaderboard positions for a user
 * Returns positions for global and quest leaderboards (both alltime and monthly)
 * 
 * @example
 * ```tsx
 * const positions = useUserPositions(currentUser.id);
 * 
 * const globalAlltime = positions[0];
 * const globalMonthly = positions[1];
 * const questsAlltime = positions[2];
 * const questsMonthly = positions[3];
 * 
 * return (
 *   <View>
 *     {positions.map((query, index) => (
 *       query.isLoading ? <Skeleton key={index} /> :
 *       query.error ? <Error key={index} /> :
 *       <UserRankCardCompact key={index} data={query.data.data} />
 *     ))}
 *   </View>
 * );
 * ```
 */
export function useUserPositions(userId: string, refreshInterval = 2 * 60 * 1000) {
  return useQueries({
    queries: [
      // Global All-Time
      {
        queryKey: leaderboardKeys.userPosition(userId, { type: 'global', period: 'alltime' }),
        queryFn: () => LeaderboardAPI.getUserPosition({ userId, type: 'global', period: 'alltime' }),
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: refreshInterval,
        retry: 2,
      },
      // Global Monthly
      {
        queryKey: leaderboardKeys.userPosition(userId, { type: 'global', period: 'monthly' }),
        queryFn: () => LeaderboardAPI.getUserPosition({ userId, type: 'global', period: 'monthly' }),
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: refreshInterval,
        retry: 2,
      },
      // Quest All-Time
      {
        queryKey: leaderboardKeys.userPosition(userId, { type: 'category', period: 'alltime', category: 'quests' }),
        queryFn: () => LeaderboardAPI.getUserPosition({ userId, type: 'category', period: 'alltime', category: 'quests' }),
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: refreshInterval,
        retry: 2,
      },
      // Quest Monthly
      {
        queryKey: leaderboardKeys.userPosition(userId, { type: 'category', period: 'monthly', category: 'quests' }),
        queryFn: () => LeaderboardAPI.getUserPosition({ userId, type: 'category', period: 'monthly', category: 'quests' }),
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: refreshInterval,
        retry: 2,
      },
    ],
  });
}

/**
 * Check if user is ranked in a leaderboard
 * Simple boolean check without full position data
 * 
 * @example
 * ```tsx
 * const { data: isRanked, isLoading } = useIsUserRanked({
 *   userId: currentUser.id,
 *   type: 'global',
 *   period: 'alltime',
 * });
 * 
 * if (isRanked) {
 *   return <Text>You're on the leaderboard!</Text>;
 * }
 * ```
 */
export function useIsUserRanked(params: {
  userId: string;
  type?: LeaderboardType;
  period?: LeaderboardPeriod;
  category?: string;
}) {
  const { userId, type = 'global', period = 'alltime', category } = params;

  return useQuery({
    queryKey: [...leaderboardKeys.userPosition(userId, { type, period, category }), 'ranked'],
    queryFn: () => LeaderboardAPI.isUserRanked(userId, type, period, category),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Prefetch leaderboard data
 * Useful for preloading data before navigation
 * 
 * @example
 * ```tsx
 * const prefetchLeaderboard = usePrefetchLeaderboard();
 * 
 * // Prefetch on tab press
 * <Tab onPress={() => {
 *   prefetchLeaderboard({ type: 'global', period: 'monthly' });
 *   navigation.navigate('Leaderboards');
 * }} />
 * ```
 */
export function usePrefetchLeaderboard() {
  const queryClient = new QueryClient();

  return (params: GetLeaderboardParams) => {
    queryClient.prefetchQuery({
      queryKey: leaderboardKeys.list(params),
      queryFn: () => LeaderboardAPI.getLeaderboard(params),
      staleTime: 1 * 60 * 1000,
    });
  };
}

/**
 * Invalidate leaderboard cache
 * Forces refetch of leaderboard data (e.g., after earning XP)
 * 
 * @example
 * ```tsx
 * const invalidateLeaderboards = useInvalidateLeaderboards();
 * 
 * // After completing a quest
 * const completeQuest = useMutation({
 *   mutationFn: completeQuestApi,
 *   onSuccess: () => {
 *     invalidateLeaderboards(); // Refresh all leaderboards
 *   },
 * });
 * ```
 */
export function useInvalidateLeaderboards() {
  const queryClient = new QueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
  };
}

/**
 * Custom hook for paginated leaderboard with infinite scroll support
 * Combines multiple pages into a single list
 * 
 * @example
 * ```tsx
 * const {
 *   entries,
 *   isLoading,
 *   hasNextPage,
 *   fetchNextPage,
 * } = usePaginatedLeaderboard({
 *   type: 'global',
 *   period: 'alltime',
 * });
 * 
 * return (
 *   <FlatList
 *     data={entries}
 *     onEndReached={fetchNextPage}
 *     onEndReachedThreshold={0.5}
 *   />
 * );
 * ```
 */
export function usePaginatedLeaderboard(
  baseParams: Omit<GetLeaderboardParams, 'page' | 'limit'>,
  limit = 20
) {
  const [page, setPage] = useState(1);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);

  const { data, isLoading, error, refetch } = useLeaderboard({
    params: { ...baseParams, page, limit },
  });

  useEffect(() => {
    if (data?.data.entries) {
      if (page === 1) {
        setAllEntries(data.data.entries);
      } else {
        setAllEntries((prev) => [...prev, ...data.data.entries]);
      }
    }
  }, [data, page]);

  const hasNextPage = data ? page < data.data.pagination.total_pages : false;
  const fetchNextPage = () => {
    if (hasNextPage && !isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  const resetPagination = () => {
    setPage(1);
    setAllEntries([]);
  };

  return {
    entries: allEntries,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    resetPagination,
    refetch,
    currentPage: page,
    totalPages: data?.data.pagination.total_pages || 0,
  };
}

// Re-export for convenience
export type { LeaderboardType, LeaderboardPeriod, LeaderboardEntry, UserLeaderboardPosition };
