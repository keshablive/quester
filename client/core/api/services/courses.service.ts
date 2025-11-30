import { apiClient, ApiError } from '../client';
import type { ServiceRequestOptions } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Course {
    id: string;
    title: string;
    description: string;
    instructor: string;
    duration: number;
    level: 'beginner' | 'intermediate' | 'advanced';
    thumbnail?: string;
    enrolled: boolean;
    progress?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Lesson {
    id: string;
    courseId: string;
    title: string;
    description: string;
    order: number;
    duration: number;
    videoUrl?: string;
    content?: string;
    completed: boolean;
}

export interface CourseProgress {
    courseId: string;
    completedLessons: number;
    totalLessons: number;
    progress: number;
    lastAccessedAt: string;
}

export const coursesService = {
    /**
     * Get all courses
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async getCourses(page: number = 1, limit: number = 20, options?: ServiceRequestOptions): Promise<Course[]> {
        try {
            return await apiClient.get(`${API_ENDPOINTS.COURSES.BASE}?page=${page}&limit=${limit}`, {
                signal: options?.signal,
            });
        } catch (error) {
            // FR-012: Log error with context (excluding PII per Constitution II)
            console.error('[coursesService.getCourses] Failed to fetch courses', {
                page,
                limit,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
                isNetworkError: error instanceof ApiError ? error.isNetworkError : false,
            });
            throw error;
        }
    },

    /**
     * Get course by ID
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async getCourse(id: string, options?: ServiceRequestOptions): Promise<Course> {
        try {
            return await apiClient.get(API_ENDPOINTS.COURSES.BY_ID(id), {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[coursesService.getCourse] Failed to fetch course', {
                courseId: id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
                isNetworkError: error instanceof ApiError ? error.isNetworkError : false,
            });
            throw error;
        }
    },

    /**
     * Get course lessons
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async getCourseLessons(id: string, options?: ServiceRequestOptions): Promise<Lesson[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.COURSES.LESSONS(id), {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[coursesService.getCourseLessons] Failed to fetch lessons', {
                courseId: id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
                isNetworkError: error instanceof ApiError ? error.isNetworkError : false,
            });
            throw error;
        }
    },

    /**
     * Enroll in course
     */
    async enrollCourse(id: string, options?: ServiceRequestOptions): Promise<void> {
        try {
            await apiClient.post(API_ENDPOINTS.COURSES.ENROLL(id), undefined, {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[coursesService.enrollCourse] Failed to enroll', {
                courseId: id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
            });
            throw error;
        }
    },

    /**
     * Get course progress
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async getCourseProgress(id: string, options?: ServiceRequestOptions): Promise<CourseProgress> {
        try {
            return await apiClient.get(API_ENDPOINTS.COURSES.PROGRESS(id), {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[coursesService.getCourseProgress] Failed to fetch progress', {
                courseId: id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
            });
            throw error;
        }
    },
};

export const lessonsService = {
    /**
     * Get lesson by ID
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async getLesson(id: string, options?: ServiceRequestOptions): Promise<Lesson> {
        try {
            return await apiClient.get(API_ENDPOINTS.LESSONS.BY_ID(id), {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[lessonsService.getLesson] Failed to fetch lesson', {
                lessonId: id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
            });
            throw error;
        }
    },

    /**
     * Mark lesson as complete
     */
    async completeLesson(id: string, options?: ServiceRequestOptions): Promise<void> {
        try {
            return await apiClient.post(API_ENDPOINTS.LESSONS.COMPLETE(id), undefined, {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[lessonsService.completeLesson] Failed to complete lesson', {
                lessonId: id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
            });
            throw error;
        }
    },
};
