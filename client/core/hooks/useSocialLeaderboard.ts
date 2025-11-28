import { useState, useEffect, useCallback } from 'react';
import { socialGamificationService } from '@/core/api';

/**
 * Leaderboard entry from API (internal to this hook)
 * Note: The canonical LeaderboardEntry type is in query.types.ts
 */
interface SocialLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  socialXp: number;
}

/**
 * User position in leaderboard
 */
export interface UserPosition {
  rank: number;
  socialXp: number;
  percentile: number;
}

/**
 * API response format
 */
interface SocialLeaderboardResponse {
  entries: Array<{
    rank: number;
    user_id: string;
    username: string;
    avatar_url?: string;
    social_xp: number;
  }>;
  user_position?: {
    rank: number;
    social_xp: number;
    percentile: number;
  };
  period: string;
  limit: number;
}

interface UseSocialLeaderboardOptions {
  /** Period filter */
  period?: 'alltime' | 'monthly';
  /** Number of entries to fetch */
  limit?: number;
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Whether to fetch on mount */
  fetchOnMount?: boolean;
}

interface UseSocialLeaderboardResult {
  /** Leaderboard entries */
  entries: SocialLeaderboardEntry[];
  /** Current user's position */
  userPosition: UserPosition | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually refresh the leaderboard */
  refresh: () => Promise<void>;
  /** Current period */
  period: 'alltime' | 'monthly';
  /** Set period and refetch */
  setPeriod: (period: 'alltime' | 'monthly') => void;
}

/** Cache duration in ms */
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/** Cached data */
let cachedData: {
  entries: SocialLeaderboardEntry[];
  userPosition: UserPosition | null;
  period: string;
  timestamp: number;
} | null = null;

/**
 * Hook for fetching social leaderboard data
 * T060: Provides leaderboard data with caching and refresh
 */
export function useSocialLeaderboard(options: UseSocialLeaderboardOptions = {}): UseSocialLeaderboardResult {
  const {
    period: initialPeriod = 'alltime',
    limit = 20,
    refreshInterval = 0,
    fetchOnMount = true,
  } = options;

  const [entries, setEntries] = useState<SocialLeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriodState] = useState<'alltime' | 'monthly'>(initialPeriod);

  const fetchLeaderboard = useCallback(async () => {
    // Check cache
    if (
      cachedData &&
      cachedData.period === period &&
      Date.now() - cachedData.timestamp < CACHE_DURATION
    ) {
      setEntries(cachedData.entries);
      setUserPosition(cachedData.userPosition);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await socialGamificationService.getSocialLeaderboard({
        period,
        limit,
      });

      // Transform API response to our format
      const transformedEntries: SocialLeaderboardEntry[] = (response.entries || []).map((entry: SocialLeaderboardResponse['entries'][0]) => ({
        rank: entry.rank,
        userId: entry.user_id,
        username: entry.username,
        avatarUrl: entry.avatar_url,
        socialXp: entry.social_xp,
      }));

      const transformedPosition: UserPosition | null = response.user_position
        ? {
            rank: response.user_position.rank,
            socialXp: response.user_position.social_xp,
            percentile: response.user_position.percentile,
          }
        : null;

      setEntries(transformedEntries);
      setUserPosition(transformedPosition);

      // Update cache
      cachedData = {
        entries: transformedEntries,
        userPosition: transformedPosition,
        period,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error('Failed to fetch social leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period, limit]);

  const refresh = useCallback(async () => {
    // Clear cache to force refresh
    cachedData = null;
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  const setPeriod = useCallback((newPeriod: 'alltime' | 'monthly') => {
    setPeriodState(newPeriod);
    // Clear cache when period changes
    cachedData = null;
  }, []);

  // Fetch on mount
  useEffect(() => {
    if (fetchOnMount) {
      fetchLeaderboard();
    }
  }, [fetchOnMount, fetchLeaderboard]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchLeaderboard();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchLeaderboard]);

  return {
    entries,
    userPosition,
    loading,
    error,
    refresh,
    period,
    setPeriod,
  };
}

export default useSocialLeaderboard;
