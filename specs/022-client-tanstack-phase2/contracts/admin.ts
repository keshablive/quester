/**
 * Admin Hook Interfaces
 * 
 * Contract for useAdmin.ts implementation
 */

import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { 
  AdminStats, 
  AdminUserFilters, 
  AuditLogEntry, 
  AuditLogFilters,
  PaginatedResponse 
} from './types';

// Assuming User type exists in core types
interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

/**
 * Hook to fetch admin dashboard statistics
 * 
 * Implements:
 * - FR-009: Admin dashboard statistics
 * - FR-011: Auto-refresh every 5 minutes while visible
 * 
 * @returns TanStack Query result with admin stats
 * 
 * @example
 * ```tsx
 * const { data: stats, isLoading, dataUpdatedAt } = useAdminStats();
 * ```
 */
export type UseAdminStats = () => UseQueryResult<AdminStats, Error>;

/**
 * Hook to fetch admin user list with search and pagination
 * 
 * Implements:
 * - FR-010: Admin users with search and pagination
 * 
 * @param filters - Optional filters for search, role, status, pagination
 * @returns TanStack Query result with paginated user list
 * 
 * @example
 * ```tsx
 * const { data: users } = useAdminUsers({ search: 'john', role: 'player' });
 * ```
 */
export type UseAdminUsers = (
  filters?: AdminUserFilters
) => UseQueryResult<PaginatedResponse<User>, Error>;

/**
 * Hook to fetch admin audit log
 * 
 * @param filters - Optional filters for action, actor, date range
 * @returns TanStack Query result with audit log entries
 * 
 * @example
 * ```tsx
 * const { data: logs } = useAdminAuditLog({ action: 'user.create' });
 * ```
 */
export type UseAdminAuditLog = (
  filters?: AuditLogFilters
) => UseQueryResult<AuditLogEntry[], Error>;

/**
 * Hook for rotating Data Encryption Key (DEK)
 * 
 * @returns TanStack Mutation result for DEK rotation
 * 
 * @example
 * ```tsx
 * const { mutate: rotateDEK, isPending } = useRotateDEK();
 * ```
 */
export type UseRotateDEK = () => UseMutationResult<void, Error, void, unknown>;

/**
 * Configuration for admin hooks
 */
export const ADMIN_CONFIG = {
  /** Stale time for admin stats in milliseconds (5 minutes per FR-011) */
  statsStaleTime: 5 * 60 * 1000,
  /** Stale time for admin users in milliseconds (2 minutes) */
  usersStaleTime: 2 * 60 * 1000,
  /** Refetch interval when dashboard is visible (5 minutes per FR-011) */
  refetchInterval: 5 * 60 * 1000,
  /** Query key prefix */
  queryKeyPrefix: 'admin',
} as const;
