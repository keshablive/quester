/**
 * Streak Milestone Modal Component
 *
 * Celebratory modal displayed when a user achieves a streak milestone.
 * 006-course-gamification T078
 */
import React, { useEffect, useRef } from 'react';
import { View, Modal, Animated, Easing, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { Flame, Gift, Trophy, Star, Sparkles, X, ChevronRight } from 'lucide-react-native';
import { cn } from '@/core';
import type { LearningStreakMilestone } from '@/core/types';

/**
 * Props for the StreakMilestoneModal component
 */
interface StreakMilestoneModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Milestone that was achieved */
  milestone: LearningStreakMilestone | null;
  /** Current streak count */
  currentStreak: number;
  /** XP reward amount */
  xpReward: number;
  /** Callback when modal is dismissed */
  onDismiss: () => void;
  /** Callback to navigate to streak details */
  onViewDetails?: () => void;
}

/**
 * Get milestone tier styling based on days
 */
function getMilestoneTier(days: number): {
  gradient: string;
  glowColor: string;
  iconColor: string;
  tier: string;
} {
  if (days >= 100) {
    return {
      gradient: 'from-amber-400 via-amber-500 to-amber-600',
      glowColor: '#fbbf24',
      iconColor: '#fbbf24',
      tier: 'Legendary',
    };
  } else if (days >= 60) {
    return {
      gradient: 'from-purple-400 via-purple-500 to-purple-600',
      glowColor: '#a855f7',
      iconColor: '#a855f7',
      tier: 'Epic',
    };
  } else if (days >= 30) {
    return {
      gradient: 'from-blue-400 via-blue-500 to-blue-600',
      glowColor: '#3b82f6',
      iconColor: '#3b82f6',
      tier: 'Rare',
    };
  } else if (days >= 14) {
    return {
      gradient: 'from-green-400 via-green-500 to-green-600',
      glowColor: '#22c55e',
      iconColor: '#22c55e',
      tier: 'Uncommon',
    };
  } else {
    return {
      gradient: 'from-orange-400 via-orange-500 to-orange-600',
      glowColor: '#f97316',
      iconColor: '#f97316',
      tier: 'Common',
    };
  }
}

/**
 * Animated confetti particle
 */
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue, delay]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 200],
  });

  const translateX = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, Math.random() * 40 - 20, Math.random() * 80 - 40],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${Math.random() * 360}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        backgroundColor: color,
        borderRadius: 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

/**
 * Animated pulse ring
 */
function PulseRing({ color, delay }: { color: string; delay: number }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scaleAnim, opacityAnim, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: color,
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}
    />
  );
}

/**
 * Main celebration animation
 */
function CelebrationAnimation({ glowColor }: { glowColor: string }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { rotate: spin }],
      }}>
      <View className="relative items-center justify-center">
        {/* Pulse rings */}
        <PulseRing color={glowColor} delay={0} />
        <PulseRing color={glowColor} delay={500} />
        <PulseRing color={glowColor} delay={1000} />

        {/* Main icon container */}
        <View
          className="h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br"
          style={{
            backgroundColor: glowColor,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}>
          <Flame size={48} color="#fff" />
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Streak Milestone Modal
 *
 * Displays a celebratory modal when the user achieves a streak milestone.
 * Features animated confetti, pulse rings, and XP reward display.
 *
 * @example
 * ```tsx
 * <StreakMilestoneModal
 *   visible={showMilestone}
 *   milestone={{ days: 7, xp_reward: 50, name: '1 Week Warrior' }}
 *   currentStreak={7}
 *   xpReward={50}
 *   onDismiss={() => setShowMilestone(false)}
 *   onViewDetails={() => navigation.navigate('Streak')}
 * />
 * ```
 */
export function StreakMilestoneModal({
  visible,
  milestone,
  currentStreak,
  xpReward,
  onDismiss,
  onViewDetails,
}: StreakMilestoneModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!milestone) return null;

  const { glowColor, iconColor, tier } = getMilestoneTier(milestone.days);
  const confettiColors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#fbbf24'];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable className="flex-1 items-center justify-center bg-black/60" onPress={onDismiss}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
          className="w-[320px] overflow-hidden rounded-2xl bg-card">
          {/* Close button */}
          <Pressable
            onPress={onDismiss}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/20 p-2">
            <X size={20} color="#fff" />
          </Pressable>

          {/* Confetti container */}
          <View className="pointer-events-none absolute inset-0 overflow-hidden">
            {confettiColors.flatMap((color, i) =>
              Array.from({ length: 3 }).map((_, j) => (
                <View
                  key={`${i}-${j}`}
                  style={{ position: 'absolute', left: `${(i * 6 + j * 2 + 5) * 3}%` }}>
                  <ConfettiParticle delay={j * 200 + i * 100} color={color} />
                </View>
              ))
            )}
          </View>

          {/* Header with gradient background */}
          <View
            className="items-center px-6 pb-6 pt-10"
            style={{ backgroundColor: `${glowColor}20` }}>
            {/* Celebration animation */}
            <CelebrationAnimation glowColor={glowColor} />

            {/* Tier badge */}
            <View
              className="mt-4 rounded-full px-4 py-1"
              style={{ backgroundColor: `${glowColor}30` }}>
              <Text
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: glowColor }}>
                {tier} Milestone
              </Text>
            </View>
          </View>

          {/* Content */}
          <View className="px-6 py-4">
            {/* Milestone name */}
            <Text className="mb-1 text-center text-xl font-bold text-foreground">
              {milestone.name || `${milestone.days} Day Streak!`}
            </Text>

            {/* Streak count */}
            <View className="mb-4 flex-row items-center justify-center gap-1">
              <Sparkles size={16} color={iconColor} />
              <Text className="text-muted-foreground">
                {currentStreak} days of consistent learning
              </Text>
            </View>

            {/* XP Reward card */}
            <View className="mb-4 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 p-4 dark:from-amber-900/30 dark:to-orange-900/30">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="rounded-full bg-amber-200 p-2 dark:bg-amber-800/50">
                    <Gift size={20} color="#f59e0b" />
                  </View>
                  <Text className="font-medium text-foreground">Bonus XP Earned</Text>
                </View>
                <Text className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  +{xpReward}
                </Text>
              </View>
            </View>

            {/* Next milestone preview */}
            {milestone.days < 100 && (
              <View className="mb-4 flex-row items-center justify-center gap-1">
                <Trophy size={14} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">
                  Keep going for even bigger rewards!
                </Text>
              </View>
            )}

            {/* Actions */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={onDismiss}
                className="flex-1 items-center rounded-xl bg-muted py-3">
                <Text className="font-medium text-muted-foreground">Continue</Text>
              </Pressable>

              {onViewDetails && (
                <Pressable
                  onPress={() => {
                    onDismiss();
                    onViewDetails();
                  }}
                  className="flex-1 flex-row items-center justify-center gap-1 rounded-xl py-3"
                  style={{ backgroundColor: glowColor }}>
                  <Text className="font-medium text-white">View Streak</Text>
                  <ChevronRight size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default StreakMilestoneModal;
