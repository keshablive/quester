/**
 * useAnalytics Hook (T194)
 * 
 * React Query hook for analytics data management.
 * Provides caching, automatic refetching, and real-time updates.
 * 
 * Features:
 * - Automatic caching with React Query
 * - Background refetch on window focus
 * - Period-based queries (today, yesterday, 7days, 30days, etc.)
 * - User, course, and engagement analytics
 * - Metrics management with refresh
 * - Optimistic updates for tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AnalyticsAPI from '../api/analytics';
import type {
  AnalyticsPeriod,
  TrackUserActivityRequest,
  TrackCourseActivityRequest,
  TrackEngagementActivityRequest,
} from '../api/analytics';

// Query Keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  
  // User analytics
  userAnalytics: (userId: string) => [...analyticsKeys.all, 'user', userId] as const,
  userSummary: (userId: string, period?: AnalyticsPeriod) => 
    [...analyticsKeys.userAnalytics(userId), 'summary', period] as const,
  userTimeSeries: (userId: string, period?: AnalyticsPeriod) => 
    [...analyticsKeys.userAnalytics(userId), 'timeseries', period] as const,
  
  // Course analytics
  courseAnalytics: (courseId: string) => [...analyticsKeys.all, 'course', courseId] as const,
  courseSummary: (courseId: string, period?: AnalyticsPeriod) => 
    [...analyticsKeys.courseAnalytics(courseId), 'summary', period] as const,
  courseTimeSeries: (courseId: string, period?: AnalyticsPeriod) => 
    [...analyticsKeys.courseAnalytics(courseId), 'timeseries', period] as const,
  topCourses: (period?: AnalyticsPeriod, orderBy?: string) => 
    [...analyticsKeys.all, 'top-courses', period, orderBy] as const,
  
  // Engagement analytics
  engagement: () => [...analyticsKeys.all, 'engagement'] as const,
  engagementSummary: (period?: AnalyticsPeriod) => 
    [...analyticsKeys.engagement(), 'summary', period] as const,
  engagementTimeSeries: (period?: AnalyticsPeriod) => 
    [...analyticsKeys.engagement(), 'timeseries', period] as const,
  
  // Metrics
  metrics: () => [...analyticsKeys.all, 'metrics'] as const,
  metricsList: (limit?: number, offset?: number) => 
    [...analyticsKeys.metrics(), 'list', limit, offset] as const,
  metric: (id: string) => [...analyticsKeys.metrics(), id] as const,
  metricByName: (name: string) => [...analyticsKeys.metrics(), 'name', name] as const,
  metricsByCategory: (category: string) => 
    [...analyticsKeys.metrics(), 'category', category] as const,
};

// ==================== USER ANALYTICS ====================

/**
 * Track user activity
 * 
 * @example
 * ```tsx
 * const { mutate: trackActivity } = useTrackUserActivity(userId);
 * 
 * trackActivity({
 *   login_count: 1,
 *   active_minutes: 45,
 *   courses_accessed: 3,
 * });
 * ```
 */
export function useTrackUserActivity(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TrackUserActivityRequest) => 
      AnalyticsAPI.analyticsAPI.trackUserActivity(userId, data),
    onSuccess: () => {
      // Invalidate user analytics queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: analyticsKeys.userAnalytics(userId) });
    },
  });
}

/**
 * Get user analytics summary
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUserAnalyticsSummary({
 *   userId: user.id,
 *   period: '30days',
 * });
 * 
 * const summary = data?.summary;
 * ```
 */
export function useUserAnalyticsSummary(options: {
  userId: string;
  period?: AnalyticsPeriod;
  enabled?: boolean;
}) {
  const { userId, period = '30days', enabled = true } = options;

  return useQuery({
    queryKey: analyticsKeys.userSummary(userId, period),
    queryFn: () => AnalyticsAPI.analyticsAPI.getUserAnalyticsSummary(userId, { period }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: enabled && !!userId,
    retry: 2,
  });
}

/**
 * Get user analytics time series
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUserAnalyticsTimeSeries({
 *   userId: user.id,
 *   period: '7days',
 * });
 * 
 * const timeSeriesData = data?.timeseries || [];
 * ```
 */
export function useUserAnalyticsTimeSeries(options: {
  userId: string;
  period?: AnalyticsPeriod;
  enabled?: boolean;
}) {
  const { userId, period = '30days', enabled = true } = options;

  return useQuery({
    queryKey: analyticsKeys.userTimeSeries(userId, period),
    queryFn: () => AnalyticsAPI.analyticsAPI.getUserAnalyticsTimeSeries(userId, { period }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: enabled && !!userId,
    retry: 2,
  });
}

// ==================== COURSE ANALYTICS ====================

/**
 * Track course activity
 */
export function useTrackCourseActivity(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TrackCourseActivityRequest) => 
      AnalyticsAPI.analyticsAPI.trackCourseActivity(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.courseAnalytics(courseId) });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.topCourses() });
    },
  });
}

