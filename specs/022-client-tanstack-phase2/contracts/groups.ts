/**
 * Group Hook Interfaces
 * 
 * Contract for group query and mutation hooks
 */

import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { Group, GroupFilters, CreateGroupInput } from './types';

/**
 * Hook to fetch groups list
 * 
 * Implements:
 * - FR-018: Groups hook with cache
 * 
 * @param filters - Optional filters for search, joined status, pagination
 * @returns TanStack Query result with groups array
 * 
 * @example
 * ```tsx
 * const { data: groups, isLoading } = useGroups({ joined: true });
 * ```
 */
export type UseGroups = (
  filters?: GroupFilters
) => UseQueryResult<Group[], Error>;

/**
 * Hook to fetch a single group by ID
 * 
 * Implements:
 * - FR-018: Group detail with cache
 * 
 * @param groupId - The group ID to fetch
 * @returns TanStack Query result with group detail (includes members)
 * 
 * @example
 * ```tsx
 * const { data: group, isLoading } = useGroup(groupId);
 * const members = group?.members ?? [];
 * ```
 */
export type UseGroup = (groupId: string) => UseQueryResult<Group, Error>;

/**
 * Optimistic update context for group mutations
 */
export interface GroupMutationContext {
  previousGroup: Group | undefined;
  previousGroups: Group[] | undefined;
}

/**
 * Hook for joining a group with optimistic update
 * 
 * @returns TanStack Mutation result for joining groups
 * 
 * @example
 * ```tsx
 * const { mutate: joinGroup, isPending } = useJoinGroup();
 * 
 * const handleJoin = () => {
 *   joinGroup(groupId);
 * };
 * ```
 */
export type UseJoinGroup = () => UseMutationResult<
  Group,
  Error,
  string, // groupId
  GroupMutationContext
>;

/**
 * Hook for leaving a group with optimistic update
 * 
 * @returns TanStack Mutation result for leaving groups
 * 
 * @example
 * ```tsx
 * const { mutate: leaveGroup, isPending } = useLeaveGroup();
 * 
 * const handleLeave = () => {
 *   leaveGroup(groupId);
 * };
 * ```
 */
export type UseLeaveGroup = () => UseMutationResult<
  void,
  Error,
  string, // groupId
  GroupMutationContext
>;

/**
 * Hook for creating a new group
 * 
 * @returns TanStack Mutation result for creating groups
 * 
 * @example
 * ```tsx
 * const { mutate: createGroup, isPending } = useCreateGroup();
 * 
 * const handleCreate = (input: CreateGroupInput) => {
 *   createGroup(input);
 * };
 * ```
 */
export type UseCreateGroup = () => UseMutationResult<
  Group,
  Error,
  CreateGroupInput,
  unknown
>;

/**
 * Configuration for group hooks
 */
export const GROUP_CONFIG = {
  /** Stale time for groups list in milliseconds (5 minutes) */
  listStaleTime: 5 * 60 * 1000,
  /** Stale time for group detail in milliseconds (5 minutes) */
  detailStaleTime: 5 * 60 * 1000,
  /** Query key prefix */
  queryKeyPrefix: 'social.groups',
} as const;
