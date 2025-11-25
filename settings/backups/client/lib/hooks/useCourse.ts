import { useMemo } from 'react';
import { useCourse, useUserEnrollment, useEnrollmentCheck } from '../api/courses';
import { useCourseLessons } from '../api/lessons';
import { calculateProgress, calculateAverageGrade, getNextLesson } from '../api/lessons';

export interface UseCourseOptions {
  courseId: string;
  enabled?: boolean;
}

export interface UseCourseResult {
  // Course data
  course: ReturnType<typeof useCourse>['data'];
  courseLoading: boolean;
  courseError: Error | null;
  
  // Enrollment data
  enrollment: ReturnType<typeof useUserEnrollment>['data'];
  isEnrolled: boolean | undefined;
  enrollmentLoading: boolean;
  enrollmentError: Error | null;
  
  // Lessons data
  lessons: ReturnType<typeof useCourseLessons>['data'];
  lessonsLoading: boolean;
  lessonsError: Error | null;
  
  // Computed progress data
  progress: {
    completedCount: number;
    totalCount: number;
    percentage: number;
  } | null;
  
  // Computed grade data
  averageGrade: number | null;
  
  // Next lesson to take
  nextLesson: ReturnType<typeof getNextLesson>;
  
  // Status flags
  isCompleted: boolean;
  isCertificateEligible: boolean;
  
  // Loading states
  isLoading: boolean;
  isReady: boolean;
}

/**
 * Comprehensive hook for managing course state, enrollment, and progress
 * 
 * Combines multiple API calls to provide complete course context:
 * - Course details
 * - Enrollment status and progress
 * - Lessons with completion status
 * - Calculated progress metrics
 * - Next lesson recommendation
 * - Certificate eligibility
 * 
 * @example
 * ```tsx
 * const {
 *   course,
 *   isEnrolled,
 *   progress,
 *   nextLesson,
 *   isCertificateEligible,
 * } = useCourseWithProgress({ courseId });
 * ```
 */
export function useCourseWithProgress({ courseId, enabled: _enabled = true }: UseCourseOptions): UseCourseResult {
  // Fetch course details
  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useCourse(courseId);

  // Fetch enrollment status
  const {
    data: isEnrolledData,
    isLoading: enrolledCheckLoading,
    error: enrolledCheckError,
  } = useEnrollmentCheck(courseId);

  // Fetch enrollment details (only if enrolled)
  const {
    data: enrollment,
    isLoading: enrollmentDetailsLoading,
    error: enrollmentDetailsError,
  } = useUserEnrollment(courseId);

  // Fetch lessons (only if enrolled)
  const {
    data: lessons,
    isLoading: lessonsLoading,
    error: lessonsError,
  } = useCourseLessons(courseId);

  // Compute enrollment loading and error states
  const enrollmentLoading = enrolledCheckLoading || enrollmentDetailsLoading;
  const enrollmentError = enrolledCheckError || enrollmentDetailsError;

  // Compute overall loading state
  const isLoading = courseLoading || enrollmentLoading || lessonsLoading;

  // Compute ready state (all required data loaded)
  const isReady = !isLoading && !!course && isEnrolledData !== undefined;

  // Calculate progress from lessons
  const progress = useMemo(() => {
    if (!lessons || lessons.length === 0) return null;
    return calculateProgress(lessons);
  }, [lessons]);

  // Calculate average grade
  const averageGrade = useMemo(() => {
    if (!lessons || lessons.length === 0) return null;
    return calculateAverageGrade(lessons);
  }, [lessons]);

  // Find next lesson to take
  const nextLesson = useMemo(() => {
    if (!lessons || lessons.length === 0) return null;
    return getNextLesson(lessons);
  }, [lessons]);

  // Check if course is completed
  const isCompleted = useMemo(() => {
    return progress?.percentage === 100;
  }, [progress]);

  // Check if eligible for certificate
  // Requirements: 100% completion + 70% average grade
  const isCertificateEligible = useMemo(() => {
    return isCompleted && (averageGrade !== null && averageGrade >= 70);
  }, [isCompleted, averageGrade]);

  return {
    // Course data
    course,
    courseLoading,
    courseError,
    
    // Enrollment data
    enrollment,
    isEnrolled: isEnrolledData,
    enrollmentLoading,
    enrollmentError,
    
    // Lessons data
    lessons: lessons || [],
    lessonsLoading,
    lessonsError,
    
    // Computed data
    progress,
    averageGrade,
    nextLesson,
    
    // Status flags
    isCompleted,
    isCertificateEligible,
    
    // Loading states
    isLoading,
    isReady,
  };
}

/**
 * Simplified hook for basic course information
 * Use this when you only need course details without progress tracking
 */
export function useCourseBasic(courseId: string) {
  const {
    data: course,
    isLoading,
    error,
  } = useCourse(courseId);

  return {
    course,
    isLoading,
    error,
  };
}

/**
 * Hook for checking enrollment status only
 * Lighter weight than useCourseWithProgress
 */
export function useCourseEnrollment(courseId: string) {
  const {
    data: isEnrolled,
    isLoading: checkLoading,
  } = useEnrollmentCheck(courseId);

  const {
    data: enrollment,
    isLoading: detailsLoading,
  } = useUserEnrollment(courseId);

  return {
    isEnrolled,
    enrollment,
    isLoading: checkLoading || detailsLoading,
  };
}

/**
 * Hook for course lessons with progress
 * Use this when you have a course ID and want lessons + progress
 */
export function useCourseLessonsWithProgress(courseId: string) {
  const {
    data: lessons,
    isLoading,
    error,
  } = useCourseLessons(courseId);

  const progress = useMemo(() => {
    if (!lessons || lessons.length === 0) return null;
    return calculateProgress(lessons);
  }, [lessons]);

  const averageGrade = useMemo(() => {
    if (!lessons || lessons.length === 0) return null;
    return calculateAverageGrade(lessons);
  }, [lessons]);

  const nextLesson = useMemo(() => {
    if (!lessons || lessons.length === 0) return null;
    return getNextLesson(lessons);
  }, [lessons]);

  return {
    lessons: lessons || [],
    isLoading,
    error,
    progress,
    averageGrade,
    nextLesson,
  };
}

/**
 * Hook for instructor course management
 * Includes lessons but not enrollment data
 */
export function useCourseManagement(courseId: string) {
  const {
    data: course,
    isLoading: courseLoading,
  } = useCourse(courseId);

  const {
    data: lessons,
    isLoading: lessonsLoading,
  } = useCourseLessons(courseId);

  const lessonCount = lessons?.length || 0;
  const canPublish = lessonCount > 0;

  return {
    course,
    lessons: lessons || [],
    lessonCount,
    canPublish,
    isLoading: courseLoading || lessonsLoading,
  };
}

// Export the main hook as default
export default useCourseWithProgress;
