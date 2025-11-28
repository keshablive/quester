/**
 * Daily Challenge Card Component
 *
 * Displays a single daily learning challenge with progress bar,
 * difficulty indicator, and XP reward.
 * 006-course-gamification T097
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { Target, CheckCircle, Clock, Zap, BookOpen, Award, Star, Flame } from 'lucide-react-native';
import { cn } from '@/core';
import type { DailyLearningChallenge, ChallengeDifficulty, ChallengeType } from '@/core/types';

/**
 * Props for DailyChallengeCard
 */
interface DailyChallengeCardProps {
  /** The challenge data */
  challenge: DailyLearningChallenge;
  /** Whether the card is compact */
  compact?: boolean;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Get difficulty styling
 */
function getDifficultyStyle(difficulty: ChallengeDifficulty): {
  color: string;
  bgColor: string;
  label: string;
} {
  switch (difficulty) {
    case 'easy':
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: 'Easy',
      };
    case 'medium':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        label: 'Medium',
      };
    case 'hard':
      return {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: 'Hard',
      };
    default:
      return {
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        label: 'Normal',
      };
  }
}

/**
 * Get challenge type icon
 */
function getChallengeTypeIcon(type: ChallengeType): typeof Target {
  switch (type) {
    case 'lesson_count':
      return BookOpen;
    case 'xp_earned':
      return Zap;
    case 'quiz_score':
      return Award;
    case 'streak_maintain':
      return Flame;
    case 'time_spent':
      return Star;
    default:
      return Target;
  }
}

/**
 * Progress bar component
 */
function ProgressBar({ progress, completed }: { progress: number; completed: boolean }) {
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <View
        className={cn(
          'h-full rounded-full transition-all',
          completed ? 'bg-green-500' : 'bg-gradient-to-r from-primary/70 to-primary'
        )}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </View>
  );
}

/**
 * Daily Challenge Card
 *
 * Displays a challenge with visual progress, difficulty badge,
 * and XP reward indicator.
 *
 * @example
 * ```tsx
 * <DailyChallengeCard
 *   challenge={challenge}
 *   onPress={() => navigateToChallenge(challenge.id)}
 * />
 * ```
 */
export function DailyChallengeCard({
  challenge,
  compact = false,
  onPress,
  className,
}: DailyChallengeCardProps) {
  const isCompleted = challenge.status === 'completed';
  const isExpired = challenge.status === 'expired';
  const difficultyStyle = getDifficultyStyle(challenge.difficulty);
  const ChallengeIcon = getChallengeTypeIcon(challenge.challenge_type);

  // Calculate remaining time
  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(challenge.expires_at);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        disabled={isExpired}
        className={cn(
          'flex-row items-center gap-3 rounded-xl border p-3',
          isCompleted
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
            : isExpired
              ? 'border-border bg-muted opacity-50'
              : 'border-border bg-card',
          className
        )}>
        {/* Icon */}
        <View
          className={cn(
            'h-10 w-10 items-center justify-center rounded-full',
            isCompleted ? 'bg-green-100 dark:bg-green-900/50' : 'bg-primary/10'
          )}>
          {isCompleted ? (
            <CheckCircle size={20} color="#22c55e" />
          ) : (
            <ChallengeIcon size={20} className="text-primary" />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text
            className={cn(
              'font-medium',
              isCompleted ? 'text-green-700 dark:text-green-400' : 'text-foreground'
            )}
            numberOfLines={1}>
            {challenge.name}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-xs text-muted-foreground">
              {challenge.current_progress}/{challenge.target_value}
            </Text>
            <View className="h-1 w-1 rounded-full bg-muted-foreground" />
            <Text className="text-xs text-amber-600 dark:text-amber-400">
              +{challenge.xp_reward} XP
            </Text>
          </View>
        </View>

        {/* Progress indicator */}
        {!isCompleted && !isExpired && (
          <View className="h-12 w-12 items-center justify-center">
            <Text className="text-lg font-bold text-primary">
              {Math.round(challenge.progress_pct)}%
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isExpired}
      className={cn(
        'rounded-xl border p-4',
        isCompleted
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
          : isExpired
            ? 'border-border bg-muted opacity-50'
            : 'border-border bg-card',
        className
      )}>
      {/* Header */}
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          {/* Icon */}
          <View
            className={cn(
              'h-12 w-12 items-center justify-center rounded-xl',
              isCompleted ? 'bg-green-100 dark:bg-green-900/50' : 'bg-primary/10'
            )}>
            {isCompleted ? (
              <CheckCircle size={24} color="#22c55e" />
            ) : (
              <ChallengeIcon size={24} className="text-primary" />
            )}
          </View>

          {/* Title and difficulty */}
          <View className="flex-1">
            <Text
              className={cn(
                'text-base font-semibold',
                isCompleted ? 'text-green-700 dark:text-green-400' : 'text-foreground'
              )}
              numberOfLines={2}>
              {challenge.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className={cn('rounded-full px-2 py-0.5', difficultyStyle.bgColor)}>
                <Text className={cn('text-xs font-medium', difficultyStyle.color)}>
                  {difficultyStyle.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* XP reward */}
        <View className="items-end">
          <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900/30">
            <Zap size={12} color="#f59e0b" />
            <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
              +{challenge.xp_reward} XP
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <Text className="mb-3 text-sm text-muted-foreground" numberOfLines={2}>
        {challenge.description}
      </Text>

      {/* Progress section */}
      <View className="mb-2">
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-xs text-muted-foreground">
            Progress: {challenge.current_progress} / {challenge.target_value}
          </Text>
          <Text
            className={cn(
              'text-xs font-medium',
              isCompleted ? 'text-green-600 dark:text-green-400' : 'text-primary'
            )}>
            {Math.round(challenge.progress_pct)}%
          </Text>
        </View>
        <ProgressBar progress={challenge.progress_pct} completed={isCompleted} />
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between border-t border-border/50 pt-2">
        {/* Time remaining */}
        <View className="flex-row items-center gap-1">
          <Clock size={14} className="text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">
            {isCompleted ? 'Completed!' : isExpired ? 'Expired' : getTimeRemaining()}
          </Text>
        </View>

        {/* Status badge */}
        {isCompleted && (
          <View className="flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-1 dark:bg-green-900/50">
            <CheckCircle size={12} color="#22c55e" />
            <Text className="text-xs font-medium text-green-600 dark:text-green-400">Complete</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default DailyChallengeCard;
