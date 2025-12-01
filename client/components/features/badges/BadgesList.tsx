/**
 * BadgesList Component
 *
 * Displays user badges with TanStack Query caching.
 * Supports instant cache display, offline viewing, and pull-to-refresh.
 *
 * US1: Instant Achievement Display with Cache (Priority: P1)
 * FR-002: useUserBadges() returns earned badges with automatic cache
 * FR-003: useBadges() returns all available badges
 * FR-004: 10-minute staleTime for badges (less volatile than achievements)
 *
 * @module components/features/badges/BadgesList
 */

import React, { useCallback, useMemo } from 'react';
import { View, Image } from 'react-native';
import { Text, Card, CardContent, Skeleton, Icon } from '@/components/ui';
import { Trophy, Lock } from 'lucide-react-native';
import {
  useBadges,
  useUserBadges,
  type ExtendedBadge,
  OptimizedList,
  type ListRenderItemInfo,
  cn,
} from '@/core';
import { OfflineIndicator, StaleDataIndicator, ErrorState } from '@/components/shared';

// ============================================================================
// Types
// ============================================================================

interface BadgesListProps {
  /** Optional user ID to fetch badges for (defaults to current user) */
  userId?: string;
  /** Show all badges or only earned ones */
  showAll?: boolean;
  /** Test ID for automation */
  testID?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

interface BadgeCardProps {
  badge: ExtendedBadge;
}

function BadgeCard({ badge }: BadgeCardProps) {
  const isEarned = badge.isEarned;

  return (
    <Card className={cn('mb-4', isEarned ? 'border-primary/50' : 'border-border opacity-50')}>
      <CardContent className="flex-row items-center gap-4 p-4">
        <View
          className={cn(
            'h-16 w-16 items-center justify-center rounded-full',
            isEarned ? 'bg-primary/10' : 'bg-muted'
          )}>
          {isEarned ? (
            badge.imageUrl ? (
              <Image source={{ uri: badge.imageUrl }} className="h-12 w-12" resizeMode="contain" />
            ) : (
              <Text className="text-3xl">🎖️</Text>
            )
          ) : (
            <Icon as={Lock} size={24} className="text-muted-foreground" />
          )}
        </View>

        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={cn(
                'text-lg font-bold',
                isEarned ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {badge.name}
            </Text>
            {badge.tier && (
              <Text className="text-xs font-medium uppercase text-muted-foreground">
                {badge.tier}
              </Text>
            )}
          </View>

          <Text className="text-sm text-muted-foreground">{badge.description}</Text>

          {isEarned && badge.earnedAt && (
            <Text className="mt-1 text-xs text-primary">
              Earned: {new Date(badge.earnedAt).toLocaleDateString()}
            </Text>
          )}

          {!isEarned && badge.criteria && (
            <Text className="mt-1 text-xs italic text-muted-foreground">{badge.criteria}</Text>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

/**
 * T020: Empty state component for zero badges
 */
function EmptyBadges({ showAll }: { showAll: boolean }) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon as={Trophy} size={40} className="text-muted-foreground" />
      </View>
      <Text className="mb-2 text-center text-xl font-bold text-foreground">
        {showAll ? 'No Badges Available' : 'No Badges Earned Yet'}
      </Text>
      <Text className="text-center text-muted-foreground">
        {showAll
          ? 'Check back later for new badges!'
          : 'Complete quests and achievements to earn badges!'}
      </Text>
    </View>
  );
}

/**
 * Skeleton loading state for badges list
 */
function BadgesSkeleton() {
  return (
    <View className="gap-4 p-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="flex-row items-center gap-4 p-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <View className="flex-1 gap-2">
              <View className="flex-row justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16" />
              </View>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </View>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BadgesList
 *
 * T018: Main badges list using TanStack Query hooks.
 * T022: Includes OfflineIndicator integration.
 * T024: Includes pull-to-refresh using refetch().
 * T025: Includes StaleDataIndicator with 10-minute threshold.
 *
 * @example
 * ```tsx
 * // Show user's earned badges
 * function MyBadges() {
 *   return <BadgesList />;
 * }
 *
 * // Show all available badges
 * function AllBadges() {
 *   return <BadgesList showAll />;
 * }
 *
 * // Show specific user's badges
 * function UserBadges({ userId }: { userId: string }) {
 *   return <BadgesList userId={userId} />;
 * }
 * ```
 */
export function BadgesList({ userId, showAll = false, testID = 'badges-list' }: BadgesListProps) {
  // T005, T006: Use appropriate TanStack Query hook based on showAll flag
  const userBadgesQuery = useUserBadges(userId ?? 'me');
  const allBadgesQuery = useBadges();

  // Select the appropriate query based on showAll
  const {
    data: badgesData,
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = showAll ? allBadgesQuery : userBadgesQuery;

  // Normalize badges data - badge hooks return ExtendedBadge[] directly
  const badges: ExtendedBadge[] = useMemo(() => {
    if (!badgesData) return [];
    return badgesData;
  }, [badgesData]);

  // T024: Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Render item callback for OptimizedList
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ExtendedBadge>) => <BadgeCard badge={item} />,
    []
  );

  const keyExtractor = useCallback((item: ExtendedBadge) => item.id, []);

  // Calculate stats
  const earnedCount = useMemo(
    () => badges.filter((b: ExtendedBadge) => b.isEarned).length,
    [badges]
  );

  // FR-022: Error state with retry button
  if (error && !badges.length) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <ErrorState
          title="Failed to Load Badges"
          message={error.message || 'An error occurred'}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* T022: OfflineIndicator integration */}
      <OfflineIndicator />

      {/* T025: StaleDataIndicator with 10-minute threshold for badges */}
      {dataUpdatedAt && (
        <StaleDataIndicator
          dataUpdatedAt={dataUpdatedAt}
          staleThreshold={10 * 60 * 1000} // 10 minutes per FR-004
        />
      )}

      {/* Header with stats */}
      <View className="border-b border-border bg-card p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Icon as={Trophy} size={24} className="mr-2 text-primary" />
            <Text className="text-2xl font-bold text-foreground">Badges</Text>
          </View>
          <Text className="text-lg font-semibold text-primary">
            {earnedCount}/{badges.length}
          </Text>
        </View>
        {/* FR-023: Background refetch shows subtle loading indicator */}
        {isRefetching && !isLoading && (
          <Text className="mt-1 text-xs text-muted-foreground">Updating...</Text>
        )}
      </View>

      {/* Content */}
      {isLoading && !badges.length ? (
        <BadgesSkeleton />
      ) : badges.length === 0 ? (
        <EmptyBadges showAll={showAll} />
      ) : (
        <OptimizedList<ExtendedBadge>
          data={badges}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={120}
          contentContainerStyle={{ padding: 16 }}
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          testID={testID}
        />
      )}
    </View>
  );
}

export default BadgesList;
