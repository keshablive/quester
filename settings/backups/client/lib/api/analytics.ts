/**
 * Analytics API Client (T192)
 * 
 * Provides methods for interacting with analytics and metrics endpoints.
 * Handles request/response parsing, error handling, and authentication.
 * 
 * Endpoints:
 * - POST /api/analytics/users/:userId/track - Track user activity
 * - GET /api/analytics/users/:userId/summary - Get user analytics summary
 * - GET /api/analytics/users/:userId/timeseries - Get user time series data
 * - POST /api/analytics/courses/:courseId/track - Track course activity
 * - GET /api/analytics/courses/:courseId/summary - Get course analytics summary
 * - GET /api/analytics/courses/:courseId/timeseries - Get course time series
 * - GET /api/analytics/courses/top - Get top performing courses
 * - POST /api/analytics/engagement/track - Track engagement activity
 * - GET /api/analytics/engagement/summary - Get engagement summary
 * - GET /api/analytics/engagement/timeseries - Get engagement time series
 * - GET /api/metrics - Get all metrics
 * - GET /api/metrics/:id - Get metric by ID
 * - GET /api/metrics/name/:name - Get metric by name
 * - GET /api/metrics/category/:category - Get metrics by category
 * - POST /api/metrics/refresh - Refresh all metrics
 */

import { getTokens } from '@/lib/storage/secure-storage';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const API_TIMEOUT = 10000; // 10 seconds

// Period types for analytics queries
export type AnalyticsPeriod = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'year';

// Metric format types
export type MetricFormat = 'number' | 'currency' | 'percentage' | 'duration';

// Metric trend direction
export type TrendDirection = 'up' | 'down' | 'neutral';

// Request Types
export interface TrackUserActivityRequest {
  login_count?: number;
  active_minutes?: number;
  courses_accessed?: number;
  quizzes_completed?: number;
  points_earned?: number;
  badges_earned?: number;
  posts_created?: number;
  comments_made?: number;
  likes_given?: number;
  shares_made?: number;
}

export interface TrackCourseActivityRequest {
  enrollments?: number;
  completions?: number;
  dropouts?: number;
  avg_completion_rate?: number;
  avg_rating?: number;
  total_revenue?: number;
}

export interface TrackEngagementActivityRequest {
  daily_active_users?: number;
  weekly_active_users?: number;
  monthly_active_users?: number;
  total_sessions?: number;
  avg_session_duration?: number;
  bounce_rate?: number;
  conversion_rate?: number;
}

export interface GetAnalyticsSummaryParams {
  period?: AnalyticsPeriod;
}

export interface GetAnalyticsTimeSeriesParams {
  period?: AnalyticsPeriod;
}

export interface GetTopCoursesParams {
  period?: AnalyticsPeriod;
  orderBy?: 'enrollments' | 'completions' | 'rating' | 'revenue';
  limit?: number;
}

export interface GetMetricsParams {
  limit?: number;
  offset?: number;
}

export interface GetMetricsByCategoryParams {
  limit?: number;
  offset?: number;
}

// Response Types
export interface UserAnalytics {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  login_count: number;
  active_minutes: number;
  courses_accessed: number;
  courses_completed: number;
  quizzes_attempted: number;
  quizzes_completed: number;
  points_earned: number;
  badges_earned: number;
  posts_created: number;
  comments_made: number;
  likes_given: number;
  shares_made: number;
  messages_sent: number;
  videos_watched: number;
  livestreams_joined: number;
  created_at: string;
  updated_at: string;
}

export interface UserAnalyticsSummary {
  total_logins: number;
  total_active_minutes: number;
  avg_active_minutes: number;
  total_courses_accessed: number;
  total_courses_completed: number;
  total_quizzes_attempted: number;
  total_quizzes_completed: number;
  quiz_completion_rate: number;
  total_points_earned: number;
  total_badges_earned: number;
  total_social_activity: number;
  period: string;
  start_date: string;
  end_date: string;
}

export interface CourseAnalytics {
  id: string;
  tenant_id: string;
  course_id: string;
  date: string;
  enrollments: number;
  completions: number;
  dropouts: number;
  avg_completion_rate: number;
  avg_rating: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface CourseAnalyticsSummary {
  total_enrollments: number;
  total_completions: number;
  total_dropouts: number;
  avg_completion_rate: number;
  avg_rating: number;
  total_revenue: number;
  period: string;
  start_date: string;
  end_date: string;
}

export interface EngagementAnalytics {
  id: string;
  tenant_id: string;
  date: string;
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  total_sessions: number;
  avg_session_duration: number;
  bounce_rate: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface EngagementAnalyticsSummary {
  avg_daily_active_users: number;
  avg_weekly_active_users: number;
  avg_monthly_active_users: number;
  total_sessions: number;
  avg_session_duration: number;
  avg_bounce_rate: number;
  avg_conversion_rate: number;
  period: string;
  start_date: string;
  end_date: string;
}

export interface DashboardMetric {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  value: number;
  previous_value?: number;
  change?: number;
  change_percentage?: number;
  trend?: TrendDirection;
  format?: MetricFormat;
  category?: string;
  updated_at: string;
}

export interface TopCourse {
  course_id: string;
  course_name?: string;
  total_enrollments: number;
  total_completions: number;
  avg_rating: number;
  total_revenue: number;
}

// API Client
class AnalyticsAPIClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const tokens = await getTokens();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken && { Authorization: `Bearer ${tokens.accessToken}` }),
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  // ==================== USER ANALYTICS ====================

