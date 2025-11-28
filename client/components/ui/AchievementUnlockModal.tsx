import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform, Dimensions } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/core';

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
}

interface AchievementUnlockModalProps {
  /** The achievement that was unlocked */
  achievement: UnlockedAchievement | null;
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Achievement Unlock Modal with celebration animations
 * US3: Display celebratory modal when achievements are unlocked
 */
export function AchievementUnlockModal({
  achievement,
  isOpen,
  onClose,
  className,
}: AchievementUnlockModalProps) {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(0)).current;
  const xpPopAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen && achievement) {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      glowAnim.setValue(0);
      starAnim.setValue(0);
      xpPopAnim.setValue(0);

      // Badge entrance animation
      Animated.sequence([
        // Initial pop-in with slight rotation
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Settle to normal size
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Star burst animation
      Animated.timing(starAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // XP pop animation
      Animated.sequence([
        Animated.delay(400),
        Animated.spring(xpPopAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, achievement, scaleAnim, rotateAnim, glowAnim, starAnim, xpPopAnim]);

  if (!achievement) {
    return null;
  }

  const difficultyColors = {
    easy: 'bg-green-500',
    medium: 'bg-blue-500',
    hard: 'bg-purple-500',
    legendary: 'bg-yellow-500',
  };

  const difficultyGlow = {
    easy: '#22c55e',
    medium: '#3b82f6',
    hard: '#a855f7',
    legendary: '#eab308',
  };

  const difficultyLabels = {
    easy: 'Common',
    medium: 'Rare',
    hard: 'Epic',
    legendary: 'Legendary',
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn('sm:max-w-[400px]', className)}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">🏆 Achievement Unlocked!</DialogTitle>
        </DialogHeader>

        <View className="items-center py-6">
          {/* Star burst background */}
          <Animated.View
            className="absolute"
            style={{
              opacity: starAnim,
              transform: [
                {
                  scale: starAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.5],
                  }),
                },
              ],
            }}>
            <Text className="text-6xl opacity-30">✨</Text>
          </Animated.View>

          {/* Achievement Badge */}
          <Animated.View
            className={cn(
              'h-24 w-24 items-center justify-center rounded-full',
              difficultyColors[achievement.difficulty]
            )}
            style={[
              {
                transform: [{ scale: scaleAnim }, { rotate: spin }],
                shadowColor: difficultyGlow[achievement.difficulty],
                shadowOpacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
                shadowRadius: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 20],
                }),
                shadowOffset: { width: 0, height: 0 },
              },
              Platform.select({
                web: {
                  boxShadow: `0 0 20px ${difficultyGlow[achievement.difficulty]}`,
                },
                default: {},
              }),
            ]}>
            {achievement.iconUrl ? (
              <Animated.Image
                source={{ uri: achievement.iconUrl }}
                className="h-16 w-16"
                resizeMode="contain"
              />
            ) : (
              <Text className="text-4xl">🎖️</Text>
            )}
          </Animated.View>

          {/* Difficulty Badge */}
          <View
            className={cn('mt-3 rounded-full px-3 py-1', difficultyColors[achievement.difficulty])}>
            <Text className="text-xs font-bold text-white">
              {difficultyLabels[achievement.difficulty]}
            </Text>
          </View>

          {/* Achievement Name */}
          <Text className="mt-4 text-center text-xl font-bold text-foreground">
            {achievement.name}
          </Text>

          {/* Achievement Description */}
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            {achievement.description}
          </Text>

          {/* XP Reward */}
          <Animated.View
            className="mt-4 flex-row items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 dark:bg-yellow-900/30"
            style={{
              transform: [{ scale: xpPopAnim }],
              opacity: xpPopAnim,
            }}>
            <Text className="text-2xl">⭐</Text>
            <Text className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              +{achievement.xpReward} XP
            </Text>
          </Animated.View>
        </View>

        <DialogFooter>
          <Button onPress={onClose} className="w-full">
            <Text className="font-semibold text-primary-foreground">Awesome!</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AchievementUnlockModal;
