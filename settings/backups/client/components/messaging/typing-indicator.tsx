import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

export type TypingIndicatorProps = {
  dotSize?: number;
  dotColor?: string;
  className?: string;
};

export function TypingIndicator({
  dotSize = 8,
  dotColor = '#6B7280',
  className,
}: TypingIndicatorProps) {
  const dot1TranslateY = useSharedValue(0);
  const dot2TranslateY = useSharedValue(0);
  const dot3TranslateY = useSharedValue(0);

  React.useEffect(() => {
    // Start animations with delays
    dot1TranslateY.value = withRepeat(
      withSequence(withTiming(-6, { duration: 400 }), withTiming(0, { duration: 400 })),
      -1,
      false
    );

    dot2TranslateY.value = withDelay(
      150,
      withRepeat(
        withSequence(withTiming(-6, { duration: 400 }), withTiming(0, { duration: 400 })),
        -1,
        false
      )
    );

    dot3TranslateY.value = withDelay(
      300,
      withRepeat(
        withSequence(withTiming(-6, { duration: 400 }), withTiming(0, { duration: 400 })),
        -1,
        false
      )
    );
  }, [dot1TranslateY, dot2TranslateY, dot3TranslateY]);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1TranslateY.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2TranslateY.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3TranslateY.value }],
  }));

  const DotStyle = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: dotColor,
    marginHorizontal: 2,
  };

  return (
    <View className={`flex-row items-center ${className || ''}`}>
      <Animated.View style={[DotStyle, dot1Style]} />
      <Animated.View style={[DotStyle, dot2Style]} />
      <Animated.View style={[DotStyle, dot3Style]} />
    </View>
  );
}
