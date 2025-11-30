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
  TransactionFilters,
  PropertyFilters,
  ClassifiedFilters,
  CertificateFilters,
  AchievementFilters,
  AuditLogFilters,
  GroupFilters,
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
    /** Follow statistics (follower/following counts) */
    followStats: (id: string) =>
      [...queryKeys.users.detail(id), 'followStats'] as const,
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

  // ═══════════════════════════════════════════════════════════════
  // Analytics Queries
  // ═══════════════════════════════════════════════════════════════
  analytics: {
    all: ['analytics'] as const,
    /** User analytics summary (sessions, scores, courses) */
    userSummary: (userId: string) =>
      [...queryKeys.analytics.all, 'user', userId, 'summary'] as const,
    /** User analytics timeseries */
    userTimeseries: (userId: string, startDate: string, endDate: string) =>
      [...queryKeys.analytics.all, 'user', userId, 'timeseries', startDate, endDate] as const,
    /** Top performing courses */
    topCourses: (limit?: number) =>
      [...queryKeys.analytics.all, 'courses', 'top', limit ?? 10] as const,
    /** Platform engagement summary (DAU, WAU, MAU) */
    engagementSummary: () =>
      [...queryKeys.analytics.all, 'engagement', 'summary'] as const,
    /** Engagement timeseries for charts */
    engagementTimeseries: (startDate: string, endDate: string) =>
      [...queryKeys.analytics.all, 'engagement', 'timeseries', startDate, endDate] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Messages Queries (Feature 017)
  // ═══════════════════════════════════════════════════════════════
  messages: {
    all: ['messages'] as const,
    /** All message threads */
    threads: () => [...queryKeys.messages.all, 'threads'] as const,
    /** Single thread by ID */
    thread: (id: string) => [...queryKeys.messages.all, 'thread', id] as const,
    /** Direct message conversation with a user */
    conversation: (userId: string) =>
      [...queryKeys.messages.all, 'conversation', userId] as const,
    /** Infinite scroll for direct messages */
    conversationInfinite: (userId: string) =>
      [...queryKeys.messages.all, 'conversation', userId, 'infinite'] as const,
    /** Group conversation messages */
    groupConversation: (groupId: string) =>
      [...queryKeys.messages.all, 'group', groupId] as const,
    /** Infinite scroll for group messages */
    groupInfinite: (groupId: string) =>
      [...queryKeys.messages.all, 'group', groupId, 'infinite'] as const,
    /** Search messages by content */
    search: (query: string) =>
      [...queryKeys.messages.all, 'search', query] as const,
    /** Unread message count */
    unreadCount: () => [...queryKeys.messages.all, 'unread-count'] as const,
    /** Message statistics */
    stats: () => [...queryKeys.messages.all, 'stats'] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Transaction Queries (Feature 020)
  // ═══════════════════════════════════════════════════════════════
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters?: TransactionFilters) =>
      filters
        ? ([...queryKeys.transactions.lists(), filters] as const)
        : queryKeys.transactions.lists(),
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
    /** Infinite scroll paginated list */
    infinite: (filters?: TransactionFilters) =>
      [...queryKeys.transactions.all, 'infinite', filters ?? {}] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Marketplace Queries (Feature 020)
  // ═══════════════════════════════════════════════════════════════
  marketplace: {
    all: ['marketplace'] as const,

    /** Property listings */
    properties: {
      all: () => [...queryKeys.marketplace.all, 'properties'] as const,
      lists: () => [...queryKeys.marketplace.properties.all(), 'list'] as const,
      list: (filters?: PropertyFilters) =>
        filters
          ? ([...queryKeys.marketplace.properties.lists(), filters] as const)
          : queryKeys.marketplace.properties.lists(),
      details: () => [...queryKeys.marketplace.properties.all(), 'detail'] as const,
      detail: (id: string) =>
        [...queryKeys.marketplace.properties.details(), id] as const,
      infinite: (filters?: PropertyFilters) =>
        [...queryKeys.marketplace.properties.all(), 'infinite', filters ?? {}] as const,
    },

    /** Classified ad listings */
    classifieds: {
      all: () => [...queryKeys.marketplace.all, 'classifieds'] as const,
      lists: () => [...queryKeys.marketplace.classifieds.all(), 'list'] as const,
      list: (filters?: ClassifiedFilters) =>
        filters
          ? ([...queryKeys.marketplace.classifieds.lists(), filters] as const)
          : queryKeys.marketplace.classifieds.lists(),
      details: () => [...queryKeys.marketplace.classifieds.all(), 'detail'] as const,
      detail: (id: string) =>
        [...queryKeys.marketplace.classifieds.details(), id] as const,
      infinite: (filters?: ClassifiedFilters) =>
        [...queryKeys.marketplace.classifieds.all(), 'infinite', filters ?? {}] as const,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Certificate Queries (Feature 020)
  // ═══════════════════════════════════════════════════════════════
  certificates: {
    all: ['certificates'] as const,
    lists: () => [...queryKeys.certificates.all, 'list'] as const,
    list: (filters?: CertificateFilters) =>
      filters
        ? ([...queryKeys.certificates.lists(), filters] as const)
        : queryKeys.certificates.lists(),
    details: () => [...queryKeys.certificates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.certificates.details(), id] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Notification Settings Queries (Feature 020)
  // ═══════════════════════════════════════════════════════════════
  notificationSettings: {
    all: ['notificationSettings'] as const,
    /** Current user's notification settings */
    current: () => [...queryKeys.notificationSettings.all, 'current'] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Achievement Queries (Feature 022 - Phase 2)
  // ═══════════════════════════════════════════════════════════════
  achievements: {
    all: ['achievements'] as const,
    list: (filters?: AchievementFilters) =>
      filters
        ? ([...queryKeys.achievements.all, 'list', filters] as const)
        : ([...queryKeys.achievements.all, 'list'] as const),
    detail: (id: string) =>
      [...queryKeys.achievements.all, 'detail', id] as const,
    user: (userId: string) =>
      [...queryKeys.achievements.all, 'user', userId] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Badge Queries (Feature 022 - Phase 2)
  // ═══════════════════════════════════════════════════════════════
  badges: {
    all: ['badges'] as const,
    list: () => [...queryKeys.badges.all, 'list'] as const,
    user: (userId: string) =>
      [...queryKeys.badges.all, 'user', userId] as const,
    detail: (id: string) =>
      [...queryKeys.badges.all, 'detail', id] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Admin Queries (Feature 022 - Phase 2)
  // ═══════════════════════════════════════════════════════════════
  admin: {
    all: ['admin'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    keys: () => [...queryKeys.admin.all, 'keys'] as const,
    auditLog: (filters?: AuditLogFilters) =>
      filters
        ? ([...queryKeys.admin.all, 'auditLog', filters] as const)
        : ([...queryKeys.admin.all, 'auditLog'] as const),
  },

  // ═══════════════════════════════════════════════════════════════
  // Social Feed & Groups Queries (Feature 022 - Phase 2)
  // ═══════════════════════════════════════════════════════════════
  social: {
    all: ['social'] as const,
    /** Social feed posts */
    feed: () => [...queryKeys.social.all, 'feed'] as const,
    /** Infinite scroll feed */
    feedInfinite: () => [...queryKeys.social.all, 'feed', 'infinite'] as const,
    /** Single post by ID */
    post: (id: string) => [...queryKeys.social.all, 'post', id] as const,
    /** Group list */
    groups: (filters?: GroupFilters) =>
      filters
        ? ([...queryKeys.social.all, 'groups', filters] as const)
        : ([...queryKeys.social.all, 'groups'] as const),
    /** Single group by ID */
    group: (id: string) => [...queryKeys.social.all, 'group', id] as const,
    /** Group members */
    groupMembers: (groupId: string) =>
      [...queryKeys.social.all, 'group', groupId, 'members'] as const,
  },
} as const;

// Export type for the entire query keys object
export type QueryKeys = typeof queryKeys;
