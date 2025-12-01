/**
 * @fileoverview Feature Components Barrel File
 *
 * Exports all domain-specific feature components.
 * Each feature module contains components specific to that domain.
 *
 * Import individual features when needed:
 * @example
 * import { QuestList, QuestDetail } from '@/components/features/quests';
 * import { CourseList, CourseDetail } from '@/components/features/learning';
 *
 * @module @/components/features
 */

// Achievement features
export * from './achievements';

// Admin features
export * from './admin';

// Analytics features
export * from './analytics';

// Badge features
export * from './badges';

// Communication features (messages, social, streams)
export * from './communicate';

// Dashboard features
export * from './dashboard';

// Home features
export * from './home';

// Learning features (courses, certificates)
export * from './learning';

// Marketplace features
export * from './marketplace';

// Notification features
export * from './notifications';

// Profile features
export * from './profile';

// Quest features
export * from './quests';

// Settings features
export * from './settings';

// Transaction features
export * from './transactions';
