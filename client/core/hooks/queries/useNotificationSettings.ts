/**
 * Notification Settings Query & Mutation Hooks
 *
 * TanStack Query hooks for notification settings data fetching and updates
 * with optimistic updates, caching, and offline support.
 *
 * US4: Notification Settings with Optimistic Updates
 *
 * @module core/hooks/queries/useNotificationSettings
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  onlineManager,
  type UseQueryOptions,
  type UseQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { notificationsService, NotificationSettings } from '../../services/notifications.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import { offlineMutationQueue } from '../../query/offlineQueue';
import type { ApiError } from '../../types/query.types';

// Register notification settings mutation with offline queue (T047)
const NOTIFICATION_SETTINGS_MUTATION_KEY = 'updateNotificationSettings';
offlineMutationQueue.registerMutation(
  NOTIFICATION_SETTINGS_MUTATION_KEY,
  (updates: Partial<NotificationSettings>) => notificationsService.updateSettings(updates)
);

/**
 * Fetch current notification settings
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with notification settings data
 *
 * @example
 * ```tsx
 * const { data: settings, isLoading, error, refetch } = useNotificationSettings();
 * ```
 */
export function useNotificationSettings(
  options?: Omit<
    UseQueryOptions<NotificationSettings, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<NotificationSettings, ApiError> {
  return useQuery({
    queryKey: queryKeys.notificationSettings.current(),
    queryFn: () => notificationsService.getSettings(),
    staleTime: STALE_TIMES.NOTIFICATION_SETTINGS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Update notification settings mutation with optimistic updates
 *
 * Provides instant UI feedback while the mutation is in progress.
 * If the mutation fails, the previous settings are restored.
 *
 * @param options - Optional TanStack Mutation options
 * @returns Mutation result with update function
 *
 * @example
 * ```tsx
 * const { mutate: updateSettings, isPending } = useUpdateNotificationSettings();
 * 
 * // Toggle a setting with optimistic update
 * updateSettings({ emailNotifications: false });
 * ```
 */
export function useUpdateNotificationSettings(
  options?: Omit<
    UseMutationOptions<NotificationSettings, ApiError, Partial<NotificationSettings>, { previousSettings: NotificationSettings | undefined }>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<NotificationSettings, ApiError, Partial<NotificationSettings>, { previousSettings: NotificationSettings | undefined }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<NotificationSettings>) =>
      notificationsService.updateSettings(updates),

    // Optimistic update (FR-004)
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.notificationSettings.current(),
      });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<NotificationSettings>(
        queryKeys.notificationSettings.current()
      );

      // Optimistically update to the new value
      if (previousSettings) {
        queryClient.setQueryData<NotificationSettings>(
          queryKeys.notificationSettings.current(),
          (old) => old ? { ...old, ...updates } : old
        );
      }

      // Return context with the previous value
      return { previousSettings };
    },

    // If mutation fails, use context to roll back
    onError: (_error, _updates, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(
          queryKeys.notificationSettings.current(),
          context.previousSettings
        );
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationSettings.current(),
      });
    },

    ...options,
  });
}

/**
 * Update a single notification setting with optimistic update
 *
 * Convenience hook for toggling individual settings.
 *
 * @param options - Optional TanStack Mutation options
 * @returns Mutation result with toggle function
 *
 * @example
 * ```tsx
 * const { mutate: toggleSetting, isPending } = useToggleNotificationSetting();
 * 
 * // Toggle email notifications
 * toggleSetting({ key: 'emailNotifications', value: false });
 * ```
 */
export function useToggleNotificationSetting(
  options?: Omit<
    UseMutationOptions<
      NotificationSettings,
      ApiError,
      { key: keyof NotificationSettings; value: boolean },
      { previousSettings: NotificationSettings | undefined }
    >,
    'mutationFn'
  >
): UseMutationResult<
  NotificationSettings,
  ApiError,
  { key: keyof NotificationSettings; value: boolean },
  { previousSettings: NotificationSettings | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }) => {
      const updates: Partial<NotificationSettings> = { [key]: value };
      return notificationsService.updateSettings(updates);
    },

    // Optimistic update
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notificationSettings.current(),
      });

      const previousSettings = queryClient.getQueryData<NotificationSettings>(
        queryKeys.notificationSettings.current()
      );

      if (previousSettings) {
        queryClient.setQueryData<NotificationSettings>(
          queryKeys.notificationSettings.current(),
          (old) => old ? { ...old, [key]: value } : old
        );
      }

      return { previousSettings };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(
          queryKeys.notificationSettings.current(),
          context.previousSettings
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationSettings.current(),
      });
    },

    ...options,
  });
}

/**
 * Update a notification type setting with optimistic update
 *
 * Convenience hook for toggling notification type preferences.
 *
 * @param options - Optional TanStack Mutation options
 * @returns Mutation result with toggle function
 *
 * @example
 * ```tsx
 * const { mutate: toggleType, isPending } = useToggleNotificationType();
 * 
 * // Toggle likes notifications
 * toggleType({ type: 'likes', value: false });
 * ```
 */
export function useToggleNotificationType(
  options?: Omit<
    UseMutationOptions<
      NotificationSettings,
      ApiError,
      { type: keyof NotificationSettings['notificationTypes']; value: boolean },
      { previousSettings: NotificationSettings | undefined }
    >,
    'mutationFn'
  >
): UseMutationResult<
  NotificationSettings,
  ApiError,
  { type: keyof NotificationSettings['notificationTypes']; value: boolean },
  { previousSettings: NotificationSettings | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, value }) => {
      // Get current settings to construct full update
      const current = queryClient.getQueryData<NotificationSettings>(
        queryKeys.notificationSettings.current()
      );

      if (!current) {
        throw new Error('Settings not loaded');
      }

      return notificationsService.updateSettings({
        notificationTypes: {
          ...current.notificationTypes,
          [type]: value,
        },
      });
    },

    // Optimistic update for nested notificationTypes
    onMutate: async ({ type, value }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notificationSettings.current(),
      });

      const previousSettings = queryClient.getQueryData<NotificationSettings>(
        queryKeys.notificationSettings.current()
      );

      if (previousSettings) {
        queryClient.setQueryData<NotificationSettings>(
          queryKeys.notificationSettings.current(),
          (old) => old ? {
            ...old,
            notificationTypes: {
              ...old.notificationTypes,
              [type]: value,
            },
          } : old
        );
      }

      return { previousSettings };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(
          queryKeys.notificationSettings.current(),
          context.previousSettings
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationSettings.current(),
      });
    },

    ...options,
  });
}
