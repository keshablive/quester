/**
 * Learning XP Hook
 * 
 * React hook for managing learning XP data with caching and real-time updates.
 * 006-course-gamification T037: Learning XP state management
 * 006-course-gamification T048: Level-up modal integration
 * 006-course-gamification T056: Achievement unlock integration
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  learningGamificationService,
} from '../services/learning-gamification.service';
import type {
  PaginatedResponse,
  LearningXPSummary,
  LearningXPTransaction,
  LearningStreakInfo,
  DailyLearningChallenge,
  LearningLevel,
  LearningXPAwardResult as ApiXPAwardResult,
  UnlockedAchievement,
} from '../types/learning-gamification.types';
import { useXPNotification } from './useXPNotification';
import { useAchievementNotification, AchievementNotificationData } from './useAchievementNotification';

/**
 * Learning XP state
 */
interface LearningXPState {
  summary: LearningXPSummary | null;
  transactions: LearningXPTransaction[];
  streak: LearningStreakInfo | null;
  challenges: DailyLearningChallenge[];
  currentLevel: LearningLevel | null;
  loading: boolean;
  error: string | null;
}

/**
 * Level-up modal state
 */
export interface LevelUpModalState {
  visible: boolean;
  level: number;
  levelName: string;
  totalXP?: number;
}

/**
 * Streak milestone modal state (T079)
 */
export interface StreakMilestoneModalState {
  visible: boolean;
  currentStreak: number;
  xpReward: number;
  milestoneName: string;
  milestoneDays: number;
}

/**
 * XP Award result from lesson/course completion (camelCase version for hook consumers)
 * Note: This interface uses camelCase for consumer convenience,
 * transform API response (snake_case) before calling handleXPAwarded
 */
export interface XPAwardHandlerResult {
  xpAwarded: number;
  newTotalXP: number;
  isDuplicate?: boolean;
  leveledUp?: boolean;
  newLevel?: number;
  newLevelName?: string;
  streakUpdated?: boolean;
  currentStreak?: number;
  streakMilestoneXP?: number;
  achievementsUnlocked?: UnlockedAchievement[];
  challengesUpdated?: Array<{
    challengeId: string;
    challengeName: string;
    currentProgress: number;
    targetValue: number;
    completed: boolean;
    xpAwarded?: number;
  }>;
}

/**
 * Learning XP hook return type
 */
interface UseLearningXPReturn extends LearningXPState {
  /** Refresh XP summary */
  refreshSummary: () => Promise<void>;
  /** Refresh streak info */
  refreshStreak: () => Promise<void>;
  /** Refresh daily challenges */
  refreshChallenges: () => Promise<void>;
  /** Load more transactions */
  loadMoreTransactions: () => Promise<void>;
  /** Check if there are more transactions to load */
  hasMoreTransactions: boolean;
  /** Handle XP award from lesson/course completion */
  handleXPAwarded: (result: XPAwardHandlerResult) => void;
  /** Previous XP value for animation */
  previousXP: number | undefined;
  /** Refresh all data */
  refreshAll: () => Promise<void>;
  /** Level-up modal state */
  levelUpModal: LevelUpModalState;
  /** Close level-up modal */
  closeLevelUpModal: () => void;
  /** Streak milestone modal state (T079) */
  streakMilestoneModal: StreakMilestoneModalState;
  /** Close streak milestone modal */
  closeStreakMilestoneModal: () => void;
}

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Transactions page size */
const TRANSACTIONS_PAGE_SIZE = 20;