/**
 * Get course analytics summary
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useCourseAnalyticsSummary({
 *   courseId: course.id,
 *   period: '30days',
 * });
 * ```
 */
export function useCourseAnalyticsSummary(options: {
  courseId: string;
  period?: AnalyticsPeriod;
  enabled?: boolean;
}) {
  const { courseId, period = '30days', enabled = true } = options;

  return useQuery({
    queryKey: analyticsKeys.courseSummary(courseId, period),
    queryFn: () => AnalyticsAPI.analyticsAPI.getCourseAnalyticsSummary(courseId, { period }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!courseId,
    retry: 2,
  });
}

/**
 * Get course analytics time series
 */
export function useCourseAnalyticsTimeSeries(options: {
  courseId: string;
  period?: AnalyticsPeriod;
  enabled?: boolean;
}) {
  const { courseId, period = '30days', enabled = true } = options;

  return useQuery({
    queryKey: analyticsKeys.courseTimeSeries(courseId, period),
    queryFn: () => AnalyticsAPI.analyticsAPI.getCourseAnalyticsTimeSeries(courseId, { period }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!courseId,
    retry: 2,
  });
}

/**
 * Get top performing courses
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useTopCourses({
 *   period: '30days',
 *   orderBy: 'enrollments',
 *   limit: 10,
 * });
 * 
 * const topCourses = data?.courses || [];
 * ```
 */
export function useTopCourses(options?: {
  period?: AnalyticsPeriod;
  orderBy?: 'enrollments' | 'completions' | 'rating' | 'revenue';
  limit?: number;
  enabled?: boolean;
}) {
  const { period = '30days', orderBy = 'enrollments', limit = 10, enabled = true } = options || {};

  return useQuery({
    queryKey: analyticsKeys.topCourses(period, orderBy),
    queryFn: () => AnalyticsAPI.analyticsAPI.getTopCourses({ period, orderBy, limit }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

// ==================== ENGAGEMENT ANALYTICS ====================

/**
 * Track engagement activity
 */
export function useTrackEngagementActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TrackEngagementActivityRequest) => 
      AnalyticsAPI.analyticsAPI.trackEngagementActivity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.engagement() });
    },
  });
}

/**
 * Get engagement analytics summary
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useEngagementAnalyticsSummary({
 *   period: '7days',
 * });
 * 
 * const { avg_daily_active_users, avg_bounce_rate } = data?.summary || {};
 * ```
 */
