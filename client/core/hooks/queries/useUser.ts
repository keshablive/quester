/**
 * User Query Hooks
 *
 * TanStack Query hooks for fetching user data with caching.
 *
 * @module core/hooks/queries/useUser
 */

import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES } from '../../query/constants';
import type { User, UserProfile, ApiError } from '../../types/query.types';
import { useAuth } from '../../auth/AuthContext';

/**
 * Fetch a user by ID
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with user data
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }) {
 *   const { data: user, isLoading, error } = useUser(userId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <Text>{user.displayName}</Text>;
 * }
 * ```
 */
export function useUser(
  userId: string,
  options?: Omit<
    UseQueryOptions<User, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<User, ApiError> {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => apiClient.get<User>(`/users/${userId}`),
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch the current authenticated user
 *
 * Uses the auth context to get the current user ID,
 * then fetches the full user data.
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with current user data
 *
 * @example
 * ```tsx
 * function ProfileHeader() {
 *   const { data: user, isLoading } = useCurrentUser();
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <View>
 *       <Avatar source={user?.avatarUrl} />
 *       <Text>{user?.displayName}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useCurrentUser(
  options?: Omit<
    UseQueryOptions<User, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<User, ApiError> {
  const { user: authUser, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.users.current(),
    queryFn: () => apiClient.get<User>('/users/me'),
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: isAuthenticated && !!authUser,
    // Use auth user as placeholder while fetching full profile
    placeholderData: authUser ? {
      id: authUser.id,
      username: authUser.name, // Auth user has 'name' instead of 'username'
      email: authUser.email,
      displayName: authUser.name,
      avatarUrl: authUser.avatar, // Auth user has 'avatar' instead of 'avatarUrl'
      bio: '',
      role: authUser.role || 'user',
      xp: 0,
      level: 1,
      createdAt: '',
      updatedAt: '',
    } : undefined,
    ...options,
  });
}

/**
 * Fetch minimal user data for header display
 *
 * Optimized for header components - fetches less data
 * and uses a shared query key for deduplication.
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with header user data
 *
 * US3: Multiple components using this hook with the same userId
 * will deduplicate to a single network request.
 */
export function useUserHeader(
  userId: string,
  options?: Omit<
    UseQueryOptions<Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>, ApiError> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.users.header(userId),
    queryFn: async () => {
      // First check if we have full user data cached
      const cachedUser = queryClient.getQueryData<User>(
        queryKeys.users.detail(userId)
      );

      if (cachedUser) {
        // Return subset from cached full user
        return {
          id: cachedUser.id,
          username: cachedUser.username,
          displayName: cachedUser.displayName,
          avatarUrl: cachedUser.avatarUrl,
        };
      }

      // Fetch full user and return subset
      const user = await apiClient.get<User>(`/users/${userId}`);
      
      // Also cache the full user data
      queryClient.setQueryData(queryKeys.users.detail(userId), user);

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      };
    },
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch user's full profile with stats
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with user profile data
 */
export function useUserProfile(
  userId: string,
  options?: Omit<
    UseQueryOptions<UserProfile, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<UserProfile, ApiError> {
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: () => apiClient.get<UserProfile>(`/users/${userId}/profile`),
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch user's followers list
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with followers list
 */
export function useUserFollowers(
  userId: string,
  options?: Omit<
    UseQueryOptions<User[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<User[], ApiError> {
  return useQuery({
    queryKey: queryKeys.users.followers(userId),
    queryFn: () => apiClient.get<User[]>(`/users/${userId}/followers`),
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch user's following list
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with following list
 */
export function useUserFollowing(
  userId: string,
  options?: Omit<
    UseQueryOptions<User[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<User[], ApiError> {
  return useQuery({
    queryKey: queryKeys.users.following(userId),
    queryFn: () => apiClient.get<User[]>(`/users/${userId}/following`),
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
    ...options,
  });
}
