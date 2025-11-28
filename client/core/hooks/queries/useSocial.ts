/**
 * Social Query Hooks
 *
 * TanStack Query hooks for social features like follow stats,
 * feed data, and social interactions.
 *
 * @module core/hooks/queries/useSocial
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES } from '../../query/constants';
import type { FollowStats, ApiError } from '../../types/query.types';

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
