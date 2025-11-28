/**
 * Notification Query Hooks
 *
 * TanStack Query hooks for fetching notification data with caching.
 * Supports infinite scroll for notification lists.
 *
 * @module core/hooks/queries/useNotifications
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
  Notification,
  NotificationFilters,
  PaginatedResponse,
  ApiError,
} from '../../types/query.types';

/**
 * Fetch notifications with infinite scroll
 *
 * @param filters - Optional filters (read status, type)
 * @param options - Optional TanStack Query options
 * @returns Infinite query result with paginated notifications
 *
 * @example
 * ```tsx
 * function NotificationList() {
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
 *
 *   const notifications = data?.pages.flatMap(page => page.items) ?? [];
 *
 *   return (
 *     <FlatList
 *       data={notifications}
 *       renderItem={({ item }) => <NotificationCard notification={item} />}
 *       onEndReached={() => hasNextPage && fetchNextPage()}
 *       ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
 *     />
 *   );
 * }
 * ```
 */
export function useNotifications(
  filters?: NotificationFilters,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Notification>,
      ApiError,
      InfiniteData<PaginatedResponse<Notification>>,
      readonly unknown[],
      string
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  >
): UseInfiniteQueryResult<
  InfiniteData<PaginatedResponse<Notification>>,
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      params.set('limit', '20');
      if (filters?.read !== undefined) {
        params.set('read', String(filters.read));
      }
      if (filters?.type) params.set('type', filters.type);

      return apiClient.get<PaginatedResponse<Notification>>(
        `/notifications?${params.toString()}`
      );
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.NOTIFICATIONS,
    ...options,
  });
}

/**
 * Fetch unread notification count
 *
 * Useful for badge display in navigation/header.
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with unread count
 *
 * @example
 * ```tsx
 * function NotificationBadge() {
 *   const { data } = useUnreadNotificationCount();
 *
 *   if (!data?.count) return null;
 *
 *   return (
 *     <Badge count={data.count} />
 *   );
 * }
 * ```
 */
export function useUnreadNotificationCount(
  options?: Omit<
    UseQueryOptions<{ count: number }, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<{ count: number }, ApiError> {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () =>
      apiClient.get<{ count: number }>('/notifications/unread-count'),
    staleTime: STALE_TIMES.NOTIFICATIONS,
    // Poll for new notifications
    refetchInterval: 30000, // Every 30 seconds
    ...options,
  });
}

/**
 * Fetch unread notifications only
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with unread notifications
 */
export function useUnreadNotifications(
  options?: Omit<
    UseQueryOptions<Notification[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Notification[], ApiError> {
  return useQuery({
    queryKey: queryKeys.notifications.list({ read: false }),
    queryFn: () =>
      apiClient.get<Notification[]>('/notifications?read=false'),
    staleTime: STALE_TIMES.NOTIFICATIONS,
    ...options,
  });
}
