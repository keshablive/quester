/**
 * Gamification Header Component
 *
 * Displays user's XP, level, and progress bar in the navigation header.
 * Features:
 * - Current level display
 * - XP progress bar with percentage
 * - Navigation to gamification dashboard
 * - Real-time XP updates via WebSocket
 * - Badge indicators
 * - Rank display for top 100
 * - Compact mode support
 *
 * @module components/gamification/gamification-header
 */

import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useGamification } from '@/lib/contexts/gamification-context';

interface GamificationHeaderProps {
  /** Whether to show compact version */
  compact?: boolean;
  /** Hide when there's no recent activity */
  hideWhenInactive?: boolean;
  /** Callback when header is pressed */
  onPress?: () => void;
}

export const GamificationHeader = React.memo(function GamificationHeader({
  compact = false,
  hideWhenInactive = false,
  onPress,
}: GamificationHeaderProps) {
  const router = useRouter();
  const { metrics } = useGamification();

  const currentLevel = metrics?.level || 1;
  const currentXP = metrics?.currentXP || 0;
  const xpForNextLevel = metrics?.xpToNextLevel || 100;
  const badges = metrics?.badges || [];
  const rank = metrics?.leaderboardRank;

  const scale = useSharedValue(1);
  const [hasRecentActivity, setHasRecentActivity] = useState(true);

  const progressPercentage = xpForNextLevel > 0 ? (currentXP / xpForNextLevel) * 100 : 0;

  // Pulse animation when XP changes
  useEffect(() => {
    setHasRecentActivity(true);

    scale.value = withSequence(
      withTiming(1.05, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
  }, [currentXP]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/profile/gamification');
    }
  };

  // Hide if inactive and no recent activity
  if (hideWhenInactive && !hasRecentActivity) {
    return null;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const hasNewBadges = badges?.some((badge: any) => !badge.seen);
  const isTopRanked = rank && rank <= 100;

  return (
    <Pressable
      className={`rounded-xl bg-indigo-600/10 px-4 py-2 ${compact ? 'min-h-[48px] py-1.5' : 'min-h-[64px]'}`}
      onPress={handlePress}
      testID="gamification-header-container"
      accessibilityRole="button"
      accessibilityLabel={`Level ${currentLevel}. ${currentXP.toLocaleString()} out of ${xpForNextLevel.toLocaleString()} experience points. ${progressPercentage.toFixed(0)} percent progress.`}
      accessibilityHint="View your gamification dashboard">
      <Animated.View className="flex-1" style={animatedStyle}>
        {/* Level Display */}
        <View className="mb-1 flex-row items-center gap-2">
          <Text variant="p" className="font-bold text-indigo-600" testID="level-text">
            Level {currentLevel}
          </Text>
          {hasNewBadges && (
            <View
              className="h-5 w-5 items-center justify-center rounded-full bg-red-500"
              testID="new-badge-indicator">
              <Text variant="small" className="font-bold text-white">
                !
              </Text>
            </View>
          )}
          {isTopRanked && (
            <View className="rounded-lg bg-amber-500 px-2 py-0.5" testID="rank-badge">
              <Text variant="small" className="font-semibold text-white">
                #{rank}
              </Text>
            </View>
          )}
        </View>

        {/* XP Progress Bar */}
        {!compact && (
          <View className="gap-1">
            <View className="h-2 overflow-hidden rounded bg-indigo-600/20">
              <View
                className="h-full rounded bg-indigo-600"
                style={{ width: `${progressPercentage}%` }}
                testID="xp-progress-bar-fill"
              />
            </View>
            <Text variant="small" className="text-gray-500" testID="xp-text">
              {currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
            </Text>
          </View>
        )}

        {/* Compact Mode - Just XP */}
        {compact && (
          <Text variant="small" className="font-semibold text-indigo-600" testID="xp-text">
            {currentXP.toLocaleString()} XP
          </Text>
        )}
      </Animated.View>

      {/* Hidden for accessibility - progress percentage */}
      <View
        className="absolute h-0 w-0 opacity-0"
        testID="xp-progress-bar"
        accessibilityLabel={`${progressPercentage.toFixed(0)} percent progress to next level`}
        accessible={false}
        // @ts-ignore
        value={progressPercentage}
      />
    </Pressable>
  );
});
