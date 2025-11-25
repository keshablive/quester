import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client'; // T311: Use API client with 401 interceptor

// Types
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  contentType: 'video' | 'text' | 'quiz';
  contentUrl?: string;
  textContent?: string;
  quizData?: QuizData;
  orderIndex: number;
  xpReward: number;
  duration?: number;
  isLocked: boolean;
  isCompleted: boolean;
  grade?: number;
  prerequisiteLessonId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  passingGrade: number;
  timeLimit?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  correctAnswer: string | boolean;
  points: number;
}

export interface LessonCompletion {
  lessonId: string;
  userId: string;
  completedAt: string;
  grade?: number;
  timeSpent?: number;
}

export interface LessonProgress {
  lessonId: string;
  totalCompletions: number;
  averageGrade: number;
  averageTimeSpent: number;
  completionRate: number;
}

export interface CreateLessonRequest {
  courseId: string;
  title: string;
  description?: string;
  contentType: 'video' | 'text' | 'quiz';
  contentUrl?: string;
  textContent?: string;
  quizData?: QuizData;
  orderIndex: number;
  xpReward: number;
  duration?: number;
  prerequisiteLessonId?: string;
}

export interface UpdateLessonRequest extends Partial<CreateLessonRequest> {
  id: string;
}

export interface CompleteLessonRequest {
  lessonId: string;
  grade?: number;
  timeSpent?: number;
  answers?: Record<string, string | boolean>;
}

export interface ReorderLessonsRequest {
  courseId: string;
  lessons: Array<{ id: string; orderIndex: number }>;
}

