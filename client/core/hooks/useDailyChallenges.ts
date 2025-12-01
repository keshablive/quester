/**
 * useDailyChallenges Hook
 * 
 * T081: Hook for fetching and managing daily challenges state
 * US6/FR-010: Daily Social Challenges with XP rewards
 * 
 * @deprecated Use the TanStack Query hooks instead:
 * - `useDailyQuests` from '@/core/hooks/queries/useQuests' for daily quests/challenges
 * 
 * This hook will be removed in a future release. It has been replaced by TanStack Query
 * hooks that provide automatic caching, background refresh, and optimistic updates.
 */
import { useState, useEffect, useCallback } from 'react';
import { socialGamificationService, DailyChallenge } from '../services/social-gamification.service';

export interface DailyChallengesState {
  challenges: DailyChallenge[];
  loading: boolean;
  error: string | null;
  completedCount: number;
  totalCount: number;
  totalXPEarned: number;
  totalXPAvailable: number;
  allComplete: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage daily challenges
 * 
 * @deprecated Use useDailyQuests from '@/core/hooks/queries/useQuests' instead
 */
export function useDailyChallenges(): DailyChallengesState {
  // Deprecation warning (shown once per component instance in dev mode)
  useEffect(() => {
    if (__DEV__) {
      console.warn(
        '[DEPRECATED] useDailyChallenges is deprecated. ' +
        'Use useDailyQuests from "@/core/hooks/queries/useQuests" instead. ' +
        'This hook will be removed in a future release.'
      );
    }
  }, []);

  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await socialGamificationService.getDailyChallenges();
      
      // Handle array response (backend returns { challenges: [...] })
      const challengeList = Array.isArray(response) ? response : (response as any).challenges || [];
      setChallenges(challengeList);
    } catch (err) {
      console.error('Failed to fetch daily challenges:', err);
      setError('Failed to load daily challenges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Calculate derived stats
  const completedCount = challenges.filter(c => c.isCompleted).length;
  const totalCount = challenges.length;
  const totalXPEarned = challenges
    .filter(c => c.isCompleted)
    .reduce((sum, c) => sum + c.xpReward, 0);
  const totalXPAvailable = challenges.reduce((sum, c) => sum + c.xpReward, 0);
  const allComplete = totalCount > 0 && completedCount === totalCount;

  return {
    challenges,
    loading,
    error,
    completedCount,
    totalCount,
    totalXPEarned,
    totalXPAvailable,
    allComplete,
    refresh: fetchChallenges,
  };
}

export default useDailyChallenges;
