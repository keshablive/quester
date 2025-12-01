/**
 * Learning Challenges Hook
 *
 * React hook for managing daily learning challenges with progress tracking,
 * completion handling, and celebration notifications.
 * 006-course-gamification T096
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { learningGamificationService } from '../services/learning-gamification.service';
import type {
  DailyLearningChallenge,
  ChallengeStatus,
} from '../types/learning-gamification.types';

/**
 * Challenge filter type
 */
export type ChallengeFilter = 'all' | 'active' | 'completed';

/**
 * Challenge completion celebration data
 */
export interface ChallengeCelebration {
  challenge: DailyLearningChallenge;
  xpAwarded: number;
}

/**
 * Challenges state
 */
interface ChallengesState {
  challenges: DailyLearningChallenge[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

/**
 * Hook return type
 */
interface UseLearningChallengesReturn extends Omit<ChallengesState, 'lastRefresh'> {
  /** Filtered challenges based on filter type */
  filteredChallenges: DailyLearningChallenge[];
  /** Current filter */
  filter: ChallengeFilter;
  /** Set the challenge filter */
  setFilter: (filter: ChallengeFilter) => void;
  /** Active challenges count */
  activeChallengesCount: number;
  /** Completed challenges count */
  completedChallengesCount: number;
  /** Total XP available from active challenges */
  totalAvailableXP: number;
  /** Total XP earned from completed challenges */
  earnedXP: number;
  /** Overall completion percentage */
  overallProgress: number;
  /** Time until challenges reset */
  timeUntilReset: string | null;
  /** Refresh challenges from API */
  refresh: () => Promise<void>;
  /** Get a specific challenge by ID */
  getChallengeById: (id: string) => DailyLearningChallenge | undefined;
  /** Celebration data when a challenge is completed (null when none) */
  celebration: ChallengeCelebration | null;
  /** Dismiss the celebration modal */
  dismissCelebration: () => void;
  /** Update challenge progress locally (for optimistic updates) */
  updateProgress: (challengeId: string, progress: number) => void;
}

/** Cache duration in milliseconds (1 minute) */
const CACHE_DURATION_MS = 1 * 60 * 1000;

/**
 * Calculate time until midnight (challenge reset)
 */
function getTimeUntilReset(): string | null {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  
  const diff = midnight.getTime() - now.getTime();
  if (diff <= 0) return null;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Hook for managing daily learning challenges
 *
 * @example
 * ```tsx
 * function ChallengesPage() {
 *   const {
 *     filteredChallenges,
 *     filter,
 *     setFilter,
 *     activeChallengesCount,
 *     overallProgress,
 *     celebration,
 *     dismissCelebration,
 *   } = useLearningChallenges();
 *
 *   return (
 *     <View>
 *       <FilterTabs value={filter} onChange={setFilter} />
 *       <Text>Progress: {overallProgress}%</Text>
 *       {filteredChallenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
 *       {celebration && (
 *         <CelebrationModal challenge={celebration} onDismiss={dismissCelebration} />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLearningChallenges(): UseLearningChallengesReturn {
  const [state, setState] = useState<ChallengesState>({
    challenges: [],
    loading: true,
    error: null,
    lastRefresh: null,
  });

  const [filter, setFilter] = useState<ChallengeFilter>('all');
  const [celebration, setCelebration] = useState<ChallengeCelebration | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string | null>(getTimeUntilReset());

  const cacheRef = useRef<{
    data: DailyLearningChallenge[];
    timestamp: number;
  }>({
    data: [],
    timestamp: 0,
  });

  // Track previous completion state to detect new completions
  const prevCompletedRef = useRef<Set<string>>(new Set());

  /**
   * Fetch challenges from API
   */
  const fetchChallenges = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Check cache validity
    if (
      !forceRefresh &&
      cacheRef.current.data.length > 0 &&
      now - cacheRef.current.timestamp < CACHE_DURATION_MS
    ) {
      setState((prev) => ({
        ...prev,
        challenges: cacheRef.current.data,
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const challenges = await learningGamificationService.getDailyChallenges();

      // Check for newly completed challenges
      const currentCompleted = new Set(
        challenges.filter((c) => c.status === 'completed').map((c) => c.id)
      );

      // Find challenges that are now completed but weren't before
      currentCompleted.forEach((id) => {
        if (!prevCompletedRef.current.has(id)) {
          const challenge = challenges.find((c) => c.id === id);
          if (challenge) {
            setCelebration({
              challenge,
              xpAwarded: challenge.xp_reward,
            });
          }
        }
      });

      // Update previous completed ref
      prevCompletedRef.current = currentCompleted;

      // Update cache
      cacheRef.current = {
        data: challenges,
        timestamp: now,
      };

      setState({
        challenges,
        loading: false,
        error: null,
        lastRefresh: new Date(),
      });
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load challenges',
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Update time until reset every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilReset());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Refresh challenges
   */
  const refresh = useCallback(async () => {
    await fetchChallenges(true);
  }, [fetchChallenges]);

  /**
   * Get challenge by ID
   */
  const getChallengeById = useCallback(
    (id: string): DailyLearningChallenge | undefined => {
      return state.challenges.find((c) => c.id === id);
    },
    [state.challenges]
  );

  /**
   * Dismiss celebration
   */
  const dismissCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  /**
   * Update challenge progress locally (optimistic update)
   */
  const updateProgress = useCallback((challengeId: string, progress: number) => {
    setState((prev) => {
      const updatedChallenges = prev.challenges.map((c) => {
        if (c.id !== challengeId) return c;

        const completed = progress >= c.target_value;
        const newStatus: ChallengeStatus = completed ? 'completed' : 'active';

        // Trigger celebration if newly completed
        if (completed && c.status !== 'completed') {
          setCelebration({
            challenge: { ...c, status: newStatus, current_progress: progress },
            xpAwarded: c.xp_reward,
          });
          prevCompletedRef.current.add(c.id);
        }

        return {
          ...c,
          current_progress: Math.min(progress, c.target_value),
          progress_pct: Math.min(100, (progress / c.target_value) * 100),
          status: newStatus,
        };
      });

      // Update cache
      cacheRef.current.data = updatedChallenges;

      return {
        ...prev,
        challenges: updatedChallenges,
      };
    });
  }, []);

  // Filtered challenges
  const filteredChallenges = useMemo(() => {
    switch (filter) {
      case 'active':
        return state.challenges.filter((c) => c.status === 'active');
      case 'completed':
        return state.challenges.filter((c) => c.status === 'completed');
      default:
        return state.challenges;
    }
  }, [state.challenges, filter]);

  // Computed values
  const activeChallengesCount = state.challenges.filter((c) => c.status === 'active').length;
  const completedChallengesCount = state.challenges.filter((c) => c.status === 'completed').length;

  const totalAvailableXP = state.challenges
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + c.xp_reward, 0);

  const earnedXP = state.challenges
    .filter((c) => c.status === 'completed')
    .reduce((sum, c) => sum + c.xp_reward, 0);

  const overallProgress = state.challenges.length > 0
    ? Math.round((completedChallengesCount / state.challenges.length) * 100)
    : 0;

  return {
    // State
    challenges: state.challenges,
    loading: state.loading,
    error: state.error,
    // Filtered
    filteredChallenges,
    filter,
    setFilter,
    // Counts and stats
    activeChallengesCount,
    completedChallengesCount,
    totalAvailableXP,
    earnedXP,
    overallProgress,
    timeUntilReset,
    // Actions
    refresh,
    getChallengeById,
    celebration,
    dismissCelebration,
    updateProgress,
  };
}

export default useLearningChallenges;
