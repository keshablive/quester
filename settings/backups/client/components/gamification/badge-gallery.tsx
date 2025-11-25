/**
 * BadgeGallery Component (T026)
 *
 * Grid layout displaying multiple badges with filtering and sorting.
 * Used on the badges screen to show available and earned badges.
 *
 * Features:
 * - Responsive grid layout (2-4 columns based on screen size)
 * - Filter by tier, category, and status
 * - Sort by name, date earned, points
 * - Empty state messaging
 * - Loading skeleton
 * - Pull-to-refresh support
 */

import * as React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import {
  BadgeCard,
  type Badge,
  type BadgeTier,
  type BadgeCategory,
  type ApprovalStatus,
} from './badge-card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrophyIcon } from 'lucide-react-native';

export interface BadgeGalleryProps {
  badges: Badge[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onBadgePress?: (badge: Badge) => void;
  emptyMessage?: string;
  filterOptions?: {
    tier?: BadgeTier[];
    category?: BadgeCategory[];
    status?: ApprovalStatus[];
    earnedOnly?: boolean;
    lockedOnly?: boolean;
  };
  sortBy?: 'name' | 'earnedAt' | 'points' | 'tier';
  sortOrder?: 'asc' | 'desc';
  numColumns?: number;
  showProgress?: boolean; // Show progress for locked badges
  className?: string;
}

export function BadgeGallery({
  badges,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onBadgePress,
  emptyMessage = 'No badges found',
  filterOptions,
  sortBy = 'points',
  sortOrder = 'asc',
  numColumns = 2,
  showProgress = false,
  className,
}: BadgeGalleryProps) {
  // Filter badges
  const filteredBadges = React.useMemo(() => {
    let result = [...badges];

    if (filterOptions) {
      // Filter by tier
      if (filterOptions.tier && filterOptions.tier.length > 0) {
        result = result.filter((b) => filterOptions.tier!.includes(b.tier));
      }

      // Filter by category
      if (filterOptions.category && filterOptions.category.length > 0) {
        result = result.filter((b) => filterOptions.category!.includes(b.category));
      }

      // Filter by approval status
      if (filterOptions.status && filterOptions.status.length > 0) {
        result = result.filter(
          (b) => b.approvalStatus && filterOptions.status!.includes(b.approvalStatus)
        );
      }

      // Filter by earned/locked
      if (filterOptions.earnedOnly) {
        result = result.filter((b) => !!b.earnedAt);
      }
      if (filterOptions.lockedOnly) {
        result = result.filter((b) => !b.earnedAt);
      }
    }

    return result;
  }, [badges, filterOptions]);

  // Sort badges
  const sortedBadges = React.useMemo(() => {
    const result = [...filteredBadges];

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'earnedAt':
          const dateA = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
          const dateB = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'points':
          comparison = a.pointsThreshold - b.pointsThreshold;
          break;
        case 'tier':
          const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
          comparison = tierOrder[a.tier] - tierOrder[b.tier];
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [filteredBadges, sortBy, sortOrder]);

  // Loading skeleton
  if (isLoading && badges.length === 0) {
    return (
      <View className={cn('p-4', className)}>
        <View className="flex-row flex-wrap gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} className="w-[45%]">
              <Skeleton className="h-44 w-full rounded-lg" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Empty state
  if (sortedBadges.length === 0 && !isLoading) {
    return (
      <View className={cn('flex-1 items-center justify-center p-8', className)}>
        <TrophyIcon size={64} className="mb-4 text-muted-foreground" />
        <Text className="mb-2 text-center text-lg font-semibold">{emptyMessage}</Text>
        <Text className="mb-4 text-center text-sm text-muted-foreground">
          {filterOptions?.earnedOnly
            ? 'Complete quests and challenges to earn badges'
            : "Keep learning and you'll unlock badges soon"}
        </Text>
        {onRefresh && (
          <Button onPress={onRefresh} variant="outline" size="sm">
            <Text>Refresh</Text>
          </Button>
        )}
      </View>
    );
  }

  // Grid layout
  return (
    <FlatList
      data={sortedBadges}
      keyExtractor={(item) => item.id.toString()}
      numColumns={numColumns}
      columnWrapperStyle={{ gap: 16 }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined
      }
      renderItem={({ item }) => {
        const isLocked = !item.earnedAt;
        const progress = showProgress && isLocked ? calculateProgress(item) : undefined;

        return (
          <View className="flex-1">
            <BadgeCard
              badge={item}
              isLocked={isLocked}
              progress={progress}
              size="medium"
              showDetails={true}
              onPress={onBadgePress}
            />
          </View>
        );
      }}
      ListHeaderComponent={
        sortedBadges.length > 0 ? (
          <View className="mb-4">
            <Text className="text-sm text-muted-foreground">
              Showing {sortedBadges.length} badge{sortedBadges.length !== 1 ? 's' : ''}
            </Text>
          </View>
        ) : undefined
      }
      className={className}
    />
  );
}

/**
 * Calculate progress towards earning a locked badge
 * TODO: Implement based on actual user stats vs badge requirements
 */
function calculateProgress(_badge: Badge): number {
  // Placeholder - would compare user's current stats to badge threshold
  // For example:
  // - Quest badges: user.questsCompleted / badge.questsRequired
  // - XP badges: user.totalXP / badge.pointsThreshold
  // - Social badges: user.connections / badge.connectionsRequired

  return 0; // Return 0 for now until user stats API is integrated
}

/**
 * Badge Statistics Component
 * Shows summary stats for a badge collection
 */
export interface BadgeStatsProps {
  badges: Badge[];
  className?: string;
}

export function BadgeStats({ badges, className }: BadgeStatsProps) {
  const stats = React.useMemo(() => {
    const earned = badges.filter((b) => b.earnedAt).length;
    const total = badges.length;
    const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;

    const byTier = {
      bronze: badges.filter((b) => b.tier === 'bronze' && b.earnedAt).length,
      silver: badges.filter((b) => b.tier === 'silver' && b.earnedAt).length,
      gold: badges.filter((b) => b.tier === 'gold' && b.earnedAt).length,
      platinum: badges.filter((b) => b.tier === 'platinum' && b.earnedAt).length,
    };

    return { earned, total, percentage, byTier };
  }, [badges]);

  return (
    <View className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <Text className="mb-3 text-lg font-bold">Badge Collection</Text>

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-3xl font-bold">{stats.earned}</Text>
        <Text className="text-sm text-muted-foreground">/ {stats.total} badges</Text>
      </View>

      <View className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${stats.percentage}%` }}
        />
      </View>

      <Text className="mb-3 text-center text-sm text-muted-foreground">
        {stats.percentage}% complete
      </Text>

      {/* Tier Breakdown */}
      <View className="flex-row justify-between border-t border-border pt-3">
        <StatBadge tier="bronze" count={stats.byTier.bronze} />
        <StatBadge tier="silver" count={stats.byTier.silver} />
        <StatBadge tier="gold" count={stats.byTier.gold} />
        <StatBadge tier="platinum" count={stats.byTier.platinum} />
      </View>
    </View>
  );
}

function StatBadge({ tier, count }: { tier: BadgeTier; count: number }) {
  const colors = {
    bronze: 'text-amber-600 dark:text-amber-400',
    silver: 'text-slate-600 dark:text-slate-400',
    gold: 'text-yellow-600 dark:text-yellow-400',
    platinum: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <View className="items-center">
      <Text className={cn('text-2xl font-bold', colors[tier])}>{count}</Text>
      <Text className="text-xs capitalize text-muted-foreground">{tier}</Text>
    </View>
  );
}
