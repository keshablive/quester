/**
 * Instructor Badge Award Hook
 *
 * React hook for instructors to award badges to students with
 * state management, validation, and error handling.
 * 006-course-gamification T086
 */
import { useState, useCallback } from 'react';
import { learningGamificationService } from '../services/learning-gamification.service';

/**
 * Badge award state
 */
interface BadgeAwardState {
  /** Whether an award is in progress */
  loading: boolean;
  /** Error message if award failed */
  error: string | null;
  /** Success message after award */
  success: string | null;
  /** The last awarded badge info */
  lastAwarded: {
    studentId: string;
    badgeId: string;
    message?: string;
  } | null;
}

/**
 * Badge award input
 */
export interface BadgeAwardInput {
  studentId: string;
  badgeId: string;
  message?: string;
}

/**
 * Hook return type
 */
interface UseInstructorBadgeAwardReturn extends BadgeAwardState {
  /** Award a badge to a student */
  awardBadge: (input: BadgeAwardInput) => Promise<boolean>;
  /** Clear any errors */
  clearError: () => void;
  /** Clear success message */
  clearSuccess: () => void;
  /** Reset the hook state */
  reset: () => void;
}

/**
 * Validate badge award input
 */
function validateInput(input: BadgeAwardInput): string | null {
  if (!input.studentId || input.studentId.trim() === '') {
    return 'Student ID is required';
  }
  if (!input.badgeId || input.badgeId.trim() === '') {
    return 'Badge ID is required';
  }
  // UUID format validation (basic)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input.studentId)) {
    return 'Invalid student ID format';
  }
  if (!uuidRegex.test(input.badgeId)) {
    return 'Invalid badge ID format';
  }
  // Message length validation
  if (input.message && input.message.length > 500) {
    return 'Message must be 500 characters or less';
  }
  return null;
}

/**
 * Hook for instructor badge awarding
 *
 * @example
 * ```tsx
 * function InstructorDashboard() {
 *   const { awardBadge, loading, error, success } = useInstructorBadgeAward();
 *
 *   const handleAward = async () => {
 *     const success = await awardBadge({
 *       studentId: selectedStudent.id,
 *       badgeId: selectedBadge.id,
 *       message: 'Great work on the project!'
 *     });
 *     if (success) {
 *       // Show success notification
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       {error && <Text className="text-red-500">{error}</Text>}
 *       {success && <Text className="text-green-500">{success}</Text>}
 *       <Button onPress={handleAward} disabled={loading}>
 *         {loading ? 'Awarding...' : 'Award Badge'}
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useInstructorBadgeAward(): UseInstructorBadgeAwardReturn {
  const [state, setState] = useState<BadgeAwardState>({
    loading: false,
    error: null,
    success: null,
    lastAwarded: null,
  });

  /**
   * Award a badge to a student
   */
  const awardBadge = useCallback(async (input: BadgeAwardInput): Promise<boolean> => {
    // Validate input
    const validationError = validateInput(input);
    if (validationError) {
      setState((prev) => ({
        ...prev,
        error: validationError,
        success: null,
      }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      success: null,
    }));

    try {
      const result = await learningGamificationService.awardInstructorBadge(
        input.studentId,
        input.badgeId,
        input.message
      );

      setState({
        loading: false,
        error: null,
        success: result.message || 'Badge awarded successfully!',
        lastAwarded: {
          studentId: input.studentId,
          badgeId: input.badgeId,
          message: input.message,
        },
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to award badge. Please try again.';
      
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        success: null,
      }));

      return false;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Clear success state
   */
  const clearSuccess = useCallback(() => {
    setState((prev) => ({ ...prev, success: null }));
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: null,
      lastAwarded: null,
    });
  }, []);

  return {
    ...state,
    awardBadge,
    clearError,
    clearSuccess,
    reset,
  };
}

export default useInstructorBadgeAward;
