/**
 * Course Query Hooks
 *
 * TanStack Query hooks for fetching course data with caching.
 * Supports infinite scroll for course lists.
 *
 * US5: Paginated Data with Infinite Scroll
 *
 * @module core/hooks/queries/useCourses
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
  Course,
  CourseProgress,
  CourseFilters,
  PaginatedResponse,
  ApiError,
} from '../../types/query.types';

/**
 * Fetch courses with infinite scroll
 *
 * @param filters - Optional filters (category, difficulty, status)
 * @param options - Optional TanStack Query options
 * @returns Infinite query result with paginated courses
 *
 * @example
 * ```tsx
 * function CourseList() {
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useCourses({
 *     category: 'programming',
 *   });
 *
 *   const courses = data?.pages.flatMap(page => page.items) ?? [];
 *
 *   return (
 *     <FlatList
 *       data={courses}
 *       renderItem={({ item }) => <CourseCard course={item} />}
 *       onEndReached={() => hasNextPage && fetchNextPage()}
 *       ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
 *     />
 *   );
 * }
 * ```
 */
export function useCourses(
  filters?: CourseFilters,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Course>,
      ApiError,
      InfiniteData<PaginatedResponse<Course>>,
      readonly unknown[],
      string
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  >
): UseInfiniteQueryResult<
  InfiniteData<PaginatedResponse<Course>>,
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.courses.infinite(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      params.set('limit', '20');
      if (filters?.search) params.set('search', filters.search);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.difficulty) params.set('difficulty', filters.difficulty);
      if (filters?.status) params.set('status', filters.status);

      return apiClient.get<PaginatedResponse<Course>>(
        `/courses?${params.toString()}`
      );
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.COURSES,
    ...options,
  });
}

/**
 * Fetch a single course by ID
 *
 * @param courseId - The course's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with course data
 *
 * @example
 * ```tsx
 * function CourseDetail({ courseId }) {
 *   const { data: course, isLoading, error } = useCourse(courseId);
 *
 *   if (isLoading) return <CourseSkeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <View>
 *       <Text>{course.title}</Text>
 *       <Text>{course.description}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useCourse(
  courseId: string,
  options?: Omit<
    UseQueryOptions<Course, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Course, ApiError> {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: () => apiClient.get<Course>(`/courses/${courseId}`),
    staleTime: STALE_TIMES.COURSES,
    enabled: !!courseId,
    ...options,
  });
}

/**
 * Fetch course progress for the current user
 *
 * @param courseId - The course's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with course progress
 *
 * @example
 * ```tsx
 * function CourseProgressBar({ courseId }) {
 *   const { data: progress, isLoading } = useCourseProgress(courseId);
 *
 *   if (isLoading) return <ProgressSkeleton />;
 *
 *   return (
 *     <View>
 *       <ProgressBar progress={progress?.percentComplete ?? 0} />
 *       <Text>{progress?.completedLessons}/{progress?.totalLessons} lessons</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useCourseProgress(
  courseId: string,
  options?: Omit<
    UseQueryOptions<CourseProgress, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<CourseProgress, ApiError> {
  return useQuery({
    queryKey: queryKeys.courses.progress(courseId),
    queryFn: () =>
      apiClient.get<CourseProgress>(`/courses/${courseId}/progress`),
    staleTime: STALE_TIMES.COURSES,
    enabled: !!courseId,
    ...options,
  });
}

/**
 * Fetch enrolled courses for current user
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with enrolled courses
 */
export function useEnrolledCourses(
  options?: Omit<
    UseQueryOptions<Course[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Course[], ApiError> {
  return useQuery({
    queryKey: queryKeys.courses.list({ status: 'enrolled' }),
    queryFn: () =>
      apiClient.get<Course[]>('/courses?status=enrolled'),
    staleTime: STALE_TIMES.COURSES,
    ...options,
  });
}

/**
 * Fetch completed courses for current user
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with completed courses
 */
export function useCompletedCourses(
  options?: Omit<
    UseQueryOptions<Course[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Course[], ApiError> {
  return useQuery({
    queryKey: queryKeys.courses.list({ status: 'completed' }),
    queryFn: () =>
      apiClient.get<Course[]>('/courses?status=completed'),
    staleTime: STALE_TIMES.COURSES,
    ...options,
  });
}
