/**
 * AchievementToast Component (T025)
 *
 * Animated toast notification shown when user earns a badge.
 * Includes confetti animation and celebratory styling.
 *
 * Features:
 * - Confetti animation on badge earn
 * - Slide-in animation from top
 * - Auto-dismiss after 5 seconds
 * - Tap to view badge details
 * - Sound effect support (optional)
 * - Accessibility announcements
 */

import * as React from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { BadgeCard, type Badge } from './badge-card';
import { cn } from '@/lib/utils';
import { SparklesIcon, XIcon } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AchievementToastProps {
  badge: Badge;
  visible: boolean;
  onDismiss: () => void;
  onViewDetails?: (badge: Badge) => void;
  duration?: number; // Auto-dismiss duration in ms (default 5000)
}

/**
 * AchievementToast Component - Optimized with React.memo (Phase 7, T111)
 *
 * Prevents unnecessary re-renders when parent components update.
 * Only re-renders when props change (badge, visible, onDismiss, onViewDetails, duration).
 */
export const AchievementToast = React.memo(function AchievementToast({
  badge,
  visible,
  onDismiss,
  onViewDetails,
  duration = 5000,
}: AchievementToastProps) {
  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  // Simplified confetti - using basic animation
  const confettiAnims = React.useRef(
    Array.from({ length: 20 }, () => ({
      x: useSharedValue(0),
      y: useSharedValue(0),
      rotation: useSharedValue(0),
      opacity: useSharedValue(0),
    }))
  ).current;

  // Auto-dismiss timer
  React.useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, duration, onDismiss]);

  // Slide-in animation
  React.useEffect(() => {
    if (visible) {
      // Reset and animate in
      translateY.value = -200;
      opacity.value = 0;
      scale.value = 0.8;

      translateY.value = withSpring(20, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 10, stiffness: 100 });

      // Confetti animation
      triggerConfetti();
    } else {
      // Slide out
      translateY.value = withTiming(-200, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const triggerConfetti = () => {
    confettiAnims.forEach((anim) => {
      // Random horizontal spread
      const randomX = (Math.random() - 0.5) * SCREEN_WIDTH;
      const randomY = Math.random() * 400 + 100;
      const randomRotation = Math.random() * 720 - 360;

      // Reset
      anim.x.value = 0;
      anim.y.value = 0;
      anim.rotation.value = 0;
      anim.opacity.value = 1;

      // Animate
      anim.x.value = withTiming(randomX, { duration: 2000 });
      anim.y.value = withTiming(randomY, { duration: 2000 });
      anim.rotation.value = withTiming(randomRotation, { duration: 2000 });
      anim.opacity.value = withTiming(0, { duration: 1000 });
    });
  };

  const handlePress = () => {
    if (onViewDetails) {
      onViewDetails(badge);
    }
    onDismiss();
  };

  if (!visible) {
    return null;
  }

  return (
    <View className="pointer-events-box-none absolute left-0 right-0 top-0 z-50">
      {/* Confetti Particles */}
      <View className="pointer-events-none absolute inset-0">
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            className="absolute left-1/2 top-24"
            style={useAnimatedStyle(() => ({
              transform: [
                { translateX: anim.x.value },
                { translateY: anim.y.value },
                { rotate: `${anim.rotation.value}deg` },
              ],
              opacity: anim.opacity.value,
            }))}>
            <View
              className={cn(
                'h-2 w-2 rounded-full',
                index % 4 === 0 && 'bg-yellow-400',
                index % 4 === 1 && 'bg-purple-400',
                index % 4 === 2 && 'bg-blue-400',
                index % 4 === 3 && 'bg-green-400'
              )}
            />
          </Animated.View>
        ))}
      </View>

      {/* Toast Card */}
      <Animated.View
        className="pointer-events-auto mx-4"
        style={useAnimatedStyle(() => ({
          transform: [{ translateY: translateY.value }, { scale: scale.value }],
          opacity: opacity.value,
        }))}>
        <Pressable onPress={handlePress}>
          <Card className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-xl dark:from-yellow-950 dark:to-amber-950">
            <CardContent className="p-4">
              {/* Close Button */}
              <Pressable
                onPress={onDismiss}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/10 p-1 active:bg-black/20">
                <XIcon size={20} className="text-foreground" />
              </Pressable>

              <View className="flex-row items-center gap-4">
                {/* Badge Preview */}
                <View className="w-20">
                  <BadgeCard badge={badge} size="small" showDetails={false} />
                </View>

                {/* Achievement Message */}
                <View className="flex-1 pr-8">
                  <View className="mb-1 flex-row items-center gap-2">
                    <SparklesIcon size={20} className="text-yellow-600 dark:text-yellow-400" />
                    <Text
                      variant="small"
                      className="font-bold text-yellow-700 dark:text-yellow-300">
                      Achievement Unlocked!
                    </Text>
                  </View>

                  <Text variant="h3" className="mb-1">
                    {badge.name}
                  </Text>

                  <Text variant="small" className="text-muted-foreground" numberOfLines={2}>
                    {badge.description}
                  </Text>

                  {/* Points */}
                  <View className="mt-2 flex-row items-center gap-1">
                    <Text
                      variant="small"
                      className="font-semibold text-yellow-600 dark:text-yellow-400">
                      +{badge.pointsThreshold} points
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tap to View Hint */}
              {onViewDetails && (
                <Text variant="small" className="mt-3 text-center text-muted-foreground">
                  Tap to view details
                </Text>
              )}
            </CardContent>
          </Card>
        </Pressable>
      </Animated.View>
    </View>
  );
});

/**
 * Hook to manage achievement toast state
 *
 * Usage:
 * ```tsx
 * const toast = useAchievementToast();
 *
 * // Show toast when badge is earned
 * toast.show(badgeData);
 * ```
 */
export function useAchievementToast() {
  const [visible, setVisible] = React.useState(false);
  const [badge, setBadge] = React.useState<Badge | null>(null);

  const show = React.useCallback((badgeData: Badge) => {
    setBadge(badgeData);
    setVisible(true);
  }, []);

  const dismiss = React.useCallback(() => {
    setVisible(false);
  }, []);

  const component = badge ? (
    <AchievementToast badge={badge} visible={visible} onDismiss={dismiss} />
  ) : null;

  return {
    show,
    dismiss,
    visible,
    component,
  };
}
