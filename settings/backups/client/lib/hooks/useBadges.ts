/**
 * useBadges Hook (T028)
 * 
 * React Query hook for badge data management.
 * Provides caching, automatic refetching, and optimistic updates.
 * 
 * Features:
 * - Automatic caching with React Query
 * - Background refetch on window focus
 * - Pagination support
 * - Filtering by tier, category, status
 * - Admin actions (approve, reject, revoke)
 * - Optimistic updates for better UX
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import * as BadgeAPI from '../api/badges';
import type {
  Badge,
  UserBadge,
  GetBadgesParams,
  GetUserBadgesParams,
  ApproveBadgeRequest,
  RejectBadgeRequest,
  RevokeBadgeRequest,
} from '../api/badges';

// Query Keys
export const badgeKeys = {
  all: ['badges'] as const,
  lists: () => [...badgeKeys.all, 'list'] as const,
  list: (filters?: GetBadgesParams) => [...badgeKeys.lists(), filters] as const,
  userBadges: (userId: string, filters?: GetUserBadgesParams) =>
    [...badgeKeys.all, 'user', userId, filters] as const,
  userBadge: (userId: string, badgeId: number) =>
    [...badgeKeys.all, 'user', userId, 'badge', badgeId] as const,
};

// Hook Options
export interface UseBadgesOptions extends Omit<UseQueryOptions<BadgeAPI.GetBadgesResponse>, 'queryKey' | 'queryFn'> {
  filters?: GetBadgesParams;
}

export interface UseUserBadgesOptions extends Omit<UseQueryOptions<BadgeAPI.GetUserBadgesResponse>, 'queryKey' | 'queryFn'> {
  userId: string;
  filters?: GetUserBadgesParams;
  limit?: number; // Allow limit as top-level option for convenience
  page?: number;  // Allow page as top-level option
  sort?: string;  // Allow sort field (e.g., 'earnedAt', 'tier')
  order?: 'asc' | 'desc'; // Allow sort order
}

/**
 * Fetch all available badges
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useBadges({
 *   filters: { category: 'quest', tier: 'gold' },
 * });
 * 
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 * 
 * return <BadgeGallery badges={data.data.badges} />;
 * ```
 */