// T311: Use apiClient with automatic token refresh and retry logic
// Helper function for API calls (now uses apiClient for 401 handling)
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Use apiClient which handles token refresh automatically
  const method = (options.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
  
  switch (method) {
    case 'post':
      return apiClient.post(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'put':
      return apiClient.put(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'patch':
      return apiClient.patch(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'delete':
      return apiClient.delete(endpoint);
    default:
      return apiClient.get(endpoint);
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all lessons for a course
 */
export async function getCourseLessons(courseId: string): Promise<Lesson[]> {
  const response = await apiCall<{ lessons: Lesson[] }>(`/courses/${courseId}/lessons`);
  return response.lessons;
}

/**
 * Get single lesson by ID
 */
export async function getLesson(lessonId: string): Promise<Lesson> {
  const response = await apiCall<{ lesson: Lesson }>(`/lessons/${lessonId}`);
  return response.lesson;
}

/**
 * Get lesson progress (instructor/admin only)
 */
export async function getLessonProgress(lessonId: string): Promise<LessonProgress> {
  const response = await apiCall<{ progress: LessonProgress }>(`/lessons/${lessonId}/progress`);
  return response.progress;
}

/**
 * Get user's lesson completion
 */
export async function getLessonCompletion(lessonId: string): Promise<LessonCompletion | null> {
  try {
    const response = await apiCall<{ completion: LessonCompletion }>(`/lessons/${lessonId}/completion`);
    return response.completion;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a new lesson (course owner/admin only)
 */
export async function createLesson(data: CreateLessonRequest): Promise<Lesson> {
  const response = await apiCall<{ lesson: Lesson }>(`/courses/${data.courseId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.lesson;
}

/**
 * Update existing lesson
 */
export async function updateLesson(data: UpdateLessonRequest): Promise<Lesson> {
  const { id, ...updates } = data;
  const response = await apiCall<{ lesson: Lesson }>(`/lessons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response.lesson;
}

/**
 * Delete lesson
 */
export async function deleteLesson(lessonId: string): Promise<void> {
  await apiCall(`/lessons/${lessonId}`, {
    method: 'DELETE',
  });
}

/**
 * Complete a lesson
 */
export async function completeLesson(data: CompleteLessonRequest): Promise<{
  completion: LessonCompletion;
  xpAwarded: number;
  certificateIssued: boolean;
}> {
  const { lessonId, ...body } = data;
  const response = await apiCall<{
    completion: LessonCompletion;
    xpAwarded: number;
    certificateIssued: boolean;
  }>(`/lessons/${lessonId}/complete`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response;
}

/**
 * Reorder lessons in a course
 */
export async function reorderLessons(data: ReorderLessonsRequest): Promise<void> {
  const { courseId, lessons } = data;
  await apiCall(`/courses/${courseId}/lessons/reorder`, {
    method: 'POST',
    body: JSON.stringify({ lessons }),
  });
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch course lessons
 */
export function useCourseLessons(courseId: string) {
  return useQuery({
    queryKey: ['lessons', 'course', courseId],
    queryFn: () => getCourseLessons(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch single lesson
 */
export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: ['lessons', lessonId],
    queryFn: () => getLesson(lessonId),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch lesson progress (instructor/admin)
 */
export function useLessonProgress(lessonId: string) {
  return useQuery({
    queryKey: ['lessons', lessonId, 'progress'],
    queryFn: () => getLessonProgress(lessonId),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch lesson completion
 */
export function useLessonCompletion(lessonId: string) {
  return useQuery({
    queryKey: ['lessons', lessonId, 'completion'],
    queryFn: () => getLessonCompletion(lessonId),
    enabled: !!lessonId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create lesson
 */
export function useCreateLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createLesson,
    onSuccess: (data) => {
      // Invalidate course lessons
      queryClient.invalidateQueries({ queryKey: ['lessons', 'course', data.courseId] });
      // Invalidate course to update lesson count
      queryClient.invalidateQueries({ queryKey: ['courses', data.courseId] });
    },
  });
}

/**
 * Hook to update lesson
 */
export function useUpdateLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateLesson,
    onSuccess: (data) => {
      // Update lesson in cache
      queryClient.setQueryData(['lessons', data.id], data);
      // Invalidate course lessons
      queryClient.invalidateQueries({ queryKey: ['lessons', 'course', data.courseId] });
    },
  });
}

/**
 * Hook to delete lesson
 */
export function useDeleteLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteLesson,
    onSuccess: (_, lessonId) => {
      // Remove lesson from cache
      queryClient.removeQueries({ queryKey: ['lessons', lessonId] });
      // Invalidate all course lessons (we don't know which course)
      queryClient.invalidateQueries({ queryKey: ['lessons', 'course'] });
      // Invalidate all courses (to update lesson counts)
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Hook to complete lesson
 */
export function useCompleteLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: completeLesson,
    onSuccess: (data, variables) => {
      // Invalidate lesson to update completion status
      queryClient.invalidateQueries({ queryKey: ['lessons', variables.lessonId] });
      queryClient.invalidateQueries({ queryKey: ['lessons', variables.lessonId, 'completion'] });
      // Invalidate course lessons to update unlock status of next lessons
      queryClient.invalidateQueries({ queryKey: ['lessons', 'course'] });
      // Invalidate enrollments to update progress
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      // Invalidate user profile if XP was awarded
      if (data.xpAwarded > 0) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
      // Invalidate certificates if one was issued
      if (data.certificateIssued) {
        queryClient.invalidateQueries({ queryKey: ['certificates'] });
      }
    },
  });
}

/**
 * Hook to reorder lessons
 */
export function useReorderLessons() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reorderLessons,
    onSuccess: (_, variables) => {
      // Invalidate course lessons to refresh order
      queryClient.invalidateQueries({ queryKey: ['lessons', 'course', variables.courseId] });
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate next unlocked lesson
 */
export function getNextLesson(lessons: Lesson[]): Lesson | null {
  const sortedLessons = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  return sortedLessons.find(lesson => !lesson.isCompleted && !lesson.isLocked) || null;
}

/**
 * Calculate course progress
 */
export function calculateProgress(lessons: Lesson[]): {
  completedCount: number;
  totalCount: number;
  percentage: number;
} {
  const totalCount = lessons.length;
  const completedCount = lessons.filter(l => l.isCompleted).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  return { completedCount, totalCount, percentage };
}

/**
 * Calculate average grade
 */
export function calculateAverageGrade(lessons: Lesson[]): number | null {
  const gradedLessons = lessons.filter(l => l.isCompleted && l.grade !== undefined);
  if (gradedLessons.length === 0) return null;
  
  const sum = gradedLessons.reduce((acc, l) => acc + (l.grade || 0), 0);
  return Math.round(sum / gradedLessons.length);
}

/**
 * Check if lesson is accessible
 */
export function isLessonAccessible(lesson: Lesson, lessons: Lesson[]): boolean {
  if (!lesson.prerequisiteLessonId) return true;
  
  const prerequisite = lessons.find(l => l.id === lesson.prerequisiteLessonId);
  return prerequisite ? prerequisite.isCompleted : false;
}

/**
 * Format lesson duration
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get content type icon
 */
export function getContentTypeIcon(contentType: Lesson['contentType']): string {
  switch (contentType) {
    case 'video':
      return '🎥';
    case 'text':
      return '📝';
    case 'quiz':
      return '📋';
    default:
      return '📄';
  }
}

/**
 * Get content type label
 */
export function getContentTypeLabel(contentType: Lesson['contentType']): string {
  switch (contentType) {
    case 'video':
      return 'Video';
    case 'text':
      return 'Reading';
    case 'quiz':
      return 'Quiz';
    default:
      return 'Content';
  }
}
