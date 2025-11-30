/**
 * Learning Leaderboard Widget Component
 *
 * Displays learning XP leaderboard with user rankings, timeframe filters,
 * and current user highlight.
 * 006-course-gamification T066
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import {
  Trophy,
  Medal,
  Crown,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  User,
} from 'lucide-react-native';
import { cn, OptimizedImage } from '@/core';
import type { LearningLeaderboardEntry } from '@/core/types';
import { useLearningLeaderboard, LeaderboardTimeframe } from '@/core/hooks/useLearningLeaderboard';

/**
 * Timeframe tabs configuration
 */
const TIMEFRAME_TABS: { key: LeaderboardTimeframe; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'all_time', label: 'All Time' },
];

/**
 * Props for the LearningLeaderboardWidget component
 */
interface LearningLeaderboardWidgetProps {
  /** Optional course ID to show course-specific leaderboard */
  courseId?: string;
  /** Maximum entries to display */
  maxEntries?: number;
  /** Show timeframe tabs */
  showTimeframeTabs?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
  /** Title override */
  title?: string;
}

/**
 * Get rank medal icon and styling
 */
function getRankIcon(rank: number): { icon: typeof Trophy; color: string; bgColor: string } {
  switch (rank) {
    case 1:
      return { icon: Crown, color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
    case 2:
      return { icon: Medal, color: 'text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800' };
    case 3:
      return { icon: Medal, color: 'text-amber-700', bgColor: 'bg-amber-50 dark:bg-amber-950/30' };
    default:
      return { icon: Trophy, color: 'text-muted-foreground', bgColor: 'bg-muted' };
  }
}

/**
 * Rank change indicator (for future rank history feature)
 */
function RankChange({ change }: { change?: number }) {
  if (!change || change === 0) return null;

  const isUp = change > 0;
  const Icon = isUp ? ChevronUp : ChevronDown;
  const color = isUp ? 'text-green-500' : 'text-red-500';

  return (
    <View className={cn('flex-row items-center', color)}>
      <Icon size={12} />
      <Text className={cn('text-xs font-medium', color)}>{Math.abs(change)}</Text>
    </View>
  );
}

/**
 * Single leaderboard entry row
 */
function LeaderboardEntry({
  entry,
  isCurrentUser,
  compact = false,
}: {
  entry: LearningLeaderboardEntry;
  isCurrentUser: boolean;
  compact?: boolean;
}) {
  const { icon: RankIcon, color, bgColor } = getRankIcon(entry.rank);
  const isTopThree = entry.rank <= 3;

  return (
    <View
      className={cn(
        'flex-row items-center rounded-xl p-3',
        isCurrentUser && 'border-2 border-primary bg-primary/5',
        !isCurrentUser && isTopThree && bgColor,
        !isCurrentUser && !isTopThree && 'bg-card'
      )}>
      {/* Rank */}
      <View
        className={cn(
          'h-8 w-8 items-center justify-center rounded-full',
          isTopThree ? bgColor : 'bg-muted'
        )}>
        {isTopThree ? (
          <RankIcon size={16} className={color} />
        ) : (
          <Text className="text-sm font-bold text-muted-foreground">#{entry.rank}</Text>
        )}
      </View>

      {/* User info */}
      <View className="ml-3 flex-1 flex-row items-center">
        {/* Avatar */}
        {entry.avatar ? (
          <OptimizedImage
            source={entry.avatar}
            className="h-10 w-10 rounded-full"
            placeholder="avatar"
            contentFit="cover"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User size={20} className="text-muted-foreground" />
          </View>
        )}

        {/* Name and level */}
        <View className="ml-2 flex-1">
          <View className="flex-row items-center">
            <Text
              className={cn(
                'font-semibold',
                isCurrentUser && 'text-primary',
                compact ? 'text-sm' : 'text-base'
              )}
              numberOfLines={1}>
              {entry.username}
            </Text>
            {isCurrentUser && (
              <View className="ml-2 rounded-full bg-primary px-1.5 py-0.5">
                <Text className="text-xs font-medium text-primary-foreground">You</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-muted-foreground">Level {entry.level}</Text>
        </View>
      </View>

      {/* XP and rank change */}
      <View className="items-end">
        <View className="flex-row items-center">
          <TrendingUp size={14} className="mr-1 text-amber-500" />
          <Text
            className={cn(
              'font-bold text-amber-600 dark:text-amber-400',
              compact ? 'text-sm' : 'text-base'
            )}>
            {entry.total_xp.toLocaleString()}
          </Text>
        </View>
        <Text className="text-xs text-muted-foreground">XP</Text>
      </View>
    </View>
  );
}

/**
 * Loading skeleton for leaderboard
 */
function LeaderboardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-row items-center rounded-xl bg-card p-3">
          <View className="h-8 w-8 rounded-full bg-muted" />
          <View className="ml-3 flex-1 flex-row items-center">
            <View className="h-10 w-10 rounded-full bg-muted" />
            <View className="ml-2 flex-1">
              <View className="mb-1 h-4 w-24 rounded bg-muted" />
              <View className="h-3 w-16 rounded bg-muted" />
            </View>
          </View>
          <View className="h-5 w-16 rounded bg-muted" />
        </View>
      ))}
    </View>
  );
}

