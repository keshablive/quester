/**
 * useToastNotifications Hook (T152)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 * 
 * Hook for managing toast notifications with:
 * - Show notification (with auto-generated ID and timestamp)
 * - Dismiss notification by ID
 * - Dismiss all notifications
 * - Queue management (FIFO)
 * - Max visible notifications limit
 * - Convenience methods (success, error, warning, info)
 * 
 * Usage:
 * ```tsx
 * const { notifications, show, dismiss, dismissAll, success, error } = useToastNotifications();
 * 
 * // Show custom notification
 * show({
 *   type: 'success',
 *   title: 'Quest Completed',
 *   message: '+50 XP earned',
 *   action: { label: 'View', onPress: () => {} }
 * });
 * 
 * // Convenience methods
 * success('Task completed!');
 * error('Something went wrong', 'Please try again');
 * 
 * // Dismiss
 * dismiss(notificationId);
 * dismissAll();
 * ```
 */

import { useState, useCallback } from 'react';
import { ToastNotification } from '@/lib/types/real-time';

interface UseToastNotificationsOptions {
  maxVisible?: number;
}

interface ShowNotificationOptions {
  type: ToastNotification['type'];
  title: string;
  message?: string;
  duration?: number;
  avatar?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function useToastNotifications(options: UseToastNotificationsOptions = {}) {
  const { maxVisible = 5 } = options;
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  /**
   * Show a new toast notification
   */
  const show = useCallback(
    (notification: ShowNotificationOptions) => {
      const newNotification: ToastNotification = {
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...notification,
      };

      setNotifications((prev) => {
        const updated = [...prev, newNotification];
        
        // Limit to maxVisible notifications (remove oldest)
        if (updated.length > maxVisible) {
          return updated.slice(updated.length - maxVisible);
        }
        
        return updated;
      });
    },
    [maxVisible]
  );

  /**
   * Dismiss a specific notification by ID
   */
  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Dismiss all notifications
   */
  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Convenience method: Show success notification
   */
  const success = useCallback(
    (title: string, message?: string) => {
      show({
        type: 'success',
        title,
        message,
      });
    },
    [show]
  );

  /**
   * Convenience method: Show error notification
   */
  const error = useCallback(
    (title: string, message?: string) => {
      show({
        type: 'error',
        title,
        message,
      });
    },
    [show]
  );

  /**
   * Convenience method: Show warning notification
   */
  const warning = useCallback(
    (title: string, message?: string) => {
      show({
        type: 'warning',
        title,
        message,
      });
    },
    [show]
  );

  /**
   * Convenience method: Show info notification
   */
  const info = useCallback(
    (title: string, message?: string) => {
      show({
        type: 'info',
        title,
        message,
      });
    },
    [show]
  );

  return {
    notifications,
    show,
    dismiss,
    dismissAll,
    success,
    error,
    warning,
    info,
  };
}