/**
 * Hook for learning XP data management
 * 
 * @example
 * ```tsx
 * function LearningDashboard() {
 *   const { summary, streak, loading, refreshSummary } = useLearningXP();
 *   
 *   if (loading) return <LoadingSpinner />;
 *   
 *   return (
 *     <View>
 *       <Text>Total XP: {summary?.totalXP}</Text>
 *       <Text>Level: {summary?.levelName}</Text>
 *       <Text>Streak: {streak?.currentStreak} days</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useLearningXP(): UseLearningXPReturn {
  const [state, setState] = useState<LearningXPState>({
    summary: null,
    transactions: [],
    streak: null,
    challenges: [],
    currentLevel: null,
    loading: true,
    error: null,
  });

  const [previousXP, setPreviousXP] = useState<number | undefined>(undefined);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  
  // Level-up modal state (T048)
  const [levelUpModal, setLevelUpModal] = useState<LevelUpModalState>({
    visible: false,
    level: 0,
    levelName: '',
    totalXP: undefined,
  });
  
  // Streak milestone modal state (T079)
  const [streakMilestoneModal, setStreakMilestoneModal] = useState<StreakMilestoneModalState>({
    visible: false,
    currentStreak: 0,
    xpReward: 0,
    milestoneName: '',
    milestoneDays: 0,
  });
  
  const { addNotification } = useXPNotification();
  const { addAchievementNotification } = useAchievementNotification();
  
  // Cache timestamps
  const cacheTimestamps = useRef<{
    summary: number;
    streak: number;
    challenges: number;
  }>({
    summary: 0,
    streak: 0,
    challenges: 0,
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
      const summary = await learningGamificationService.getXPSummary();
      
      // Track previous value for animation
      if (state.summary) {
        setPreviousXP(state.summary.total_xp);
      }
      
      setState(prev => ({ ...prev, summary, loading: false }));
      cacheTimestamps.current.summary = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load XP summary';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [isCacheValid, state.summary]);

  /**
   * Refresh streak info
   */
  const refreshStreak = useCallback(async (force = false) => {
    if (!force && isCacheValid('streak') && state.streak) {
      return;
    }

    try {
      const streak = await learningGamificationService.getStreak();
      setState(prev => ({ ...prev, streak }));
      cacheTimestamps.current.streak = Date.now();
    } catch (error) {
      console.error('Failed to load streak info:', error);
    }
  }, [isCacheValid, state.streak]);

  /**
   * Refresh daily challenges
   */
  const refreshChallenges = useCallback(async (force = false) => {
    if (!force && isCacheValid('challenges') && state.challenges.length > 0) {
      return;
    }

    try {
      const challenges = await learningGamificationService.getDailyChallenges();
      setState(prev => ({ ...prev, challenges }));
      cacheTimestamps.current.challenges = Date.now();
    } catch (error) {
      console.error('Failed to load daily challenges:', error);
    }
  }, [isCacheValid, state.challenges.length]);

  /**
   * Load more transactions
   */
  const loadMoreTransactions = useCallback(async () => {
    if (!hasMoreTransactions) return;

    try {
      const response = await learningGamificationService.getXPTransactions({
        page: transactionsPage,
        limit: TRANSACTIONS_PAGE_SIZE,
      });

      setState(prev => ({
        ...prev,
        transactions: transactionsPage === 1 
          ? response.data 
          : [...prev.transactions, ...response.data],
      }));

      // Calculate hasMore from pagination data
      const hasMore = response.page < response.total_pages;
      setHasMoreTransactions(hasMore);
      setTransactionsPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, [transactionsPage, hasMoreTransactions]);

  /**
   * Handle XP awarded from lesson/course completion
   * Updates local state optimistically and shows notification
   * T056: Achievement unlock integration
   */
  const handleXPAwarded = useCallback((result: XPAwardHandlerResult) => {
    // Don't process duplicates
    if (result.isDuplicate) return;

    // Show XP notification (T039)
    addNotification({
      amount: result.xpAwarded,
      type: 'achievement', // Use achievement type for learning XP
      message: result.leveledUp 
        ? `Level Up! You reached ${result.newLevelName}!`
        : 'Lesson completed!',
    });

    // Show level-up modal if leveled up (T048)
    if (result.leveledUp && result.newLevel && result.newLevelName) {
      setLevelUpModal({
        visible: true,
        level: result.newLevel,
        levelName: result.newLevelName,
        totalXP: result.newTotalXP,
      });
    }

    // Show achievement unlock modals (T056)
    if (result.achievementsUnlocked && result.achievementsUnlocked.length > 0) {
      for (const achievement of result.achievementsUnlocked) {
        // Map rarity to difficulty for the modal
        const difficultyMap: Record<string, 'easy' | 'medium' | 'hard' | 'legendary'> = {
          'COMMON': 'easy',
          'UNCOMMON': 'easy',
          'RARE': 'medium',
          'EPIC': 'hard',
          'LEGENDARY': 'legendary',
        };

        const notificationData: AchievementNotificationData = {
          id: achievement.badge_id,
          name: achievement.badge_name,
          description: achievement.description,
          iconUrl: achievement.icon_url,
          xpReward: achievement.xp_awarded,
          difficulty: difficultyMap[achievement.rarity] || 'easy',
          category: 'learning',
          unlockedAt: new Date().toISOString(),
        };

        addAchievementNotification(notificationData);
      }
    }

    // Show streak milestone modal if applicable (T079)
    if (result.streakMilestoneXP && result.streakMilestoneXP > 0 && result.currentStreak) {
      // Determine milestone name based on streak count
      const milestoneNames: Record<number, string> = {
        7: '1 Week Warrior',
        14: '2 Week Champion',
        30: 'Monthly Master',
        60: 'Double Month Hero',
        100: 'Century Legend',
      };
      
      const milestoneDays = Object.keys(milestoneNames)
        .map(Number)
        .find(days => days === result.currentStreak) || result.currentStreak;
      
      setStreakMilestoneModal({
        visible: true,
        currentStreak: result.currentStreak,
        xpReward: result.streakMilestoneXP,
        milestoneName: milestoneNames[result.currentStreak] || `${result.currentStreak} Day Streak`,
        milestoneDays: milestoneDays,
      });

      // Also show toast notification
      addNotification({
        amount: result.streakMilestoneXP,
        type: 'milestone',
        message: `${result.currentStreak} day streak! Bonus XP earned!`,
      });
    }

    // Show challenge completion notifications
    if (result.challengesUpdated) {
      for (const challenge of result.challengesUpdated) {
        if (challenge.completed && challenge.xpAwarded) {
          addNotification({
            amount: challenge.xpAwarded,
            type: 'challenge',
            message: `Challenge Complete: ${challenge.challengeName}`,
          });
        }
      }
    }

    // Optimistically update summary
    setState(prev => {
      if (!prev.summary) return prev;
      
      setPreviousXP(prev.summary.total_xp);
      
      return {
        ...prev,
        summary: {
          ...prev.summary,
          total_xp: result.newTotalXP,
          level: result.newLevel || prev.summary.level,
          level_name: result.newLevelName || prev.summary.level_name,
        },
        streak: result.streakUpdated && prev.streak
          ? {
              ...prev.streak,
              current_streak: result.currentStreak || prev.streak.current_streak,
              has_activity_today: true,
            }
          : prev.streak,
        challenges: prev.challenges.map(c => {
          const update = result.challengesUpdated?.find(u => u.challengeId === c.id);
          if (update) {
            return {
              ...c,
              current_progress: update.currentProgress,
              is_completed: update.completed,
            };
          }
          return c;
        }),
      };
    });

    // Refresh from server after a short delay to sync
    setTimeout(() => {
      refreshSummary(true);
      refreshStreak(true);
      refreshChallenges(true);
    }, 2000);
  }, [addNotification, addAchievementNotification, refreshSummary, refreshStreak, refreshChallenges]);

  /**
   * Close level-up modal (T048)
   */
  const closeLevelUpModal = useCallback(() => {
    setLevelUpModal(prev => ({ ...prev, visible: false }));
  }, []);

  /**
   * Close streak milestone modal (T079)
   */
  const closeStreakMilestoneModal = useCallback(() => {
    setStreakMilestoneModal(prev => ({ ...prev, visible: false }));
  }, []);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await Promise.all([
      refreshSummary(true),
      refreshStreak(true),
      refreshChallenges(true),
    ]);
    setState(prev => ({ ...prev, loading: false }));
  }, [refreshSummary, refreshStreak, refreshChallenges]);

  /**
   * Initial data load
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      
      try {
        const [summary, streak, challenges] = await Promise.all([
          learningGamificationService.getXPSummary(),
          learningGamificationService.getStreak(),
          learningGamificationService.getDailyChallenges(),
        ]);

        setState(prev => ({
          ...prev,
          summary,
          streak,
          challenges,
          loading: false,
          error: null,
        }));

        // Update cache timestamps
        const now = Date.now();
        cacheTimestamps.current.summary = now;
        cacheTimestamps.current.streak = now;
        cacheTimestamps.current.challenges = now;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load learning data';
        setState(prev => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    };

    loadInitialData();
  }, []);

  return {
    ...state,
    refreshSummary: () => refreshSummary(true),
    refreshStreak: () => refreshStreak(true),
    refreshChallenges: () => refreshChallenges(true),
    loadMoreTransactions,
    hasMoreTransactions,
    handleXPAwarded,
    previousXP,
    refreshAll,
    levelUpModal,
    closeLevelUpModal,
    streakMilestoneModal,
    closeStreakMilestoneModal,
  };
}

export default useLearningXP;
