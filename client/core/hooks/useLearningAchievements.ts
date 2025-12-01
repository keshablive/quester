/**
 * Learning Achievements Hook (T055)
 * 
 * Manages learning achievements state for displaying unlocked and in-progress achievements.
 * 006-course-gamification: US3 - Achievement tracking
 */
import { useState, useCallback, useEffect } from 'react';
import { learningGamificationService } from '../services/learning-gamification.service';
import type { LearningAchievement } from '../types/learning-gamification.types';

/**
 * Achievement with progress info
 */
export interface AchievementWithProgress extends LearningAchievement {
  /** Whether achievement is unlocked */
  is_unlocked: boolean;
  /** Progress percentage toward unlocking */
  progress_pct: number;
  /** When achievement was unlocked (if unlocked) */
  unlocked_at?: string;
}

/**
 * Grouped achievements by status
 */
export interface AchievementsData {
  /** All achievements */
  all: AchievementWithProgress[];
  /** Unlocked achievements */
  unlocked: AchievementWithProgress[];
  /** Locked achievements (in progress) */
  locked: AchievementWithProgress[];
  /** Total achievement count */
  totalCount: number;
  /** Unlocked achievement count */
  unlockedCount: number;
  /** Completion percentage */
  completionPct: number;
}

/**
 * Hook state
 */
interface UseLearningAchievementsState {
  /** Achievements data */
  achievements: AchievementsData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Hook return type
 */
interface UseLearningAchievementsResult extends UseLearningAchievementsState {
  /** Refresh achievements data */
  refresh: () => Promise<void>;
  /** Get a specific achievement by ID */
  getAchievement: (id: string) => AchievementWithProgress | undefined;
  /** Check if an achievement is unlocked */
  isUnlocked: (id: string) => boolean;
  /** Get next achievements to unlock (sorted by progress) */
  getNextToUnlock: (count?: number) => AchievementWithProgress[];
}

/**
 * Hook for managing learning achievements
 * 
 * @example
 * ```tsx
 * function AchievementsPage() {
 *   const { achievements, isLoading, getNextToUnlock } = useLearningAchievements();
 * 
 *   if (isLoading) return <Loading />;
 * 
 *   return (
 *     <View>
 *       <Text>Unlocked: {achievements?.unlockedCount}/{achievements?.totalCount}</Text>
 *       <Text>Next to unlock:</Text>
 *       {getNextToUnlock(3).map(a => (
 *         <AchievementCard key={a.id} achievement={a} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLearningAchievements(): UseLearningAchievementsResult {
  const [state, setState] = useState<UseLearningAchievementsState>({
    achievements: null,
    isLoading: true,
    error: null,
  });

  /**
   * Fetch achievements from API
   */
  const fetchAchievements = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await learningGamificationService.getAchievements();
      
      // Handle API response format
      const data = response as unknown as {
        achievements: AchievementWithProgress[];
        unlocked: AchievementWithProgress[];
        locked: AchievementWithProgress[];
        total_count: number;
        unlocked_count: number;
        completion_percent: number;
      };

      setState({
        achievements: {
          all: data.achievements || [],
          unlocked: data.unlocked || [],
          locked: data.locked || [],
          totalCount: data.total_count || 0,
          unlockedCount: data.unlocked_count || 0,
          completionPct: data.completion_percent || 0,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load achievements',
      }));
    }
  }, []);

  /**
   * Get achievement by ID
   */
  const getAchievement = useCallback((id: string): AchievementWithProgress | undefined => {
    return state.achievements?.all.find(a => a.id === id);
  }, [state.achievements]);

  /**
   * Check if achievement is unlocked
   */
  const isUnlocked = useCallback((id: string): boolean => {
    const achievement = getAchievement(id);
    return achievement?.is_unlocked ?? false;
  }, [getAchievement]);

  /**
   * Get next achievements to unlock (sorted by progress, highest first)
   */
  const getNextToUnlock = useCallback((count: number = 3): AchievementWithProgress[] => {
    if (!state.achievements) return [];
    
    return [...state.achievements.locked]
      .sort((a, b) => (b.progress_pct ?? 0) - (a.progress_pct ?? 0))
      .slice(0, count);
  }, [state.achievements]);

  // Load achievements on mount
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    ...state,
    refresh: fetchAchievements,
    getAchievement,
    isUnlocked,
    getNextToUnlock,
  };
}

export default useLearningAchievements;
