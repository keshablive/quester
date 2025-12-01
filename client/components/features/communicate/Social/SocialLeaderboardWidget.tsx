import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, Platform } from 'react-native';
import { Text, Card, Avatar, Badge } from '@/components/ui';
import { cn } from '@/core';
import { useAuth } from '@/core/auth/AuthContext';

/**
 * Leaderboard entry from API
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  socialXp: number;
}

/**
 * User position in leaderboard
 */
export interface UserPosition {
  rank: number;
  socialXp: number;
  percentile: number;
}

interface SocialLeaderboardWidgetProps {
  /** Entries to display (fetched from parent) */
  entries?: LeaderboardEntry[];
  /** Current user's position */
  userPosition?: UserPosition | null;
  /** Period filter */
  period?: 'alltime' | 'monthly';
  /** Loading state */
  loading?: boolean;
  /** Maximum entries to show */
  maxEntries?: number;
  /** Callback when user entry is pressed */
  onUserPress?: (userId: string) => void;
  /** Additional class names */
  className?: string;
  /** Whether to show as compact widget */
  compact?: boolean;
}

// Rank badge colors
const rankColors: Record<number, string> = {
  1: 'bg-yellow-500', // Gold
  2: 'bg-gray-400', // Silver
  3: 'bg-amber-600', // Bronze
};

/**
 * LeaderboardRow component for displaying a single entry
 */
function LeaderboardRow({
  entry,
  isCurrentUser,
  onPress,
  compact,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center py-2',
        isCurrentUser && 'rounded-lg bg-primary/10 px-2',
        Platform.select({
          web: 'cursor-pointer transition-colors hover:bg-muted/50',
        })
      )}>
      {/* Rank Badge */}
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-full',
          entry.rank <= 3 ? rankColors[entry.rank] : 'bg-muted'
        )}>
        <Text
          className={cn(
            'text-xs font-bold',
            entry.rank <= 3 ? 'text-white' : 'text-muted-foreground'
          )}>
          {entry.rank}
        </Text>
      </View>

      {/* Avatar */}
      <Avatar className={cn('ml-2', compact ? 'h-6 w-6' : 'h-8 w-8')}>
        {entry.avatarUrl ? (
          <Avatar.Image source={{ uri: entry.avatarUrl }} />
        ) : (
          <Avatar.Fallback>
            <Text className="text-xs">{entry.username.slice(0, 2).toUpperCase()}</Text>
          </Avatar.Fallback>
        )}
      </Avatar>

      {/* Username */}
      <Text
        className={cn(
          'ml-2 flex-1',
          compact ? 'text-sm' : 'text-base',
          isCurrentUser && 'font-semibold text-primary'
        )}
        numberOfLines={1}>
        {entry.username}
        {isCurrentUser && ' (You)'}
      </Text>

      {/* XP */}
      <View className="flex-row items-center">
        <Text className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
          {formatXP(entry.socialXp)}
        </Text>
        <Text className={cn('ml-1 text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          XP
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Format XP with K/M suffix
 */
function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * SocialLeaderboardWidget - Displays top social XP users
 * T059: Widget for displaying social leaderboard in feed
 */
export function SocialLeaderboardWidget({
  entries = [],
  userPosition,
  period = 'alltime',
  loading = false,
  maxEntries = 5,
  onUserPress,
  className,
  compact = false,
}: SocialLeaderboardWidgetProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Limit entries displayed
  const displayedEntries = entries.slice(0, maxEntries);

  // Check if current user is in top list
  const isUserInTopList = displayedEntries.some((e) => e.userId === currentUserId);

  if (loading) {
    return (
      <Card className={cn('p-4', className)}>
        <View className="items-center justify-center py-4">
          <ActivityIndicator size="small" />
          <Text className="mt-2 text-sm text-muted-foreground">Loading leaderboard...</Text>
        </View>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className={cn('p-4', className)}>
        <Text className="mb-2 text-base font-semibold">🏆 Social Leaderboard</Text>
        <Text className="text-center text-sm text-muted-foreground">
          No leaderboard data yet. Be the first to earn social XP!
        </Text>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">🏆</Text>
          <Text className="text-base font-semibold">Top Contributors</Text>
        </View>
        <Badge variant="secondary">
          <Text className="text-xs capitalize">{period}</Text>
        </Badge>
      </View>

      {/* Leaderboard entries */}
      <View className="divide-y divide-border">
        {displayedEntries.map((entry) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
            isCurrentUser={entry.userId === currentUserId}
            onPress={onUserPress ? () => onUserPress(entry.userId) : undefined}
            compact={compact}
          />
        ))}
      </View>

      {/* Current user position (if not in top list) */}
      {userPosition && !isUserInTopList && userPosition.rank > 0 && (
        <View className="mt-3 border-t border-border pt-3">
          <Text className="mb-1 text-xs text-muted-foreground">Your Position</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Text className="text-xs font-bold text-primary-foreground">
                  #{userPosition.rank}
                </Text>
              </View>
              <Text className="font-medium">{formatXP(userPosition.socialXp)} XP</Text>
            </View>
            <Badge variant="outline">
              <Text className="text-xs">Top {100 - userPosition.percentile}%</Text>
            </Badge>
          </View>
        </View>
      )}
    </Card>
  );
}

export default SocialLeaderboardWidget;
