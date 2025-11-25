/**
 * LeaderboardRow Component (T046)
 *
 * Displays a single user's entry in a leaderboard with rank badge, avatar, username, and score.
 * Used in leaderboard screens for global and category rankings.
 *
 * Features:
 * - Rank badge with tier-based styling (top 3 get special colors)
 * - User avatar with fallback initials
 * - Username display
 * - Metric value (XP, quest count, etc.) with animated number
 * - Highlight styling for current user
 * - Responsive design for various screen sizes
 * - Accessibility support
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TrophyIcon, CrownIcon, MedalIcon } from 'lucide-react-native';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  avatar?: string;
  metricValue: number;
}

export interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean; // Highlight current user's row
  metricLabel?: string; // Label for metric (e.g., "XP", "Quests")
  onPress?: (entry: LeaderboardEntry) => void; // Navigate to user profile
  className?: string;
}

/**
 * Get rank badge styling based on position
 * Top 3 get special treatment: Gold, Silver, Bronze
 */
const getRankBadgeStyles = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        containerClass: 'bg-yellow-500 dark:bg-yellow-600',
        textClass: 'text-yellow-50 font-bold',
        icon: CrownIcon,
        iconColor: '#fef3c7', // yellow-100
      };
    case 2:
      return {
        containerClass: 'bg-gray-400 dark:bg-gray-500',
        textClass: 'text-gray-50 font-bold',
        icon: MedalIcon,
        iconColor: '#f3f4f6', // gray-100
      };
    case 3:
      return {
        containerClass: 'bg-orange-600 dark:bg-orange-700',
        textClass: 'text-orange-50 font-bold',
        icon: TrophyIcon,
        iconColor: '#fed7aa', // orange-200
      };
    default:
      return {
        containerClass: 'bg-muted',
        textClass: 'text-muted-foreground font-semibold',
        icon: null,
        iconColor: null,
      };
  }
};

/**
 * Format large numbers with K/M suffixes
 * Examples: 1234 -> 1.2K, 1234567 -> 1.2M
 */
const formatMetricValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Get user initials from username for avatar fallback
 * Examples: "John Doe" -> "JD", "alice" -> "A"
 */
const getUserInitials = (username: string): string => {
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
};

/**
 * LeaderboardRow Component - Optimized with React.memo (Phase 7, T111)
 *
 * Prevents unnecessary re-renders when leaderboard updates.
 * Only re-renders when entry, isCurrentUser, metricLabel, onPress, or className change.
 */
export const LeaderboardRow = React.memo(function LeaderboardRow({
  entry,
  isCurrentUser = false,
  metricLabel = 'XP',
  onPress,
  className,
}: LeaderboardRowProps) {
  const rankStyles = getRankBadgeStyles(entry.rank);
  const RankIcon = rankStyles.icon;

  return (
    <Pressable
      onPress={() => onPress?.(entry)}
      disabled={!onPress}
      className={cn(
        'flex flex-row items-center justify-between gap-3 rounded-lg p-4',
        'border border-border',
        isCurrentUser
          ? 'border-primary/50 bg-primary/10 dark:bg-primary/20'
          : 'bg-card active:bg-muted',
        onPress && 'active:opacity-70',
        className
      )}
      accessibilityRole="button"
      accessibilityLabel={`${entry.username}, rank ${entry.rank}, ${entry.metricValue} ${metricLabel}`}
      accessibilityHint={onPress ? 'Double tap to view profile' : undefined}>
      {/* Left Section: Rank Badge */}
      <View className="flex flex-row items-center gap-3">
        {/* Rank Badge */}
        <View
          className={cn(
            'flex items-center justify-center rounded-full',
            rankStyles.containerClass,
            entry.rank <= 3 ? 'h-10 w-10' : 'h-9 w-9'
          )}>
          {RankIcon ? (
            <RankIcon size={entry.rank === 1 ? 20 : 18} color={rankStyles.iconColor!} />
          ) : (
            <Text variant="small" className={rankStyles.textClass}>
              {entry.rank}
            </Text>
          )}
        </View>

        {/* User Avatar */}
        <Avatar className="h-12 w-12" alt={`${entry.username}'s avatar`}>
          {entry.avatar ? (
            <AvatarImage
              source={{ uri: entry.avatar }}
              accessibilityLabel={`${entry.username}'s avatar`}
            />
          ) : null}
          <AvatarFallback>
            <Text variant="h4" className="text-muted-foreground">
              {getUserInitials(entry.username)}
            </Text>
          </AvatarFallback>
        </Avatar>

        {/* Username */}
        <View className="flex-1">
          <Text
            variant="h4"
            className={cn(isCurrentUser ? 'text-primary' : 'text-foreground')}
            numberOfLines={1}
            ellipsizeMode="tail">
            {entry.username}
          </Text>
          {isCurrentUser && (
            <Text variant="small" className="mt-0.5 text-muted-foreground">
              You
            </Text>
          )}
        </View>
      </View>

      {/* Right Section: Metric Value */}
      <View className="flex items-end">
        <Text variant="h3" className="text-foreground">
          {formatMetricValue(entry.metricValue)}
        </Text>
        <Text variant="small" className="uppercase tracking-wide text-muted-foreground">
          {metricLabel}
        </Text>
      </View>
    </Pressable>
  );
});

/**
 * LeaderboardRowSkeleton - Loading placeholder
 * Used while leaderboard data is being fetched
 */
export function LeaderboardRowSkeleton({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'flex flex-row items-center justify-between gap-3 rounded-lg p-4',
        'border border-border bg-card',
        className
      )}>
      {/* Left Section Skeleton */}
      <View className="flex flex-1 flex-row items-center gap-3">
        {/* Rank Badge Skeleton */}
        <View className="h-9 w-9 animate-pulse rounded-full bg-muted" />

        {/* Avatar Skeleton */}
        <View className="h-12 w-12 animate-pulse rounded-full bg-muted" />

        {/* Username Skeleton */}
        <View className="flex-1 gap-1">
          <View className="h-4 w-32 animate-pulse rounded bg-muted" />
          <View className="h-3 w-20 animate-pulse rounded bg-muted" />
        </View>
      </View>

      {/* Right Section Skeleton */}
      <View className="flex items-end gap-1">
        <View className="h-5 w-16 animate-pulse rounded bg-muted" />
        <View className="h-3 w-8 animate-pulse rounded bg-muted" />
      </View>
    </View>
  );
}

/**
 * LeaderboardRowEmpty - Empty state
 * Shown when user is not ranked in any leaderboard
 */
export function LeaderboardRowEmpty({
  message = 'No leaderboard data available',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <View
      className={cn(
        'flex items-center justify-center rounded-lg p-8',
        'border border-dashed border-border bg-card',
        className
      )}>
      <TrophyIcon size={48} className="mb-3 text-muted-foreground" />
      <Text variant="p" className="text-center text-muted-foreground">
        {message}
      </Text>
    </View>
  );
}
