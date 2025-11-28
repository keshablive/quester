/**
 * Query-Specific Type Definitions
 *
 * Types for TanStack Query hooks, filters, pagination,
 * and cache management.
 *
 * @module core/types/query.types
 */

import type { UseQueryResult, UseInfiniteQueryResult, UseMutationResult } from '@tanstack/react-query';

// ═══════════════════════════════════════════════════════════════
// Filter Types
// ═══════════════════════════════════════════════════════════════

/**
 * User list filters
 */
export interface UserFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
}

/**
 * Course list filters
 */
export interface CourseFilters {
  search?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'enrolled' | 'completed' | 'available';
}

/**
 * Quest list filters
 */
export interface QuestFilters {
  status?: 'available' | 'active' | 'completed';
  type?: 'daily' | 'weekly' | 'story';
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Notification filters
 */
export interface NotificationFilters {
  read?: boolean;
  type?: string;
}

/**
 * Leaderboard types
 */
export type LeaderboardType =
  | 'global'
  | 'friends'
  | 'course'
  | 'weekly'
  | 'monthly';

// ═══════════════════════════════════════════════════════════════
// Pagination Types
// ═══════════════════════════════════════════════════════════════

/**
 * Pagination parameters for infinite queries
 */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response structure from API
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  previousCursor?: string | null;
  total?: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Optimistic Update Types
// ═══════════════════════════════════════════════════════════════

/**
 * Context returned from onMutate for rollback
 * FR-004: Support optimistic updates with automatic rollback on failure
 */
export interface OptimisticContext<TData> {
  /** Previous data before optimistic update */
  previousData: TData | undefined;
  /** Optimistically updated data */
  optimisticData: TData;
}

/**
 * Optimistic update configuration
 */
export interface OptimisticConfig<TVariables, TData> {
  /** Generate optimistic data from variables and current state */
  getOptimisticData: (
    variables: TVariables,
    current: TData | undefined
  ) => TData;
  /** Optional custom rollback logic */
  rollback?: (context: OptimisticContext<TData>) => void;
}

// ═══════════════════════════════════════════════════════════════
// Offline Queue Types
// ═══════════════════════════════════════════════════════════════

/**
 * Queued mutation for offline retry
 */
export interface QueuedMutation<TVariables = unknown> {
  id: string;
  mutationKey: readonly string[];
  variables: TVariables;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'retrying' | 'failed';
}

/**
 * Offline mutation queue configuration
 */
export interface OfflineQueueConfig {
  /** Maximum queued mutations (default: 50) */
  maxQueueSize: number;
  /** Per-mutation retry limit (default: 3) */
  maxRetries: number;
  /** Persist to AsyncStorage (default: true) */
  persistQueue: boolean;
  /** Callback when connectivity restored */
  onOnline?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Cache Eviction Types
// ═══════════════════════════════════════════════════════════════

/**
 * Cache eviction configuration
 * SC-008: Cache memory usage stays under 50MB on mobile devices
 */
export interface CacheEvictionConfig {
  /** Maximum cache size in bytes (default: 50MB) */
  maxCacheSize: number;
  /** Maximum number of cache entries (default: 1000) */
  maxEntries: number;
  /** Eviction strategy (default: 'lru') */
  evictionPolicy: 'lru' | 'ttl';
  /** Percentage at which to warn (default: 0.8) */
  warningThreshold: number;
}

// ═══════════════════════════════════════════════════════════════
// API Error Type
// ═══════════════════════════════════════════════════════════════

/**
 * Standard API error structure
 */
export interface ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Create an ApiError from response data
 */
export function createApiError(
  message: string,
  status: number,
  code?: string,
  details?: Record<string, unknown>
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

// ═══════════════════════════════════════════════════════════════
// Re-export TanStack Query types for convenience
// ═══════════════════════════════════════════════════════════════

export type {
  UseQueryResult,
  UseInfiniteQueryResult,
  UseMutationResult,
};

// ═══════════════════════════════════════════════════════════════
// Entity Placeholder Types
// (These should be imported from existing types once available)
// ═══════════════════════════════════════════════════════════════

/**
 * User entity
 */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  xp: number;
  level: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User profile (extended user data)
 */
export interface UserProfile extends User {
  followersCount: number;
  followingCount: number;
  coursesCompleted: number;
  questsCompleted: number;
  badges: Badge[];
}

/**
 * Follow statistics for a user
 * Returned from /api/v1/users/:userId/follow-stats
 */
export interface FollowStats {
  followers: number;
  following: number;
}

/**
 * Course entity
 */
export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  thumbnailUrl?: string;
  instructorId: string;
  duration: number;
  lessonsCount: number;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Course progress
 */
export interface CourseProgress {
  courseId: string;
  userId: string;
  completedLessons: number;
  totalLessons: number;
  percentComplete: number;
  lastAccessedAt: string;
  completedAt?: string;
}

/**
 * Quest entity
 */
export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'story';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  steps: QuestStep[];
  status: 'available' | 'active' | 'completed';
  expiresAt?: string;
  createdAt: string;
}

/**
 * Quest step
 */
export interface QuestStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  order: number;
}

/**
 * Quest progress
 */
export interface QuestProgress {
  questId: string;
  userId: string;
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  startedAt: string;
  completedAt?: string;
}

/**
 * Badge/Achievement
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: string;
}

/**
 * Notification entity
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  xp: number;
  level: number;
}

/**
 * Dashboard stats
 */
export interface DashboardStats {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  coursesInProgress: number;
  coursesCompleted: number;
  questsCompleted: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Activity item for dashboard feed
 */
export interface ActivityItem {
  id: string;
  type: 'course_completed' | 'quest_completed' | 'badge_earned' | 'level_up';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Quick action for dashboard
 */
export interface QuickAction {
  id: string;
  type: 'continue_course' | 'daily_quest' | 'challenge';
  title: string;
  subtitle: string;
  actionUrl: string;
  iconName: string;
  progress?: number;
}

// ═══════════════════════════════════════════════════════════════
// Mutation Response Types
// ═══════════════════════════════════════════════════════════════

/**
 * Follow user mutation variables
 */
export interface FollowUserVariables {
  userId: string;
  action: 'follow' | 'unfollow';
}

/**
 * Enroll course mutation variables
 */
export interface EnrollCourseVariables {
  courseId: string;
}

/**
 * Enroll course response
 */
export interface EnrollmentResponse {
  courseId: string;
  enrolledAt: string;
  progress: CourseProgress;
}

/**
 * Complete lesson mutation variables
 */
export interface CompleteLessonVariables {
  courseId: string;
  lessonId: string;
}

/**
 * Lesson completion response
 */
export interface LessonCompletionResponse {
  courseId: string;
  lessonId: string;
  xpAwarded: number;
  progress: CourseProgress;
  achievementsUnlocked?: Badge[];
}

/**
 * Complete quest step mutation variables
 */
export interface CompleteQuestStepVariables {
  questId: string;
  stepId: string;
}

/**
 * Quest step completion response
 */
export interface QuestStepResponse {
  questId: string;
  stepId: string;
  xpAwarded: number;
  questCompleted: boolean;
  progress: QuestProgress;
  achievementsUnlocked?: Badge[];
}

/**
 * Update profile mutation variables
 */
export interface UpdateProfileVariables {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

/**
 * Mark notification read mutation variables
 */
export interface MarkNotificationReadVariables {
  notificationId?: string;
  all?: boolean;
}
