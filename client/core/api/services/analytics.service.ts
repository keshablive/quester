import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface AnalyticsEvent {
    userId?: string;
    courseId?: string;
    eventType: string;
    metadata?: Record<string, string | number | boolean>;
}

export interface UserAnalyticsSummary {
    totalSessions: number;
    totalTimeSpent: number;
    coursesCompleted: number;
    averageScore: number;
    lastActive: string;
}

export interface CourseAnalyticsSummary {
    totalEnrollments: number;
    completionRate: number;
    averageRating: number;
    averageTimeToComplete: number;
}

export interface EngagementSummary {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
}

export interface TimeSeriesData {
    date: string;
    value: number;
}

export interface TopCourse {
    id: string;
    title: string;
    enrollmentCount: number;
    completionRate: number;
    averageRating: number;
}

export const analyticsService = {
    /**
     * Track user activity
     */
    async trackUserActivity(userId: string, event: AnalyticsEvent): Promise<void> {
        return apiClient.post(API_ENDPOINTS.ANALYTICS.USER_TRACK(userId), event);
    },

    /**
     * Get user analytics summary
     */
    async getUserSummary(userId: string): Promise<UserAnalyticsSummary> {
        return apiClient.get(API_ENDPOINTS.ANALYTICS.USER_SUMMARY(userId));
    },

    /**
     * Get user analytics timeseries
     */
    async getUserTimeseries(userId: string, startDate: string, endDate: string): Promise<TimeSeriesData[]> {
        return apiClient.get(`${API_ENDPOINTS.ANALYTICS.USER_TIMESERIES(userId)}?start=${startDate}&end=${endDate}`);
    },

    /**
     * Track course activity
     */
    async trackCourseActivity(courseId: string, event: AnalyticsEvent): Promise<void> {
        return apiClient.post(API_ENDPOINTS.ANALYTICS.COURSE_TRACK(courseId), event);
    },

    /**
     * Get course analytics summary
     */
    async getCourseSummary(courseId: string): Promise<CourseAnalyticsSummary> {
        return apiClient.get(API_ENDPOINTS.ANALYTICS.COURSE_SUMMARY(courseId));
    },

    /**
     * Get course analytics timeseries
     */
    async getCourseTimeseries(courseId: string, startDate: string, endDate: string): Promise<TimeSeriesData[]> {
        return apiClient.get(`${API_ENDPOINTS.ANALYTICS.COURSE_TIMESERIES(courseId)}?start=${startDate}&end=${endDate}`);
    },

    /**
     * Get top courses
     */
    async getTopCourses(limit: number = 10): Promise<TopCourse[]> {
        return apiClient.get(`${API_ENDPOINTS.ANALYTICS.TOP_COURSES}?limit=${limit}`);
    },

    /**
     * Track engagement activity
     */
    async trackEngagement(event: AnalyticsEvent): Promise<void> {
        return apiClient.post(API_ENDPOINTS.ANALYTICS.ENGAGEMENT_TRACK, event);
    },

    /**
     * Get engagement summary
     */
    async getEngagementSummary(): Promise<EngagementSummary> {
        return apiClient.get(API_ENDPOINTS.ANALYTICS.ENGAGEMENT_SUMMARY);
    },

    /**
     * Get engagement timeseries
     */
    async getEngagementTimeseries(startDate: string, endDate: string): Promise<TimeSeriesData[]> {
        return apiClient.get(`${API_ENDPOINTS.ANALYTICS.ENGAGEMENT_TIMESERIES}?start=${startDate}&end=${endDate}`);
    },
};
