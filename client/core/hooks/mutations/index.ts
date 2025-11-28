/**
 * Mutation Hooks
 *
 * TanStack Query mutation hooks with optimistic updates,
 * automatic rollback, and cache invalidation.
 *
 * @module core/hooks/mutations
 */

// User mutations (profile, avatar, follow/unfollow)
export {
  useUpdateProfile,
  useUpdateAvatar,
  useFollowUser,
  useUnfollowUser,
} from './useUserMutations';

// Course mutations (enroll, lessons, assignments)
export {
  useEnrollCourse,
  useCompleteLesson,
  useSubmitAssignment,
  useRateCourse,
} from './useCourseMutations';

// Quest mutations (start, progress, complete, abandon)
export {
  useStartQuest,
  useUpdateQuestProgress,
  useCompleteQuestStep,
  useCompleteQuest,
  useAbandonQuest,
} from './useQuestMutations';

// Notification mutations (read, delete, settings)
export {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useUpdateNotificationSettings,
} from './useNotificationMutations';
