/**
 * Learning Leaderboard Hook
 *
 * React hook for managing learning leaderboard data with caching and filters.
 * 006-course-gamification T065: Learning leaderboard state management
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { learningGamificationService, LearningLeaderboardResponse } from '../services/learning-gamification.service';
import type { LearningLeaderboardEntry, LeaderboardTimeframe } from '../types/learning-gamification.types';

// Re-export for consumers who import from hooks
export type { LeaderboardTimeframe };

/**
 * Leaderboard filter state
 */
interface LeaderboardFilters {
  timeframe: LeaderboardTimeframe;
  courseId?: string;
}

/**
 * Leaderboard state
 */
interface LeaderboardState {
  entries: LearningLeaderboardEntry[];
  userRank: LearningLeaderboardEntry | null;
  totalUsers: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook return type
 */
interface UseLearningLeaderboardReturn extends LeaderboardState {
  /** Current filters */
  filters: LeaderboardFilters;
  /** Set timeframe filter */
  setTimeframe: (timeframe: LeaderboardTimeframe) => void;
  /** Set course filter for course-specific leaderboard */
  setCourseId: (courseId: string | undefined) => void;
  /** Clear course filter to show global leaderboard */
  clearCourseFilter: () => void;
  /** Refresh leaderboard data */
  refresh: () => Promise<void>;
  /** Check if user is in top N */
  isUserInTopN: (n: number) => boolean;
  /** Get user's position message */
  getUserPositionMessage: () => string;
}

/** Cache duration in milliseconds (2 minutes for leaderboard) */
const CACHE_DURATION_MS = 2 * 60 * 1000;

/**
 * Hook for learning leaderboard data management
 *
 * @example
 * ```tsx
 * function LeaderboardPage() {
 *   const { entries, userRank, loading, setTimeframe, filters } = useLearningLeaderboard();
 *
 *   return (
 *     <View>
 *       <TimeframeSelector value={filters.timeframe} onChange={setTimeframe} />
 *       {loading ? <Spinner /> : <LeaderboardList entries={entries} userRank={userRank} />}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLearningLeaderboard(initialCourseId?: string): UseLearningLeaderboardReturn {
  const [state, setState] = useState<LeaderboardState>({
    entries: [],
    userRank: null,
    totalUsers: 0,
    loading: true,
    error: null,
  });

  const [filters, setFilters] = useState<LeaderboardFilters>({
    timeframe: 'weekly',
    courseId: initialCourseId,
  });

  // Cache timestamp
  const cacheTimestamp = useRef<number>(0);
  const lastFilters = useRef<string>('');

  /**
   * Fetch leaderboard data
   */
  const fetchLeaderboard = useCallback(async (force = false) => {
    const filterKey = JSON.stringify(filters);

    // Check cache validity
    if (!force && filterKey === lastFilters.current && Date.now() - cacheTimestamp.current < CACHE_DURATION_MS) {
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      let response: LearningLeaderboardResponse;

      if (filters.courseId) {
        // Course-specific leaderboard
        response = await learningGamificationService.getCourseLeaderboard(filters.courseId, {
          timeframe: filters.timeframe,
          limit: 50,
        });
      } else {
        // Global learning leaderboard
        response = await learningGamificationService.getLeaderboard({
          timeframe: filters.timeframe,
          limit: 50,
        });
      }

      setState({
        entries: response.entries || [],
        userRank: response.userRank || null,
        totalUsers: response.totalUsers || response.entries?.length || 0,
        loading: false,
        error: null,
      });

      cacheTimestamp.current = Date.now();
      lastFilters.current = filterKey;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load leaderboard';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [filters]);

  /**
   * Set timeframe filter
   */
  const setTimeframe = useCallback((timeframe: LeaderboardTimeframe) => {
    setFilters((prev) => ({ ...prev, timeframe }));
  }, []);

  /**
   * Set course filter
   */
  const setCourseId = useCallback((courseId: string | undefined) => {
    setFilters((prev) => ({ ...prev, courseId }));
  }, []);

  /**
   * Clear course filter
   */
  const clearCourseFilter = useCallback(() => {
    setFilters((prev) => ({ ...prev, courseId: undefined }));
  }, []);

  /**
   * Refresh leaderboard data
   */
  const refresh = useCallback(async () => {
    await fetchLeaderboard(true);
  }, [fetchLeaderboard]);

  /**
   * Check if user is in top N
   */
  const isUserInTopN = useCallback(
    (n: number): boolean => {
      if (!state.userRank) return false;
      return state.userRank.rank <= n;
    },
    [state.userRank]
  );

  /**
   * Get user's position message
   */
  const getUserPositionMessage = useCallback((): string => {
    if (!state.userRank) return 'Not ranked yet';
    
    const { rank, total_xp } = state.userRank;
    const totalUsers = state.totalUsers || state.entries.length;

    if (rank === 1) return '🥇 You\'re #1!';
    if (rank === 2) return '🥈 You\'re #2!';
    if (rank === 3) return '🥉 You\'re #3!';
    if (rank <= 10) return `🔥 Top 10! You're #${rank}`;
    if (rank <= 50) return `💪 Top 50! You're #${rank}`;
    
    const percentile = Math.round(((totalUsers - rank) / totalUsers) * 100);
    return `You're #${rank} (top ${percentile}%)`;
  }, [state.userRank, state.totalUsers, state.entries.length]);

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    ...state,
    filters,
    setTimeframe,
    setCourseId,
    clearCourseFilter,
    refresh,
    isUserInTopN,
    getUserPositionMessage,
  };
}

export default useLearningLeaderboard;
