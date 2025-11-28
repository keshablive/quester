/**
 * Dashboard Query Hooks
 *
 * TanStack Query hooks for fetching dashboard data with caching.
 * Implements stale-while-revalidate for instant display.
 *
 * US1: Instant Data Display with Background Refresh
 *
 * @module core/hooks/queries/useDashboard
 */

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES } from '../../query/constants';
import type {
  DashboardStats,
  ActivityItem,
  QuickAction,
  PaginatedResponse,
  ApiError,
} from '../../types/query.types';

/**
 * Fetch dashboard statistics
 *
 * Returns XP, level, streak, course progress, etc.
 * Data is cached for 5 minutes (DASHBOARD stale time).
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with dashboard stats
 *
 * @example
 * ```tsx
 * function StatsCards() {
 *   const { data: stats, isLoading } = useDashboardStats();
 *
 *   if (isLoading) return <StatsSkeleton />;
 *
 *   return (
 *     <View>
 *       <StatCard label="XP" value={stats?.totalXp} />
 *       <StatCard label="Level" value={stats?.level} />
 *       <StatCard label="Streak" value={`${stats?.currentStreak} days`} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useDashboardStats(
  options?: Omit<
    UseQueryOptions<DashboardStats, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<DashboardStats, ApiError> {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
    staleTime: STALE_TIMES.DASHBOARD,
    // US1: Display cached data immediately while background refresh occurs
    // placeholderData keeps previous data visible during refetch
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Fetch dashboard activity feed with infinite scroll
 *
 * Returns paginated activity items (course completions, achievements, etc.)
 * Supports infinite scroll with automatic pagination.
 *
 * @param options - Optional TanStack Query options
 * @returns Infinite query result with paginated activity
 *
 * @example
 * ```tsx
 * function RecentActivity() {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *   } = useDashboardActivity();
 *
 *   const items = data?.pages.flatMap(page => page.items) ?? [];
 *
 *   return (
 *     <FlatList
 *       data={items}
 *       renderItem={({ item }) => <ActivityCard item={item} />}
 *       onEndReached={() => hasNextPage && fetchNextPage()}
 *       ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
 *     />
 *   );
 * }
 * ```
 */
export function useDashboardActivity(
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<ActivityItem>,
      ApiError,
      InfiniteData<PaginatedResponse<ActivityItem>>,
      readonly unknown[],
      string
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  >
): UseInfiniteQueryResult<
  InfiniteData<PaginatedResponse<ActivityItem>>,
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) {
        params.set('cursor', pageParam);
      }
      params.set('limit', '20');

      const endpoint = `/dashboard/activity?${params.toString()}`;
      return apiClient.get<PaginatedResponse<ActivityItem>>(endpoint);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.DASHBOARD,
    ...options,
  });
}

/**
 * Fetch quick actions for dashboard
 *
 * Returns personalized quick actions (continue course, daily quest, etc.)
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with quick actions
 *
 * @example
 * ```tsx
 * function QuickActions() {
 *   const { data: actions, isLoading } = useQuickActions();
 *
 *   if (isLoading) return <QuickActionsSkeleton />;
 *
 *   return (
 *     <View>
 *       {actions?.map(action => (
 *         <QuickActionCard key={action.id} action={action} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useQuickActions(
  options?: Omit<
    UseQueryOptions<QuickAction[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<QuickAction[], ApiError> {
  return useQuery({
    queryKey: queryKeys.dashboard.quickActions(),
    queryFn: () => apiClient.get<QuickAction[]>('/dashboard/quick-actions'),
    staleTime: STALE_TIMES.DASHBOARD,
    // US1: Display cached data immediately
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Combined hook for all dashboard data
 *
 * Fetches stats and quick actions together for initial load.
 * Useful for dashboard screen that needs both.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { stats, quickActions, isLoading } = useDashboardData();
 *
 *   if (isLoading) return <DashboardSkeleton />;
 *
 *   return (
 *     <>
 *       <StatsCards stats={stats} />
 *       <QuickActions actions={quickActions} />
 *     </>
 *   );
 * }
 * ```
 */
export function useDashboardData() {
  const statsQuery = useDashboardStats();
  const quickActionsQuery = useQuickActions();

  return {
    stats: statsQuery.data,
    quickActions: quickActionsQuery.data,
    isLoading: statsQuery.isLoading || quickActionsQuery.isLoading,
    isError: statsQuery.isError || quickActionsQuery.isError,
    error: statsQuery.error || quickActionsQuery.error,
    refetch: async () => {
      await Promise.all([statsQuery.refetch(), quickActionsQuery.refetch()]);
    },
  };
}
