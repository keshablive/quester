/**
 * Analytics Query Hooks
 *
 * TanStack Query hooks for fetching analytics data with caching.
 * FR-009: Cache analytics data with 5-minute stale time.
 *
 * @module core/hooks/queries/useAnalytics
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { analyticsService } from '../../api/services/analytics.service';
import type {
  UserAnalyticsSummary,
  TopCourse,
  EngagementSummary,
  TimeSeriesData,
} from '../../api/services/analytics.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { ApiError } from '../../types/query.types';

/**
 * Fetch user analytics summary (sessions, scores, courses completed)
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with user analytics summary
 *
 * @example
 * ```tsx
 * function KeyMetrics({ userId }) {
 *   const { data, isLoading, error } = useUserAnalytics(userId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return (
 *     <MetricCard label="Sessions" value={data.totalSessions} />
 *   );
 * }
 * ```
 */
export function useUserAnalytics(
  userId: string,
  options?: Omit<
    UseQueryOptions<UserAnalyticsSummary, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<UserAnalyticsSummary, ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.userSummary(userId),
    queryFn: () => analyticsService.getUserSummary(userId),
    staleTime: STALE_TIMES.ANALYTICS,
    gcTime: GC_TIME,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch top performing courses
 *
 * @param limit - Maximum number of courses to fetch (default: 10)
 * @param options - Optional TanStack Query options
 * @returns Query result with top courses array
 *
 * @example
 * ```tsx
 * function TopCoursesList() {
 *   const { data: courses, isLoading } = useTopCourses(5);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return courses?.map(course => (
 *     <CourseCard key={course.id} title={course.title} />
 *   ));
 * }
 * ```
 */
export function useTopCourses(
  limit: number = 10,
  options?: Omit<
    UseQueryOptions<TopCourse[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<TopCourse[], ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.topCourses(limit),
    queryFn: () => analyticsService.getTopCourses(limit),
    staleTime: STALE_TIMES.ANALYTICS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch platform engagement summary (DAU, WAU, MAU)
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with engagement metrics
 *
 * @example
 * ```tsx
 * function EngagementMetrics() {
 *   const { data, isLoading } = useEngagementSummary();
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <View>
 *       <Text>DAU: {data?.dailyActiveUsers}</Text>
 *       <Text>WAU: {data?.weeklyActiveUsers}</Text>
 *       <Text>MAU: {data?.monthlyActiveUsers}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useEngagementSummary(
  options?: Omit<
    UseQueryOptions<EngagementSummary, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<EngagementSummary, ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.engagementSummary(),
    queryFn: () => analyticsService.getEngagementSummary(),
    staleTime: STALE_TIMES.ANALYTICS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch engagement timeseries data for charts
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param options - Optional TanStack Query options
 * @returns Query result with timeseries data points
 *
 * @example
 * ```tsx
 * function TrafficChart() {
 *   const { start, end } = getDateRange(30); // Last 30 days
 *   const { data, isLoading } = useEngagementTimeseries(start, end);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return <Chart data={data} />;
 * }
 * ```
 */
export function useEngagementTimeseries(
  startDate: string,
  endDate: string,
  options?: Omit<
    UseQueryOptions<TimeSeriesData[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<TimeSeriesData[], ApiError> {
  return useQuery({
    queryKey: queryKeys.analytics.engagementTimeseries(startDate, endDate),
    queryFn: () => analyticsService.getEngagementTimeseries(startDate, endDate),
    staleTime: STALE_TIMES.ANALYTICS,
    gcTime: GC_TIME,
    enabled: !!startDate && !!endDate,
    ...options,
  });
}

// Re-export types for convenience
export type {
  UserAnalyticsSummary,
  TopCourse,
  EngagementSummary,
  TimeSeriesData,
} from '../../api/services/analytics.service';
