/**
 * Group Query Hooks
 *
 * TanStack Query hooks for fetching group data with caching.
 * FR-018: Groups cached with 5-minute stale time.
 *
 * @module core/hooks/queries/useGroups
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { Group, GroupFilters, ApiError } from '../../types/query.types';

/**
 * Fetch all groups with optional filters
 *
 * @param filters - Optional filters (search, joined status)
 * @param options - Optional TanStack Query options
 * @returns Query result with groups data
 *
 * @example
 * ```tsx
 * function GroupList() {
 *   const { data: groups, isLoading, error, refetch } = useGroups();
 *
 *   if (isLoading) return <GroupsSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *   if (!groups?.length) return <EmptyGroups />;
 *
 *   return (
 *     <FlatList
 *       data={groups}
 *       renderItem={({ item }) => <GroupCard group={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useGroups(
  filters?: GroupFilters,
  options?: Omit<
    UseQueryOptions<Group[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Group[], ApiError> {
  return useQuery({
    queryKey: queryKeys.social.groups(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.joined !== undefined) params.set('joined', String(filters.joined));
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const query = params.toString();
      return apiClient.get<Group[]>(`/groups${query ? `?${query}` : ''}`);
    },
    staleTime: STALE_TIMES.GROUPS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single group by ID
 *
 * @param groupId - The group's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with group data including members
 *
 * @example
 * ```tsx
 * function GroupDetail({ groupId }) {
 *   const { data: group, isLoading, error, refetch } = useGroup(groupId);
 *
 *   if (isLoading) return <GroupDetailSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} message="Failed to load group" />;
 *
 *   return (
 *     <View>
 *       <Image source={{ uri: group?.imageUrl }} />
 *       <Text>{group?.name}</Text>
 *       <Text>{group?.description}</Text>
 *       <Text>Members: {group?.memberCount}</Text>
 *       {group?.isJoined ? (
 *         <Button onPress={handleLeave}>Leave Group</Button>
 *       ) : (
 *         <Button onPress={handleJoin}>Join Group</Button>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useGroup(
  groupId: string,
  options?: Omit<
    UseQueryOptions<Group, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Group, ApiError> {
  return useQuery({
    queryKey: queryKeys.social.group(groupId),
    queryFn: () => apiClient.get<Group>(`/groups/${groupId}`),
    staleTime: STALE_TIMES.GROUPS,
    gcTime: GC_TIME,
    enabled: !!groupId,
    ...options,
  });
}

/**
 * Fetch group members
 *
 * @param groupId - The group's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with group members
 *
 * @example
 * ```tsx
 * function GroupMembers({ groupId }) {
 *   const { data: members, isLoading } = useGroupMembers(groupId);
 *
 *   if (isLoading) return <MembersSkeleton />;
 *
 *   return (
 *     <FlatList
 *       data={members}
 *       renderItem={({ item }) => <MemberCard member={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useGroupMembers(
  groupId: string,
  options?: Omit<
    UseQueryOptions<Group['members'], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Group['members'], ApiError> {
  return useQuery({
    queryKey: queryKeys.social.groupMembers(groupId),
    queryFn: async () => {
      const group = await apiClient.get<Group>(`/groups/${groupId}`);
      return group.members ?? [];
    },
    staleTime: STALE_TIMES.GROUPS,
    gcTime: GC_TIME,
    enabled: !!groupId,
    ...options,
  });
}