export function useEngagementAnalyticsSummary(options?: {
  period?: AnalyticsPeriod;
  enabled?: boolean;
}) {
  const { period = '30days', enabled = true } = options || {};

  return useQuery({
    queryKey: analyticsKeys.engagementSummary(period),
    queryFn: () => AnalyticsAPI.analyticsAPI.getEngagementAnalyticsSummary({ period }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

/**
 * Get engagement analytics time series
 */
export function useEngagementAnalyticsTimeSeries(options?: {
  period?: AnalyticsPeriod;
  enabled?: boolean;
}) {
  const { period = '30days', enabled = true } = options || {};

  return useQuery({
    queryKey: analyticsKeys.engagementTimeSeries(period),
    queryFn: () => AnalyticsAPI.analyticsAPI.getEngagementAnalyticsTimeSeries({ period }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

// ==================== METRICS ====================

/**
 * Get all metrics
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useMetrics({
 *   limit: 50,
 *   offset: 0,
 * });
 * 
 * const metrics = data?.metrics || [];
 * ```
 */
export function useMetrics(options?: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { limit = 50, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: analyticsKeys.metricsList(limit, offset),
    queryFn: () => AnalyticsAPI.analyticsAPI.getMetrics({ limit, offset }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

/**
 * Get metric by ID
 */
export function useMetric(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: analyticsKeys.metric(id),
    queryFn: () => AnalyticsAPI.analyticsAPI.getMetric(id),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && !!id,
    retry: 2,
  });
}

/**
 * Get metric by name
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useMetricByName('total_users');
 * const totalUsers = data?.metric.value;
 * ```
 */
export function useMetricByName(name: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: analyticsKeys.metricByName(name),
    queryFn: () => AnalyticsAPI.analyticsAPI.getMetricByName(name),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && !!name,
    retry: 2,
  });
}

/**
 * Get metrics by category
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useMetricsByCategory('users', {
 *   limit: 20,
 * });
 * ```
 */
export function useMetricsByCategory(
  category: string,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { limit = 20, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: analyticsKeys.metricsByCategory(category),
    queryFn: () => AnalyticsAPI.analyticsAPI.getMetricsByCategory(category, { limit, offset }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && !!category,
    retry: 2,
  });
}

/**
 * Refresh all metrics (admin only)
 * 
 * @example
 * ```tsx
 * const { mutate: refreshMetrics, isPending } = useRefreshAllMetrics();
 * 
 * <Button onPress={() => refreshMetrics()} disabled={isPending}>
 *   Refresh Metrics
 * </Button>
 * ```
 */
export function useRefreshAllMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AnalyticsAPI.analyticsAPI.refreshAllMetrics(),
    onSuccess: () => {
      // Invalidate all metrics queries
      queryClient.invalidateQueries({ queryKey: analyticsKeys.metrics() });
    },
  });
}

/**
 * Refresh metric by name (admin only)
 */
export function useRefreshMetricByName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => AnalyticsAPI.analyticsAPI.refreshMetricByName(name),
    onSuccess: (_, name) => {
      // Invalidate specific metric query
      queryClient.invalidateQueries({ queryKey: analyticsKeys.metricByName(name) });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.metrics() });
    },
  });
}

// ==================== COMPOSITE HOOKS ====================

/**
 * Get complete dashboard data
 * Fetches all key metrics for a dashboard view
 * 
 * @example
 * ```tsx
 * const {
 *   userSummary,
 *   engagementSummary,
 *   topCourses,
 *   metrics,
 *   isLoading
 * } = useDashboardData({
 *   userId: user.id,
 *   period: '30days',
 * });
 * ```
 */
export function useDashboardData(options: {
  userId: string;
  period?: AnalyticsPeriod;
  includeTopCourses?: boolean;
  includeMetrics?: boolean;
}) {
  const { userId, period = '30days', includeTopCourses = true, includeMetrics = true } = options;

  const userSummary = useUserAnalyticsSummary({ userId, period });
  const engagementSummary = useEngagementAnalyticsSummary({ period });
  const topCourses = useTopCourses({ period, enabled: includeTopCourses });
  const metrics = useMetrics({ enabled: includeMetrics });

  return {
    userSummary: userSummary.data?.summary,
    engagementSummary: engagementSummary.data?.summary,
    topCourses: topCourses.data?.courses,
    metrics: metrics.data?.metrics,
    isLoading:
      userSummary.isLoading ||
      engagementSummary.isLoading ||
      (includeTopCourses && topCourses.isLoading) ||
      (includeMetrics && metrics.isLoading),
    isError:
      userSummary.isError ||
      engagementSummary.isError ||
      topCourses.isError ||
      metrics.isError,
    refetch: () => {
      userSummary.refetch();
      engagementSummary.refetch();
      topCourses.refetch();
      metrics.refetch();
    },
  };
}

export default {
  // User analytics
  useTrackUserActivity,
  useUserAnalyticsSummary,
  useUserAnalyticsTimeSeries,
  
  // Course analytics
  useTrackCourseActivity,
  useCourseAnalyticsSummary,
  useCourseAnalyticsTimeSeries,
  useTopCourses,
  
  // Engagement analytics
  useTrackEngagementActivity,
  useEngagementAnalyticsSummary,
  useEngagementAnalyticsTimeSeries,
  
  // Metrics
  useMetrics,
  useMetric,
  useMetricByName,
  useMetricsByCategory,
  useRefreshAllMetrics,
  useRefreshMetricByName,
  
  // Composite
  useDashboardData,
};
