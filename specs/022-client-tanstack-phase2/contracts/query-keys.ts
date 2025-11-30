/**
 * Extended Query Keys for Phase 2 Migration
 * 
 * This file documents the query key additions needed for the Phase 2 migration.
 * These keys should be added to client/core/query/keys.ts
 */

import type { 
  AchievementFilters, 
  AdminUserFilters, 
  AuditLogFilters,
  GroupFilters 
} from './types';

/**
 * Achievement query keys
 */
export const achievementKeys = {
  all: ['achievements'] as const,
  list: (filters?: AchievementFilters) => 
    [...achievementKeys.all, 'list', filters] as const,
  detail: (id: string) => 
    [...achievementKeys.all, 'detail', id] as const,
  user: (userId: string) => 
    [...achievementKeys.all, 'user', userId] as const,
};

/**
 * Badge query keys
 */
export const badgeKeys = {
  all: ['badges'] as const,
  list: () => [...badgeKeys.all, 'list'] as const,
  user: (userId: string) => [...badgeKeys.all, 'user', userId] as const,
  detail: (id: string) => [...badgeKeys.all, 'detail', id] as const,
};

/**
 * Admin query keys
 */
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: (filters?: AdminUserFilters) => 
    [...adminKeys.all, 'users', filters] as const,
  keys: () => [...adminKeys.all, 'keys'] as const,
  auditLog: (filters?: AuditLogFilters) => 
    [...adminKeys.all, 'auditLog', filters] as const,
};

/**
 * Social query keys (extensions to existing social keys)
 */
export const socialExtensionKeys = {
  feed: () => ['social', 'feed'] as const,
  feedInfinite: () => ['social', 'feed', 'infinite'] as const,
  post: (id: string) => ['social', 'post', id] as const,
  groups: (filters?: GroupFilters) => ['social', 'groups', filters] as const,
  group: (id: string) => ['social', 'group', id] as const,
  groupMembers: (groupId: string) => 
    ['social', 'group', groupId, 'members'] as const,
};

/**
 * Full queryKeys structure for reference
 * Merge with existing queryKeys in keys.ts
 */
export const phase2QueryKeys = {
  achievements: achievementKeys,
  badges: badgeKeys,
  admin: adminKeys,
  // social extensions to merge with existing social keys
};
