/**
 * Prefetch Utilities
 *
 * Functions for prefetching data on hover/focus to reduce
 * perceived latency when navigating to a new screen.
 *
 * FR-011: System MUST provide hooks for prefetching data on hover/focus
 *
 * @module core/query/prefetch
 */

import { QueryClient } from '@tanstack/react-query';
import { queryClient } from './client';
import { queryKeys } from './keys';
import { STALE_TIMES } from './constants';
import { apiClient } from '../api/client';
import type { User, Course, DashboardStats, ActivityItem, QuickAction, PaginatedResponse } from '../types/query.types';

/**
 * Prefetch user data
 *
 * Use on hover/focus of user avatars, links, or navigation items
 * to preload user data before the user clicks.
 *
 * @param userId - The user ID to prefetch
 * @param client - QueryClient instance (defaults to singleton)
 *
 * @example
 * ```tsx
 * <Pressable
 *   onHoverIn={() => prefetchUser(userId)}
 *   onPress={() => navigate(`/profile/${userId}`)}
 * >
 *   <UserAvatar userId={userId} />
 * </Pressable>
 * ```
 */
export async function prefetchUser(
  userId: string,
  client: QueryClient = queryClient
): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => apiClient.get<User>(`/users/${userId}`),
    staleTime: STALE_TIMES.USER_PROFILE,
  });
}

/**
 * Prefetch current user data
 *
 * Useful for prefetching authenticated user data on app startup.
 *
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function prefetchCurrentUser(
  client: QueryClient = queryClient
): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.users.current(),
    queryFn: () => apiClient.get<User>('/users/me'),
    staleTime: STALE_TIMES.USER_PROFILE,
  });
}

/**
 * Prefetch course data
 *
 * Use on hover/focus of course cards or links to preload
 * course details before the user clicks.
 *
 * @param courseId - The course ID to prefetch
 * @param client - QueryClient instance (defaults to singleton)
 *
 * @example
 * ```tsx
 * <Pressable
 *   onHoverIn={() => prefetchCourse(courseId)}
 *   onPress={() => navigate(`/courses/${courseId}`)}
 * >
 *   <CourseCard courseId={courseId} />
 * </Pressable>
 * ```
 */
export async function prefetchCourse(
  courseId: string,
  client: QueryClient = queryClient
): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: () => apiClient.get<Course>(`/courses/${courseId}`),
    staleTime: STALE_TIMES.COURSES,
  });
}

/**
 * Prefetch dashboard data
 *
 * Prefetches all dashboard-related queries (stats, activity, quick actions).
 * Useful for prefetching on app startup or when dashboard tab is focused.
 *
 * @param client - QueryClient instance (defaults to singleton)
 *
 * @example
 * ```tsx
 * // On app startup
 * useEffect(() => {
 *   prefetchDashboard();
 * }, []);
 * ```
 */
export async function prefetchDashboard(
  client: QueryClient = queryClient
): Promise<void> {
  await Promise.all([
    // Prefetch dashboard stats
    client.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(),
      queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
      staleTime: STALE_TIMES.DASHBOARD,
    }),

    // Prefetch quick actions
    client.prefetchQuery({
      queryKey: queryKeys.dashboard.quickActions(),
      queryFn: () => apiClient.get<QuickAction[]>('/dashboard/quick-actions'),
      staleTime: STALE_TIMES.DASHBOARD,
    }),

    // Prefetch first page of activity
    client.prefetchInfiniteQuery({
      queryKey: queryKeys.dashboard.activity(),
      queryFn: ({ pageParam }) =>
        apiClient.get<PaginatedResponse<ActivityItem>>(
          `/dashboard/activity?cursor=${pageParam || ''}`
        ),
      initialPageParam: '',
      staleTime: STALE_TIMES.DASHBOARD,
    }),
  ]);
}

/**
 * Prefetch quest data
 *
 * @param questId - The quest ID to prefetch
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function prefetchQuest(
  questId: string,
  client: QueryClient = queryClient
): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.quests.detail(questId),
    queryFn: () => apiClient.get(`/quests/${questId}`),
    staleTime: STALE_TIMES.QUESTS,
  });
}

/**
 * Prefetch daily quests
 *
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function prefetchDailyQuests(
  client: QueryClient = queryClient
): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.quests.daily(),
    queryFn: () => apiClient.get('/quests/daily'),
    staleTime: STALE_TIMES.QUESTS,
  });
}

/**
 * Prefetch leaderboard data
 *
 * @param type - Leaderboard type to prefetch
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function prefetchLeaderboard(
  type: 'global' | 'friends' | 'weekly' | 'monthly',
  client: QueryClient = queryClient
): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.leaderboards.type(type),
    queryFn: () => apiClient.get(`/leaderboards/${type}`),
    staleTime: STALE_TIMES.LEADERBOARDS,
  });
}

/**
 * Prefetch notification count
 *
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function prefetchNotificationCount(
  client: QueryClient = queryClient
): Promise<void> {
  await client.prefetchQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
    staleTime: STALE_TIMES.NOTIFICATIONS,
  });
}

/**
 * Create a prefetch handler for use with onHoverIn/onFocus
 *
 * Wraps a prefetch function with error handling and debouncing.
 *
 * @param prefetchFn - The prefetch function to wrap
 * @returns A safe prefetch handler
 *
 * @example
 * ```tsx
 * const handleHover = createPrefetchHandler(() => prefetchUser(userId));
 *
 * <Pressable onHoverIn={handleHover}>
 *   <UserAvatar />
 * </Pressable>
 * ```
 */
export function createPrefetchHandler(
  prefetchFn: () => Promise<void>
): () => void {
  let prefetched = false;

  return () => {
    if (prefetched) return;
    prefetched = true;

    prefetchFn().catch((error) => {
      // Silently handle prefetch errors - they're not critical
      console.debug('Prefetch failed:', error);
      // Reset flag to allow retry
      prefetched = false;
    });
  };
}