  /**
   * Track user activity
   */
  async trackUserActivity(
    userId: string,
    data: TrackUserActivityRequest
  ): Promise<{ message: string }> {
    return this.request(`/api/analytics/users/${userId}/track`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get user analytics summary
   */
  async getUserAnalyticsSummary(
    userId: string,
    params?: GetAnalyticsSummaryParams
  ): Promise<{ summary: UserAnalyticsSummary }> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);

    return this.request(`/api/analytics/users/${userId}/summary?${query}`);
  }

  /**
   * Get user analytics time series
   */
  async getUserAnalyticsTimeSeries(
    userId: string,
    params?: GetAnalyticsTimeSeriesParams
  ): Promise<{ timeseries: UserAnalytics[] }> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);

    return this.request(`/api/analytics/users/${userId}/timeseries?${query}`);
  }

  // ==================== COURSE ANALYTICS ====================

  /**
   * Track course activity
   */
  async trackCourseActivity(
    courseId: string,
    data: TrackCourseActivityRequest
  ): Promise<{ message: string }> {
    return this.request(`/api/analytics/courses/${courseId}/track`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get course analytics summary
   */
  async getCourseAnalyticsSummary(
    courseId: string,
    params?: GetAnalyticsSummaryParams
  ): Promise<{ summary: CourseAnalyticsSummary }> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);

    return this.request(`/api/analytics/courses/${courseId}/summary?${query}`);
  }

  /**
   * Get course analytics time series
   */
  async getCourseAnalyticsTimeSeries(
    courseId: string,
    params?: GetAnalyticsTimeSeriesParams
  ): Promise<{ timeseries: CourseAnalytics[] }> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);

    return this.request(`/api/analytics/courses/${courseId}/timeseries?${query}`);
  }

  /**
   * Get top performing courses
   */
  async getTopCourses(
    params?: GetTopCoursesParams
  ): Promise<{ courses: TopCourse[] }> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.orderBy) query.set('orderBy', params.orderBy);
    if (params?.limit) query.set('limit', params.limit.toString());

    return this.request(`/api/analytics/courses/top?${query}`);
  }

  // ==================== ENGAGEMENT ANALYTICS ====================

  /**
   * Track engagement activity
   */
  async trackEngagementActivity(
    data: TrackEngagementActivityRequest
  ): Promise<{ message: string }> {
    return this.request('/api/analytics/engagement/track', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get engagement analytics summary
   */
  async getEngagementAnalyticsSummary(
    params?: GetAnalyticsSummaryParams
  ): Promise<{ summary: EngagementAnalyticsSummary }> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);

    return this.request(`/api/analytics/engagement/summary?${query}`);
  }

  /**
   * Get engagement analytics time series
   */
  async getEngagementAnalyticsTimeSeries(
    params?: GetAnalyticsTimeSeriesParams
  ): Promise<{ timeseries: EngagementAnalytics[] }> {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);

    return this.request(`/api/analytics/engagement/timeseries?${query}`);
  }

  // ==================== METRICS ====================

  /**
   * Get all metrics
   */
  async getMetrics(
    params?: GetMetricsParams
  ): Promise<{ metrics: DashboardMetric[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return this.request(`/api/metrics?${query}`);
  }

  /**
   * Get metric by ID
   */
  async getMetric(id: string): Promise<{ metric: DashboardMetric }> {
    return this.request(`/api/metrics/${id}`);
  }

  /**
   * Get metric by name
   */
  async getMetricByName(name: string): Promise<{ metric: DashboardMetric }> {
    return this.request(`/api/metrics/name/${name}`);
  }

  /**
   * Get metrics by category
   */
  async getMetricsByCategory(
    category: string,
    params?: GetMetricsByCategoryParams
  ): Promise<{ metrics: DashboardMetric[]; category: string; count: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return this.request(`/api/metrics/category/${category}?${query}`);
  }

  /**
   * Refresh all metrics (admin only)
   */
  async refreshAllMetrics(): Promise<{ message: string }> {
    return this.request('/api/metrics/refresh', {
      method: 'POST',
    });
  }

  /**
   * Refresh metric by name (admin only)
   */
  async refreshMetricByName(name: string): Promise<{ metric: DashboardMetric; message: string }> {
    return this.request(`/api/metrics/name/${name}/refresh`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const analyticsAPI = new AnalyticsAPIClient();

// Export types and client
export default analyticsAPI;
