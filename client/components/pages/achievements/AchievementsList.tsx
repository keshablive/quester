/**
 * AchievementsList Component
 *
 * Displays user achievements with TanStack Query caching.
 * Supports instant cache display, offline viewing, and pull-to-refresh.
 *
 * US1: Instant Achievement Display with Cache (Priority: P1)
 * FR-001: useAchievements() returns cached data instantly on return navigation
 * FR-004: 5-minute staleTime with background revalidation
 *
 * @module components/pages/achievements/AchievementsList
 */

import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Text, Card, CardContent, Button, Progress, Skeleton, Icon } from '@/components/ui';
import { Award, Gift, WifiOff } from 'lucide-react-native';
import {
  useAchievements,
  useUserAchievements,
  type Achievement,
  OptimizedList,
  type ListRenderItemInfo,
  cn,
} from '@/core';
import { OfflineIndicator, StaleDataIndicator, ErrorState } from '@/components/shared';
import { useClaimAchievement } from '../../../core/hooks/mutations/useAchievementMutations';

// ============================================================================
// Types
// ============================================================================

interface AchievementsListProps {
  /** Optional user ID to fetch achievements for (defaults to current user) */
  userId?: string;
  /** Test ID for automation */
  testID?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

interface AchievementCardProps {
  achievement: Achievement;
  onClaim?: (id: string) => void;
  isClaimPending?: boolean;
}

function AchievementCard({ achievement, onClaim, isClaimPending }: AchievementCardProps) {
  const progress = achievement.criteria?.target
    ? ((achievement.criteria.current ?? 0) / achievement.criteria.target) * 100
    : achievement.isEarned
      ? 100
      : 0;

  return (
    <Card className={cn('mb-4', achievement.isEarned ? 'border-primary/50' : 'border-border')}>
      <CardContent className="p-4 pt-4">
        <View className="mb-3 flex-row items-center">
          <View
            className={cn(
              'mr-3 h-16 w-16 items-center justify-center rounded-full',
              achievement.isEarned ? 'bg-primary/10' : 'bg-muted'
            )}>
            <Text className="text-3xl">{achievement.icon || '🏆'}</Text>
          </View>
          <View className="flex-1">
            <Text
              className={cn(
                'mb-1 text-lg font-bold',
                achievement.isEarned ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {achievement.title}
            </Text>
            <View className="flex-row items-center">
              <Icon as={Award} size={14} className="mr-1 text-primary" />
              <Text className="text-sm font-semibold text-primary">{achievement.points} pts</Text>
            </View>
          </View>
        </View>

        <Text className="mb-3 text-sm text-muted-foreground">{achievement.description}</Text>

        {/* Progress Bar */}
        {achievement.criteria && (
          <View className="mb-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">Progress</Text>
              <Text className="text-xs font-semibold text-foreground">
                {achievement.criteria.current ?? 0}/{achievement.criteria.target}
              </Text>
            </View>
            <Progress value={progress} />
          </View>
        )}

        {/* Claim Button - FR-001: Achievement claiming with optimistic update */}
        {achievement.isEarned && !achievement.earnedAt && onClaim && (
          <Button
            className="w-full"
            onPress={() => onClaim(achievement.id)}
            disabled={isClaimPending}>
            <Icon as={Gift} size={16} className="mr-2 text-primary-foreground" />
            <Text>{isClaimPending ? 'Claiming...' : 'Claim Reward'}</Text>
          </Button>
        )}

        {achievement.earnedAt && (
          <View className="flex-row items-center justify-center rounded-lg border border-primary/20 bg-primary/10 py-3">
            <Text className="text-base font-semibold text-primary">Claimed</Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * T019: Empty state component for zero achievements
 */
function EmptyAchievements() {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon as={Award} size={40} className="text-muted-foreground" />
      </View>
      <Text className="mb-2 text-center text-xl font-bold text-foreground">
        No Achievements Yet
      </Text>
      <Text className="text-center text-muted-foreground">
        Complete quests and activities to earn achievements!
      </Text>
    </View>
  );
}

/**
 * Skeleton loading state for achievements list
 */
function AchievementsSkeleton() {
  return (
    <View className="gap-4 p-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <View className="mb-3 flex-row items-center">
            <Skeleton className="mr-3 h-16 w-16 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </View>
          </View>
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="mb-3 h-2 w-full" />
        </Card>
      ))}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AchievementsList
 *
 * T017: Main achievements list using TanStack Query hooks.
 * T021: Includes OfflineIndicator integration.
 * T023: Includes pull-to-refresh using refetch().
 * T025: Includes StaleDataIndicator with 5-minute threshold.
 *
 * @example
 * ```tsx
 * // In achievements page
 * function AchievementsPage() {
 *   return <AchievementsList />;
 * }
 *
 * // With specific user
 * function UserAchievements({ userId }: { userId: string }) {
 *   return <AchievementsList userId={userId} />;
 * }
 * ```
 */
export function AchievementsList({ userId, testID = 'achievements-list' }: AchievementsListProps) {
  // T017: Use TanStack Query hooks instead of useState/useEffect
  const {
    data: achievementsData,
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = userId ? useUserAchievements(userId) : useAchievements();

  // T012: Claim mutation with optimistic update (defined in separate hook)
  const claimMutation = useClaimAchievement();

  // Normalize achievements data - hooks return Achievement[] directly
  const achievements = useMemo(() => {
    if (!achievementsData) return [];
    return achievementsData;
  }, [achievementsData]);

  // T023: Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Claim handler with optimistic update
  const handleClaim = useCallback(
    (achievementId: string) => {
      claimMutation.mutate(achievementId);
    },
    [claimMutation]
  );

  // Render item callback for OptimizedList
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Achievement>) => (
      <AchievementCard
        achievement={item}
        onClaim={handleClaim}
        isClaimPending={claimMutation.isPending && claimMutation.variables === item.id}
      />
    ),
    [handleClaim, claimMutation.isPending, claimMutation.variables]
  );

  const keyExtractor = useCallback((item: Achievement) => item.id, []);

  // Calculate stats
  const totalPoints = useMemo(
    () =>
      achievements
        .filter((a: Achievement) => a.earnedAt)
        .reduce((sum: number, a: Achievement) => sum + a.points, 0),
    [achievements]
  );

  const unlockedCount = useMemo(
    () => achievements.filter((a: Achievement) => a.isEarned).length,
    [achievements]
  );

  // FR-022: Error state with retry button
  if (error && !achievements.length) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <ErrorState
          title="Failed to Load Achievements"
          message={error.message || 'An error occurred'}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* T021: OfflineIndicator integration */}
      <OfflineIndicator />

      {/* T025: StaleDataIndicator with 5-minute threshold */}
      {dataUpdatedAt && (
        <StaleDataIndicator
          dataUpdatedAt={dataUpdatedAt}
          staleThreshold={5 * 60 * 1000} // 5 minutes per FR-004
        />
      )}

      {/* Header with stats */}
      <View className="border-b border-border bg-card p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Icon as={Award} size={24} className="mr-2 text-primary" />
            <Text className="text-2xl font-bold text-foreground">Achievements</Text>
          </View>
          <Text className="text-lg font-semibold text-primary">{totalPoints} pts</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          {unlockedCount}/{achievements.length} unlocked
        </Text>
        {/* FR-023: Background refetch shows subtle loading indicator */}
        {isRefetching && !isLoading && (
          <Text className="mt-1 text-xs text-muted-foreground">Updating...</Text>
        )}
      </View>

      {/* Content */}
      {isLoading && !achievements.length ? (
        <AchievementsSkeleton />
      ) : achievements.length === 0 ? (
        <EmptyAchievements />
      ) : (
        <OptimizedList<Achievement>
          data={achievements}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={180}
          contentContainerStyle={{ padding: 16 }}
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          testID={testID}
        />
      )}
    </View>
  );
}

export default AchievementsList;
