/**
 * Badge Query Hooks
 *
 * TanStack Query hooks for fetching badge data with caching.
 * FR-002, FR-003, FR-004: Badge catalog (10 min) and user badges (5 min) stale times.
 *
 * @module core/hooks/queries/useBadges
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { badgesService } from '../../services/gamification.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { ExtendedBadge, ApiError } from '../../types/query.types';

/**
 * Map service badge tier to our tier type
 */
function mapRarityToTier(rarity: string): ExtendedBadge['tier'] {
  const tierMap: Record<string, ExtendedBadge['tier']> = {
    common: 'bronze',
    rare: 'silver',
    epic: 'gold',
    legendary: 'platinum',
  };
  return tierMap[rarity] ?? 'bronze';
}

/**
 * Fetch all available badges (catalog)
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with all badges
 *
 * @example
 * ```tsx
 * function BadgeCatalog() {
 *   const { data: badges, isLoading, error, refetch } = useBadges();
 *
 *   if (isLoading) return <BadgesSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return (
 *     <FlatList
 *       data={badges}
 *       renderItem={({ item }) => <BadgeCard badge={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useBadges(
  options?: Omit<
    UseQueryOptions<ExtendedBadge[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<ExtendedBadge[], ApiError> {
  return useQuery({
    queryKey: queryKeys.badges.list(),
    queryFn: async () => {
      const badges = await badgesService.getBadges();
      return badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        tier: mapRarityToTier(b.rarity),
        imageUrl: b.icon,
        criteria: b.requirement ?? '',
        isEarned: b.earned,
        earnedAt: b.earnedAt,
        earnedCount: undefined,
      }));
    },
    staleTime: STALE_TIMES.BADGES_CATALOG,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single badge by ID
 *
 * @param badgeId - The badge's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with badge data
 *
 * @example
 * ```tsx
 * function BadgeDetail({ badgeId }) {
 *   const { data: badge, isLoading } = useBadge(badgeId);
 *
 *   if (isLoading) return <BadgeDetailSkeleton />;
 *
 *   return (
 *     <View>
 *       <Image source={{ uri: badge?.imageUrl }} />
 *       <Text>{badge?.name}</Text>
 *       <Text>{badge?.criteria}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useBadge(
  badgeId: string,
  options?: Omit<
    UseQueryOptions<ExtendedBadge, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<ExtendedBadge, ApiError> {
  return useQuery({
    queryKey: queryKeys.badges.detail(badgeId),
    queryFn: async () => {
      const b = await badgesService.getBadge(badgeId);
      return {
        id: b.id,
        name: b.name,
        description: b.description,
        tier: mapRarityToTier(b.rarity),
        imageUrl: b.icon,
        criteria: b.requirement ?? '',
        isEarned: b.earned,
        earnedAt: b.earnedAt,
        earnedCount: undefined,
      };
    },
    staleTime: STALE_TIMES.BADGES_CATALOG,
    gcTime: GC_TIME,
    enabled: !!badgeId,
    ...options,
  });
}

/**
 * Fetch user's earned badges
 *
 * @param userId - The user's unique identifier (optional, defaults to current user)
 * @param options - Optional TanStack Query options
 * @returns Query result with user's earned badges
 *
 * @example
 * ```tsx
 * function ProfileBadges({ userId }) {
 *   const { data: badges, isLoading, dataUpdatedAt } = useUserBadges(userId);
 *
 *   if (isLoading) return <ProfileBadgesSkeleton />;
 *
 *   return (
 *     <View>
 *       <Text>Badges Earned: {badges?.length ?? 0}</Text>
 *       <StaleDataIndicator dataUpdatedAt={dataUpdatedAt} threshold={5 * 60 * 1000} />
 *       {badges?.map(b => <BadgeIcon key={b.id} badge={b} />)}
 *     </View>
 *   );
 * }
 * ```
 */
export function useUserBadges(
  userId?: string,
  options?: Omit<
    UseQueryOptions<ExtendedBadge[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<ExtendedBadge[], ApiError> {
  return useQuery({
    queryKey: queryKeys.badges.user(userId ?? 'me'),
    queryFn: async () => {
      const badges = await badgesService.getUserBadges();
      return badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        tier: mapRarityToTier(b.rarity),
        imageUrl: b.icon,
        criteria: b.requirement ?? '',
        isEarned: b.earned,
        earnedAt: b.earnedAt,
        earnedCount: undefined,
      }));
    },
    staleTime: STALE_TIMES.BADGES_USER,
    gcTime: GC_TIME,
    ...options,
  });
}