export function useBadges(options?: UseBadgesOptions) {
  const { filters, ...queryOptions } = options || {};

  return useQuery({
    queryKey: badgeKeys.list(filters),
    queryFn: () => BadgeAPI.getBadges(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Fetch badges earned by a specific user
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useUserBadges({
 *   userId: user.id,
 *   filters: { status: 'approved' },
 * });
 * 
 * const earnedBadges = data?.data.badges || [];
 * ```
 */
export function useUserBadges(options: UseUserBadgesOptions) {
  const { userId, filters, ...queryOptions } = options;

  return useQuery({
    queryKey: badgeKeys.userBadges(userId, filters),
    queryFn: () => BadgeAPI.getUserBadges(userId, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!userId, // Only fetch if userId is provided
    ...queryOptions,
  });
}

/**
 * Approve a pending badge (admin/moderator only)
 * 
 * @example
 * ```tsx
 * const { mutate: approve, isPending } = useApproveBadge();
 * 
 * approve({
 *   userId: '123',
 *   badgeId: 456,
 *   notes: 'Well deserved!',
 * }, {
 *   onSuccess: () => {
 *     toast.success('Badge approved!');
 *   },
 * });
 * ```
 */
export function useApproveBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      badgeId,
      request,
    }: {
      userId: string;
      badgeId: string;
      request?: ApproveBadgeRequest;
    }) => BadgeAPI.approveBadge(userId, badgeId, request),
    onSuccess: (_data, variables) => {
      // Invalidate user badges query to refetch
      queryClient.invalidateQueries({
        queryKey: badgeKeys.userBadges(variables.userId),
      });

      // Update the specific badge in cache if it exists
      queryClient.setQueryData<BadgeAPI.GetUserBadgesResponse>(
        badgeKeys.userBadges(variables.userId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              badges: old.data.badges.map((badge) =>
                badge.badge_id === variables.badgeId
                  ? { ...badge, approval_status: 'approved' as const }
                  : badge
              ),
            },
          };
        }
      );
    },
  });
}

/**
 * Reject a pending badge (admin/moderator only)
 * 
 * @example
 * ```tsx
 * const { mutate: reject, isPending } = useRejectBadge();
 * 
 * reject({
 *   userId: '123',
 *   badgeId: 456,
 *   reason: 'Requirements not met',
 * });
 * ```
 */
export function useRejectBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      badgeId,
      request,
    }: {
      userId: string;
      badgeId: string;
      request: RejectBadgeRequest;
    }) => BadgeAPI.rejectBadge(userId, badgeId, request),
    onSuccess: (_data, variables) => {
      // Invalidate user badges query
      queryClient.invalidateQueries({
        queryKey: badgeKeys.userBadges(variables.userId),
      });

      // Update cache optimistically
      queryClient.setQueryData<BadgeAPI.GetUserBadgesResponse>(
        badgeKeys.userBadges(variables.userId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              badges: old.data.badges.map((badge) =>
                badge.badge_id === variables.badgeId
                  ? { ...badge, approval_status: 'rejected' as const }
                  : badge
              ),
            },
          };
        }
      );
    },
  });
}

/**
 * Revoke an earned badge (admin only)
 * 
 * @example
 * ```tsx
 * const { mutate: revoke, isPending } = useRevokeBadge();
 * 
 * revoke({
 *   userId: '123',
 *   badgeId: 456,
 *   reason: 'Violation of terms',
 * });
 * ```
 */
export function useRevokeBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      badgeId,
      request,
    }: {
      userId: string;
      badgeId: string;
      request: RevokeBadgeRequest;
    }) => BadgeAPI.revokeBadge(userId, badgeId, request),
    onSuccess: (_data, variables) => {
      // Invalidate user badges query
      queryClient.invalidateQueries({
        queryKey: badgeKeys.userBadges(variables.userId),
      });

      // Update cache optimistically
      queryClient.setQueryData<BadgeAPI.GetUserBadgesResponse>(
        badgeKeys.userBadges(variables.userId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              badges: old.data.badges.map((badge) =>
                badge.badge_id === variables.badgeId
                  ? { ...badge, approval_status: 'revoked' as const }
                  : badge
              ),
            },
          };
        }
      );
    },
  });
}

/**
 * Prefetch badges for better UX
 * Useful when navigating to the badges screen
 * 
 * @example
 * ```tsx
 * const prefetchBadges = usePrefetchBadges();
 * 
 * <Button onPress={() => {
 *   prefetchBadges();
 *   navigation.navigate('Badges');
 * }}>
 *   View Badges
 * </Button>
 * ```
 */
export function usePrefetchBadges() {
  const queryClient = useQueryClient();

  return (filters?: GetBadgesParams) => {
    queryClient.prefetchQuery({
      queryKey: badgeKeys.list(filters),
      queryFn: () => BadgeAPI.getBadges(filters),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Prefetch user badges
 */
export function usePrefetchUserBadges() {
  const queryClient = useQueryClient();

  return (userId: string, filters?: GetUserBadgesParams) => {
    queryClient.prefetchQuery({
      queryKey: badgeKeys.userBadges(userId, filters),
      queryFn: () => BadgeAPI.getUserBadges(userId, filters),
      staleTime: 2 * 60 * 1000,
    });
  };
}

/**
 * Invalidate all badge queries (force refetch)
 * Useful after earning a new badge or admin actions
 * 
 * @example
 * ```tsx
 * const invalidateBadges = useInvalidateBadges();
 * 
 * // After completing a quest
 * await questAPI.complete(questId);
 * invalidateBadges(); // Refetch to show newly earned badges
 * ```
 */
export function useInvalidateBadges() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: badgeKeys.all,
    });
  };
}

// Export types for convenience
export type { Badge, UserBadge, GetBadgesParams, GetUserBadgesParams };
