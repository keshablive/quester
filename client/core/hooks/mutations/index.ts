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
  // Note: useUpdateNotificationSettings is exported from queries/useNotificationSettings.ts
  // with full optimistic update support
} from './useNotificationMutations';

// Message mutations (send, delete, mark read) - Feature 017
export {
  useSendDirectMessage,
  useSendGroupMessage,
  useMarkAsRead,
  useMarkMultipleAsRead,
  useDeleteMessage,
} from './useMessageMutations';
export type {
  SendDirectMessageInput,
  SendGroupMessageInput,
  DeleteMessageInput,
} from './useMessageMutations';

// Social mutations (like, unlike, create post) - Feature 022 Phase 2
export {
  useLikePost,
  useUnlikePost,
  useCreatePost,
} from './useSocialMutations';

// Achievement mutations (claim) - Feature 022 Phase 2
export { useClaimAchievement } from './useAchievementMutations';

// Group mutations (join, leave, create) - Feature 022 Phase 2
export {
  useJoinGroup,
  useLeaveGroup,
  useCreateGroup,
} from './useGroupMutations';

// Marketplace mutations (purchase, contact, favorite) - Feature 023 Phase 3
export {
  usePurchaseItem,
  useContactSeller,
  useFavoriteItem,
  useUnfavoriteItem,
} from './useMarketplaceMutations';
export type {
  PurchaseInput,
  PurchaseResponse,
  ContactSellerInput,
  ContactSellerResponse,
} from './useMarketplaceMutations';
