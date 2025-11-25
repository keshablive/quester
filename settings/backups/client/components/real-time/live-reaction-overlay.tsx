/**
 * LiveReactionOverlay Component (T150)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Displays floating emoji reactions with animations for video streaming.
 *
 * Features:
 * - Multiple reaction types (heart, thumbsUp, clap, fire, star)
 * - Float up animation with fade
 * - Random horizontal positioning
 * - Multiple simultaneous reactions
 * - Auto-removal after animation
 * - Configurable animation duration
 *
 * Usage:
 * ```tsx
 * const [reactions, setReactions] = useState<LiveReaction[]>([]);
 *
 * <LiveReactionOverlay
 *   reactions={reactions}
 *   animationDuration={3000}
 *   onReactionComplete={(id) => {
 *     setReactions(prev => prev.filter(r => r.id !== id));
 *   }}
 * />
 * ```
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LiveReaction } from '@/lib/types/real-time';

interface LiveReactionOverlayProps {
  reactions: LiveReaction[];
  animationDuration?: number;
  onReactionComplete?: (id: string) => void;
  className?: string;
}

export function LiveReactionOverlay({
  reactions,
  animationDuration = 3000,
  onReactionComplete,
  className = '',
}: LiveReactionOverlayProps) {
  return (
    <View
      testID="live-reaction-overlay"
      accessibilityRole="none"
      accessibilityLabel="Live reactions overlay"
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      className={className}>
      {reactions.map((reaction) => (
        <AnimatedReaction
          key={reaction.id}
          reaction={reaction}
          duration={animationDuration}
          onComplete={onReactionComplete}
        />
      ))}
    </View>
  );
}

interface AnimatedReactionProps {
  reaction: LiveReaction;
  duration: number;
  onComplete?: (id: string) => void;
}

function AnimatedReaction({ reaction, duration, onComplete }: AnimatedReactionProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Float up animation
    translateY.value = withTiming(-300, { duration }, (finished) => {
      if (finished && onComplete) {
        onComplete(reaction.id);
      }
    });

    // Fade starts halfway through
    setTimeout(() => {
      opacity.value = withTiming(0, { duration: duration * 0.5 });
    }, duration * 0.5);
  }, [reaction.id, duration, onComplete]);

  const getEmoji = () => {
    switch (reaction.type) {
      case 'heart':
        return '❤️';
      case 'thumbsup':
        return '👍';
      case 'clap':
        return '👏';
      case 'fire':
        return '🔥';
      case 'star':
        return '⭐';
      default:
        return '❤️';
    }
  };

  // Calculate position (convert 0-1 to percentage string for style)
  const xPercent = Math.max(0, Math.min(1, reaction.x)) * 100;
  const yPercent = reaction.y ? reaction.y * 100 : 10;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${xPercent}%`,
          bottom: `${yPercent}%`,
        } as any, // RN allows percentage strings but TS doesn't recognize them
        useAnimatedStyle(() => ({
          transform: [{ translateY: translateY.value }],
          opacity: opacity.value,
        })),
      ]}>
      <Text testID={`reaction-${reaction.id}`} style={{ fontSize: 48 }}>
        {getEmoji()}
      </Text>
    </Animated.View>
  );
}
