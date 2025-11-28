/**
 * Course Mutation Hooks
 *
 * TanStack Query mutations for course enrollment and progress
 * with optimistic updates and cascade invalidation.
 *
 * US4: Cascade Invalidation on Quest Complete
 *
 * @module core/hooks/mutations/useCourseMutations
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { invalidateByMutation } from '../../query/invalidation';
import type {
  Course,
  CourseProgress,
  ApiError,
} from '../../types/query.types';

/**
 * Enroll in a course
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for course enrollment
 *
 * @example
 * ```tsx
 * function EnrollButton({ course }) {
 *   const { mutate: enroll, isPending } = useEnrollCourse();
 *
 *   return (
 *     <Button
 *       onPress={() => enroll(course.id)}
 *       disabled={isPending}
 *     >
 *       {isPending ? 'Enrolling...' : 'Enroll Now'}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useEnrollCourse(
  options?: Omit<
    UseMutationOptions<Course, ApiError, string>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<Course, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) =>
      apiClient.post<Course>(`/courses/${courseId}/enroll`),

    onSuccess: (_data, courseId) => {
      // Invalidate course detail and user's enrolled courses
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.list({ status: 'enrolled' }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },

    ...options,
  });
}

/**
 * Complete a lesson within a course
 *
 * Updates course progress and may trigger cascade invalidation
 * for related stats and achievements.
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for lesson completion
 */
export function useCompleteLesson(
  options?: Omit<
    UseMutationOptions<
      CourseProgress,
      ApiError,
      { courseId: string; lessonId: string }
    >,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<
  CourseProgress,
  ApiError,
  { courseId: string; lessonId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, lessonId }) =>
      apiClient.post<CourseProgress>(
        `/courses/${courseId}/lessons/${lessonId}/complete`
      ),

    onSuccess: (data, { courseId }) => {
      // Update course progress in cache
      queryClient.setQueryData(queryKeys.courses.progress(courseId), data);

      // Invalidate related queries
      invalidateByMutation(queryClient, 'course.completeLesson');

      // If course is now completed, invalidate completed courses list
      if (data.percentComplete === 100) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.courses.list({ status: 'completed' }),
        });
      }
    },

    ...options,
  });
}

/**
 * Submit a course assignment
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for assignment submission
 */
export function useSubmitAssignment(
  options?: Omit<
    UseMutationOptions<
      { score: number; passed: boolean },
      ApiError,
      { courseId: string; assignmentId: string; answers: Record<string, unknown> }
    >,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<
  { score: number; passed: boolean },
  ApiError,
  { courseId: string; assignmentId: string; answers: Record<string, unknown> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, assignmentId, answers }) =>
      apiClient.post<{ score: number; passed: boolean }>(
        `/courses/${courseId}/assignments/${assignmentId}/submit`,
        { answers }
      ),

    onSuccess: (_data, { courseId }) => {
      // Invalidate course progress to show updated status
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.progress(courseId),
      });
      invalidateByMutation(queryClient, 'course.submitAssignment');
    },

    ...options,
  });
}

/**
 * Rate a course
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for course rating
 */
export function useRateCourse(
  options?: Omit<
    UseMutationOptions<
      Course,
      ApiError,
      { courseId: string; rating: number; review?: string }
    >,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<
  Course,
  ApiError,
  { courseId: string; rating: number; review?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, rating, review }) =>
      apiClient.post<Course>(`/courses/${courseId}/rate`, { rating, review }),

    onSuccess: (data, { courseId }) => {
      queryClient.setQueryData(queryKeys.courses.detail(courseId), data);
    },

    ...options,
  });
}
