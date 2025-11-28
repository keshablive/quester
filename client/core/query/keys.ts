/**
 * Type-Safe Query Key Factory
 *
 * Provides consistent, type-safe query keys for all data fetching operations.
 * This prevents cache invalidation bugs and enables efficient cache management.
 *
 * @module core/query/keys
 */

import type {
  UserFilters,
  CourseFilters,
  QuestFilters,
  NotificationFilters,
  LeaderboardType,
} from '../types/query.types';

/**
 * Query key factory with hierarchical structure
 *
 * Pattern: ['entity', 'scope', ...identifiers]
 *
 * Benefits:
 * - Type-safe keys prevent typos
 * - Hierarchical structure enables targeted invalidation
 * - Consistent patterns across the codebase
 */
export const queryKeys = {
  // ═══════════════════════════════════════════════════════════════
  // User Queries
  // ═══════════════════════════════════════════════════════════════
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (id: string) => [...queryKeys.users.detail(id), 'profile'] as const,
    courses: (id: string) => [...queryKeys.users.detail(id), 'courses'] as const,
    achievements: (id: string) =>
      [...queryKeys.users.detail(id), 'achievements'] as const,
    xp: (id: string) => [...queryKeys.users.detail(id), 'xp'] as const,
    followers: (id: string) =>
      [...queryKeys.users.detail(id), 'followers'] as const,
    following: (id: string) =>
      [...queryKeys.users.detail(id), 'following'] as const,
    /** Current authenticated user */
    current: () => [...queryKeys.users.all, 'current'] as const,
    /** Current authenticated user (alias for current) */
    me: () => queryKeys.users.current(),
    /** User header data (name, avatar) */
    header: (id: string) => [...queryKeys.users.detail(id), 'header'] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Course Queries
  // ═══════════════════════════════════════════════════════════════
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters?: CourseFilters) =>
      filters
        ? ([...queryKeys.courses.lists(), filters] as const)
        : queryKeys.courses.lists(),
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
    progress: (id: string) =>
      [...queryKeys.courses.detail(id), 'progress'] as const,
    lessons: (id: string) =>
      [...queryKeys.courses.detail(id), 'lessons'] as const,
    /** Infinite scroll paginated list */
    infinite: (filters?: CourseFilters) =>
      [...queryKeys.courses.all, 'infinite', filters ?? {}] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Quest Queries
  // ═══════════════════════════════════════════════════════════════
  quests: {
    all: ['quests'] as const,
    lists: () => [...queryKeys.quests.all, 'list'] as const,
    list: (filters?: QuestFilters) =>
      filters
        ? ([...queryKeys.quests.lists(), filters] as const)
        : queryKeys.quests.lists(),
    details: () => [...queryKeys.quests.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.quests.details(), id] as const,
    progress: (id: string) =>
      [...queryKeys.quests.detail(id), 'progress'] as const,
    /** Daily quests (2-minute stale time) */
    daily: () => [...queryKeys.quests.all, 'daily'] as const,
    /** Infinite scroll paginated list */
    infinite: (filters?: QuestFilters) =>
      [...queryKeys.quests.all, 'infinite', filters ?? {}] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Leaderboard Queries
  // ═══════════════════════════════════════════════════════════════
  leaderboards: {
    all: ['leaderboards'] as const,
    type: (type: LeaderboardType) =>
      [...queryKeys.leaderboards.all, type] as const,
    global: () => [...queryKeys.leaderboards.all, 'global'] as const,
    friends: () => [...queryKeys.leaderboards.all, 'friends'] as const,
    course: (courseId: string) =>
      [...queryKeys.leaderboards.all, 'course', courseId] as const,
    weekly: () => [...queryKeys.leaderboards.all, 'weekly'] as const,
    monthly: () => [...queryKeys.leaderboards.all, 'monthly'] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Dashboard Queries
  // ═══════════════════════════════════════════════════════════════
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    activity: () => [...queryKeys.dashboard.all, 'activity'] as const,
    quickActions: () => [...queryKeys.dashboard.all, 'quickActions'] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Notification Queries
  // ═══════════════════════════════════════════════════════════════
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: NotificationFilters) =>
      filters
        ? ([...queryKeys.notifications.all, 'list', filters] as const)
        : ([...queryKeys.notifications.all, 'list'] as const),
    unreadCount: () =>
      [...queryKeys.notifications.all, 'unread-count'] as const,
    /** Infinite scroll paginated list */
    infinite: (filters?: NotificationFilters) =>
      [...queryKeys.notifications.all, 'infinite', filters ?? {}] as const,
  },
} as const;

// Export type for the entire query keys object
export type QueryKeys = typeof queryKeys;
