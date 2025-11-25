/**
 * NavigationContext
 * Feature 003, T020: Context for navigation state and notification counts
 *
 * Provides global navigation state, notification counts, and feature tracking.
 *
 * Usage:
 * ```typescript
 * const { notificationCounts, navigationState, trackFeature } = useNavigation();
 * ```
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type FeatureType =
  | 'quests'
  | 'courses'
  | 'marketplace'
  | 'properties'
  | 'social'
  | 'messages'
  | 'videos'
  | 'live';

export interface NotificationCounts {
  quests: number;
  courses: number;
  marketplace: number;
  properties: number;
  social: number;
  messages: number;
  videos: number;
  live: number;
  total: number;
}

export interface NavigationState {
  currentFeature: FeatureType | null;
  previousFeature: FeatureType | null;
  featureHistory: FeatureType[];
  lastVisited: Record<FeatureType, number>; // timestamp
}

interface NavigationContextValue {
  notificationCounts: NotificationCounts;
  navigationState: NavigationState;
  updateNotificationCount: (feature: FeatureType, count: number) => void;
  incrementNotificationCount: (feature: FeatureType, increment?: number) => void;
  decrementNotificationCount: (feature: FeatureType, decrement?: number) => void;
  clearNotificationCount: (feature: FeatureType) => void;
  clearAllNotifications: () => void;
  trackFeature: (feature: FeatureType) => void;
  getFeatureVisitCount: (feature: FeatureType) => number;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

const initialNotificationCounts: NotificationCounts = {
  quests: 0,
  courses: 0,
  marketplace: 0,
  properties: 0,
  social: 0,
  messages: 0,
  videos: 0,
  live: 0,
  total: 0,
};

const initialNavigationState: NavigationState = {
  currentFeature: null,
  previousFeature: null,
  featureHistory: [],
  lastVisited: {
    quests: 0,
    courses: 0,
    marketplace: 0,
    properties: 0,
    social: 0,
    messages: 0,
    videos: 0,
    live: 0,
  },
};

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [notificationCounts, setNotificationCounts] =
    useState<NotificationCounts>(initialNotificationCounts);
  const [navigationState, setNavigationState] = useState<NavigationState>(initialNavigationState);

  /**
   * Calculate total notifications
   */
  const calculateTotal = useCallback((counts: Omit<NotificationCounts, 'total'>): number => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }, []);

  /**
   * Update notification count for a specific feature
   */
  const updateNotificationCount = useCallback(
    (feature: FeatureType, count: number) => {
      setNotificationCounts((prev) => {
        const newCounts = {
          ...prev,
          [feature]: Math.max(0, count), // Ensure non-negative
        };
        const { total, ...countsWithoutTotal } = newCounts;
        return {
          ...newCounts,
          total: calculateTotal(countsWithoutTotal),
        };
      });
    },
    [calculateTotal]
  );

  /**
   * Increment notification count
   */
  const incrementNotificationCount = useCallback(
    (feature: FeatureType, increment = 1) => {
      setNotificationCounts((prev) => {
        const newCounts = {
          ...prev,
          [feature]: prev[feature] + increment,
        };
        const { total, ...countsWithoutTotal } = newCounts;
        return {
          ...newCounts,
          total: calculateTotal(countsWithoutTotal),
        };
      });
    },
    [calculateTotal]
  );

  /**
   * Decrement notification count
   */
  const decrementNotificationCount = useCallback(
    (feature: FeatureType, decrement = 1) => {
      setNotificationCounts((prev) => {
        const newCounts = {
          ...prev,
          [feature]: Math.max(0, prev[feature] - decrement),
        };
        const { total, ...countsWithoutTotal } = newCounts;
        return {
          ...newCounts,
          total: calculateTotal(countsWithoutTotal),
        };
      });
    },
    [calculateTotal]
  );

  /**
   * Clear notification count for a specific feature
   */
  const clearNotificationCount = useCallback(
    (feature: FeatureType) => {
      updateNotificationCount(feature, 0);
    },
    [updateNotificationCount]
  );

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotificationCounts(initialNotificationCounts);
  }, []);

  /**
   * Track feature navigation
   */
  const trackFeature = useCallback(
    (feature: FeatureType) => {
      setNavigationState((prev) => {
        const now = Date.now();
        return {
          currentFeature: feature,
          previousFeature: prev.currentFeature,
          featureHistory: [
            ...prev.featureHistory.slice(-9), // Keep last 10
            feature,
          ],
          lastVisited: {
            ...prev.lastVisited,
            [feature]: now,
          },
        };
      });

      // Clear notifications for this feature when visited
      clearNotificationCount(feature);
    },
    [clearNotificationCount]
  );

  /**
   * Get visit count for a feature
   */
  const getFeatureVisitCount = useCallback(
    (feature: FeatureType): number => {
      return navigationState.featureHistory.filter((f) => f === feature).length;
    },
    [navigationState.featureHistory]
  );

  const value: NavigationContextValue = {
    notificationCounts,
    navigationState,
    updateNotificationCount,
    incrementNotificationCount,
    decrementNotificationCount,
    clearNotificationCount,
    clearAllNotifications,
    trackFeature,
    getFeatureVisitCount,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

/**
 * Hook to use navigation context
 */
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

export default NavigationContext;
