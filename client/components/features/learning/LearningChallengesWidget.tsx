/**
 * Learning Challenges Widget Component
 *
 * Displays the 3 daily learning challenges with overall progress
 * and time until reset.
 * 006-course-gamification T098
 */
import React from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Text } from '@/components/ui';
import { Target, Clock, Zap, ChevronRight, RefreshCw, Trophy, Flame } from 'lucide-react-native';
import { cn } from '@/core';
import { useLearningChallenges } from '@/core/hooks/useLearningChallenges';
import { DailyChallengeCard } from './DailyChallengeCard';

/**
 * Props for LearningChallengesWidget
 */
interface LearningChallengesWidgetProps {
  /** Compact mode for dashboard */
  compact?: boolean;
  /** Maximum challenges to show in compact mode */
  maxChallenges?: number;
  /** Callback when "View All" is pressed */
  onViewAll?: () => void;
  /** Callback when a challenge card is pressed */
  onChallengePress?: (challengeId: string) => void;
  /** Show refresh control */
  showRefresh?: boolean;
  /** Additional class names */
  className?: string;
  /** Title override */
  title?: string;
}

/**
 * Circular progress indicator
 */
function CircularProgress({ progress, size = 60 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <View className="absolute">
        {/* Background circle */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'rgba(0,0,0,0.1)',
          }}
        />
      </View>
      <View className="absolute">
        {/* Progress circle - simplified for RN */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: progress >= 100 ? '#22c55e' : '#3b82f6',
            borderTopColor: 'transparent',
            borderRightColor:
              progress > 25 ? (progress >= 100 ? '#22c55e' : '#3b82f6') : 'transparent',
            borderBottomColor:
              progress > 50 ? (progress >= 100 ? '#22c55e' : '#3b82f6') : 'transparent',
            borderLeftColor:
              progress > 75 ? (progress >= 100 ? '#22c55e' : '#3b82f6') : 'transparent',
            transform: [{ rotate: '-45deg' }],
          }}
        />
      </View>
      <Text
        className={cn('text-lg font-bold', progress >= 100 ? 'text-green-500' : 'text-primary')}>
        {Math.round(progress)}%
      </Text>
    </View>
  );
}

/**
 * Stats row component
 */
function StatsRow({
  activeChallenges,
  completedChallenges,
  totalXP,
  earnedXP,
}: {
  activeChallenges: number;
  completedChallenges: number;
  totalXP: number;
  earnedXP: number;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-around rounded-xl bg-muted/50 py-3">
      <View className="items-center">
        <View className="flex-row items-center gap-1">
          <Target size={14} className="text-primary" />
          <Text className="text-lg font-bold text-foreground">
            {completedChallenges}/{activeChallenges + completedChallenges}
          </Text>
        </View>
        <Text className="text-xs text-muted-foreground">Completed</Text>
      </View>

      <View className="h-8 w-px bg-border" />

      <View className="items-center">
        <View className="flex-row items-center gap-1">
          <Zap size={14} color="#f59e0b" />
          <Text className="text-lg font-bold text-amber-600 dark:text-amber-400">{earnedXP}</Text>
        </View>
        <Text className="text-xs text-muted-foreground">XP Earned</Text>
      </View>

      <View className="h-8 w-px bg-border" />

      <View className="items-center">
        <View className="flex-row items-center gap-1">
          <Trophy size={14} className="text-muted-foreground" />
          <Text className="text-lg font-bold text-muted-foreground">{totalXP}</Text>
        </View>
        <Text className="text-xs text-muted-foreground">Available</Text>
      </View>
    </View>
  );
}

/**
 * Loading skeleton
 */
function ChallengesSkeleton() {
  return (
    <View className="gap-3">
      {[1, 2, 3].map((i) => (
        <View key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-xl bg-muted" />
            <View className="flex-1">
              <View className="mb-2 h-5 w-3/4 rounded bg-muted" />
              <View className="h-4 w-1/4 rounded bg-muted" />
            </View>
            <View className="h-6 w-16 rounded-full bg-muted" />
          </View>
          <View className="h-2 rounded-full bg-muted" />
        </View>
      ))}
    </View>
  );
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <View className="items-center py-12">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Target size={32} className="text-muted-foreground" />
      </View>
      <Text className="mb-1 text-lg font-medium text-foreground">No Challenges Today</Text>
      <Text className="text-center text-sm text-muted-foreground">
        Check back tomorrow for new daily challenges!
      </Text>
    </View>
  );
}

/**
 * All challenges completed state
 */
function AllCompletedState({ earnedXP }: { earnedXP: number }) {
  return (
    <View className="items-center py-8">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <Trophy size={40} color="#22c55e" />
      </View>
      <Text className="mb-1 text-xl font-bold text-foreground">All Challenges Complete! 🎉</Text>
      <Text className="mb-2 text-center text-sm text-muted-foreground">
        You've earned {earnedXP} XP today
      </Text>
      <View className="flex-row items-center gap-1">
        <Flame size={16} color="#f97316" />
        <Text className="text-sm font-medium text-orange-500">Keep up the streak!</Text>
      </View>
    </View>
  );
}

