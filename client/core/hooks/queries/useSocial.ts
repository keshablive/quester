/**
 * Social Query Hooks
 *
 * TanStack Query hooks for social features like follow stats,
 * feed data, and social interactions.
 *
 * US5: Infinite Scroll Lists (Feature 020)
 *
 * @module core/hooks/queries/useSocial
 */

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { socialService } from '../../services/social.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { FollowStats, ApiError, PaginatedResponse } from '../../types/query.types';

/**
 * User data for followers/following lists
 */
export interface SocialUser {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
}

/**
 * Fetch follow statistics for a user
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with follow stats data
 *
 * @example
 * ```tsx
 * function ProfileStats({ userId }) {
 *   const { data: stats, isLoading, error } = useFollowStats(userId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <View>
 *       <Text>{stats.followers} Followers</Text>
 *       <Text>{stats.following} Following</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useFollowStats(
  userId: string,
  options?: Omit<
    UseQueryOptions<FollowStats, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<FollowStats, ApiError> {
  return useQuery({
    queryKey: queryKeys.users.followStats(userId),
    queryFn: () => apiClient.get<FollowStats>(`/users/${userId}/follow-stats`),
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch followers list for a user
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with followers data
 *
 * @example
 * ```tsx
 * const { data: followers, isLoading } = useFollowers(userId);
 * ```
 */
export function useFollowers(
  userId: string,
  options?: Omit<
    UseQueryOptions<SocialUser[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<SocialUser[], ApiError> {
  return useQuery({
    queryKey: queryKeys.users.followers(userId),
    queryFn: () => socialService.getFollowers(userId),
    staleTime: STALE_TIMES.USER_PROFILE,
    gcTime: GC_TIME,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch following list for a user
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with following data
 *
 * @example
 * ```tsx
 * const { data: following, isLoading } = useFollowing(userId);
 * ```
 */
export function useFollowing(
  userId: string,
  options?: Omit<
    UseQueryOptions<SocialUser[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<SocialUser[], ApiError> {
  return useQuery({
    queryKey: queryKeys.users.following(userId),
    queryFn: () => socialService.getFollowing(userId),
    staleTime: STALE_TIMES.USER_PROFILE,
    gcTime: GC_TIME,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch followers with infinite scroll pagination
 *
 * US5: Infinite scroll support for followers list
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query infinite options
 * @returns Infinite query result with pagination controls
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useInfiniteFollowers(userId);
 * const followers = data?.pages.flatMap(p => p.items) ?? [];
 * ```
 */
export function useInfiniteFollowers(
  userId: string,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<SocialUser>,
      ApiError,
      { pages: PaginatedResponse<SocialUser>[]; pageParams: (string | undefined)[] }
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
): UseInfiniteQueryResult<
  { pages: PaginatedResponse<SocialUser>[]; pageParams: (string | undefined)[] },
  ApiError
> {
  return useInfiniteQuery({
    queryKey: [...queryKeys.users.followers(userId), 'infinite'] as const,
    queryFn: async ({ pageParam }) => {
      // Fetch all followers and simulate pagination
      // TODO: Update API to support cursor-based pagination
      const allFollowers = await socialService.getFollowers(userId);
      
      const pageSize = 20;
      const startIndex = pageParam ? parseInt(pageParam, 10) : 0;
      const items = allFollowers.slice(startIndex, startIndex + pageSize);
      const hasMore = startIndex + pageSize < allFollowers.length;

      return {
        items,
        total: allFollowers.length,
        nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
        hasMore,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.USER_PROFILE,
    gcTime: GC_TIME,
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch following with infinite scroll pagination
 *
 * US5: Infinite scroll support for following list
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query infinite options
 * @returns Infinite query result with pagination controls
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useInfiniteFollowing(userId);
 * const following = data?.pages.flatMap(p => p.items) ?? [];
 * ```
 */
export function useInfiniteFollowing(
  userId: string,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<SocialUser>,
      ApiError,
      { pages: PaginatedResponse<SocialUser>[]; pageParams: (string | undefined)[] }
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
): UseInfiniteQueryResult<
  { pages: PaginatedResponse<SocialUser>[]; pageParams: (string | undefined)[] },
  ApiError
> {
  return useInfiniteQuery({
    queryKey: [...queryKeys.users.following(userId), 'infinite'] as const,
    queryFn: async ({ pageParam }) => {
      // Fetch all following and simulate pagination
      // TODO: Update API to support cursor-based pagination
      const allFollowing = await socialService.getFollowing(userId);
      
      const pageSize = 20;
      const startIndex = pageParam ? parseInt(pageParam, 10) : 0;
      const items = allFollowing.slice(startIndex, startIndex + pageSize);
      const hasMore = startIndex + pageSize < allFollowing.length;

      return {
        items,
        total: allFollowing.length,
        nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
        hasMore,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.USER_PROFILE,
    gcTime: GC_TIME,
    enabled: !!userId,
    ...options,
  });
}
