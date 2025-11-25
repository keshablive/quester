/**
 * TypingIndicator Component (T148)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Displays when users are typing with:
 * - User avatars (up to 3 visible)
 * - Formatted text (single, multiple users)
 * - Animated dots (...)
 * - Auto-deduplication
 * - Accessibility support
 * - Compact/normal size variants
 *
 * Usage:
 * ```tsx
 * <TypingIndicator
 *   users={typingUsers}
 *   size="compact"
 * />
 * ```
 */

import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { TypingIndicator as TypingIndicatorType } from '@/lib/types/real-time';

interface TypingIndicatorProps {
  users: TypingIndicatorType[];
  size?: 'compact' | 'normal';
}

export function TypingIndicator({ users, size = 'normal' }: TypingIndicatorProps) {
  // Deduplicate users by ID
  const uniqueUsers = Array.from(new Map(users.map((user) => [user.userId, user])).values());

  // Don't render if no users
  if (uniqueUsers.length === 0) {
    return null;
  }

  const formatTypingText = () => {
    const usernames = uniqueUsers.map((u) => u.username || 'Someone');

    if (usernames.length === 1) {
      return `${usernames[0]} is typing`;
    } else if (usernames.length === 2) {
      return `${usernames[0]} and ${usernames[1]} are typing`;
    } else if (usernames.length === 3) {
      return `${usernames[0]}, ${usernames[1]} and ${usernames[2]} are typing`;
    } else {
      const others = usernames.length - 2;
      return `${usernames[0]}, ${usernames[1]} and ${others} ${
        others === 1 ? 'other' : 'others'
      } are typing`;
    }
  };

  const typingText = formatTypingText();
  const avatarsToShow = uniqueUsers.slice(0, 3); // Show max 3 avatars

  const paddingClass = size === 'compact' ? 'py-1' : 'py-2';

  return (
    <View
      testID="typing-indicator"
      accessibilityLiveRegion="polite"
      accessibilityLabel={typingText}
      accessibilityHint="User is typing a message"
      className={`flex-row items-center ${paddingClass} px-4`}>
      {/* User avatars */}
      {avatarsToShow.map(
        (user) =>
          user.avatar && (
            <Image
              key={user.userId}
              testID={`typing-avatar-${user.userId}`}
              source={{ uri: user.avatar }}
              className="mr-2 h-6 w-6 rounded-full"
            />
          )
      )}

      {/* Typing text */}
      <Text variant="small" className="mr-1 text-muted-foreground">
        {typingText}
      </Text>

      {/* Animated dots */}
      <AnimatedDots />
    </View>
  );
}

/**
 * Animated dots component (...)
 */
function AnimatedDots() {
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);
  const opacity3 = useSharedValue(0.3);

  useEffect(() => {
    opacity1.value = withRepeat(
      withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
      -1,
      false
    );
    opacity2.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 200 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
    opacity3.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    opacity: opacity1.value,
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    opacity: opacity2.value,
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    opacity: opacity3.value,
  }));

  return (
    <View testID="typing-dots" className="flex-row items-center">
      <Animated.View style={animatedStyle1}>
        <Text variant="small" testID="typing-dot-1" className="mx-0.5 text-muted-foreground">
          •
        </Text>
      </Animated.View>
      <Animated.View style={animatedStyle2}>
        <Text variant="small" testID="typing-dot-2" className="mx-0.5 text-muted-foreground">
          •
        </Text>
      </Animated.View>
      <Animated.View style={animatedStyle3}>
        <Text variant="small" testID="typing-dot-3" className="mx-0.5 text-muted-foreground">
          •
        </Text>
      </Animated.View>
    </View>
  );
}