/**
 * Learning Challenges Widget
 *
 * Displays daily challenges with progress tracking and stats.
 *
 * @example
 * ```tsx
 * <LearningChallengesWidget
 *   onViewAll={() => navigation.navigate('Challenges')}
 *   onChallengePress={(id) => navigation.navigate('Challenge', { id })}
 * />
 * ```
 */
export function LearningChallengesWidget({
  compact = false,
  maxChallenges = 3,
  onViewAll,
  onChallengePress,
  showRefresh = true,
  className,
  title = 'Daily Challenges',
}: LearningChallengesWidgetProps) {
  const {
    challenges,
    loading,
    error,
    activeChallengesCount,
    completedChallengesCount,
    totalAvailableXP,
    earnedXP,
    overallProgress,
    timeUntilReset,
    refresh,
  } = useLearningChallenges();

  const displayChallenges = compact ? challenges.slice(0, maxChallenges) : challenges;
  const allCompleted = challenges.length > 0 && activeChallengesCount === 0;

  if (loading) {
    return (
      <View className={cn('rounded-xl bg-card p-4', className)}>
        <View className="mb-4 flex-row items-center justify-between">
          <View className="h-6 w-32 animate-pulse rounded bg-muted" />
          <View className="h-4 w-20 animate-pulse rounded bg-muted" />
        </View>
        <ChallengesSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View className={cn('rounded-xl border border-destructive/30 bg-card p-4', className)}>
        <View className="items-center py-6">
          <Text className="mb-2 text-destructive">Failed to load challenges</Text>
          <Pressable
            onPress={refresh}
            className="flex-row items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2">
            <RefreshCw size={16} className="text-destructive" />
            <Text className="font-medium text-destructive">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className={cn('rounded-xl bg-card', className)}>
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 pb-2">
        <View className="flex-row items-center gap-2">
          <Target size={20} className="text-primary" />
          <Text className="text-lg font-semibold text-foreground">{title}</Text>
        </View>

        <View className="flex-row items-center gap-3">
          {/* Time until reset */}
          {timeUntilReset && (
            <View className="flex-row items-center gap-1">
              <Clock size={14} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">Resets in {timeUntilReset}</Text>
            </View>
          )}

          {/* Refresh button */}
          {showRefresh && !compact && (
            <Pressable onPress={refresh} className="p-1.5">
              <RefreshCw size={16} className="text-muted-foreground" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress overview */}
      {!compact && challenges.length > 0 && (
        <View className="px-4">
          <View className="mb-4 flex-row items-center gap-4">
            <CircularProgress progress={overallProgress} />
            <View className="flex-1">
              <Text className="mb-1 text-sm text-muted-foreground">Daily Progress</Text>
              <Text className="text-lg font-semibold text-foreground">
                {completedChallengesCount} of {challenges.length} completed
              </Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Zap size={14} color="#f59e0b" />
                <Text className="text-sm text-amber-600 dark:text-amber-400">
                  {earnedXP} / {earnedXP + totalAvailableXP} XP earned
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Compact stats */}
      {compact && challenges.length > 0 && (
        <View className="px-4 pb-2">
          <StatsRow
            activeChallenges={activeChallengesCount}
            completedChallenges={completedChallengesCount}
            totalXP={totalAvailableXP}
            earnedXP={earnedXP}
          />
        </View>
      )}

      {/* Content */}
      <View className="px-4 pb-4">
        {challenges.length === 0 ? (
          <EmptyState />
        ) : allCompleted && !compact ? (
          <AllCompletedState earnedXP={earnedXP} />
        ) : (
          <View className="gap-3">
            {displayChallenges.map((challenge) => (
              <DailyChallengeCard
                key={challenge.id}
                challenge={challenge}
                compact={compact}
                onPress={() => onChallengePress?.(challenge.id)}
              />
            ))}
          </View>
        )}

        {/* View all button */}
        {compact && challenges.length > maxChallenges && onViewAll && (
          <Pressable
            onPress={onViewAll}
            className="mt-3 flex-row items-center justify-center gap-1 py-2">
            <Text className="text-sm font-medium text-primary">View all challenges</Text>
            <ChevronRight size={16} className="text-primary" />
          </Pressable>
        )}

        {/* View all for non-compact */}
        {!compact && onViewAll && (
          <Pressable
            onPress={onViewAll}
            className="mt-4 flex-row items-center justify-center gap-1 border-t border-border py-3">
            <Text className="text-sm font-medium text-primary">View challenge history</Text>
            <ChevronRight size={16} className="text-primary" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default LearningChallengesWidget;
