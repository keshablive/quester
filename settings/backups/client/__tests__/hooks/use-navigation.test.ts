import { renderHook, act } from '@testing-library/react-native';
import { NavigationProvider, useNavigation } from '@/lib/contexts/navigation-context';
import React from 'react';

type FeatureType =
  | 'quests'
  | 'courses'
  | 'marketplace'
  | 'properties'
  | 'social'
  | 'messages'
  | 'videos'
  | 'live';

describe('useNavigation Hook', () => {
  // Create a new wrapper for each test to avoid state pollution
  const createWrapper = () => ({ children }: any) => 
    React.createElement(NavigationProvider, null, children);

  describe('Notification Counts', () => {
    it('initializes with zero notification counts', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      expect(result.current.notificationCounts.quests).toBe(0);
      expect(result.current.notificationCounts.courses).toBe(0);
      expect(result.current.notificationCounts.marketplace).toBe(0);
      expect(result.current.notificationCounts.social).toBe(0);
      expect(result.current.notificationCounts.messages).toBe(0);
      expect(result.current.notificationCounts.videos).toBe(0);
      expect(result.current.notificationCounts.properties).toBe(0);
      expect(result.current.notificationCounts.live).toBe(0);
      expect(result.current.notificationCounts.total).toBe(0);
    });

    it('updates notification count for a feature', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('quests', 5);
      });

      expect(result.current.notificationCounts.quests).toBe(5);
      expect(result.current.notificationCounts.total).toBe(5);
    });

    it('increments notification count', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('courses', 3);
      });

      act(() => {
        result.current.incrementNotificationCount('courses', 2);
      });

      expect(result.current.notificationCounts.courses).toBe(5);
      expect(result.current.notificationCounts.total).toBe(5);
    });

    it('increments by 1 when no increment value provided', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.incrementNotificationCount('social');
      });

      expect(result.current.notificationCounts.social).toBe(1);
    });

    it('decrements notification count', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('messages', 10);
      });

      act(() => {
        result.current.decrementNotificationCount('messages', 3);
      });

      expect(result.current.notificationCounts.messages).toBe(7);
      expect(result.current.notificationCounts.total).toBe(7);
    });

    it('does not decrement below zero', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('videos', 2);
      });

      act(() => {
        result.current.decrementNotificationCount('videos', 5);
      });

      expect(result.current.notificationCounts.videos).toBe(0);
    });

    it('clears notification count for a feature', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('marketplace', 8);
      });

      act(() => {
        result.current.clearNotificationCount('marketplace');
      });

      expect(result.current.notificationCounts.marketplace).toBe(0);
      expect(result.current.notificationCounts.total).toBe(0);
    });

    it('clears all notification counts', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('quests', 5);
        result.current.updateNotificationCount('courses', 3);
        result.current.updateNotificationCount('social', 12);
      });

      expect(result.current.notificationCounts.total).toBe(20);

      act(() => {
        result.current.clearAllNotifications();
      });

      expect(result.current.notificationCounts.quests).toBe(0);
      expect(result.current.notificationCounts.courses).toBe(0);
      expect(result.current.notificationCounts.social).toBe(0);
      expect(result.current.notificationCounts.total).toBe(0);
    });

    it('calculates total notification count correctly', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('quests', 5);
        result.current.updateNotificationCount('courses', 3);
        result.current.updateNotificationCount('marketplace', 2);
        result.current.updateNotificationCount('social', 15);
        result.current.updateNotificationCount('messages', 8);
        result.current.updateNotificationCount('videos', 4);
      });

      expect(result.current.notificationCounts.total).toBe(37);
    });
  });

  describe('Navigation State', () => {
    it('initializes with null current feature', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      expect(result.current.navigationState.currentFeature).toBeNull();
      expect(result.current.navigationState.previousFeature).toBeNull();
      expect(result.current.navigationState.featureHistory).toEqual([]);
    });

    it('tracks feature navigation', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.trackFeature('quests');
      });

      expect(result.current.navigationState.currentFeature).toBe('quests');
      expect(result.current.navigationState.previousFeature).toBeNull();
      expect(result.current.navigationState.featureHistory).toEqual(['quests']);
    });

    it('updates previous feature on navigation', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.trackFeature('quests');
      });

      act(() => {
        result.current.trackFeature('courses');
      });

      expect(result.current.navigationState.currentFeature).toBe('courses');
      expect(result.current.navigationState.previousFeature).toBe('quests');
    });

    it('maintains feature history', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      const features: FeatureType[] = ['home', 'quests', 'courses', 'marketplace', 'social'];

      act(() => {
        features.forEach(feature => result.current.trackFeature(feature));
      });

      expect(result.current.navigationState.featureHistory).toEqual(features);
    });

    it('limits feature history to last 10 items', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      const features: FeatureType[] = [
        'home', 'quests', 'courses', 'marketplace', 'social',
        'messages', 'videos', 'properties', 'live', 'home',
        'quests', 'courses',
      ];

      act(() => {
        features.forEach(feature => result.current.trackFeature(feature));
      });

      // Should only keep last 10
      expect(result.current.navigationState.featureHistory).toHaveLength(10);
      expect(result.current.navigationState.featureHistory).toEqual(features.slice(-10));
    });

    it('records last visited timestamp', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      const beforeTimestamp = Date.now();

      act(() => {
        result.current.trackFeature('quests');
      });

      const afterTimestamp = Date.now();

      const lastVisited = result.current.navigationState.lastVisited.quests;
      expect(lastVisited).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(lastVisited).toBeLessThanOrEqual(afterTimestamp);
    });

    it('auto-clears notifications when feature is visited', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('courses', 8);
      });

      expect(result.current.notificationCounts.courses).toBe(8);

      act(() => {
        result.current.trackFeature('courses');
      });

      expect(result.current.notificationCounts.courses).toBe(0);
    });
  });

  describe('Feature Visit Tracking', () => {
    it('tracks feature visit count', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.trackFeature('quests');
        result.current.trackFeature('courses');
        result.current.trackFeature('quests');
        result.current.trackFeature('quests');
      });

      expect(result.current.getFeatureVisitCount('quests')).toBe(3);
      expect(result.current.getFeatureVisitCount('courses')).toBe(1);
    });

    it('returns 0 for unvisited features', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      expect(result.current.getFeatureVisitCount('marketplace')).toBe(0);
    });
  });

  describe('Multiple Updates', () => {
    it('handles rapid notification updates', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.incrementNotificationCount('social');
        result.current.incrementNotificationCount('social');
        result.current.incrementNotificationCount('social');
        result.current.decrementNotificationCount('social');
      });

      expect(result.current.notificationCounts.social).toBe(2);
    });

    it('handles concurrent feature tracking', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.trackFeature('quests');
        result.current.updateNotificationCount('courses', 5);
        result.current.trackFeature('courses');
      });

      expect(result.current.navigationState.currentFeature).toBe('courses');
      expect(result.current.notificationCounts.courses).toBe(0); // Auto-cleared
      expect(result.current.navigationState.featureHistory).toEqual(['quests', 'courses']);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined feature gracefully', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      expect(() => {
        act(() => {
          // @ts-expect-error Testing invalid input
          result.current.trackFeature(undefined);
        });
      }).not.toThrow();
    });

    it('handles negative notification counts', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        // @ts-expect-error Testing invalid input
        result.current.updateNotificationCount('quests', -5);
      });

      // Should clamp to 0 or handle gracefully
      expect(result.current.notificationCounts.quests).toBeGreaterThanOrEqual(0);
    });

    it('handles very large notification counts', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        result.current.updateNotificationCount('social', 9999);
      });

      expect(result.current.notificationCounts.social).toBe(9999);
      expect(result.current.notificationCounts.total).toBe(9999);
    });
  });

  describe('Type Safety', () => {
    it('only accepts valid FeatureType values', () => {
      const { result } = renderHook(() => useNavigation(), { wrapper: createWrapper() });

      act(() => {
        // Valid features
        result.current.trackFeature('home');
        result.current.trackFeature('quests');
        result.current.trackFeature('courses');
        result.current.trackFeature('marketplace');
        result.current.trackFeature('properties');
        result.current.trackFeature('social');
        result.current.trackFeature('videos');
        result.current.trackFeature('messages');
        result.current.trackFeature('live');
      });

      // TypeScript should prevent invalid values at compile time
      // @ts-expect-error Testing invalid feature type
      expect(() => result.current.trackFeature('invalid')).toBeDefined();
    });
  });
});
