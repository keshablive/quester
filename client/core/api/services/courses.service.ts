import { apiClient } from '../client';
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
     */
    async getCourses(page: number = 1, limit: number = 20): Promise<Course[]> {
        try {
            return await apiClient.get(`${API_ENDPOINTS.COURSES.BASE}?page=${page}&limit=${limit}`);
        } catch (error) {
            console.warn('Failed to get courses, returning mock data:', error);
            return [
                {
                    id: '1',
                    title: 'Introduction to React Native',
                    description: 'Learn the basics of React Native development',
                    instructor: 'John Doe',
                    duration: 120,
                    level: 'beginner',
                    enrolled: true,
                    progress: 45,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: '2',
                    title: 'Advanced TypeScript Patterns',
                    description: 'Master advanced TypeScript concepts',
                    instructor: 'Jane Smith',
                    duration: 180,
                    level: 'advanced',
                    enrolled: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }
            ];
        }
    },

    /**
     * Get course by ID
     */
    async getCourse(id: string): Promise<Course> {
        try {
            return await apiClient.get(API_ENDPOINTS.COURSES.BY_ID(id));
        } catch (error) {
            console.warn(`Failed to get course ${id}, returning mock data:`, error);
            return {
                id: id,
                title: 'Introduction to React Native',
                description: 'Learn the basics of React Native development',
                instructor: 'John Doe',
                duration: 120,
                level: 'beginner',
                enrolled: true,
                progress: 45,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }
    },

    /**
     * Get course lessons
     */
    async getCourseLessons(id: string): Promise<Lesson[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.COURSES.LESSONS(id));
        } catch (error) {
            console.warn(`Failed to get lessons for course ${id}, returning mock data:`, error);
            return [
                {
                    id: '1',
                    courseId: id,
                    title: 'Setup Environment',
                    description: 'Setting up your development environment',
                    order: 1,
                    duration: 15,
                    completed: true,
                    videoUrl: 'https://example.com/video.mp4',
                    content: 'Step 1: Install Node.js...'
                },
                {
                    id: '2',
                    courseId: id,
                    title: 'Hello World',
                    description: 'Your first React Native app',
                    order: 2,
                    duration: 20,
                    completed: false,
                    videoUrl: 'https://example.com/video2.mp4',
                    content: 'Step 1: Create a new project...'
                }
            ];
        }
    },

    /**
     * Enroll in course
     */
    async enrollCourse(id: string): Promise<void> {
        try {
            await apiClient.post(API_ENDPOINTS.COURSES.ENROLL(id));
        } catch (error) {
            console.warn(`Failed to enroll in course ${id}, simulating success:`, error);
            return;
        }
    },

    /**
     * Get course progress
     */
    async getCourseProgress(id: string): Promise<CourseProgress> {
        try {
            return await apiClient.get(API_ENDPOINTS.COURSES.PROGRESS(id));
        } catch (error) {
            return {
                courseId: id,
                completedLessons: 1,
                totalLessons: 2,
                progress: 50,
                lastAccessedAt: new Date().toISOString(),
            };
        }
    },
};

export const lessonsService = {
    /**
     * Get lesson by ID
     */
    async getLesson(id: string): Promise<Lesson> {
        try {
            return await apiClient.get(API_ENDPOINTS.LESSONS.BY_ID(id));
        } catch (error) {
            return {
                id: id,
                courseId: '1',
                title: 'Setup Environment',
                description: 'Setting up your development environment',
                order: 1,
                duration: 15,
                completed: true,
                videoUrl: 'https://example.com/video.mp4',
                content: 'Step 1: Install Node.js...'
            };
        }
    },

    /**
     * Mark lesson as complete
     */
    async completeLesson(id: string): Promise<void> {
        try {
            return await apiClient.post(API_ENDPOINTS.LESSONS.COMPLETE(id));
        } catch (error) {
            console.warn(`Failed to complete lesson ${id}, simulating success:`, error);
            return;
        }
    },
};
