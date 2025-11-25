/**
 * Report Query Keys
 * 
 * Centralized query key factory for reports, schedules, and dashboards.
 * Used by React Query for cache management and invalidation.
 */

export const reportsKeys = {
  all: ['reports'] as const,
  
  // Reports
  reports: () => [...reportsKeys.all, 'list'] as const,
  reportsList: (limit?: number, offset?: number) => 
    [...reportsKeys.reports(), limit, offset] as const,
  report: (id: string) => [...reportsKeys.all, 'report', id] as const,
  reportsSearch: (query: string) => [...reportsKeys.reports(), 'search', query] as const,
  
  // Schedules
  schedules: () => [...reportsKeys.all, 'schedules'] as const,
  schedule: (id: string) => [...reportsKeys.schedules(), id] as const,
  scheduleExecutions: (scheduleId: string, limit?: number, offset?: number) => 
    [...reportsKeys.schedule(scheduleId), 'executions', limit, offset] as const,
  scheduleStats: (scheduleId: string, startDate?: string, endDate?: string) => 
    [...reportsKeys.schedule(scheduleId), 'stats', startDate, endDate] as const,
  
  // Dashboards
  dashboards: () => [...reportsKeys.all, 'dashboards'] as const,
  dashboardsList: (limit?: number, offset?: number) => 
    [...reportsKeys.dashboards(), 'list', limit, offset] as const,
  dashboard: (id: string) => [...reportsKeys.dashboards(), id] as const,
  defaultDashboard: () => [...reportsKeys.dashboards(), 'default'] as const,
  sharedDashboards: () => [...reportsKeys.dashboards(), 'shared'] as const,
  dashboardsSearch: (query: string) => [...reportsKeys.dashboards(), 'search', query] as const,
};
