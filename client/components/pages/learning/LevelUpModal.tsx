/**
 * Level Up Modal Component
 *
 * Displays a celebration modal when user reaches a new level.
 * 006-course-gamification T047
 */
import React, { useEffect, useRef } from 'react';
import { View, Modal, Pressable, Animated, Easing } from 'react-native';
import { Text } from '@/components/ui';
import { Star, Sparkles, Trophy, X } from 'lucide-react-native';
import { cn } from '@/core';

/**
 * Props for LevelUpModal component
 */
interface LevelUpModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** New level number */
  level: number;
  /** New level name/title */
  levelName: string;
  /** Total XP */
  totalXP?: number;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Auto-close delay in ms (0 = no auto-close) */
  autoCloseDelay?: number;
}

/**
 * Animated star burst effect
 */
function StarBurst() {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnim, scaleAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ rotate }, { scale: scaleAnim }],
      }}
      className="absolute">
      <View className="h-64 w-64 items-center justify-center">
        {/* Outer rays */}
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            className="absolute h-32 w-1 rounded-full bg-primary/20"
            style={{
              transform: [{ rotate: `${i * 30}deg` }],
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

/**
 * Animated level badge
 */
function LevelBadge({ level, levelName }: { level: number; levelName: string }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scale in with bounce
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 300,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 5,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim, bounceAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { translateY: bounceAnim }],
      }}
      className="items-center">
      <View className="mb-2 h-24 w-24 items-center justify-center rounded-full bg-primary shadow-lg">
        <Text className="text-4xl font-bold text-primary-foreground">{level}</Text>
      </View>
      <View className="rounded-full bg-primary/20 px-4 py-1">
        <Text className="text-lg font-bold text-primary">{levelName}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * Confetti particle
 */
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const startX = Math.random() * 200 - 100;
    const endX = startX + (Math.random() * 100 - 50);

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 300,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: endX,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: Math.random() * 4 - 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    translateX.setValue(startX);
  }, [delay, translateY, translateX, rotate, opacity]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-2, 2],
    outputRange: ['-720deg', '720deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateY }, { translateX }, { rotate: rotateInterpolate }],
        opacity,
      }}>
      <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
    </Animated.View>
  );
}

/**
 * Confetti burst effect
 */
function ConfettiBurst() {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
  ];

  return (
    <View className="pointer-events-none absolute inset-0 items-center overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <ConfettiParticle key={i} delay={i * 50} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

/**
 * Level Up Modal Component
 *
 * @example
 * ```tsx
 * function LearningPage() {
 *   const [showLevelUp, setShowLevelUp] = useState(false);
 *   const [newLevel, setNewLevel] = useState({ level: 5, name: 'Scholar' });
 *
 *   return (
 *     <>
 *       <LevelUpModal
 *         visible={showLevelUp}
 *         level={newLevel.level}
 *         levelName={newLevel.name}
 *         onClose={() => setShowLevelUp(false)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function LevelUpModal({
  visible,
  level,
  levelName,
  totalXP,
  onClose,
  autoCloseDelay = 5000,
}: LevelUpModalProps) {
  // Auto-close timer
  useEffect(() => {
    if (visible && autoCloseDelay > 0) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [visible, autoCloseDelay, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70">
        {/* Confetti */}
        <ConfettiBurst />

        {/* Modal Content */}
        <View className="relative mx-6 items-center overflow-hidden rounded-2xl bg-card p-6">
          {/* Close button */}
          <Pressable className="absolute right-3 top-3 z-10 p-2" onPress={onClose}>
            <X size={20} className="text-muted-foreground" />
          </Pressable>

          {/* Background effect */}
          <View className="absolute inset-0 items-center justify-center opacity-50">
            <StarBurst />
          </View>

          {/* Content */}
          <View className="relative z-10 items-center py-4">
            {/* Header */}
            <View className="mb-4 flex-row items-center">
              <Sparkles size={24} className="text-yellow-500" fill="currentColor" />
              <Text className="mx-2 text-2xl font-bold text-foreground">LEVEL UP!</Text>
              <Sparkles size={24} className="text-yellow-500" fill="currentColor" />
            </View>

            {/* Level Badge */}
            <View className="my-6">
              <LevelBadge level={level} levelName={levelName} />
            </View>

            {/* Congratulations */}
            <Text className="mb-4 text-center text-muted-foreground">
              Congratulations! You've reached a new milestone in your learning journey!
            </Text>

            {/* XP Display */}
            {totalXP !== undefined && (
              <View className="mb-4 flex-row items-center rounded-full bg-primary/10 px-4 py-2">
                <Trophy size={16} className="mr-2 text-primary" />
                <Text className="text-sm font-semibold text-primary">
                  Total XP: {totalXP.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Continue Button */}
            <Pressable className="mt-2 rounded-lg bg-primary px-8 py-3" onPress={onClose}>
              <Text className="text-base font-semibold text-primary-foreground">
                Continue Learning
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default LevelUpModal;
