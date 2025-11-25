/**
 * ToastNotification Component (T147)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Single toast notification with:
 * - Visual styling based on type (info, success, warning, error, message)
 * - Auto-dismiss with configurable duration
 * - Optional action button
 * - Dismiss button
 * - Avatar display for message notifications
 * - Slide-in animation
 * - Full accessibility support (ARIA roles, screen reader announcements)
 *
 * Usage:
 * ```tsx
 * <ToastNotification
 *   notification={{
 *     id: '1',
 *     type: 'success',
 *     title: 'Quest Completed',
 *     message: '+50 XP earned',
 *     duration: 5000,
 *     action: {
 *       label: 'View',
 *       onPress: () => navigate('/quests/123')
 *     }
 *   }}
 *   onDismiss={(id) => console.log('Dismissed:', id)}
 *   onPress={(notification) => console.log('Pressed:', notification)}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ToastNotification as ToastNotificationType } from '@/lib/types/real-time';

interface ToastNotificationProps {
  notification: ToastNotificationType;
  onDismiss: (id: string) => void;
  onPress?: (notification: ToastNotificationType) => void;
}

export function ToastNotification({ notification, onDismiss, onPress }: ToastNotificationProps) {
  const { id, type, title, message, duration = 5000, action, avatar } = notification;

  const translateY = useSharedValue(-100);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Slide in animation
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });

    // Auto-dismiss timer
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleDismiss = () => {
    if (isDismissed) return;
    setIsDismissed(true);

    // Slide out animation
    translateY.value = withTiming(-100, { duration: 200 }, (finished) => {
      if (finished) {
        onDismiss(id);
      }
    });
  };

  const handleActionPress = () => {
    if (action?.onPress) {
      action.onPress();
      handleDismiss();
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
    }
  };

  // Type-specific styling
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'message':
        return 'bg-gray-50 border-gray-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-900';
      case 'warning':
        return 'text-yellow-900';
      case 'error':
        return 'text-red-900';
      case 'message':
        return 'text-gray-900';
      case 'info':
      default:
        return 'text-blue-900';
    }
  };

  // Accessibility
  const liveRegion = type === 'warning' || type === 'error' ? 'assertive' : 'polite';
  const accessibilityLabel = message ? `${title}. ${message}` : title;

  return (
    <Animated.View
      testID="toast-animated-view"
      style={useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
      }))}
      className="px-4 pb-1 pt-2">
      <Pressable
        testID="toast-notification"
        accessibilityRole="alert"
        accessibilityLiveRegion={liveRegion}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to open, swipe to dismiss"
        onPress={handlePress}
        className={`flex-row items-start rounded-lg border p-4 shadow-md ${getTypeStyles()}`}>
        {/* Avatar (for message notifications) */}
        {avatar && (
          <Image
            testID="toast-avatar"
            source={{ uri: avatar }}
            className="mr-3 h-10 w-10 rounded-full"
          />
        )}

        {/* Content */}
        <View className="mr-2 flex-1">
          <Text className={`text-base font-semibold ${getTextColor()}`}>{title}</Text>
          {message && <Text className={`mt-1 text-sm ${getTextColor()}`}>{message}</Text>}

          {/* Action Button */}
          {action && (
            <Button
              testID="toast-action-button"
              variant="ghost"
              size="sm"
              onPress={handleActionPress}
              className="mt-2 self-start"
              accessibilityRole="button"
              accessibilityLabel={action.label}>
              <Text className={`text-sm font-semibold ${getTextColor()}`}>{action.label}</Text>
            </Button>
          )}
        </View>

        {/* Dismiss Button */}
        <Pressable
          testID="toast-dismiss-button"
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          className="p-1">
          <X size={20} color={type === 'error' ? '#7f1d1d' : '#1f2937'} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
