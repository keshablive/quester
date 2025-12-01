/**
 * Learning Streak Widget Component
 *
 * Displays learning streak information with progress bar, milestones,
 * and motivational messaging.
 * 006-course-gamification T077
 */
import React, { useState, useMemo } from 'react';
import { View, Pressable, Modal } from 'react-native';
import { Text } from '@/components/ui';
import {
  Flame,
  Target,
  Award,
  Calendar,
  ChevronRight,
  AlertCircle,
  Gift,
  Zap,
} from 'lucide-react-native';
import { cn } from '@/core';
import { useLearningStreak, StreakStatus } from '@/core/hooks/useLearningStreak';
import type { LearningStreakMilestone } from '@/core/types';

/**
 * Props for the LearningStreakWidget component
 */
interface LearningStreakWidgetProps {
  /** Compact mode for smaller display */
  compact?: boolean;
  /** Additional class names */
  className?: string;
  /** Show milestone progress */
  showMilestones?: boolean;
  /** Callback when streak info is tapped */
  onPress?: () => void;
  /** Show refresh button */
  showRefresh?: boolean;
}

/**
 * Get streak status styling
 */
function getStatusStyling(status: StreakStatus): {
  color: string;
  bgColor: string;
  icon: typeof Flame;
  iconColor: string;
} {
  switch (status) {
    case 'active':
      return {
        color: 'text-orange-500',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        icon: Flame,
        iconColor: '#f97316',
      };
    case 'at-risk':
      return {
        color: 'text-amber-500',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        icon: AlertCircle,
        iconColor: '#f59e0b',
      };
    case 'broken':
      return {
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        icon: Flame,
        iconColor: '#9ca3af',
      };
    case 'new':
    default:
      return {
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        icon: Zap,
        iconColor: '#3b82f6',
      };
  }
}

/**
 * Progress bar component
 */
function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <View className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <View
        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </View>
  );
}

/**
 * Milestone badge component
 */
function MilestoneBadge({
  milestone,
  achieved,
  current,
}: {
  milestone: LearningStreakMilestone;
  achieved: boolean;
  current: boolean;
}) {
  return (
    <View
      className={cn(
        'h-12 w-12 items-center justify-center rounded-full border-2',
        achieved
          ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/30'
          : current
            ? 'border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30'
            : 'border-muted-foreground/30 bg-muted'
      )}>
      <Text
        className={cn(
          'text-xs font-bold',
          achieved ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
        )}>
        {milestone.days}d
      </Text>
    </View>
  );
}

/**
 * Compact streak display for headers/nav
 */
function CompactStreak({
  currentStreak,
  status,
  onPress,
}: {
  currentStreak: number;
  status: StreakStatus;
  onPress?: () => void;
}) {
  const { color, bgColor, icon: StatusIcon, iconColor } = getStatusStyling(status);

  return (
    <Pressable
      onPress={onPress}
      className={cn('flex-row items-center gap-1.5 rounded-full px-3 py-1.5', bgColor)}>
      <StatusIcon size={16} color={iconColor} />
      <Text className={cn('font-bold', color)}>{currentStreak}</Text>
    </Pressable>
  );
}

/**
 * Main streak widget content
 */
