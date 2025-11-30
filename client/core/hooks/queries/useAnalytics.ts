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

/**
 * Time range for engagement chart queries
 */
export type ChartTimeRange = '7d' | '30d' | '90d' | '1y';

/**
 * Helper to convert TimeRange to date strings
 */
function getDateRangeFromTimeRange(timeRange: ChartTimeRange): { startDate: string; endDate: string } {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  
  switch (timeRange) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate,
  };
}

/**
 * Fetch engagement chart data for a given time range
 *
 * FR-013: Provides engagement chart data
 * FR-014: Supports independent loading per chart section
 *
 * @param timeRange - Time range for the chart ('7d', '30d', '90d', '1y')
 * @param options - Optional TanStack Query options
 * @returns Query result with chart data points
 *
 * @example
 * ```tsx
 * function EngagementChart() {
 *   const [timeRange, setTimeRange] = useState<ChartTimeRange>('30d');
 *   const { data, isLoading, error, isFetching } = useEngagementChart(timeRange);
 *
 *   if (isLoading) return <ChartSkeleton />;
 *   if (error) return <ChartError onRetry={() => refetch()} />;
 *
 *   return (
 *     <View>
 *       {isFetching && <RefreshIndicator />}
 *       <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
 *       <LineChart data={data} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useEngagementChart(
  timeRange: ChartTimeRange,
  options?: Omit<
    UseQueryOptions<TimeSeriesData[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<TimeSeriesData[], ApiError> {
  const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
  
  return useQuery({
    queryKey: queryKeys.analytics.engagementTimeseries(startDate, endDate),
    queryFn: () => analyticsService.getEngagementTimeseries(startDate, endDate),
    staleTime: STALE_TIMES.ENGAGEMENT_CHART,
    gcTime: GC_TIME,
    ...options,
  });
}
