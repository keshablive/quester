/**
 * Achievement Query Hooks
 *
 * TanStack Query hooks for fetching achievement data with caching.
 * FR-001, FR-004: Achievements cached with 5-minute stale time.
 *
 * @module core/hooks/queries/useAchievements
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { achievementsService } from '../../api/services/gamification.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { Achievement, AchievementFilters, ApiError } from '../../types/query.types';

/**
 * Fetch all achievements with optional filters
 *
 * @param filters - Optional filters (category, earned status)
 * @param options - Optional TanStack Query options
 * @returns Query result with achievements data
 *
 * @example
 * ```tsx
 * function AchievementsList() {
 *   const { data, isLoading, error, refetch, dataUpdatedAt } = useAchievements();
 *
 *   if (isLoading) return <AchievementsSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return (
 *     <FlatList
 *       data={data}
 *       renderItem={({ item }) => <AchievementCard achievement={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useAchievements(
  filters?: AchievementFilters,
  options?: Omit<
    UseQueryOptions<Achievement[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Achievement[], ApiError> {
  return useQuery({
    queryKey: queryKeys.achievements.list(filters),
    queryFn: async () => {
      // Map the service response to our Achievement type
      const achievements = await achievementsService.getAchievements();
      return achievements.map((a) => ({
        id: a.id,
        title: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category as Achievement['category'],
        points: a.points,
        isEarned: a.unlocked,
        earnedAt: a.unlockedAt,
        progress: a.maxProgress > 0 ? (a.progress / a.maxProgress) * 100 : 0,
        criteria: {
          type: 'count' as const,
          target: a.maxProgress,
          current: a.progress,
        },
      }));
    },
    staleTime: STALE_TIMES.ACHIEVEMENTS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single achievement by ID
 *
 * @param achievementId - The achievement's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with achievement data
 *
 * @example
 * ```tsx
 * function AchievementDetail({ achievementId }) {
 *   const { data: achievement, isLoading } = useAchievement(achievementId);
 *
 *   if (isLoading) return <AchievementDetailSkeleton />;
 *
 *   return (
 *     <View>
 *       <Text>{achievement?.title}</Text>
 *       <ProgressBar progress={achievement?.progress} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAchievement(
  achievementId: string,
  options?: Omit<
    UseQueryOptions<Achievement, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Achievement, ApiError> {
  return useQuery({
    queryKey: queryKeys.achievements.detail(achievementId),
    queryFn: async () => {
      const a = await achievementsService.getAchievement(achievementId);
      return {
        id: a.id,
        title: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category as Achievement['category'],
        points: a.points,
        isEarned: a.unlocked,
        earnedAt: a.unlockedAt,
        progress: a.maxProgress > 0 ? (a.progress / a.maxProgress) * 100 : 0,
        criteria: {
          type: 'count' as const,
          target: a.maxProgress,
          current: a.progress,
        },
      };
    },
    staleTime: STALE_TIMES.ACHIEVEMENTS,
    gcTime: GC_TIME,
    enabled: !!achievementId,
    ...options,
  });
}

/**
 * Fetch user's achievements (earned and in-progress)
 *
 * @param userId - The user's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with user's achievements
 *
 * @example
 * ```tsx
 * function ProfileAchievements({ userId }) {
 *   const { data, isLoading } = useUserAchievements(userId);
 *
 *   if (isLoading) return <ProfileAchievementsSkeleton />;
 *
 *   const earned = data?.filter(a => a.isEarned) ?? [];
 *
 *   return (
 *     <View>
 *       <Text>Achievements Earned: {earned.length}</Text>
 *       {earned.map(a => <AchievementBadge key={a.id} achievement={a} />)}
 *     </View>
 *   );
 * }
 * ```
 */
export function useUserAchievements(
  userId: string,
  options?: Omit<
    UseQueryOptions<Achievement[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Achievement[], ApiError> {
  return useQuery({
    queryKey: queryKeys.achievements.user(userId),
    queryFn: async () => {
      const achievements = await achievementsService.getUserAchievements();
      return achievements.map((a) => ({
        id: a.id,
        title: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category as Achievement['category'],
        points: a.points,
        isEarned: a.unlocked,
        earnedAt: a.unlockedAt,
        progress: a.maxProgress > 0 ? (a.progress / a.maxProgress) * 100 : 0,
        criteria: {
          type: 'count' as const,
          target: a.maxProgress,
          current: a.progress,
        },
      }));
    },
    staleTime: STALE_TIMES.ACHIEVEMENTS,
    gcTime: GC_TIME,
    enabled: !!userId,
    ...options,
  });
}
