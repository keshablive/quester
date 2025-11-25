/**
 * ToastNotificationManager Component (T146)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Manages display of multiple toast notifications with:
 * - Queue management (FIFO)
 * - Stacking multiple notifications vertically
 * - Positioning at top of screen (SafeAreaView)
 * - Auto-dismiss handling
 * - Press handling for individual notifications
 * - Accessibility support (announcements)
 *
 * Usage:
 * ```tsx
 * // In root layout or App.tsx
 * const { notifications, dismiss } = useToastNotifications();
 *
 * <ToastNotificationManager
 *   notifications={notifications}
 *   onDismiss={dismiss}
 *   onPress={(notification) => handleNotificationPress(notification)}
 * />
 * ```
 */

import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToastNotification } from '@/components/real-time/toast-notification';
import { ToastNotification as ToastNotificationType } from '@/lib/types/real-time';

interface ToastNotificationManagerProps {
  notifications: ToastNotificationType[];
  onDismiss: (id: string) => void;
  onPress?: (notification: ToastNotificationType) => void;
}

export function ToastNotificationManager({
  notifications,
  onDismiss,
  onPress,
}: ToastNotificationManagerProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <SafeAreaView
      edges={['top']}
      className="absolute left-0 right-0 top-0 z-[9999]"
      pointerEvents="box-none"
      testID="toast-notification-manager">
      <View className="flex-col" pointerEvents="box-none">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
            onPress={onPress}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
