/**
 * UserRankCard Component (T047)
 *
 * Displays the current user's position in a leaderboard with rank, percentile, and metric value.
 * Used at the top of leaderboard screens to highlight the user's standing.
 *
 * Features:
 * - Prominent rank display with visual indicators
 * - Percentile badge (top 10%, top 25%, etc.)
 * - Metric value with progress bar
 * - Rank change indicator (moved up/down)
 * - Call-to-action for unranked users
 * - Responsive design with gradient background
 * - Accessibility support
 */

import * as React from 'react';
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrophyIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  SparklesIcon,
  TargetIcon,
} from 'lucide-react-native';

export interface UserRankData {
  rank: number; // 0 if unranked
  percentile: number; // 0-100, higher is better
  metricValue: number;
  totalUsers: number;
  previousRank?: number; // For rank change indicator
}

export interface UserRankCardProps {
  data: UserRankData;
  username: string;
  leaderboardType: 'global' | 'category';
  period: 'alltime' | 'monthly';
  metricLabel?: string; // "XP", "Quests", etc.
  category?: string; // For category leaderboards
  onPress?: () => void; // View full leaderboard
  className?: string;
}

/**
 * Get percentile badge variant and label
 */
const getPercentileBadge = (percentile: number) => {
  if (percentile >= 99) {
    return {
      variant: 'default' as const,
      label: 'Top 1%',
      color: 'text-yellow-600 dark:text-yellow-400',
    };
  }
  if (percentile >= 95) {
    return {
      variant: 'default' as const,
      label: 'Top 5%',
      color: 'text-orange-600 dark:text-orange-400',
    };
  }
  if (percentile >= 90) {
    return {
      variant: 'secondary' as const,
      label: 'Top 10%',
      color: 'text-blue-600 dark:text-blue-400',
    };
  }
  if (percentile >= 75) {
    return {
      variant: 'secondary' as const,
      label: 'Top 25%',
      color: 'text-green-600 dark:text-green-400',
    };
  }
  if (percentile >= 50) {
    return { variant: 'outline' as const, label: 'Top 50%', color: 'text-muted-foreground' };
  }
  return {
    variant: 'outline' as const,
    label: `${Math.round(percentile)}%`,
    color: 'text-muted-foreground',
  };
};

/**
 * Get rank change indicator
 */
const getRankChange = (currentRank: number, previousRank?: number) => {
  if (!previousRank || previousRank === 0 || currentRank === 0) {
    return null;
  }

  const change = previousRank - currentRank; // Positive = moved up, negative = moved down

  if (change > 0) {
    return {
      icon: TrendingUpIcon,
      color: 'text-green-600 dark:text-green-400',
      label: `+${change}`,
    };
  }
  if (change < 0) {
    return {
      icon: TrendingDownIcon,
      color: 'text-red-600 dark:text-red-400',
      label: `${change}`,
    };
  }
  return {
    icon: MinusIcon,
    color: 'text-muted-foreground',
    label: '0',
  };
};

/**
 * Format rank with ordinal suffix (1st, 2nd, 3rd, etc.)
 */
const formatRankWithSuffix = (rank: number): string => {
  if (rank === 0) return 'Unranked';

  const j = rank % 10;
  const k = rank % 100;

  if (j === 1 && k !== 11) {
    return `${rank}st`;
  }
  if (j === 2 && k !== 12) {
    return `${rank}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${rank}rd`;
  }
  return `${rank}th`;
};

/**
 * UserRankCard - Main component showing user's rank and stats
 * Optimized with React.memo (Phase 7, T111)
 *
 * Prevents unnecessary re-renders when parent components update.
 * Only re-renders when props change.
 */
