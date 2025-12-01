/**
 * @fileoverview Shared Components Barrel File
 *
 * Exports utility components used across multiple features.
 * Components here are reusable and not tied to specific domains.
 *
 * @module @/components/shared
 */

// Theme components
export * from './ThemeToggle';

// User components
export * from './user-menu';
export * from './user-stats-card';

// Types
export * from './types';

// Network status components
export * from './OfflineIndicator';
export * from './StaleDataIndicator';

// List components
export * from './InfiniteScrollList';

// Error/notification components
export * from './MutationErrorToast';
export * from './ErrorState';

// Avatar components
export * from './PrefetchableAvatar';

// Social components
export * from './SocialButtons';
export * from './FollowLists';
