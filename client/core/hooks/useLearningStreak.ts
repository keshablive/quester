/**
 * Learning Streak Hook
 *
 * React hook for managing learning streak data with caching and milestone tracking.
 * 006-course-gamification T076: Learning streak state management
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { learningGamificationService } from '../services/learning-gamification.service';
import type { LearningStreakInfo, LearningStreakMilestone } from '../types/learning-gamification.types';
import { STREAK_MILESTONES } from '../types/learning-gamification.types';

/**
 * Streak status for display
 */
export type StreakStatus = 'active' | 'at-risk' | 'broken' | 'new';

/**
 * Milestone celebration info
 */
export interface MilestoneReached {
  days: number;
  xpReward: number;
  name: string;
  isNew: boolean;
}

/**
 * Streak state
 */
interface StreakState {
  streakInfo: LearningStreakInfo | null;
  milestones: LearningStreakMilestone[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook return type
 */
interface UseLearningStreakReturn extends StreakState {
  /** Current streak count */
  currentStreak: number;
  /** Longest streak achieved */
  longestStreak: number;
  /** Status of the streak */
  status: StreakStatus;
  /** Whether the user has completed today's activity */
  completedToday: boolean;
  /** Days until next milestone */
  daysUntilNextMilestone: number;
  /** XP reward for next milestone */
  nextMilestoneXP: number;
  /** Progress percentage to next milestone */
  progressToNextMilestone: number;
  /** Check if a specific milestone has been reached */
  hasMilestone: (days: number) => boolean;
  /** Get milestone info for a specific day count */
  getMilestoneInfo: (days: number) => LearningStreakMilestone | null;
  /** Get list of upcoming milestones */
  upcomingMilestones: LearningStreakMilestone[];
  /** Get list of achieved milestones */
  achievedMilestones: LearningStreakMilestone[];
  /** Refresh streak data */
  refresh: () => Promise<void>;
  /** Get motivational message based on streak status */
  getMotivationalMessage: () => string;
  /** Check if grace period is available */
  graceAvailable: boolean;
}

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Default milestone definitions */
const DEFAULT_MILESTONES: LearningStreakMilestone[] = [
  { days: 7, xp_reward: 50, name: '1 Week Warrior', icon: '🔥' },
  { days: 14, xp_reward: 100, name: '2 Week Champion', icon: '💪' },
  { days: 30, xp_reward: 250, name: 'Monthly Master', icon: '🏆' },
  { days: 60, xp_reward: 500, name: 'Double Month Hero', icon: '⭐' },
  { days: 100, xp_reward: 1000, name: 'Century Legend', icon: '👑' },
];

/**
 * Get streak status based on streak info
 */
function getStreakStatus(info: LearningStreakInfo | null): StreakStatus {
  if (!info) return 'new';
  if (info.current_streak === 0) return 'broken';
  
  const lastActivity = new Date(info.last_activity_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastActivity.setHours(0, 0, 0, 0);
  
  const daysSinceActivity = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceActivity === 0) return 'active';
  if (daysSinceActivity === 1 && info.grace_period_available) return 'at-risk';
  if (info.current_streak > 0) return 'active';
  
  return 'broken';
}

/**
 * Check if user completed today's activity
 */
function checkCompletedToday(info: LearningStreakInfo | null): boolean {
  if (!info || !info.last_activity_date) return false;
  
  const lastActivity = new Date(info.last_activity_date);
  const today = new Date();
  
  return (
    lastActivity.getFullYear() === today.getFullYear() &&
    lastActivity.getMonth() === today.getMonth() &&
    lastActivity.getDate() === today.getDate()
  );
}

/**
 * Hook for learning streak data management
 *
 * @example
 * ```tsx
 * function StreakWidget() {
 *   const { 
 *     currentStreak, 
 *     status, 
 *     completedToday,
 *     daysUntilNextMilestone,
 *     getMotivationalMessage 
 *   } = useLearningStreak();
 *
 *   return (
 *     <View>
 *       <Text>🔥 {currentStreak} day streak</Text>
 *       <Text>{getMotivationalMessage()}</Text>
 *       {!completedToday && <Text>Complete a lesson to maintain your streak!</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLearningStreak(): UseLearningStreakReturn {
  const [state, setState] = useState<StreakState>({
    streakInfo: null,
    milestones: DEFAULT_MILESTONES,
    loading: true,
    error: null,
  });

  const cacheRef = useRef<{
    data: LearningStreakInfo | null;
    timestamp: number;
  }>({
    data: null,
    timestamp: 0,
  });

  /**
   * Fetch streak data from API
   */
  const fetchStreak = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Check cache validity
    if (
      !forceRefresh &&
      cacheRef.current.data &&
      now - cacheRef.current.timestamp < CACHE_DURATION_MS
    ) {
      setState((prev) => ({
        ...prev,
        streakInfo: cacheRef.current.data,
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [streakInfo, milestones] = await Promise.all([
        learningGamificationService.getStreak(),
        learningGamificationService.getStreakMilestones().catch(() => DEFAULT_MILESTONES),
      ]);

      // Update cache
      cacheRef.current = {
        data: streakInfo,
        timestamp: now,
      };

      setState({
        streakInfo,
        milestones: milestones.length > 0 ? milestones : DEFAULT_MILESTONES,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch streak:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load streak data',
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  /**
   * Refresh streak data
   */
  const refresh = useCallback(async () => {
    await fetchStreak(true);
  }, [fetchStreak]);

  /**
   * Check if milestone has been reached
   */
  const hasMilestone = useCallback(
    (days: number): boolean => {
      if (!state.streakInfo) return false;
      return state.streakInfo.longest_streak >= days;
    },
    [state.streakInfo]
  );

  /**
   * Get milestone info for a specific day count
   */
  const getMilestoneInfo = useCallback(
    (days: number): LearningStreakMilestone | null => {
      return state.milestones.find((m) => m.days === days) || null;
    },
    [state.milestones]
  );

  /**
   * Get upcoming milestones
   */
  const upcomingMilestones = state.milestones.filter(
    (m) => !state.streakInfo || state.streakInfo.current_streak < m.days
  );

  /**
   * Get achieved milestones
   */
  const achievedMilestones = state.milestones.filter(
    (m) => state.streakInfo && state.streakInfo.longest_streak >= m.days
  );

  /**
   * Get motivational message
   */
  const getMotivationalMessage = useCallback((): string => {
    const status = getStreakStatus(state.streakInfo);
    const streak = state.streakInfo?.current_streak || 0;
    const daysUntil = state.streakInfo?.days_until_next_milestone || 0;

    switch (status) {
      case 'new':
        return 'Start your learning journey today! 🚀';
      case 'broken':
        return "Time to rebuild! Every expert was once a beginner. 💪";
      case 'at-risk':
        return "⚠️ Don't lose your streak! Complete a lesson today.";
      case 'active':
        if (streak >= 100) {
          return "🏆 Incredible! You're a learning legend!";
        } else if (streak >= 30) {
          return '⭐ Amazing consistency! Keep the momentum!';
        } else if (daysUntil <= 3) {
          return `🔥 Just ${daysUntil} days until your next milestone!`;
        } else if (streak >= 7) {
          return "💪 You're on fire! Great progress!";
        } else {
          return '🌟 Great start! Keep going!';
        }
      default:
        return 'Keep learning, keep growing! 📚';
    }
  }, [state.streakInfo]);

  // Derived values
  const currentStreak = state.streakInfo?.current_streak || 0;
  const longestStreak = state.streakInfo?.longest_streak || 0;
  const status = getStreakStatus(state.streakInfo);
  const completedToday = checkCompletedToday(state.streakInfo);
  const daysUntilNextMilestone = state.streakInfo?.days_until_next_milestone || 7;
  const nextMilestoneXP = state.streakInfo?.next_milestone_xp || STREAK_MILESTONES[7] || 50;
  const graceAvailable = state.streakInfo?.grace_period_available || false;

  // Calculate progress to next milestone
  const nextMilestoneDays = state.streakInfo?.next_milestone_days || 7;
  const previousMilestoneDays = achievedMilestones.length > 0 
    ? achievedMilestones[achievedMilestones.length - 1].days 
    : 0;
  const progressRange = nextMilestoneDays - previousMilestoneDays;
  const currentProgress = currentStreak - previousMilestoneDays;
  const progressToNextMilestone = progressRange > 0 
    ? Math.min(100, (currentProgress / progressRange) * 100) 
    : 0;

  return {
    // State
    streakInfo: state.streakInfo,
    milestones: state.milestones,
    loading: state.loading,
    error: state.error,
    // Derived values
    currentStreak,
    longestStreak,
    status,
    completedToday,
    daysUntilNextMilestone,
    nextMilestoneXP,
    progressToNextMilestone,
    graceAvailable,
    // Milestone helpers
    hasMilestone,
    getMilestoneInfo,
    upcomingMilestones,
    achievedMilestones,
    // Actions
    refresh,
    getMotivationalMessage,
  };
}

export default useLearningStreak;