export const UserRankCard = React.memo(function UserRankCard({
  data,
  username: _username,
  leaderboardType,
  period,
  metricLabel = 'XP',
  category,
  onPress,
  className,
}: UserRankCardProps) {
  const percentileBadge = getPercentileBadge(data.percentile);
  const rankChange = getRankChange(data.rank, data.previousRank);
  const isUnranked = data.rank === 0;

  // Leaderboard title
  const leaderboardTitle =
    leaderboardType === 'global'
      ? `Global ${period === 'monthly' ? 'Monthly' : 'All-Time'}`
      : `${category} ${period === 'monthly' ? 'Monthly' : 'All-Time'}`;

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Gradient Header */}
      <View className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 dark:from-primary/30 dark:to-primary/20">
        <View className="flex flex-row items-center justify-between">
          <View className="flex-1">
            <Text variant="small" className="mb-1 uppercase tracking-wide text-muted-foreground">
              {leaderboardTitle}
            </Text>
            <Text variant="small" className="font-semibold text-foreground">
              Your Rank
            </Text>
          </View>
          {!isUnranked && (
            <Badge variant={percentileBadge.variant} className="ml-2">
              <SparklesIcon size={12} className="mr-1" />
              <Text variant="small" className="font-semibold">
                {percentileBadge.label}
              </Text>
            </Badge>
          )}
        </View>
      </View>

      <CardContent className="p-4">
        {isUnranked ? (
          // Unranked State
          <View className="flex items-center justify-center py-6">
            <View className="mb-3 rounded-full bg-muted p-4">
              <TargetIcon size={32} className="text-muted-foreground" />
            </View>
            <Text variant="h3" className="mb-2 text-foreground">
              Not Ranked Yet
            </Text>
            <Text variant="small" className="mb-4 text-center text-muted-foreground">
              Complete more activities to appear on the leaderboard!
            </Text>
            <View className="flex flex-row items-center gap-2">
              <Text variant="small" className="text-muted-foreground">
                Current {metricLabel}:
              </Text>
              <Text variant="small" className="font-bold text-foreground">
                {data.metricValue.toLocaleString()}
              </Text>
            </View>
          </View>
        ) : (
          // Ranked State
          <View>
            {/* Rank and Change */}
            <View className="mb-4 flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-3">
                {/* Rank Circle */}
                <View className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                  <Text variant="h2" className="text-primary">
                    #{data.rank}
                  </Text>
                </View>

                {/* Rank Info */}
                <View>
                  <Text variant="h3" className="text-foreground">
                    {formatRankWithSuffix(data.rank)}
                  </Text>
                  <Text variant="small" className="text-muted-foreground">
                    of {data.totalUsers.toLocaleString()} users
                  </Text>
                </View>
              </View>

              {/* Rank Change Indicator */}
              {rankChange && (
                <View className="flex items-center">
                  {React.createElement(rankChange.icon, {
                    size: 24,
                    className: rankChange.color,
                  })}
                  <Text className={cn('mt-1 text-xs font-semibold', rankChange.color)}>
                    {rankChange.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Metric Value */}
            <View className="mb-3">
              <View className="mb-2 flex flex-row items-end justify-between">
                <Text className="text-sm text-muted-foreground">{metricLabel}</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {data.metricValue.toLocaleString()}
                </Text>
              </View>

              {/* Percentile Progress Bar */}
              <View>
                <Progress value={data.percentile} className="h-2" />
                <Text className={cn('mt-1 text-xs font-medium', percentileBadge.color)}>
                  Better than {data.percentile.toFixed(1)}% of users
                </Text>
              </View>
            </View>

            {/* View Full Leaderboard Button */}
            {onPress && (
              <View className="mt-2 border-t border-border pt-3">
                <Text
                  className="text-center text-sm font-semibold text-primary"
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityLabel="View full leaderboard">
                  View Full Leaderboard →
                </Text>
              </View>
            )}
          </View>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * UserRankCardSkeleton - Loading state
 */
export function UserRankCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header Skeleton */}
      <View className="bg-muted px-4 py-3">
        <View className="mb-2 h-3 w-32 animate-pulse rounded bg-muted-foreground/20" />
        <View className="h-4 w-24 animate-pulse rounded bg-muted-foreground/20" />
      </View>

      <CardContent className="p-4">
        <View className="mb-4 flex flex-row items-center gap-3">
          {/* Rank Circle Skeleton */}
          <View className="h-16 w-16 animate-pulse rounded-full bg-muted" />

          {/* Info Skeleton */}
          <View className="flex-1">
            <View className="mb-2 h-5 w-20 animate-pulse rounded bg-muted" />
            <View className="h-4 w-32 animate-pulse rounded bg-muted" />
          </View>
        </View>

        {/* Metric Skeleton */}
        <View className="mb-3">
          <View className="mb-2 flex flex-row justify-between">
            <View className="h-4 w-12 animate-pulse rounded bg-muted" />
            <View className="h-6 w-20 animate-pulse rounded bg-muted" />
          </View>
          <View className="h-2 w-full animate-pulse rounded bg-muted" />
        </View>
      </CardContent>
    </Card>
  );
}

/**
 * UserRankCardCompact - Simplified version for headers/sidebars
 * Optimized with React.memo (Phase 7, T111)
 */
export const UserRankCardCompact = React.memo(function UserRankCardCompact({
  data,
  metricLabel = 'XP',
  className,
}: {
  data: UserRankData;
  metricLabel?: string;
  className?: string;
}) {
  const isUnranked = data.rank === 0;
  const percentileBadge = getPercentileBadge(data.percentile);

  return (
    <View
      className={cn(
        'flex flex-row items-center justify-between rounded-lg p-3',
        'border border-primary/20 bg-primary/5',
        className
      )}>
      <View className="flex flex-row items-center gap-3">
        <TrophyIcon size={20} className="text-primary" />
        <View>
          <Text className="text-sm font-semibold text-foreground">
            {isUnranked ? 'Unranked' : `#${data.rank}`}
          </Text>
          {!isUnranked && (
            <Text className="text-xs text-muted-foreground">{percentileBadge.label}</Text>
          )}
        </View>
      </View>
      <View className="flex items-end">
        <Text className="text-base font-bold text-foreground">
          {data.metricValue.toLocaleString()}
        </Text>
        <Text className="text-xs uppercase text-muted-foreground">{metricLabel}</Text>
      </View>
    </View>
  );
});
