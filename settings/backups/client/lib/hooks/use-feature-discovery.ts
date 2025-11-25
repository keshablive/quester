/**
 * useFeatureDiscovery Hook
 * Feature 003, T043: Hook for feature discovery carousel data and analytics
 *
 * Provides:
 * - Featured content data
 * - View tracking
 * - User engagement metrics
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeatureDiscoveryItem {
  id: string;
  type: 'quest' | 'course' | 'marketplace' | 'property' | 'video' | 'live';
  title: string;
  description: string;
  imageUrl?: string;
  priority: number;
  metadata?: Record<string, any>;
}

export interface FeatureDiscoveryMetrics {
  totalViews: number;
  uniqueFeatureViews: Record<string, number>;
  lastViewedAt: number;
  conversionRate: number;
}

const STORAGE_KEY = '@feature_discovery_metrics';
const CACHE_KEY = '@feature_discovery_items';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export function useFeatureDiscovery() {
  const [items, setItems] = useState<FeatureDiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<FeatureDiscoveryMetrics>({
    totalViews: 0,
    uniqueFeatureViews: {},
    lastViewedAt: 0,
    conversionRate: 0,
  });

  /**
   * Load cached items from AsyncStorage
   */
  const loadCachedItems = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_DURATION) {
          return data as FeatureDiscoveryItem[];
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to load cached items:', err);
      return null;
    }
  }, []);

  /**
   * Cache items to AsyncStorage
   */
  const cacheItems = useCallback(async (data: FeatureDiscoveryItem[]) => {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (err) {
      console.error('Failed to cache items:', err);
    }
  }, []);

  /**
   * Fetch feature discovery items
   */
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try cache first
      const cached = await loadCachedItems();
      if (cached) {
        setItems(cached);
        setLoading(false);
        return;
      }

      // Fetch from API (mock for now)
      // In production, this would call your backend API
      const mockItems: FeatureDiscoveryItem[] = [
        {
          id: 'quest-1',
          type: 'quest',
          title: 'Complete Your First Quest',
          description: 'Start your journey with our beginner-friendly quest',
          priority: 1,
          metadata: { difficulty: 'easy', xp: 100 },
        },
        {
          id: 'course-1',
          type: 'course',
          title: 'Blockchain Fundamentals',
          description: 'Learn the basics of blockchain technology',
          priority: 2,
          metadata: { duration: '2 hours', level: 'beginner' },
        },
        {
          id: 'marketplace-1',
          type: 'marketplace',
          title: 'Trending NFTs',
          description: 'Explore the hottest NFT collections',
          priority: 3,
          metadata: { category: 'collectibles' },
        },
        {
          id: 'video-1',
          type: 'video',
          title: 'DeFi Explained',
          description: 'Understanding decentralized finance',
          priority: 4,
          metadata: { duration: '15:30', views: 1250 },
        },
      ];

      setItems(mockItems);
      await cacheItems(mockItems);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [loadCachedItems, cacheItems]);

  /**
   * Load metrics from storage
   */
  const loadMetrics = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMetrics(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }, []);

  /**
   * Save metrics to storage
   */
  const saveMetrics = useCallback(async (newMetrics: FeatureDiscoveryMetrics) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMetrics));
      setMetrics(newMetrics);
    } catch (err) {
      console.error('Failed to save metrics:', err);
    }
  }, []);

  /**
   * Track view of feature discovery carousel
   */
  const trackView = useCallback(async () => {
    const newMetrics = {
      ...metrics,
      totalViews: metrics.totalViews + 1,
      lastViewedAt: Date.now(),
    };
    await saveMetrics(newMetrics);
  }, [metrics, saveMetrics]);

  /**
   * Track individual feature item view
   */
  const trackFeatureView = useCallback(
    async (featureId: string) => {
      const newMetrics = {
        ...metrics,
        uniqueFeatureViews: {
          ...metrics.uniqueFeatureViews,
          [featureId]: (metrics.uniqueFeatureViews[featureId] || 0) + 1,
        },
      };
      await saveMetrics(newMetrics);
    },
    [metrics, saveMetrics]
  );

  /**
   * Track conversion (user clicked on feature)
   */
  const trackConversion = useCallback(
    async (_featureId: string) => {
      // Calculate conversion rate
      const totalViews = Object.values(metrics.uniqueFeatureViews).reduce(
        (sum, count) => sum + count,
        0
      );
      const conversions = 1; // Simplified - in production, track actual conversions
      const conversionRate = totalViews > 0 ? conversions / totalViews : 0;

      const newMetrics = {
        ...metrics,
        conversionRate,
      };
      await saveMetrics(newMetrics);
    },
    [metrics, saveMetrics]
  );

  /**
   * Refresh items (bypass cache)
   */
  const refresh = useCallback(async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    await fetchItems();
  }, [fetchItems]);

  /**
   * Clear all metrics
   */
  const clearMetrics = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setMetrics({
      totalViews: 0,
      uniqueFeatureViews: {},
      lastViewedAt: 0,
      conversionRate: 0,
    });
  }, []);

  // Load items and metrics on mount
  useEffect(() => {
    fetchItems();
    loadMetrics();
  }, []);

  return {
    items,
    loading,
    error,
    metrics,
    trackView,
    trackFeatureView,
    trackConversion,
    refresh,
    clearMetrics,
  };
}
