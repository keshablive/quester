/**
 * Query Hooks
 *
 * TanStack Query hooks for data fetching with caching,
 * background refresh, and stale-while-revalidate.
 *
 * @module core/hooks/queries
 */

// User queries
export { useUser, useCurrentUser, useUserHeader } from './useUser';

// Social queries
export { useFollowStats } from './useSocial';

// Dashboard queries
export {
  useDashboardStats,
  useDashboardActivity,
  useQuickActions,
} from './useDashboard';

// Course queries
export {
  useCourses,
  useCourse,
  useCourseProgress,
  useEnrolledCourses,
  useCompletedCourses,
} from './useCourses';

// Quest queries
export {
  useQuests,
  useQuest,
  useDailyQuests,
  useQuestProgress,
  useActiveQuests,
  useCompletedQuests,
} from './useQuests';

// Leaderboard queries
export {
  useLeaderboard,
  useGlobalLeaderboard,
  useFriendsLeaderboard,
  useWeeklyLeaderboard,
  useMonthlyLeaderboard,
  useCourseLeaderboard,
} from './useLeaderboard';

// Notification queries
export {
  useNotifications,
  useUnreadNotificationCount,
  useUnreadNotifications,
} from './useNotifications';

// Analytics queries
export {
  useUserAnalytics,
  useTopCourses,
  useEngagementSummary,
  useEngagementTimeseries,
} from './useAnalytics';
export type {
  UserAnalyticsSummary,
  TopCourse,
  EngagementSummary,
  TimeSeriesData,
} from './useAnalytics';
