/**
 * Badge Unlock Notification Component
 *
 * Displays an animated modal celebration when a user unlocks a new badge.
 * Features:
 * - Rarity-based styling (common/rare/epic/legendary)
 * - Confetti animation for unlocks
 * - Share functionality
 * - Modal behavior with backdrop
 * - Sound effects support
 * - Accessibility announcements
 *
 * @module components/gamification/badge-unlock-notification
 */

import React, { useEffect, useRef } from 'react';
import { View, Modal, Pressable, AccessibilityInfo } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { X, Share2 } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: number;
}

interface BadgeUnlockNotificationProps {
  /** The badge that was unlocked (null to hide) */
  badge: Badge | null;
  /** Callback when notification is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss after duration in ms (default: 0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Callback when share button is pressed */
  onShare?: (badge: Badge) => void;
  /** Callback to navigate to view all badges */
  onViewAll?: () => void;
}

const rarityStyles = {
  common: {
    backgroundColor: '#6B7280', // gray-500
    borderColor: '#9CA3AF', // gray-400
    glowColor: 'rgba(156, 163, 175, 0.3)',
  },
  rare: {
    backgroundColor: '#3B82F6', // blue-500
    borderColor: '#60A5FA', // blue-400
    glowColor: 'rgba(59, 130, 246, 0.5)',
  },
  epic: {
    backgroundColor: '#8B5CF6', // purple-500
    borderColor: '#A78BFA', // purple-400
    glowColor: 'rgba(139, 92, 246, 0.5)',
  },
  legendary: {
    backgroundColor: '#F59E0B', // amber-500
    borderColor: '#FBBF24', // amber-400
    glowColor: 'rgba(245, 158, 11, 0.6)',
  },
};

export function BadgeUnlockNotification({
  badge,
  onDismiss,
  autoDismiss = 0,
  onShare,
  onViewAll,
}: BadgeUnlockNotificationProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const confettiRef = useRef<LottieView>(null);

  const showConfetti = badge && ['rare', 'epic', 'legendary'].includes(badge.rarity);

  useEffect(() => {
    if (badge) {
      // Announce to screen reader
      AccessibilityInfo.announceForAccessibility(
        `Badge unlocked: ${badge.name}. ${badge.description}`
      );

      // Reset and animate entrance
      scale.value = 0.8;
      opacity.value = 0;

      scale.value = withSpring(1);
      opacity.value = withSpring(1);

      // Play confetti
      if (confettiRef.current && showConfetti) {
        confettiRef.current.play();
      }

      // Auto-dismiss if configured
      if (autoDismiss > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismiss);

        return () => clearTimeout(timer);
      }

      return undefined;
    }
    return undefined;
  }, [badge, autoDismiss]);
  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        onDismiss();
      }
    });
  };

  if (!badge) {
    return null;
  }

  const rarity = rarityStyles[badge.rarity];

  return (
    <Modal
      visible={!!badge}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      accessibilityViewIsModal>
      <Pressable
        className="flex-1 items-center justify-center bg-black/70 px-6"
        onPress={handleDismiss}
        testID="modal-backdrop"
        accessibilityRole="button"
        accessibilityLabel="Close badge unlock modal">
        {showConfetti && (
          <LottieView
            ref={confettiRef}
            source={require('@/assets/animations/confetti.json')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
              pointerEvents: 'none',
            }}
            loop={false}
            testID="badge-confetti-animation"
          />
        )}

        <Animated.View
          className="relative w-full max-w-sm items-center rounded-3xl border-2 border-gray-700 bg-gray-900 p-8 shadow-2xl"
          style={[
            useAnimatedStyle(() => ({
              transform: [{ scale: scale.value }],
              opacity: opacity.value,
            })),
          ]}
          testID="badge-notification-container"
          accessibilityRole="alert"
          accessibilityLabel={`Badge unlocked: ${badge.name}. ${badge.description}`}
          accessibilityLiveRegion="assertive"
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => {}}>
          {/* Close Button */}
          <Pressable
            className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full bg-gray-700"
            onPress={handleDismiss}
            testID="dismiss-button"
            accessibilityRole="button"
            accessibilityLabel="Dismiss badge notification"
            accessibilityHint="Close this badge unlock celebration"
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <X size={20} color="#ffffff" />
          </Pressable>

          {/* Header */}
          <Text className="mb-6 text-center text-3xl font-bold text-white">Badge Unlocked!</Text>

          {/* Badge Icon with Rarity Styling */}
          <View
            className="mb-6 h-32 w-32 items-center justify-center rounded-full border-4 shadow-lg"
            style={{
              backgroundColor: rarity.backgroundColor,
              borderColor: rarity.borderColor,
              shadowColor: rarity.glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 20,
              elevation: 10,
            }}
            testID={showConfetti ? 'badge-glow-effect' : undefined}>
            <Text
              className="text-6xl"
              testID="badge-icon"
              accessibilityLabel={`${badge.icon} icon`}>
              {getBadgeIconEmoji(badge.icon)}
            </Text>
          </View>

          {/* Badge Name */}
          <Text className="mb-3 text-center text-2xl font-bold text-white">{badge.name}</Text>

          {/* Badge Description */}
          <Text className="mb-4 text-center text-base leading-6 text-gray-400">
            {badge.description}
          </Text>

          {/* Rarity Label */}
          <View
            className="mb-6 rounded-full px-4 py-2"
            style={{ backgroundColor: rarity.backgroundColor }}>
            <Text className="text-sm font-bold text-white">
              {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="w-full flex-row gap-3">
            {onShare && (
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-gray-700 px-4 py-3"
                onPress={() => onShare(badge)}
                testID="share-button"
                accessibilityRole="button"
                accessibilityLabel="Share badge"
                accessibilityHint="Share this badge achievement">
                <Share2 size={18} color="#ffffff" />
                <Text className="text-sm font-semibold text-white">Share</Text>
              </Pressable>
            )}

            {onViewAll && (
              <Pressable
                className="flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 py-3"
                onPress={onViewAll}
                testID="view-all-button"
                accessibilityRole="button"
                accessibilityLabel="View all badges"
                accessibilityHint="Navigate to badge collection">
                <Text className="text-sm font-semibold text-white">View All</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function getBadgeIconEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    trophy: '🏆',
    star: '⭐',
    medal: '🥇',
    crown: '👑',
    fire: '🔥',
    rocket: '🚀',
    gem: '💎',
    heart: '❤️',
    lightning: '⚡',
    shield: '🛡️',
  };

  return iconMap[icon] || '🎖️';
}
