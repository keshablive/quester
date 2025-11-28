/**
 * Notification Mutation Hooks
 *
 * TanStack Query mutations for notification management
 * with optimistic updates.
 *
 * @module core/hooks/mutations/useNotificationMutations
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import type { Notification, ApiError } from '../../types/query.types';

/**
 * Mark a single notification as read
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for marking notification read
 *
 * @example
 * ```tsx
 * function NotificationItem({ notification }) {
 *   const { mutate: markRead } = useMarkNotificationRead();
 *
 *   return (
 *     <Pressable onPress={() => markRead(notification.id)}>
 *       <NotificationContent notification={notification} />
 *     </Pressable>
 *   );
 * }
 * ```
 */
export function useMarkNotificationRead(
  options?: Omit<
    UseMutationOptions<
      Notification,
      ApiError,
      string,
      { previousCount: { count: number } | undefined }
    >,
    'mutationFn' | 'onMutate' | 'onError' | 'onSuccess'
  >
): UseMutationResult<
  Notification,
  ApiError,
  string,
  { previousCount: { count: number } | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch<Notification>(
        `/notifications/${notificationId}/read`
      ),

    // Optimistic update: decrement unread count immediately
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });

      const previousCount = queryClient.getQueryData<{ count: number }>(
        queryKeys.notifications.unreadCount()
      );

      if (previousCount && previousCount.count > 0) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), {
          count: previousCount.count - 1,
        });
      }

      return { previousCount };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousCount) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousCount
        );
      }
    },

    onSuccess: () => {
      // Invalidate notification lists to refresh read status
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },

    ...options,
  });
}

/**
 * Mark all notifications as read
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for marking all read
 */
export function useMarkAllNotificationsRead(
  options?: Omit<
    UseMutationOptions<
      void,
      ApiError,
      void,
      { previousCount: { count: number } | undefined }
    >,
    'mutationFn' | 'onMutate' | 'onError' | 'onSuccess'
  >
): UseMutationResult<
  void,
  ApiError,
  void,
  { previousCount: { count: number } | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<void>('/notifications/mark-all-read'),

    // Optimistic update: set unread count to 0
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });

      const previousCount = queryClient.getQueryData<{ count: number }>(
        queryKeys.notifications.unreadCount()
      );

      queryClient.setQueryData(queryKeys.notifications.unreadCount(), {
        count: 0,
      });

      return { previousCount };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousCount) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousCount
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },

    ...options,
  });
}

/**
 * Delete a notification
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for deleting notification
 */
export function useDeleteNotification(
  options?: Omit<
    UseMutationOptions<void, ApiError, string>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.delete<void>(`/notifications/${notificationId}`),

    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },

    ...options,
  });
}

/**
 * Update notification settings
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for settings update
 */
export function useUpdateNotificationSettings(
  options?: Omit<
    UseMutationOptions<
      { email: boolean; push: boolean; types: string[] },
      ApiError,
      { email?: boolean; push?: boolean; types?: string[] }
    >,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<
  { email: boolean; push: boolean; types: string[] },
  ApiError,
  { email?: boolean; push?: boolean; types?: string[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings) =>
      apiClient.patch<{ email: boolean; push: boolean; types: string[] }>(
        '/notifications/settings',
        settings
      ),

    onSuccess: () => {
      // Invalidate user profile to show updated settings
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.me(),
      });
    },

    ...options,
  });
}
