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
export {
  useFollowStats,
  useFollowers,
  useFollowing,
  useInfiniteFollowers,
  useInfiniteFollowing,
  type SocialUser,
} from './useSocial';

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

// Messages queries (Feature 017)
export {
  useMessageThreads,
  useRecentMessages,
  useConversationMessages,
  useGroupMessages,
  useUnreadCount,
  useMessageStats,
  useSearchMessages,
} from './useMessages';

// Transaction queries (Feature 020 - US1)
export {
  useTransactions,
  useTransaction,
  useInfiniteTransactions,
} from './useTransactions';

// Marketplace queries (Feature 020 - US2)
export {
  useMarketplaceProperties,
  useMarketplaceProperty,
  useInfiniteMarketplaceProperties,
  useMarketplaceClassifieds,
  useMarketplaceClassified,
  useInfiniteMarketplaceClassifieds,
} from './useMarketplace';

// Certificate queries (Feature 020 - US3)
export {
  useCertificates,
  useCertificate,
  useCourseCertificate,
  useCertificateDownloadUrl,
  useVerifyCertificate,
  useRegenerateCertificate,
} from './useCertificates';

// Notification Settings queries (Feature 020 - US4)
export {
  useNotificationSettings,
  useUpdateNotificationSettings,
  useToggleNotificationSetting,
  useToggleNotificationType,
} from './useNotificationSettings';

// Infinite scroll utility (Feature 020)
export {
  useInfiniteScrollList,
  type UseInfiniteScrollListOptions,
  type UseInfiniteScrollListResult,
} from './useInfiniteScrollList';

// Achievement queries (Feature 022 - Phase 2)
export {
  useAchievements,
  useAchievement,
  useUserAchievements,
} from './useAchievements';

// Badge queries (Feature 022 - Phase 2)
export {
  useBadges,
  useBadge,
  useUserBadges,
} from './useBadges';

// Admin queries (Feature 022 - Phase 2)
export {
  useAdminStats,
  useAdminKeys,
  useAdminAuditLog,
} from './useAdmin';

// Analytics extension (Feature 022 - Phase 2)
export { useEngagementChart, type ChartTimeRange } from './useAnalytics';

// Social feed queries (Feature 022 - Phase 2)
export {
  useInfiniteSocialPosts,
  useSocialPost,
} from './useSocialFeed';

// Group queries (Feature 022 - Phase 2)
export {
  useGroups,
  useGroup,
  useGroupMembers,
} from './useGroups';
