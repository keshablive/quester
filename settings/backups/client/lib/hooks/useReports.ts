/**
 * useReports Hook (T195)
 * 
 * @deprecated This file maintains backward compatibility.
 * Import from './reports' for modular structure.
 * 
 * New structure:
 * - lib/hooks/reports/keys.ts - Query key factory
 * - lib/hooks/reports/use-reports.ts - Report hooks
 * - lib/hooks/reports/use-schedules.ts - Schedule hooks
 * - lib/hooks/reports/use-dashboards.ts - Dashboard hooks
 */

// Re-export everything from modular structure
export * from './reports';

// Default export for backward compatibility
import reportsHooks from './reports';
export default reportsHooks;
