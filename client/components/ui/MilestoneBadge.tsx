import React from 'react';
import { View, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/core';

/**
 * Milestone types matching backend
 */
export type MilestoneType = 'trending' | 'viral' | 'legendary';

interface MilestoneBadgeProps {
  /** Type of milestone achieved */
  type: MilestoneType;
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show only the icon */
  iconOnly?: boolean;
  /** Additional class names */
  className?: string;
}

const milestoneConfig: Record<
  MilestoneType,
  { icon: string; label: string; bgColor: string; textColor: string; threshold: number }
> = {
  trending: {
    icon: '🔥',
    label: 'Trending',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    threshold: 10,
  },
  viral: {
    icon: '⚡',
    label: 'Viral',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    threshold: 50,
  },
  legendary: {
    icon: '👑',
    label: 'Legendary',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    threshold: 100,
  },
};

/**
 * Get the highest milestone type based on like count
 */
export function getMilestoneType(likeCount: number): MilestoneType | null {
  if (likeCount >= 100) return 'legendary';
  if (likeCount >= 50) return 'viral';
  if (likeCount >= 10) return 'trending';
  return null;
}

/**
 * MilestoneBadge - Shows milestone status for content
 * T070: Visual indicator for content that has reached engagement milestones
 */
export function MilestoneBadge({
  type,
  size = 'sm',
  iconOnly = false,
  className,
}: MilestoneBadgeProps) {
  const config = milestoneConfig[type];

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (iconOnly) {
    return (
      <View
        className={cn(
          'items-center justify-center rounded-full',
          config.bgColor,
          size === 'sm' && 'h-5 w-5',
          size === 'md' && 'h-6 w-6',
          size === 'lg' && 'h-8 w-8',
          className
        )}>
        <Text className={iconSizes[size]}>{config.icon}</Text>
      </View>
    );
  }

  return (
    <View
      className={cn(
        'flex-row items-center gap-1 rounded-full',
        config.bgColor,
        sizeClasses[size],
        Platform.select({
          web: 'transition-transform hover:scale-105',
        }),
        className
      )}>
      <Text className={iconSizes[size]}>{config.icon}</Text>
      <Text className={cn('font-medium', config.textColor, iconSizes[size])}>{config.label}</Text>
    </View>
  );
}

/**
 * Auto-selecting milestone badge based on like count
 */
export function AutoMilestoneBadge({
  likeCount,
  ...props
}: Omit<MilestoneBadgeProps, 'type'> & { likeCount: number }) {
  const milestoneType = getMilestoneType(likeCount);

  if (!milestoneType) {
    return null;
  }

  return <MilestoneBadge type={milestoneType} {...props} />;
}

export default MilestoneBadge;
