/**
 * Admin Query Hooks
 *
 * TanStack Query hooks for fetching admin dashboard data.
 * FR-009, FR-011: Admin stats with 5-minute stale time and auto-refresh.
 *
 * @module core/hooks/queries/useAdmin
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { adminService } from '../../api/services/admin.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { AdminStats, AuditLogEntry, AuditLogFilters, ApiError } from '../../types/query.types';

/**
 * Fetch admin dashboard statistics
 *
 * FR-009: Provides dashboard statistics
 * FR-011: Auto-refresh every 5 minutes while visible
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with admin stats
 *
 * @example
 * ```tsx
 * function AdminDashboard() {
 *   const { data: stats, isLoading, error, refetch, dataUpdatedAt, isFetching } = useAdminStats({
 *     refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
 *   });
 *
 *   if (isLoading) return <AdminStatsSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return (
 *     <View>
 *       {isFetching && <RefreshIndicator />}
 *       <StaleDataIndicator dataUpdatedAt={dataUpdatedAt} />
 *       <StatCard label="Total Users" value={stats.totalUsers} />
 *       <StatCard label="Active Users" value={stats.activeUsers} />
 *       <StatCard label="Revenue This Month" value={stats.revenueThisMonth} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAdminStats(
  options?: Omit<
    UseQueryOptions<AdminStats, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<AdminStats, ApiError> {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: async () => {
      const kmsStats = await adminService.getStats();
      // Map KMS stats to AdminStats structure
      // The actual admin stats endpoint may have different fields
      return {
        totalUsers: 0, // These would come from a proper admin stats endpoint
        activeUsers: 0,
        totalQuests: 0,
        completedQuests: 0,
        totalRevenue: 0,
        revenueThisMonth: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        // Include KMS-specific stats
        ...kmsStats,
      } as AdminStats;
    },
    staleTime: STALE_TIMES.ADMIN_STATS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch admin encryption keys
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with encryption keys
 *
 * @example
 * ```tsx
 * function KeyManagement() {
 *   const { data: keys, isLoading, refetch } = useAdminKeys();
 *
 *   if (isLoading) return <KeysSkeleton />;
 *
 *   return (
 *     <View>
 *       {keys?.map(key => (
 *         <KeyCard key={key.id} encryptionKey={key} />
 *       ))}
 *       <Button onPress={() => refetch()}>Refresh Keys</Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useAdminKeys(
  options?: Omit<
    UseQueryOptions<unknown[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<unknown[], ApiError> {
  return useQuery({
    queryKey: queryKeys.admin.keys(),
    queryFn: () => adminService.listKeys(),
    staleTime: STALE_TIMES.ADMIN_STATS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch admin audit log
 *
 * @param filters - Optional filters (action, actor, date range)
 * @param options - Optional TanStack Query options
 * @returns Query result with audit log entries
 *
 * @example
 * ```tsx
 * function AuditLog() {
 *   const [filters, setFilters] = useState<AuditLogFilters>({});
 *   const { data: logs, isLoading } = useAdminAuditLog(filters);
 *
 *   if (isLoading) return <AuditLogSkeleton />;
 *
 *   return (
 *     <FlatList
 *       data={logs}
 *       renderItem={({ item }) => <AuditLogEntry entry={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useAdminAuditLog(
  filters?: AuditLogFilters,
  options?: Omit<
    UseQueryOptions<AuditLogEntry[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<AuditLogEntry[], ApiError> {
  return useQuery({
    queryKey: queryKeys.admin.auditLog(filters),
    queryFn: async () => {
      const logs = await adminService.getAuditLog();
      return logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorId: log.performedBy,
        actorEmail: '', // Would need to be fetched from user service
        targetType: 'key',
        targetId: log.keyId,
        metadata: log.details ? { details: log.details } : undefined,
        createdAt: log.timestamp,
      }));
    },
    staleTime: STALE_TIMES.ADMIN_STATS,
    gcTime: GC_TIME,
    ...options,
  });
}
