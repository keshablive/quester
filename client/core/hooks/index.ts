/**
 * @fileoverview Hooks Barrel File
 *
 * Exports all hook modules organized by type:
 * - queries/ - Data fetching hooks (TanStack Query)
 * - mutations/ - Data mutation hooks (TanStack Query)
 * - utils/ - Utility hooks (debounce, toggle, etc.)
 *
 * @module @/core/hooks
 */

// Utility hooks
export * from './utils';

// WebSocket Hooks
export * from './useWebSocket';

// Social Gamification Hooks
export * from './useXPNotification';
export * from './useSocialXP';
export * from './useAchievementNotification';
export * from './useSocialLeaderboard';
export * from './useDailyChallenges';

// Learning Gamification Hooks (006-course-gamification)
export * from './useLearningXP';
export * from './useLearningProgress';
export * from './useLearningAchievements';
export * from './useLearningLeaderboard';
export * from './useLearningStreak';
export * from './useInstructorBadgeAward';
export * from './useLearningChallenges';
export * from './useLearningGamificationWebSocket';

// TanStack Query Hooks (012-client-data-fetching)
export * from './queries';
export * from './mutations';
