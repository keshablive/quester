/**
 * Course Progress Card Component
 *
 * Displays course progress with XP earned, progress bar, and completion stats.
 * 006-course-gamification T046
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { BookOpen, Trophy, Zap, CheckCircle, Clock } from 'lucide-react-native';
import { cn } from '@/core';
import type { LearningCourseProgress } from '@/core/types';

/**
 * Props for CourseProgressCard component
 */
interface CourseProgressCardProps {
  /** Course progress data */
  progress: LearningCourseProgress;
  /** Called when card is pressed */
  onPress?: () => void;
  /** Compact display mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Progress bar component with gradient
 */
function ProgressBar({
  percentage,
  height = 8,
  showLabel = true,
}: {
  percentage: number;
  height?: number;
  showLabel?: boolean;
}) {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const isComplete = clampedPct >= 100;

  return (
    <View className="w-full">
      {showLabel && (
        <View className="mb-1 flex-row justify-between">
          <Text className="text-xs text-muted-foreground">Progress</Text>
          <Text
            className={cn('text-xs font-semibold', isComplete ? 'text-green-500' : 'text-primary')}>
            {clampedPct.toFixed(0)}%
          </Text>
        </View>
      )}
      <View className="overflow-hidden rounded-full bg-muted" style={{ height }}>
        <View
          className={cn('h-full rounded-full', isComplete ? 'bg-green-500' : 'bg-primary')}
          style={{ width: `${clampedPct}%` }}
        />
      </View>
    </View>
  );
}

/**
 * Stat badge component
 */
function StatBadge({
  icon: Icon,
  value,
  label,
  iconColor = 'text-muted-foreground',
}: {
  icon: typeof Zap;
  value: string | number;
  label: string;
  iconColor?: string;
}) {
  return (
    <View className="items-center">
      <View className="mb-1 flex-row items-center">
        <Icon size={14} className={iconColor} />
        <Text className="ml-1 text-sm font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
      </View>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

/**
 * Course Progress Card Component
 *
 * @example
 * ```tsx
 * function EnrolledCourses() {
 *   const { courseProgress } = useLearningProgress();
 *
 *   return (
 *     <CourseProgressCard
 *       progress={courseProgress}
 *       onPress={() => navigation.navigate('CourseDetail')}
 *     />
 *   );
 * }
 * ```
 */
export function CourseProgressCard({
  progress,
  onPress,
  compact = false,
  className,
}: CourseProgressCardProps) {
  const isComplete = progress.progress_pct >= 100;

  if (compact) {
    return (
      <Pressable
        className={cn(
          'flex-row items-center rounded-lg border border-border bg-card p-3',
          className
        )}
        onPress={onPress}>
        <View className="mr-3 rounded-lg bg-primary/10 p-2">
          {isComplete ? (
            <Trophy size={20} className="text-green-500" />
          ) : (
            <BookOpen size={20} className="text-primary" />
          )}
        </View>

        <View className="mr-3 flex-1">
          <Text className="line-clamp-1 text-sm font-semibold text-foreground">
            {progress.course_name}
          </Text>
          <ProgressBar percentage={progress.progress_pct} height={4} showLabel={false} />
        </View>

        <View className="items-end">
          <View className="flex-row items-center">
            <Zap size={12} className="text-primary" />
            <Text className="ml-1 text-xs font-semibold text-primary">{progress.xp_earned}</Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            {progress.lessons_completed}/{progress.total_lessons}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}
      onPress={onPress}>
      {/* Header with completion indicator */}
      <View className="p-4 pb-3">
        <View className="mb-2 flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="line-clamp-2 text-lg font-bold text-foreground">
              {progress.course_name}
            </Text>
          </View>

          {isComplete && (
            <View className="rounded-full bg-green-500/10 p-2">
              <CheckCircle size={20} className="text-green-500" fill="currentColor" />
            </View>
          )}
        </View>

        {/* Progress Bar */}
        <ProgressBar percentage={progress.progress_pct} />
      </View>

      {/* Stats Footer */}
      <View className="flex-row justify-around border-t border-border bg-muted/30 px-4 py-3">
        <StatBadge
          icon={BookOpen}
          value={`${progress.lessons_completed}/${progress.total_lessons}`}
          label="Lessons"
          iconColor="text-blue-500"
        />
        <StatBadge
          icon={Zap}
          value={progress.xp_earned}
          label="XP Earned"
          iconColor="text-primary"
        />
        {progress.total_xp_available && progress.total_xp_available > progress.xp_earned && (
          <StatBadge
            icon={Trophy}
            value={progress.total_xp_available}
            label="Total XP"
            iconColor="text-yellow-500"
          />
        )}
      </View>

      {/* Completion Badge */}
      {isComplete && progress.completed_at && (
        <View className="border-t border-green-500/20 bg-green-500/10 px-4 py-2">
          <View className="flex-row items-center justify-center">
            <Trophy size={14} className="mr-2 text-green-500" />
            <Text className="text-sm font-semibold text-green-500">
              Completed {new Date(progress.completed_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default CourseProgressCard;
