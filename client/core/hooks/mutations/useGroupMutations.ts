/**
 * Group Mutation Hooks
 *
 * TanStack Query mutations for group actions with cache invalidation.
 * T054: Cache invalidation on join/leave group.
 *
 * @module core/hooks/mutations/useGroupMutations
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { groupsService } from '../../services/messages.service';
import { queryKeys } from '../../query/keys';
import type { Group, ApiError } from '../../types/query.types';

// ============================================================================
// Toast Utility (safe wrapper)
// ============================================================================

// Safely show toast notification (falls back to console if package not available)
const showToast = (type: 'success' | 'error', title: string, message?: string) => {
  // Try to use react-native-toast-message if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Toast = require('react-native-toast-message').default;
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: type === 'error' ? 4000 : 2000,
    });
  } catch {
    // Fallback to console
    if (type === 'error') {
      console.error(`[GroupMutation] ${title}: ${message || ''}`);
    } else {
      console.log(`[GroupMutation] ${title}`);
    }
  }
};

// ============================================================================
// Types
// ============================================================================

/**
 * Optimistic context for group mutations
 */
interface GroupOptimisticContext {
  previousGroups: Group[] | undefined;
  previousGroup: Group | undefined;
}

// ============================================================================
// Join Group
// ============================================================================

/**
 * Join a group with optimistic update
 *
 * T054: Cache invalidation on join/leave
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for joining groups
 *
 * @example
 * ```tsx
 * function GroupDetail({ groupId }) {
 *   const { mutate: joinGroup, isPending } = useJoinGroup();
 *
 *   return (
 *     <Button
 *       onPress={() => joinGroup(groupId)}
 *       disabled={isPending}
 *     >
 *       Join Group
 *     </Button>
 *   );
 * }
 * ```
 */
export function useJoinGroup(
  options?: Omit<
    UseMutationOptions<void, ApiError, string, GroupOptimisticContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<void, ApiError, string, GroupOptimisticContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      // Note: addMember requires userId, but for self-join we'd need the current user's ID
      // The API should support a self-join endpoint, but for now we simulate with the service
      await groupsService.addMember(groupId, 'self');
    },

    onMutate: async (groupId) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: queryKeys.social.groups() });
      await queryClient.cancelQueries({ queryKey: queryKeys.social.group(groupId) });

      // Snapshot previous values for rollback
      const previousGroups = queryClient.getQueryData<Group[]>(queryKeys.social.groups());
      const previousGroup = queryClient.getQueryData<Group>(queryKeys.social.group(groupId));

      // Optimistically update single group
      queryClient.setQueryData<Group>(
        queryKeys.social.group(groupId),
        (old) => {
          if (!old) return old;
          return { 
            ...old, 
            isJoined: true,
            memberCount: old.memberCount + 1,
          };
        }
      );

      return { previousGroups, previousGroup };
    },

    onError: (error, groupId, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKeys.social.groups(), context.previousGroups);
      }
      if (context?.previousGroup) {
        queryClient.setQueryData(queryKeys.social.group(groupId), context.previousGroup);
      }

      showToast('error', 'Failed to join group', error.message || 'Please try again');
    },

    onSettled: (_, __, groupId) => {
      // T054: Invalidate caches to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.social.groups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.groupMembers(groupId) });
    },

    onSuccess: () => {
      showToast('success', 'Joined group!');
    },

    ...options,
  });
}

// ============================================================================
// Leave Group
// ============================================================================

/**
 * Leave a group with optimistic update
 *
 * T054: Cache invalidation on join/leave
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for leaving groups
 *
 * @example
 * ```tsx
 * function GroupDetail({ groupId }) {
 *   const { mutate: leaveGroup, isPending } = useLeaveGroup();
 *
 *   return (
 *     <Button
 *       variant="destructive"
 *       onPress={() => leaveGroup(groupId)}
 *       disabled={isPending}
 *     >
 *       Leave Group
 *     </Button>
 *   );
 * }
 * ```
 */
export function useLeaveGroup(
  options?: Omit<
    UseMutationOptions<void, ApiError, string, GroupOptimisticContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<void, ApiError, string, GroupOptimisticContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      await groupsService.leaveGroup(groupId);
    },

    onMutate: async (groupId) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: queryKeys.social.groups() });
      await queryClient.cancelQueries({ queryKey: queryKeys.social.group(groupId) });

      // Snapshot previous values for rollback
      const previousGroups = queryClient.getQueryData<Group[]>(queryKeys.social.groups());
      const previousGroup = queryClient.getQueryData<Group>(queryKeys.social.group(groupId));

      // Optimistically update groups list - remove from user's groups
      queryClient.setQueryData<Group[]>(
        queryKeys.social.groups(),
        (old) => {
          if (!old) return old;
          return old.filter((g) => g.id !== groupId);
        }
      );

      // Optimistically update single group
      queryClient.setQueryData<Group>(
        queryKeys.social.group(groupId),
        (old) => {
          if (!old) return old;
          return { 
            ...old, 
            isJoined: false,
            memberCount: Math.max(0, old.memberCount - 1),
          };
        }
      );

      return { previousGroups, previousGroup };
    },

    onError: (error, groupId, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKeys.social.groups(), context.previousGroups);
      }
      if (context?.previousGroup) {
        queryClient.setQueryData(queryKeys.social.group(groupId), context.previousGroup);
      }

      showToast('error', 'Failed to leave group', error.message || 'Please try again');
    },

    onSettled: (_, __, groupId) => {
      // T054: Invalidate caches to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.social.groups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.social.groupMembers(groupId) });
    },

    onSuccess: () => {
      showToast('success', 'Left group');
    },

    ...options,
  });
}

// ============================================================================
// Create Group
// ============================================================================

interface CreateGroupInput {
  name: string;
  description?: string;
}

/**
 * Create a new group
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for creating groups
 *
 * @example
 * ```tsx
 * function CreateGroupForm() {
 *   const { mutate: createGroup, isPending } = useCreateGroup();
 *
 *   const handleSubmit = () => {
 *     createGroup({ name: 'My Group', description: 'A cool group' });
 *   };
 * }
 * ```
 */
export function useCreateGroup(
  options?: Omit<
    UseMutationOptions<Group, ApiError, CreateGroupInput>,
    'mutationFn' | 'onSuccess' | 'onError'
  >
): UseMutationResult<Group, ApiError, CreateGroupInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: CreateGroupInput): Promise<Group> => {
      const result = await groupsService.createGroup(name, description);
      // Map service response to query type
      return {
        id: result.id,
        name: result.name,
        description: result.description ?? '',
        imageUrl: result.avatar,
        memberCount: result.memberCount,
        members: [],
        isJoined: true, // Creator is joined by default
        isPublic: true, // Default assumption
        createdBy: '', // Will be set by server
        createdAt: result.createdAt,
      };
    },

    onSuccess: () => {
      // Invalidate groups list to show new group
      queryClient.invalidateQueries({ queryKey: queryKeys.social.groups() });
      
      showToast('success', 'Group created!');
    },

    onError: (error) => {
      showToast('error', 'Failed to create group', error.message || 'Please try again');
    },

    ...options,
  });
}
