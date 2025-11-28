/**
 * Learning Achievements Grid Component
 *
 * Displays a grid of learning achievements with progress indicators.
 * Shows unlocked achievements with dates and locked ones with progress bars.
 * 006-course-gamification T057
 */
import React from 'react';
import { View, ScrollView, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { Award, Lock, Check, Star, Trophy, Zap } from 'lucide-react-native';
import { cn, formatTimeAgo } from '@/core';
import type { LearningAchievement } from '@/core/types';

/**
 * Rarity configuration for styling
 */
const RARITY_CONFIG = {
  COMMON: {
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-600',
    textColor: 'text-slate-700 dark:text-slate-300',
    badgeColor: 'bg-slate-200 dark:bg-slate-700',
    glowClass: '',
  },
  UNCOMMON: {
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-300 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-400',
    badgeColor: 'bg-green-200 dark:bg-green-800',
    glowClass: '',
  },
  RARE: {
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-400',
    badgeColor: 'bg-blue-200 dark:bg-blue-800',
    glowClass: '',
  },
  EPIC: {
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-400',
    badgeColor: 'bg-purple-200 dark:bg-purple-800',
    glowClass: 'shadow-lg shadow-purple-500/20',
  },
  LEGENDARY: {
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-400 dark:border-amber-600',
    textColor: 'text-amber-700 dark:text-amber-400',
    badgeColor: 'bg-amber-200 dark:bg-amber-700',
    glowClass: 'shadow-xl shadow-amber-500/30',
  },
} as const;

/**
 * Props for the LearningAchievementsGrid component
 */
interface LearningAchievementsGridProps {
  /** All achievements to display */
  achievements: LearningAchievement[];
  /** Whether data is loading */
  loading?: boolean;
  /** Callback when an achievement is tapped */
  onAchievementPress?: (achievement: LearningAchievement) => void;
  /** Show only unlocked achievements */
  showOnlyUnlocked?: boolean;
  /** Show only locked achievements */
  showOnlyLocked?: boolean;
  /** Compact mode (smaller cards) */
  compact?: boolean;
  /** Maximum achievements to show */
  maxItems?: number;
  /** Additional class names */
  className?: string;
  /** Title to display above the grid */
  title?: string;
  /** Subtitle to display below the title */
  subtitle?: string;
}

/**
 * Single achievement card component
 */
function AchievementCard({
  achievement,
  compact = false,
  onPress,
}: {
  achievement: LearningAchievement;
  compact?: boolean;
  onPress?: () => void;
}) {
  const config = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.COMMON;
  const isUnlocked = achievement.is_unlocked;
  const progressPct = achievement.progress_pct || 0;

  // Get appropriate icon
  const IconComponent = isUnlocked ? Trophy : Lock;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'overflow-hidden rounded-xl border-2',
        config.bgColor,
        config.borderColor,
        config.glowClass,
        isUnlocked ? 'opacity-100' : 'opacity-70',
        compact ? 'p-3' : 'p-4'
      )}
      accessibilityLabel={`${achievement.name} achievement${isUnlocked ? ', unlocked' : ', locked'}`}
      accessibilityHint={
        isUnlocked
          ? `Unlocked ${achievement.unlocked_at ? formatTimeAgo(achievement.unlocked_at) : ''}`
          : `${progressPct}% progress`
      }>
      {/* Header with icon and rarity badge */}
      <View className="mb-2 flex-row items-start justify-between">
        {/* Achievement icon */}
        <View
          className={cn(
            'items-center justify-center rounded-full',
            isUnlocked ? config.badgeColor : 'bg-gray-200 dark:bg-gray-700',
            compact ? 'h-10 w-10' : 'h-12 w-12'
          )}>
          {achievement.icon_url ? (
            <Image
              source={{ uri: achievement.icon_url }}
              className={cn(
                'rounded-full',
                compact ? 'h-8 w-8' : 'h-10 w-10',
                !isUnlocked && 'opacity-50'
              )}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <IconComponent
              size={compact ? 20 : 24}
              className={cn(isUnlocked ? config.textColor : 'text-gray-400 dark:text-gray-500')}
            />
          )}
        </View>

        {/* Rarity badge */}
        <View className={cn('rounded-full px-2 py-0.5', config.badgeColor)}>
          <Text className={cn('text-xs font-semibold capitalize', config.textColor)}>
            {achievement.rarity.toLowerCase()}
          </Text>
        </View>
      </View>

      {/* Achievement name */}
      <Text
        className={cn(
          'mb-1 font-bold',
          compact ? 'text-sm' : 'text-base',
          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
        )}
        numberOfLines={compact ? 1 : 2}>
        {achievement.name}
      </Text>

      {/* Description */}
      {!compact && (
        <Text className="mb-2 text-xs text-muted-foreground" numberOfLines={2}>
          {achievement.description}
        </Text>
      )}

      {/* Progress or unlock date */}
      {isUnlocked ? (
        <View className="mt-auto flex-row items-center">
          <Check size={14} className="mr-1 text-green-500" />
          <Text className="text-xs font-medium text-green-600 dark:text-green-400">
            Unlocked {achievement.unlocked_at ? formatTimeAgo(achievement.unlocked_at) : ''}
          </Text>
        </View>
      ) : (
        <View className="mt-auto">
          {/* Progress bar */}
          <View className="mb-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <View
              className={cn('h-full rounded-full', config.badgeColor)}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </View>
          <Text className="text-xs text-muted-foreground">{progressPct}% progress</Text>
        </View>
      )}

      {/* XP reward indicator */}
      <View className="mt-2 flex-row items-center">
        <Zap size={12} className="mr-1 text-amber-500" />
        <Text className="text-xs font-medium text-amber-600 dark:text-amber-400">
          +{achievement.xp_reward} XP
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Loading skeleton for achievement cards
 */
function AchievementSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <View
      className={cn(
        'rounded-xl border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800',
        compact ? 'p-3' : 'p-4'
      )}>
      <View className="mb-2 flex-row items-start justify-between">
        <View
          className={cn(
            'rounded-full bg-gray-200 dark:bg-gray-700',
            compact ? 'h-10 w-10' : 'h-12 w-12'
          )}
        />
        <View className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </View>
      <View className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      {!compact && <View className="mb-1 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />}
      {!compact && <View className="mb-2 h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />}
      <View className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
    </View>
  );
}

/**
 * Empty state component
 */
function EmptyState({ message = 'No achievements yet' }: { message?: string }) {
  return (
    <View className="items-center justify-center py-8">
      <Award size={48} className="mb-3 text-muted-foreground opacity-50" />
      <Text className="text-center text-muted-foreground">{message}</Text>
    </View>
  );
}

/**
 * Learning Achievements Grid
 *
 * Displays achievements in a responsive grid layout with progress tracking.
 *
 * @example
 * ```tsx
 * <LearningAchievementsGrid
 *   achievements={achievements}
 *   onAchievementPress={(a) => console.log('Tapped:', a.name)}
 *   title="Your Achievements"
 * />
 * ```
 */
export function LearningAchievementsGrid({
  achievements,
  loading = false,
  onAchievementPress,
  showOnlyUnlocked = false,
  showOnlyLocked = false,
  compact = false,
  maxItems,
  className,
  title,
  subtitle,
}: LearningAchievementsGridProps) {
  // Filter achievements based on props
  let filteredAchievements = achievements;

  if (showOnlyUnlocked) {
    filteredAchievements = achievements.filter((a) => a.is_unlocked);
  } else if (showOnlyLocked) {
    filteredAchievements = achievements.filter((a) => !a.is_unlocked);
  }

  // Sort: unlocked first, then by rarity
  const rarityOrder = { LEGENDARY: 0, EPIC: 1, RARE: 2, UNCOMMON: 3, COMMON: 4 };
  filteredAchievements = [...filteredAchievements].sort((a, b) => {
    // Unlocked achievements first
    if (a.is_unlocked !== b.is_unlocked) {
      return a.is_unlocked ? -1 : 1;
    }
    // Then by rarity
    return (rarityOrder[a.rarity] || 5) - (rarityOrder[b.rarity] || 5);
  });

  // Limit items if maxItems is set
  if (maxItems && maxItems > 0) {
    filteredAchievements = filteredAchievements.slice(0, maxItems);
  }

  // Stats
  const unlockedCount = achievements.filter((a) => a.is_unlocked).length;
  const totalCount = achievements.length;

  return (
    <View className={cn('', className)}>
      {/* Header */}
      {(title || subtitle) && (
        <View className="mb-4">
          {title && (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Trophy size={20} className="mr-2 text-amber-500" />
                <Text className="text-lg font-bold">{title}</Text>
              </View>
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-xs font-semibold text-primary">
                  {unlockedCount}/{totalCount}
                </Text>
              </View>
            </View>
          )}
          {subtitle && <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>}
        </View>
      )}

      {/* Loading state */}
      {loading && (
        <View className="-m-1.5 flex-row flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className={cn('p-1.5', compact ? 'w-1/2' : 'w-full sm:w-1/2')}>
              <AchievementSkeleton compact={compact} />
            </View>
          ))}
        </View>
      )}

      {/* Empty state */}
      {!loading && filteredAchievements.length === 0 && (
        <EmptyState
          message={
            showOnlyUnlocked
              ? 'No achievements unlocked yet. Keep learning!'
              : showOnlyLocked
                ? 'All achievements unlocked! 🎉'
                : 'No achievements available'
          }
        />
      )}

      {/* Achievements grid */}
      {!loading && filteredAchievements.length > 0 && (
        <View className="-m-1.5 flex-row flex-wrap">
          {filteredAchievements.map((achievement) => (
            <View
              key={achievement.id}
              className={cn('p-1.5', compact ? 'w-1/2' : 'w-full sm:w-1/2')}>
              <AchievementCard
                achievement={achievement}
                compact={compact}
                onPress={() => onAchievementPress?.(achievement)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default LearningAchievementsGrid;
