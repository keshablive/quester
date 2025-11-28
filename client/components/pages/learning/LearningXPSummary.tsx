/**
 * Learning XP Summary Component
 *
 * Displays user's learning XP summary with level, progress bar, and stats.
 * 006-course-gamification T038
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { Text } from '@/components/ui';
import { Zap, TrendingUp, Star, Flame, Target, Award } from 'lucide-react-native';
import { cn } from '@/core';
import type { LearningXPSummary as LearningXPSummaryType, LearningStreakInfo } from '@/core/types';

/**
 * Props for LearningXPSummary component
 */
interface LearningXPSummaryProps {
  /** XP summary data */
  summary: LearningXPSummaryType | null;
  /** Streak info */
  streak?: LearningStreakInfo | null;
  /** Previous XP value for animation */
  previousXP?: number;
  /** Loading state */
  loading?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Animated XP Counter component
 */
function AnimatedXPCounter({
  value,
  previousValue,
  duration = 1000,
}: {
  value: number;
  previousValue?: number;
  duration?: number;
}) {
  const animatedValue = useRef(new Animated.Value(previousValue || value)).current;
  const displayValue = useRef(previousValue || value);

  useEffect(() => {
    if (previousValue !== undefined && previousValue !== value) {
      Animated.timing(animatedValue, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Update display value during animation
      animatedValue.addListener(({ value: v }) => {
        displayValue.current = Math.round(v);
      });
    } else {
      animatedValue.setValue(value);
      displayValue.current = value;
    }

    return () => {
      animatedValue.removeAllListeners();
    };
  }, [value, previousValue, duration, animatedValue]);

  return (
    <Text className="text-4xl font-bold text-primary">{displayValue.current.toLocaleString()}</Text>
  );
}

/**
 * Level badge component
 */
function LevelBadge({ level, levelName }: { level: number; levelName: string }) {
  return (
    <View className="flex-row items-center rounded-full bg-primary/10 px-3 py-1">
      <Star size={14} className="mr-1 text-primary" fill="currentColor" />
      <Text className="text-sm font-semibold text-primary">
        Lv.{level} {levelName}
      </Text>
    </View>
  );
}

/**
 * XP Progress bar with level thresholds
 */
function XPProgressBar({
  current,
  toNext,
  progressPct,
}: {
  current: number;
  toNext: number;
  progressPct: number;
}) {
  const progressWidth = Math.min(Math.max(progressPct, 0), 100);

  return (
    <View className="w-full">
      <View className="mb-1 flex-row justify-between">
        <Text className="text-xs text-muted-foreground">{current.toLocaleString()} XP</Text>
        <Text className="text-xs text-muted-foreground">
          {toNext.toLocaleString()} to next level
        </Text>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80"
          style={{ width: `${progressWidth}%` }}
        />
      </View>
      <Text className="mt-1 text-center text-xs text-muted-foreground">
        {progressPct.toFixed(1)}% to Level Up
      </Text>
    </View>
  );
}

/**
 * Stat item component
 */
function StatItem({
  icon: Icon,
  label,
  value,
  iconColor = 'text-muted-foreground',
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
  iconColor?: string;
}) {
  return (
    <View className="items-center">
      <Icon size={20} className={iconColor} />
      <Text className="mt-1 text-lg font-bold text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

/**
 * Learning XP Summary Component
 *
 * @example
 * ```tsx
 * function LearningDashboard() {
 *   const { summary, streak, previousXP, loading } = useLearningXP();
 *
 *   return (
 *     <LearningXPSummary
 *       summary={summary}
 *       streak={streak}
 *       previousXP={previousXP}
 *       loading={loading}
 *     />
 *   );
 * }
 * ```
 */
export function LearningXPSummary({
  summary,
  streak,
  previousXP,
  loading = false,
  compact = false,
  className,
}: LearningXPSummaryProps) {
  if (loading || !summary) {
    return (
      <View
        className={cn(
          'rounded-xl border border-border bg-card p-4',
          compact ? 'p-3' : 'p-4',
          className
        )}>
        <View className="animate-pulse">
          <View className="mb-2 h-8 w-1/3 rounded bg-muted" />
          <View className="mb-4 h-12 w-1/2 rounded bg-muted" />
          <View className="mb-4 h-3 rounded-full bg-muted" />
          <View className="flex-row justify-around">
            <View className="h-12 w-16 rounded bg-muted" />
            <View className="h-12 w-16 rounded bg-muted" />
            <View className="h-12 w-16 rounded bg-muted" />
          </View>
        </View>
      </View>
    );
  }

  if (compact) {
    return (
      <View className={cn('rounded-xl border border-border bg-card p-3', className)}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Zap size={20} className="mr-2 text-primary" fill="currentColor" />
            <Text className="text-xl font-bold text-foreground">
              {summary.total_xp.toLocaleString()} XP
            </Text>
          </View>
          <LevelBadge level={summary.level} levelName={summary.level_name} />
        </View>

        {streak && streak.current_streak > 0 && (
          <View className="mt-2 flex-row items-center">
            <Flame size={16} className="mr-1 text-orange-500" />
            <Text className="text-sm text-muted-foreground">
              {streak.current_streak} day streak
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className={cn('rounded-xl border border-border bg-card p-4', className)}>
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 rounded-full bg-primary/10 p-2">
            <Zap size={24} className="text-primary" fill="currentColor" />
          </View>
          <View>
            <Text className="text-sm text-muted-foreground">Learning XP</Text>
            <AnimatedXPCounter value={summary.total_xp} previousValue={previousXP} />
          </View>
        </View>
        <LevelBadge level={summary.level} levelName={summary.level_name} />
      </View>

      {/* Progress to Next Level */}
      <View className="mb-4">
        <XPProgressBar
          current={summary.total_xp}
          toNext={summary.xp_to_next_level}
          progressPct={summary.progress_pct}
        />
      </View>

      {/* Stats Grid */}
      <View className="flex-row justify-around border-t border-border pt-3">
        <StatItem icon={Target} label="Lessons" value={0} iconColor="text-blue-500" />
        <StatItem icon={Award} label="Courses" value={0} iconColor="text-green-500" />
        {streak && (
          <StatItem
            icon={Flame}
            label="Streak"
            value={`${streak.current_streak}d`}
            iconColor={streak.grace_period_available ? 'text-muted-foreground' : 'text-orange-500'}
          />
        )}
        <StatItem
          icon={TrendingUp}
          label="Best"
          value={`${streak?.longest_streak || 0}d`}
          iconColor="text-purple-500"
        />
      </View>

      {/* Streak Status */}
      {streak && (
        <View className="mt-4 border-t border-border pt-3">
          <View className="flex-row items-center justify-center">
            {!streak.grace_period_available ? (
              <>
                <Flame size={16} className="mr-2 text-orange-500" fill="currentColor" />
                <Text className="text-sm text-muted-foreground">Streak active! Keep it going!</Text>
              </>
            ) : (
              <>
                <Flame size={16} className="mr-2 text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">
                  Complete a lesson to maintain your streak
                </Text>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default LearningXPSummary;
