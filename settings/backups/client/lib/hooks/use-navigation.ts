import { useState, useCallback } from 'react';

export type FeatureType = 'quests' | 'learning' | 'marketplace' | 'social' | 'messages' | 'home' | 'profile';

export type NotificationCounts = {
  quests: number;
  learning: number;
  marketplace: number;
  social: number;
  messages: number;
};

export type NavigationState = {
  currentFeature: FeatureType;
  notificationCounts: NotificationCounts;
  setCurrentFeature: (feature: FeatureType) => void;
  setNotificationCount: (feature: keyof NotificationCounts, count: number) => void;
  clearNotificationCount: (feature: keyof NotificationCounts) => void;
  getTotalNotifications: () => number;
};

export function useNavigation(): NavigationState {
  const [currentFeature, setCurrentFeature] = useState<FeatureType>('home');
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    quests: 0,
    learning: 0,
    marketplace: 0,
    social: 0,
    messages: 0,
  });

  const setNotificationCount = useCallback((feature: keyof NotificationCounts, count: number) => {
    setNotificationCounts((prev) => ({
      ...prev,
      [feature]: count,
    }));
  }, []);

  const clearNotificationCount = useCallback((feature: keyof NotificationCounts) => {
    setNotificationCounts((prev) => ({
      ...prev,
      [feature]: 0,
    }));
  }, []);

  const getTotalNotifications = useCallback(() => {
    return Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
  }, [notificationCounts]);

  return {
    currentFeature,
    notificationCounts,
    setCurrentFeature,
    setNotificationCount,
    clearNotificationCount,
    getTotalNotifications,
  };
}
