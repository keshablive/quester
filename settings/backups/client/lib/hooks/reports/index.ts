/**
 * Reports Hooks - Unified Export
 * 
 * Modular organization of report-related React Query hooks.
 * 
 * Structure:
 * - keys.ts: Query key factory for cache management
 * - use-reports.ts: Report CRUD and generation hooks
 * - use-schedules.ts: Schedule management and execution tracking
 * - use-dashboards.ts: Dashboard CRUD and refresh hooks
 */

// Query Keys
export { reportsKeys } from './keys';

// Report Hooks
export {
  useReports,
  useReport,
  useSearchReports,
  useCreateReport,
  useGenerateReport,
  useDeleteReport,
} from './use-reports';

// Schedule Hooks
export {
  useReportSchedules,
  useReportSchedule,
  useCreateReportSchedule,
  useUpdateReportSchedule,
  useToggleReportSchedule,
  useDeleteReportSchedule,
  useReportExecutions,
  useReportExecutionStats,
} from './use-schedules';

// Dashboard Hooks
export {
  useDashboards,
  useDashboard,
  useDefaultDashboard,
  useSearchDashboards,
  useCreateDashboard,
  useUpdateDashboard,
  useSetDefaultDashboard,
  useCloneDashboard,
  useDeleteDashboard,
  useRefreshDashboard,
} from './use-dashboards';

// Import all for default export
import {
  useReports,
  useReport,
  useSearchReports,
  useCreateReport,
  useGenerateReport,
  useDeleteReport,
} from './use-reports';

import {
  useReportSchedules,
  useReportSchedule,
  useCreateReportSchedule,
  useUpdateReportSchedule,
  useToggleReportSchedule,
  useDeleteReportSchedule,
  useReportExecutions,
  useReportExecutionStats,
} from './use-schedules';

import {
  useDashboards,
  useDashboard,
  useDefaultDashboard,
  useSearchDashboards,
  useCreateDashboard,
  useUpdateDashboard,
  useSetDefaultDashboard,
  useCloneDashboard,
  useDeleteDashboard,
  useRefreshDashboard,
} from './use-dashboards';

// Default export for backward compatibility
export default {
  // Reports
  useReports,
  useReport,
  useSearchReports,
  useCreateReport,
  useGenerateReport,
  useDeleteReport,
  
  // Schedules
  useReportSchedules,
  useReportSchedule,
  useCreateReportSchedule,
  useUpdateReportSchedule,
  useToggleReportSchedule,
  useDeleteReportSchedule,
  useReportExecutions,
  useReportExecutionStats,
  
  // Dashboards
  useDashboards,
  useDashboard,
  useDefaultDashboard,
  useSearchDashboards,
  useCreateDashboard,
  useUpdateDashboard,
  useSetDefaultDashboard,
  useCloneDashboard,
  useDeleteDashboard,
  useRefreshDashboard,
};
