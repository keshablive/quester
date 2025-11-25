import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { XPSource } from '@/lib/types/gamification';

type XPGainAnimationProps = {
  amount: number;
  source: XPSource;
  visible: boolean;
  duration?: number;
  onComplete?: () => void;
};

const sourceLabels: Record<XPSource, string> = {
  quest_completion: 'Quest Completion',
  lesson_completion: 'Lesson Completion',
  course_completion: 'Course Completion',
  daily_login: 'Daily Login',
  social_interaction: 'Social Interaction',
  marketplace_purchase: 'Marketplace Purchase',
  video_upload: 'Video Upload',
  comment: 'Comment',
  like: 'Like',
  other: 'Other',
};

/**
 * XPGainAnimation Component - Optimized with React.memo (Phase 7, T111)
 *
 * Prevents unnecessary re-renders when parent components update.
 * Only re-renders when props change (amount, source, visible, duration, onComplete).
 */
export const XPGainAnimation = React.memo(function XPGainAnimation({
  amount,
  source,
  visible,
  duration = 2000,
  onComplete,
}: XPGainAnimationProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    if (!visible) {
      return;
    }

    // Reset and start animations
    opacity.value = 0;
    translateY.value = 50;

    // Fade in and slide up
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withTiming(0, { duration: 400 });

    // Fade out after duration
    opacity.value = withDelay(
      duration - 300,
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished && onComplete) {
          onComplete();
        }
      })
    );
  }, [visible, duration, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      testID="xp-animation-container"
      accessibilityLabel={`Gained ${amount} experience points from ${sourceLabels[source]}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="absolute left-0 right-0 top-20 z-[1000] items-center"
      style={animatedStyle}>
      <View className="rounded-3xl bg-emerald-500 px-6 py-3 shadow-lg">
        <Text
          variant="h2"
          testID="xp-amount-text"
          className="text-center text-white"
          accessibilityLabel={`${amount} experience points`}>
          +{amount} XP
        </Text>
        <Text variant="small" className="mt-0.5 text-center text-emerald-100">
          {sourceLabels[source]}
        </Text>
      </View>
    </Animated.View>
  );
});