/**
 * Empty state
 */
function EmptyState({ message = 'No rankings yet' }: { message?: string }) {
  return (
    <View className="items-center justify-center py-8">
      <Trophy size={48} className="mb-3 text-muted-foreground opacity-50" />
      <Text className="text-center text-muted-foreground">{message}</Text>
    </View>
  );
}

/**
 * Timeframe selector tabs
 */
function TimeframeTabs({
  selected,
  onSelect,
}: {
  selected: LeaderboardTimeframe;
  onSelect: (timeframe: LeaderboardTimeframe) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
      <View className="flex-row rounded-xl bg-muted p-1">
        {TIMEFRAME_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            className={cn(
              'rounded-lg px-4 py-2',
              selected === tab.key && 'bg-background shadow-sm'
            )}>
            <Text
              className={cn(
                'text-sm font-medium',
                selected === tab.key ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * User rank summary card
 */
function UserRankCard({
  userRank,
  positionMessage,
}: {
  userRank: LearningLeaderboardEntry | null;
  positionMessage: string;
}) {
  if (!userRank) return null;

  const isTopThree = userRank.rank <= 3;

  return (
    <View className="mb-4 rounded-xl border-2 border-primary bg-primary/5 p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm text-muted-foreground">Your Position</Text>
          <Text className="text-lg font-bold text-primary">{positionMessage}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-muted-foreground">Your XP</Text>
          <Text className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {userRank.total_xp.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Learning Leaderboard Widget
 *
 * @example
 * ```tsx
 * <LearningLeaderboardWidget
 *   showTimeframeTabs
 *   title="Top Learners"
 * />
 *
 * // Course-specific leaderboard
 * <LearningLeaderboardWidget
 *   courseId="course-123"
 *   title="Course Leaders"
 * />
 * ```
 */
export function LearningLeaderboardWidget({
  courseId,
  maxEntries = 10,
  showTimeframeTabs = true,
  compact = false,
  className,
  title = 'Learning Leaderboard',
}: LearningLeaderboardWidgetProps) {
  const { entries, userRank, loading, error, filters, setTimeframe, getUserPositionMessage } =
    useLearningLeaderboard(courseId);

  // Limit displayed entries
  const displayedEntries = entries.slice(0, maxEntries);

  // Check if user is in displayed list
  const userInList = userRank ? displayedEntries.some((e) => e.rank === userRank.rank) : false;

  return (
    <View className={cn('', className)}>
      {/* Header */}
      <View className="mb-4 flex-row items-center">
        <Trophy size={24} className="mr-2 text-amber-500" />
        <Text className="text-xl font-bold">{title}</Text>
      </View>

      {/* Timeframe tabs */}
      {showTimeframeTabs && <TimeframeTabs selected={filters.timeframe} onSelect={setTimeframe} />}

      {/* User rank summary (if not in top list) */}
      {userRank && !userInList && (
        <UserRankCard userRank={userRank} positionMessage={getUserPositionMessage()} />
      )}

      {/* Loading state */}
      {loading && <LeaderboardSkeleton count={maxEntries} />}

      {/* Error state */}
      {error && !loading && (
        <View className="items-center justify-center rounded-xl bg-destructive/10 p-4">
          <Text className="text-destructive">{error}</Text>
        </View>
      )}

      {/* Empty state */}
      {!loading && !error && displayedEntries.length === 0 && (
        <EmptyState message="Be the first to earn XP!" />
      )}

      {/* Leaderboard list */}
      {!loading && !error && displayedEntries.length > 0 && (
        <View className="space-y-2">
          {displayedEntries.map((entry) => (
            <LeaderboardEntry
              key={`${entry.user_id}-${entry.rank}`}
              entry={entry}
              isCurrentUser={userRank?.user_id === entry.user_id}
              compact={compact}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default LearningLeaderboardWidget;
