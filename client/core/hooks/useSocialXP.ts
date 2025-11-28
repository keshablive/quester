/**
 * Social XP Hook
 * 
 * React hook for managing social XP data with caching and real-time updates.
 * FR-003: XP display and tracking
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  socialGamificationService,
  SocialXPSummary,
  SocialXPTransaction,
  DailyChallenge,
  ContentMilestone,
  LeaderboardEntry,
  LeaderboardResponse,
} from '../api/services/social-gamification.service';
import { useXPNotification } from './useXPNotification';

/**
 * Social XP state
 */
interface SocialXPState {
  summary: SocialXPSummary | null;
  transactions: SocialXPTransaction[];
  challenges: DailyChallenge[];
  milestones: ContentMilestone[];
  leaderboard: LeaderboardResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Social XP hook return type
 */
interface UseSocialXPReturn extends SocialXPState {
  /** Refresh XP summary */
  refreshSummary: () => Promise<void>;
  /** Refresh daily challenges */
  refreshChallenges: () => Promise<void>;
  /** Refresh milestones */
  refreshMilestones: () => Promise<void>;
  /** Refresh leaderboard */
  refreshLeaderboard: (params?: { page?: number; timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time' }) => Promise<void>;
  /** Load more transactions */
  loadMoreTransactions: () => Promise<void>;
  /** Check if there are more transactions to load */
  hasMoreTransactions: boolean;
  /** Handle XP award from social action (updates state and shows notification) */
  handleXPAwarded: (xpAmount: number, actionType: string, description?: string) => void;
  /** Previous XP value for animation */
  previousXP: number | undefined;
}

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Transactions page size */
const TRANSACTIONS_PAGE_SIZE = 20;

/**
 * Hook for social XP data management
 */
export function useSocialXP(): UseSocialXPReturn {
  const [state, setState] = useState<SocialXPState>({
    summary: null,
    transactions: [],
    challenges: [],
    milestones: [],
    leaderboard: null,
    loading: true,
    error: null,
  });

  const [previousXP, setPreviousXP] = useState<number | undefined>(undefined);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  
  const { addNotification } = useXPNotification();
  
  // Cache timestamps
  const cacheTimestamps = useRef<{
    summary: number;
    challenges: number;
    milestones: number;
    leaderboard: number;
  }>({
    summary: 0,
    challenges: 0,
    milestones: 0,
    leaderboard: 0,
  });

  /**
   * Check if cache is valid
   */
  const isCacheValid = useCallback((key: keyof typeof cacheTimestamps.current): boolean => {
    return Date.now() - cacheTimestamps.current[key] < CACHE_DURATION_MS;
  }, []);

  /**
   * Refresh XP summary
   */
  const refreshSummary = useCallback(async (force = false) => {
    if (!force && isCacheValid('summary') && state.summary) {
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const summary = await socialGamificationService.getXPSummary();
      
      // Track previous value for animation
      if (state.summary) {
        setPreviousXP(state.summary.totalSocialXP);
      }
      
      setState(prev => ({ ...prev, summary, loading: false }));
      cacheTimestamps.current.summary = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load XP summary';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [isCacheValid, state.summary]);

  /**
   * Refresh daily challenges
   */
  const refreshChallenges = useCallback(async (force = false) => {
    if (!force && isCacheValid('challenges') && state.challenges.length > 0) {
      return;
    }

    try {
      const challenges = await socialGamificationService.getDailyChallenges();
      setState(prev => ({ ...prev, challenges }));
      cacheTimestamps.current.challenges = Date.now();
    } catch (error) {
      console.error('Failed to load daily challenges:', error);
    }
  }, [isCacheValid, state.challenges.length]);

  /**
   * Refresh milestones
   */
  const refreshMilestones = useCallback(async (force = false) => {
    if (!force && isCacheValid('milestones') && state.milestones.length > 0) {
      return;
    }

    try {
      const milestones = await socialGamificationService.getMilestones();
      setState(prev => ({ ...prev, milestones }));
      cacheTimestamps.current.milestones = Date.now();
    } catch (error) {
      console.error('Failed to load milestones:', error);
    }
  }, [isCacheValid, state.milestones.length]);

  /**
   * Refresh leaderboard
   */
  const refreshLeaderboard = useCallback(async (params?: {
    page?: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  }) => {
    try {
      const leaderboard = await socialGamificationService.getLeaderboard({
        page: params?.page || 1,
        limit: 20,
        timeframe: params?.timeframe || 'weekly',
      });
      setState(prev => ({ ...prev, leaderboard }));
      cacheTimestamps.current.leaderboard = Date.now();
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  }, []);

  /**
   * Load more transactions
   */
  const loadMoreTransactions = useCallback(async () => {
    if (!hasMoreTransactions) return;

    try {
      const response = await socialGamificationService.getXPTransactions({
        page: transactionsPage,
        limit: TRANSACTIONS_PAGE_SIZE,
      });

      setState(prev => ({
        ...prev,
        transactions: transactionsPage === 1 
          ? response.transactions 
          : [...prev.transactions, ...response.transactions],
      }));

      setHasMoreTransactions(response.transactions.length === TRANSACTIONS_PAGE_SIZE);
      setTransactionsPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, [transactionsPage, hasMoreTransactions]);

  /**
   * Handle XP awarded from social action
   * Updates local state optimistically and shows notification
   */
  const handleXPAwarded = useCallback((
    xpAmount: number,
    actionType: string,
    description?: string
  ) => {
    // Show notification
    addNotification({
      amount: xpAmount,
      type: actionType as any,
      message: description,
    });

    // Optimistically update summary
    setState(prev => {
      if (!prev.summary) return prev;
      
      setPreviousXP(prev.summary.totalSocialXP);
      
      return {
        ...prev,
        summary: {
          ...prev.summary,
          totalSocialXP: prev.summary.totalSocialXP + xpAmount,
          lastActivityAt: new Date().toISOString(),
        },
      };
    });

    // Refresh from server after a short delay to sync
    setTimeout(() => {
      refreshSummary(true);
      refreshChallenges(true);
    }, 2000);
  }, [addNotification, refreshSummary, refreshChallenges]);

  /**
   * Initial data load
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      
      try {
        // Load summary and challenges in parallel
        const [summary, challenges] = await Promise.all([
          socialGamificationService.getXPSummary(),
          socialGamificationService.getDailyChallenges(),
        ]);

        setState(prev => ({
          ...prev,
          summary,
          challenges,
          loading: false,
        }));

        cacheTimestamps.current.summary = Date.now();
        cacheTimestamps.current.challenges = Date.now();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load XP data';
        setState(prev => ({ ...prev, loading: false, error: message }));
      }
    };

    loadInitialData();
  }, []);

  return {
    ...state,
    refreshSummary: () => refreshSummary(true),
    refreshChallenges: () => refreshChallenges(true),
    refreshMilestones: () => refreshMilestones(true),
    refreshLeaderboard,
    loadMoreTransactions,
    hasMoreTransactions,
    handleXPAwarded,
    previousXP,
  };
}

/**
 * Hook for just the XP counter display (lightweight)
 */
export function useXPCounter() {
  const [xp, setXP] = useState<number>(0);
  const [previousXP, setPreviousXP] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadXP = async () => {
      try {
        const summary = await socialGamificationService.getXPSummary();
        setXP(summary.totalSocialXP);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load XP:', error);
        setLoading(false);
      }
    };

    loadXP();
  }, []);

  const updateXP = useCallback((newXP: number) => {
    setPreviousXP(xp);
    setXP(newXP);
  }, [xp]);

  const incrementXP = useCallback((amount: number) => {
    setPreviousXP(xp);
    setXP(prev => prev + amount);
  }, [xp]);

  return {
    xp,
    previousXP,
    loading,
    updateXP,
    incrementXP,
  };
}

export default useSocialXP;
