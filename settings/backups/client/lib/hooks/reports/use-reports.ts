/**
 * Report Hooks
 * 
 * React Query hooks for report CRUD operations and generation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ReportsAPI from '../../api/reports';
import type { CreateReportRequest } from '../../api/reports';
import { reportsKeys } from './keys';

/**
 * Get user reports
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useReports({
 *   limit: 20,
 *   offset: 0,
 * });
 * 
 * const reports = data?.reports || [];
 * ```
 */
export function useReports(options?: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { limit = 20, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.reportsList(limit, offset),
    queryFn: () => ReportsAPI.reportsAPI.getUserReports({ limit, offset }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

/**
 * Get report by ID
 */
export function useReport(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.report(id),
    queryFn: () => ReportsAPI.reportsAPI.getReport(id),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    enabled: enabled && !!id,
    retry: 2,
  });
}

/**
 * Search reports
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useSearchReports('monthly');
 * const matchingReports = data?.reports || [];
 * ```
 */
export function useSearchReports(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { limit = 20, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.reportsSearch(query),
    queryFn: () => ReportsAPI.reportsAPI.searchReports({ q: query, limit, offset }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && query.length > 0,
    retry: 2,
  });
}

/**
 * Create a new report
 * 
 * @example
 * ```tsx
 * const { mutate: createReport, isPending } = useCreateReport();
 * 
 * createReport({
 *   name: 'Monthly User Activity',
 *   type: 'user_activity',
 *   period: '30days',
 *   format: 'pdf',
 * });
 * ```
 */
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReportRequest) => ReportsAPI.reportsAPI.createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.reports() });
    },
  });
}

/**
 * Generate report (async operation)
 * 
 * @example
 * ```tsx
 * const { mutate: generateReport, isPending } = useGenerateReport();
 * 
 * generateReport(reportId, {
 *   onSuccess: () => {
 *     toast.success('Report generation started');
 *   },
 * });
 * ```
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => ReportsAPI.reportsAPI.generateReport(reportId),
    onSuccess: (_, reportId) => {
      // Invalidate report to show updated status
      queryClient.invalidateQueries({ queryKey: reportsKeys.report(reportId) });
    },
  });
}

/**
 * Delete report
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => ReportsAPI.reportsAPI.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.reports() });
    },
  });
}
