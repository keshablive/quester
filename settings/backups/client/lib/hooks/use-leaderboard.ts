/**
 * useLeaderboard Hook
 *
 * Manages leaderboard data fetching, filtering, and real-time updates.
 * Features:
 * - Fetch leaderboard rankings
 * - Filter by feature (quests, courses, marketplace, etc.)
 * - Real-time rank updates via WebSocket
 * - Caching and offline support
 *
 * @module lib/hooks/use-leaderboard
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealTime } from '@/lib/contexts/real-time-context';

export interface LeaderboardUser {
  rank: number;
  userId: string;
  username: string;
  xp: number;
  level: number;
  avatar?: string;
}

export interface LeaderboardFilter {
  feature?: 'all' | 'quests' | 'courses' | 'marketplace' | 'social';
  timeframe?: 'all-time' | 'monthly' | 'weekly';
}

interface UseLeaderboardOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Enable real-time updates */
  realTime?: boolean;
  /** Default filter */
  defaultFilter?: LeaderboardFilter;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const {
    autoFetch = true,
    realTime = true,
    defaultFilter = { feature: 'all', timeframe: 'all-time' },
  } = options;

  const realTimeContext = useRealTime();

  // State
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LeaderboardFilter>(defaultFilter);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Cache for different filter combinations
  const cacheRef = useRef<Map<string, LeaderboardUser[]>>(new Map());

  // Generate cache key
  const getCacheKey = useCallback((f: LeaderboardFilter) => {
    return `${f.feature || 'all'}_${f.timeframe || 'all-time'}`;
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(
    async (f: LeaderboardFilter = filter) => {
      const cacheKey = getCacheKey(f);
      
      // Check cache first
      if (cacheRef.current.has(cacheKey)) {
        setData(cacheRef.current.get(cacheKey)!);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // TODO: Replace with actual API call
        const response = await fetch(
          `/api/leaderboard?feature=${f.feature || 'all'}&timeframe=${f.timeframe || 'all-time'}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }

        const result = await response.json();
        const leaderboardData = result.data || [];

        // Update cache
        cacheRef.current.set(cacheKey, leaderboardData);
        setData(leaderboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Use cached data if available
        if (cacheRef.current.has(cacheKey)) {
          setData(cacheRef.current.get(cacheKey)!);
        }
      } finally {
        setLoading(false);
      }
    },
    [filter, getCacheKey]
  );

  // Refresh leaderboard (bypass cache)
  const refresh = useCallback(async () => {
    const cacheKey = getCacheKey(filter);
    cacheRef.current.delete(cacheKey);
    await fetchLeaderboard(filter);
  }, [filter, fetchLeaderboard, getCacheKey]);

  // Change filter
  const changeFilter = useCallback(
    (newFilter: Partial<LeaderboardFilter>) => {
      const updatedFilter = { ...filter, ...newFilter };
      setFilter(updatedFilter);
      fetchLeaderboard(updatedFilter);
    },
    [filter, fetchLeaderboard]
  );

  // Get current user's rank
  const getCurrentUserRank = useCallback((): LeaderboardUser | null => {
    if (!currentUserId) return null;
    return data.find((user) => user.userId === currentUserId) || null;
  }, [data, currentUserId]);

  // Handle real-time leaderboard updates
  useEffect(() => {
    if (!realTime || !realTimeContext.subscribe) return;

    const unsubscribe = realTimeContext.subscribe('leaderboard_update', (update: any) => {
      setData((prevData) => {
        // Update existing user or add new user
        const existingIndex = prevData.findIndex((u) => u.userId === update.userId);
        
        if (existingIndex >= 0) {
          const newData = [...prevData];
          newData[existingIndex] = {
            ...newData[existingIndex],
            ...update,
          };
          
          // Re-sort by rank
          newData.sort((a, b) => a.rank - b.rank);
          
          // Invalidate cache
          cacheRef.current.clear();
          
          return newData;
        }
        
        return prevData;
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [realTime, realTimeContext]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchLeaderboard();
    }
  }, [autoFetch]);

  // Get top N users
  const getTopUsers = useCallback(
    (n: number): LeaderboardUser[] => {
      return data.slice(0, n);
    },
    [data]
  );

  // Check if user is in top N
  const isUserInTop = useCallback(
    (userId: string, n: number): boolean => {
      const user = data.find((u) => u.userId === userId);
      return user ? user.rank <= n : false;
    },
    [data]
  );

  return {
    // Data
    data,
    loading,
    error,
    filter,
    currentUserId,

    // Actions
    fetchLeaderboard,
    refresh,
    changeFilter,
    setCurrentUserId,

    // Helpers
    getCurrentUserRank,
    getTopUsers,
    isUserInTop,
  };
}
