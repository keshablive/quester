/**
 * User Mutation Hooks
 *
 * TanStack Query mutations for user profile updates with
 * optimistic updates and automatic cache invalidation.
 *
 * US2: Optimistic Profile Updates
 *
 * @module core/hooks/mutations/useUserMutations
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
import type { User, ApiError } from '../../types/query.types';

/**
 * Update user profile data
 */
export interface UpdateUserInput {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  settings?: Record<string, unknown>;
}

/**
 * Mutation context for rollback on error
 */
interface UserMutationContext {
  previousUser: User | undefined;
}

/**
 * Update current user's profile with optimistic updates
 *
 * Immediately updates the UI while the API call is in progress.
 * If the mutation fails, the cache is rolled back to the previous state.
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for profile updates
 *
 * @example
 * ```tsx
 * function ProfileEditor() {
 *   const { mutate: updateProfile, isPending } = useUpdateProfile();
 *
 *   const handleSave = (data: UpdateUserInput) => {
 *     updateProfile(data, {
 *       onSuccess: () => {
 *         Toast.show('Profile updated!');
 *       },
 *       onError: (error) => {
 *         Toast.show(`Failed: ${error.message}`);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <ProfileForm onSubmit={handleSave} isLoading={isPending} />
 *   );
 * }
 * ```
 */
export function useUpdateProfile(
  options?: Omit<
    UseMutationOptions<User, ApiError, UpdateUserInput, UserMutationContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<User, ApiError, UpdateUserInput, UserMutationContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserInput) =>
      apiClient.patch<User>('/users/me', input),

    // Optimistic update: immediately update the cache
    onMutate: async (newData) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.users.me() });

      // Snapshot the previous value for rollback
      const previousUser = queryClient.getQueryData<User>(queryKeys.users.me());

      // Optimistically update the cache
      if (previousUser) {
        queryClient.setQueryData<User>(queryKeys.users.me(), {
          ...previousUser,
          ...newData,
        });
      }

      // Return context with snapshot for rollback
      return { previousUser };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.me(), context.previousUser);
      }
    },

    // Refetch after success or error to ensure consistency
    onSettled: () => {
      invalidateByMutation(queryClient, 'user.updateProfile');
    },

    ...options,
  });
}

/**
 * Update user avatar with optimistic preview
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for avatar updates
 */
export function useUpdateAvatar(
  options?: Omit<
    UseMutationOptions<User, ApiError, File, UserMutationContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<User, ApiError, File, UserMutationContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return apiClient.post<User>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    onMutate: async (file) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.me() });
      const previousUser = queryClient.getQueryData<User>(queryKeys.users.me());

      // Optimistically set local preview URL
      if (previousUser) {
        const previewUrl = URL.createObjectURL(file);
        queryClient.setQueryData<User>(queryKeys.users.me(), {
          ...previousUser,
          avatarUrl: previewUrl,
        });
      }

      return { previousUser };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.me(), context.previousUser);
      }
    },

    onSettled: () => {
      invalidateByMutation(queryClient, 'user.updateAvatar');
    },

    ...options,
  });
}

/**
 * Follow a user
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for follow action
 */
export function useFollowUser(
  options?: Omit<
    UseMutationOptions<void, ApiError, string>,
    'mutationFn' | 'onSettled'
  >
): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<void>(`/users/${userId}/follow`),

    onSettled: (_data, _error, userId) => {
      // Invalidate both users' profiles
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },

    ...options,
  });
}

/**
 * Unfollow a user
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for unfollow action
 */
export function useUnfollowUser(
  options?: Omit<
    UseMutationOptions<void, ApiError, string>,
    'mutationFn' | 'onSettled'
  >
): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete<void>(`/users/${userId}/follow`),

    onSettled: (_data, _error, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },

    ...options,
  });
}