function StreakContent({
  showMilestones = true,
  onPress,
}: {
  showMilestones?: boolean;
  onPress?: () => void;
}) {
  const {
    currentStreak,
    longestStreak,
    status,
    completedToday,
    daysUntilNextMilestone,
    nextMilestoneXP,
    progressToNextMilestone,
    milestones,
    achievedMilestones,
    getMotivationalMessage,
    graceAvailable,
    loading,
    error,
  } = useLearningStreak();

  const { color, bgColor, icon: StatusIcon, iconColor } = getStatusStyling(status);

  // Determine current milestone target
  const currentTarget = useMemo(() => {
    return milestones.find((m) => currentStreak < m.days) || milestones[milestones.length - 1];
  }, [milestones, currentStreak]);

  if (loading) {
    return (
      <View className="animate-pulse rounded-xl bg-card p-4">
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-full bg-muted" />
          <View className="flex-1">
            <View className="mb-2 h-6 w-24 rounded bg-muted" />
            <View className="h-4 w-32 rounded bg-muted" />
          </View>
        </View>
        <View className="h-2 rounded-full bg-muted" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-xl border border-destructive/30 bg-card p-4">
        <View className="flex-row items-center gap-2">
          <AlertCircle size={20} color="#ef4444" />
          <Text className="text-destructive">Unable to load streak</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} className="rounded-xl border border-border bg-card p-4">
      {/* Header row */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className={cn('rounded-full p-3', bgColor)}>
            <StatusIcon size={24} color={iconColor} />
          </View>
          <View>
            <View className="flex-row items-baseline gap-2">
              <Text className={cn('text-3xl font-bold', color)}>{currentStreak}</Text>
              <Text className="text-sm text-muted-foreground">day streak</Text>
            </View>
            {longestStreak > currentStreak && (
              <View className="flex-row items-center gap-1">
                <Award size={12} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground">Best: {longestStreak} days</Text>
              </View>
            )}
          </View>
        </View>

        {/* Today's status badge */}
        <View
          className={cn(
            'rounded-full px-3 py-1',
            completedToday
              ? 'bg-green-100 dark:bg-green-900/30'
              : status === 'at-risk'
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-muted'
          )}>
          <Text
            className={cn(
              'text-xs font-medium',
              completedToday
                ? 'text-green-600 dark:text-green-400'
                : status === 'at-risk'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
            )}>
            {completedToday ? '✓ Done today' : status === 'at-risk' ? '⚠️ At risk' : 'Learn today'}
          </Text>
        </View>
      </View>

      {/* Motivational message */}
      <Text className="mb-4 text-sm text-muted-foreground">{getMotivationalMessage()}</Text>

      {/* Progress to next milestone */}
      {currentTarget && (
        <View className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Target size={14} className="text-orange-500" />
              <Text className="text-xs font-medium text-foreground">
                Next: {currentTarget.name}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Gift size={12} className="text-amber-500" />
              <Text className="text-xs text-amber-600 dark:text-amber-400">
                +{nextMilestoneXP} XP
              </Text>
            </View>
          </View>
          <ProgressBar progress={progressToNextMilestone} />
          <Text className="mt-1 text-right text-xs text-muted-foreground">
            {daysUntilNextMilestone} day{daysUntilNextMilestone !== 1 ? 's' : ''} to go
          </Text>
        </View>
      )}

      {/* Milestone badges */}
      {showMilestones && (
        <View className="mt-2 flex-row items-center justify-between">
          {milestones.slice(0, 5).map((milestone) => (
            <MilestoneBadge
              key={milestone.days}
              milestone={milestone}
              achieved={achievedMilestones.includes(milestone)}
              current={currentTarget?.days === milestone.days}
            />
          ))}
        </View>
      )}

      {/* Grace period indicator */}
      {graceAvailable && status === 'at-risk' && (
        <View className="mt-4 flex-row items-center gap-2 rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30">
          <Calendar size={14} className="text-amber-500" />
          <Text className="text-xs text-amber-700 dark:text-amber-400">
            Grace period available - complete a lesson to save your streak!
          </Text>
        </View>
      )}

      {/* Action indicator */}
      {onPress && (
        <View className="mt-3 flex-row items-center justify-center border-t border-border pt-3">
          <Text className="mr-1 text-xs text-primary">View streak details</Text>
          <ChevronRight size={14} className="text-primary" />
        </View>
      )}
    </Pressable>
  );
}

/**
 * Learning Streak Widget
 *
 * Displays the user's current learning streak with visual progress,
 * milestone tracking, and motivational messaging.
 *
 * @example
 * ```tsx
 * <LearningStreakWidget />
 * <LearningStreakWidget compact />
 * <LearningStreakWidget showMilestones={false} onPress={handleStreakPress} />
 * ```
 */
export function LearningStreakWidget({
  compact = false,
  className,
  showMilestones = true,
  onPress,
  showRefresh = false,
}: LearningStreakWidgetProps) {
  const { currentStreak, status, refresh } = useLearningStreak();

  if (compact) {
    return (
      <View className={className}>
        <CompactStreak currentStreak={currentStreak} status={status} onPress={onPress} />
      </View>
    );
  }

  return (
    <View className={className}>
      <StreakContent showMilestones={showMilestones} onPress={onPress} />
    </View>
  );
}

export default LearningStreakWidget;
