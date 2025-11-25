/**
 * Dashboard Hooks
 * 
 * React Query hooks for managing analytics dashboards.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ReportsAPI from '../../api/reports';
import type {
  CreateDashboardRequest,
  UpdateDashboardRequest,
  CloneDashboardRequest,
} from '../../api/reports';
import { reportsKeys } from './keys';

/**
 * Get user dashboards
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useDashboards({
 *   limit: 20,
 * });
 * 
 * const dashboards = data?.dashboards || [];
 * ```
 */
export function useDashboards(options?: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { limit = 20, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.dashboardsList(limit, offset),
    queryFn: () => ReportsAPI.reportsAPI.getUserDashboards({ limit, offset }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

/**
 * Get dashboard by ID
 */
export function useDashboard(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.dashboard(id),
    queryFn: () => ReportsAPI.reportsAPI.getDashboard(id),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && !!id,
    retry: 2,
  });
}

/**
 * Get default dashboard
 * Auto-creates if not exists
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useDefaultDashboard();
 * const dashboard = data?.dashboard;
 * ```
 */
export function useDefaultDashboard(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.defaultDashboard(),
    queryFn: () => ReportsAPI.reportsAPI.getDefaultDashboard(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

/**
 * Search dashboards
 */
export function useSearchDashboards(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { limit = 20, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.dashboardsSearch(query),
    queryFn: () => ReportsAPI.reportsAPI.searchDashboards({ q: query, limit, offset }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && query.length > 0,
    retry: 2,
  });
}

/**
 * Create dashboard
 * 
 * @example
 * ```tsx
 * const { mutate: createDashboard } = useCreateDashboard();
 * 
 * createDashboard({
 *   name: 'My Analytics Dashboard',
 *   description: 'Custom dashboard for tracking key metrics',
 *   widgets: {...},
 *   refresh_interval: 300,
 * });
 * ```
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDashboardRequest) => ReportsAPI.reportsAPI.createDashboard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.dashboards() });
    },
  });
}

/**
 * Update dashboard
 */
export function useUpdateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDashboardRequest }) => 
      ReportsAPI.reportsAPI.updateDashboard(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.dashboard(id) });
      queryClient.invalidateQueries({ queryKey: reportsKeys.dashboards() });
    },
  });
}

/**
 * Set dashboard as default
 */
export function useSetDefaultDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dashboardId: string) => ReportsAPI.reportsAPI.setDefaultDashboard(dashboardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.defaultDashboard() });
      queryClient.invalidateQueries({ queryKey: reportsKeys.dashboards() });
    },
  });
}

/**
 * Clone dashboard
 * 
 * @example
 * ```tsx
 * const { mutate: cloneDashboard } = useCloneDashboard();
 * 
 * cloneDashboard({
 *   id: dashboardId,
 *   name: 'Cloned Dashboard',
 *   description: 'Copy of original dashboard',
 * });
 * ```
 */
export function useCloneDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloneDashboardRequest }) => 
      ReportsAPI.reportsAPI.cloneDashboard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.dashboards() });
    },
  });
}

/**
 * Delete dashboard
 */
export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dashboardId: string) => ReportsAPI.reportsAPI.deleteDashboard(dashboardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.dashboards() });
    },
  });
}

/**
 * Refresh dashboard metrics
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dashboardId: string) => ReportsAPI.reportsAPI.refreshDashboard(dashboardId),
    onSuccess: (_, dashboardId) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.dashboard(dashboardId) });
    },
  });
}
