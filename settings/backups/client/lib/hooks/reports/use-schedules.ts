/**
 * Report Schedule Hooks
 * 
 * React Query hooks for managing report scheduling and execution tracking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ReportsAPI from '../../api/reports';
import type {
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
} from '../../api/reports';
import { reportsKeys } from './keys';

/**
 * Get user report schedules
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useReportSchedules();
 * const schedules = data?.schedules || [];
 * ```
 */
export function useReportSchedules(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.schedules(),
    queryFn: () => ReportsAPI.reportsAPI.getUserReportSchedules(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled,
    retry: 2,
  });
}

/**
 * Get report schedule by ID
 */
export function useReportSchedule(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.schedule(id),
    queryFn: () => ReportsAPI.reportsAPI.getReportSchedule(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!id,
    retry: 2,
  });
}

/**
 * Create report schedule
 * 
 * @example
 * ```tsx
 * const { mutate: createSchedule } = useCreateReportSchedule();
 * 
 * createSchedule({
 *   name: 'Weekly Activity Report',
 *   report_type: 'user_activity',
 *   report_format: 'pdf',
 *   frequency: 'weekly',
 *   day_of_week: 1, // Monday
 *   recipients: ['user@example.com'],
 * });
 * ```
 */
export function useCreateReportSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReportScheduleRequest) => 
      ReportsAPI.reportsAPI.createReportSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules() });
    },
  });
}

/**
 * Update report schedule
 */
export function useUpdateReportSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReportScheduleRequest }) => 
      ReportsAPI.reportsAPI.updateReportSchedule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedule(id) });
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules() });
    },
  });
}

/**
 * Toggle report schedule active status
 * 
 * @example
 * ```tsx
 * const { mutate: toggleSchedule } = useToggleReportSchedule();
 * 
 * toggleSchedule({ id: scheduleId, isActive: false });
 * ```
 */
export function useToggleReportSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      ReportsAPI.reportsAPI.toggleReportSchedule(id, isActive),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedule(id) });
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules() });
    },
  });
}

/**
 * Delete report schedule
 */
export function useDeleteReportSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => ReportsAPI.reportsAPI.deleteReportSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules() });
    },
  });
}

/**
 * Get report execution history
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useReportExecutions(scheduleId);
 * const executions = data?.executions || [];
 * ```
 */
export function useReportExecutions(
  scheduleId: string,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { limit = 20, offset = 0, enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.scheduleExecutions(scheduleId, limit, offset),
    queryFn: () => ReportsAPI.reportsAPI.getReportExecutions(scheduleId, { limit, offset }),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && !!scheduleId,
    retry: 2,
  });
}

/**
 * Get report execution statistics
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useReportExecutionStats(scheduleId, {
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-31',
 * });
 * 
 * const { success_rate, avg_duration } = data?.stats || {};
 * ```
 */
export function useReportExecutionStats(
  scheduleId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  }
) {
  const { startDate, endDate, enabled = true } = options || {};

  return useQuery({
    queryKey: reportsKeys.scheduleStats(scheduleId, startDate, endDate),
    queryFn: () => ReportsAPI.reportsAPI.getReportExecutionStats(scheduleId, { 
      start_date: startDate, 
      end_date: endDate 
    }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!scheduleId,
    retry: 2,
  });
}
