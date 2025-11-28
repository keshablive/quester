/**
 * Learning Progress Hook
 * 
 * React hook for managing course progress data with XP tracking.
 * 006-course-gamification T045: Course progress state management
 * 
 * @deprecated Use the TanStack Query hooks instead:
 * - `useCourseProgress` from '@/core/hooks/queries/useCourses' for progress queries
 * - `useCompleteLesson` from '@/core/hooks/mutations/useCourseMutations' for mutations
 * 
 * This hook will be removed in a future release. It has been replaced by TanStack Query
 * hooks that provide automatic caching, background refresh, and optimistic updates.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { learningGamificationService } from '../api/services/learning-gamification.service';
import type { LearningCourseProgress } from '../types/learning-gamification.types';

/**
 * Learning Progress state
 */
interface LearningProgressState {
  /** Progress for a specific course */
  courseProgress: LearningCourseProgress | null;
  /** Progress for all enrolled courses */
  allCoursesProgress: LearningCourseProgress[];
  /** Currently selected course ID */
  selectedCourseId: string | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Learning Progress hook return type
 */
interface UseLearningProgressReturn extends LearningProgressState {
  /** Load progress for a specific course */
  loadCourseProgress: (courseId: string) => Promise<void>;
  /** Refresh current course progress */
  refreshProgress: () => Promise<void>;
  /** Clear selected course */
  clearSelection: () => void;
}

/** Cache duration in milliseconds (2 minutes) */
const CACHE_DURATION_MS = 2 * 60 * 1000;

/**
 * Hook for learning progress data management
 * 
 * @example
 * ```tsx
 * function CourseProgress({ courseId }: { courseId: string }) {
 *   const { courseProgress, loading, loadCourseProgress } = useLearningProgress();
 *   
 *   useEffect(() => {
 *     loadCourseProgress(courseId);
 *   }, [courseId]);
 *   
 *   if (loading) return <LoadingSpinner />;
 *   
 *   return (
 *     <View>
 *       <Text>Progress: {courseProgress?.progressPct}%</Text>
 *       <Text>XP Earned: {courseProgress?.xpEarned}</Text>
 *     </View>
 *   );
 * }
 * ```
 * 
 * @deprecated Use useCourseProgress from '@/core/hooks/queries/useCourses' instead
 */
export function useLearningProgress(): UseLearningProgressReturn {
  // Deprecation warning (shown once per component instance in dev mode)
  useEffect(() => {
    if (__DEV__) {
      console.warn(
        '[DEPRECATED] useLearningProgress is deprecated. ' +
        'Use useCourseProgress from "@/core/hooks/queries/useCourses" instead. ' +
        'This hook will be removed in a future release.'
      );
    }
  }, []);

  const [state, setState] = useState<LearningProgressState>({
    courseProgress: null,
    allCoursesProgress: [],
    selectedCourseId: null,
    loading: false,
    error: null,
  });

  // Cache timestamps for each course
  const cacheTimestamps = useRef<Map<string, number>>(new Map());

  /**
   * Check if cache is valid for a course
   */
  const isCacheValid = useCallback((courseId: string): boolean => {
    const timestamp = cacheTimestamps.current.get(courseId);
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_DURATION_MS;
  }, []);

  /**
   * Load progress for a specific course
   */
  const loadCourseProgress = useCallback(async (courseId: string, force = false) => {
    // Check cache
    if (!force && isCacheValid(courseId) && state.selectedCourseId === courseId) {
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null, selectedCourseId: courseId }));
      
      const progress = await learningGamificationService.getCourseProgress(courseId);
      
      setState(prev => ({
        ...prev,
        courseProgress: progress,
        loading: false,
      }));
      
      cacheTimestamps.current.set(courseId, Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load course progress';
      setState(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, [isCacheValid, state.selectedCourseId]);

  /**
   * Refresh current course progress
   */
  const refreshProgress = useCallback(async () => {
    if (state.selectedCourseId) {
      await loadCourseProgress(state.selectedCourseId, true);
    }
  }, [state.selectedCourseId, loadCourseProgress]);

  /**
   * Clear selected course
   */
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      courseProgress: null,
      selectedCourseId: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    loadCourseProgress,
    refreshProgress,
    clearSelection,
  };
}

export default useLearningProgress;
