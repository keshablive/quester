import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

/**
 * XP Notification types for different actions
 */
export type XPNotificationType =
  | 'post'
  | 'like'
  | 'comment'
  | 'follow'
  | 'share'
  | 'milestone'
  | 'challenge'
  | 'achievement';

/**
 * XP Notification data
 */
export interface XPNotification {
  id: string;
  amount: number;
  type: XPNotificationType;
  message?: string;
  timestamp: number;
}

/**
 * Coalesced XP notification for batched display
 */
export interface CoalescedXPNotification {
  totalAmount: number;
  notifications: XPNotification[];
  startTime: number;
  endTime: number;
}

/**
 * XP Notification context value
 */
interface XPNotificationContextValue {
  /** Current coalesced notification to display */
  currentNotification: CoalescedXPNotification | null;
  /** Add a new XP notification (will be coalesced) */
  addNotification: (notification: Omit<XPNotification, 'id' | 'timestamp'>) => void;
  /** Dismiss the current notification */
  dismissNotification: () => void;
  /** Total XP earned this session */
  sessionXP: number;
  /** Total notifications this session */
  notificationCount: number;
}

const XPNotificationContext = createContext<XPNotificationContextValue | null>(null);

/** Coalescing window in milliseconds (FR-003: 3-second window) */
const COALESCE_WINDOW_MS = 3000;

/** How long to show the notification before auto-dismiss */
const AUTO_DISMISS_MS = 4000;

interface XPNotificationProviderProps {
  children: ReactNode;
}

/**
 * Provider for XP notifications with coalescing support
 * FR-003: Coalesce multiple XP notifications within a 3-second window
 */
export function XPNotificationProvider({ children }: XPNotificationProviderProps) {
  const [currentNotification, setCurrentNotification] = useState<CoalescedXPNotification | null>(
    null
  );
  const [sessionXP, setSessionXP] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // Queue for coalescing notifications
  const notificationQueue = useRef<XPNotification[]>([]);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateId = () => `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const processQueue = useCallback(() => {
    if (notificationQueue.current.length === 0) return;

    const notifications = [...notificationQueue.current];
    const totalAmount = notifications.reduce((sum, n) => sum + n.amount, 0);

    const coalesced: CoalescedXPNotification = {
      totalAmount,
      notifications,
      startTime: notifications[0].timestamp,
      endTime: notifications[notifications.length - 1].timestamp,
    };

    setCurrentNotification(coalesced);
    setSessionXP((prev) => prev + totalAmount);
    setNotificationCount((prev) => prev + notifications.length);

    // Clear the queue
    notificationQueue.current = [];

    // Auto-dismiss after delay
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      setCurrentNotification(null);
    }, AUTO_DISMISS_MS);
  }, []);

  const addNotification = useCallback(
    (notification: Omit<XPNotification, 'id' | 'timestamp'>) => {
      const fullNotification: XPNotification = {
        ...notification,
        id: generateId(),
        timestamp: Date.now(),
      };

      notificationQueue.current.push(fullNotification);

      // Reset coalesce timer
      if (coalesceTimerRef.current) {
        clearTimeout(coalesceTimerRef.current);
      }

      // Process queue after coalesce window
      coalesceTimerRef.current = setTimeout(() => {
        processQueue();
      }, COALESCE_WINDOW_MS);
    },
    [processQueue]
  );

  const dismissNotification = useCallback(() => {
    setCurrentNotification(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const value: XPNotificationContextValue = {
    currentNotification,
    addNotification,
    dismissNotification,
    sessionXP,
    notificationCount,
  };

  return <XPNotificationContext.Provider value={value}>{children}</XPNotificationContext.Provider>;
}

/**
 * Hook to access XP notification context
 */
export function useXPNotification(): XPNotificationContextValue {
  const context = useContext(XPNotificationContext);
  if (!context) {
    throw new Error('useXPNotification must be used within an XPNotificationProvider');
  }
  return context;
}

/**
 * Get display message for XP notification type
 */
export function getXPTypeMessage(type: XPNotificationType): string {
  switch (type) {
    case 'post':
      return 'New post created';
    case 'like':
      return 'Liked content';
    case 'comment':
      return 'Added comment';
    case 'follow':
      return 'Followed user';
    case 'share':
      return 'Shared content';
    case 'milestone':
      return 'Milestone reached!';
    case 'challenge':
      return 'Challenge completed!';
    case 'achievement':
      return 'Achievement unlocked!';
    default:
      return 'XP earned';
  }
}
