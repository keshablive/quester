import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Skeleton } from '@/components/ui';
import { useFollowStats } from '@/core/hooks/queries';
import { useCurrentUser, useUser } from '@/core/hooks/queries';
import type { ProfileProps } from './types';

/**
 * Format a number to a human-readable string (e.g., 1200 -> "1.2k")
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toString();
}

/**
 * Profile stats component displaying posts, followers, and following counts
 *
 * @param userId - Optional user ID. If provided, displays that user's stats.
 *                 If omitted, displays the current authenticated user's stats.
 *
 * @example
 * ```tsx
 * // Current user's stats
 * <ProfileStats />
 *
 * // Another user's stats
 * <ProfileStats userId="user-123" />
 * ```
 */
export function ProfileStats({ userId }: ProfileProps) {
  // Get user ID for follow stats query
  const { data: currentUser } = useCurrentUser();
  const { data: otherUser } = useUser(userId || '', { enabled: !!userId });

  const effectiveUserId = userId || currentUser?.id;

  // Fetch follow stats using the dedicated endpoint
  const {
    data: followStats,
    isLoading: isFollowStatsLoading,
    error: followStatsError,
  } = useFollowStats(effectiveUserId || '', {
    enabled: !!effectiveUserId,
  });

  const isLoading = isFollowStatsLoading;

  // Loading skeleton
  if (isLoading) {
    return (
      <View className="flex-row gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="flex-1 items-center gap-1 p-4">
            <Skeleton className="h-7 w-12 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </Card>
        ))}
      </View>
    );
  }

  // Error state - show zeroes
  if (followStatsError) {
    return (
      <View className="flex-row gap-4">
        <Card className="flex-1 items-center p-4">
          <Text className="text-2xl font-bold">0</Text>
          <Text className="text-sm text-muted-foreground">Followers</Text>
        </Card>
        <Card className="flex-1 items-center p-4">
          <Text className="text-2xl font-bold">0</Text>
          <Text className="text-sm text-muted-foreground">Following</Text>
        </Card>
      </View>
    );
  }

  const followers = followStats?.followers ?? 0;
  const following = followStats?.following ?? 0;

  return (
    <View className="flex-row gap-4">
      <Card className="flex-1 items-center p-4">
        <Text className="text-2xl font-bold">{formatNumber(followers)}</Text>
        <Text className="text-sm text-muted-foreground">Followers</Text>
      </Card>
      <Card className="flex-1 items-center p-4">
        <Text className="text-2xl font-bold">{formatNumber(following)}</Text>
        <Text className="text-sm text-muted-foreground">Following</Text>
      </Card>
    </View>
  );
}
