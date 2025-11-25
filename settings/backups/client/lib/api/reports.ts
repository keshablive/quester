/**
 * Reports API Client (T193)
 * 
 * @deprecated This file maintains backward compatibility.
 * Import from './reports' for modular structure.
 * 
 * New structure:
 * - lib/api/reports/types.ts - Type definitions
 * - lib/api/reports/base-client.ts - Shared HTTP client
 * - lib/api/reports/reports-client.ts - Reports API methods
 * - lib/api/reports/schedules-client.ts - Schedules API methods
 * - lib/api/reports/dashboards-client.ts - Dashboards API methods
 * - lib/api/reports/index.ts - Unified client
 */

// Re-export everything from modular structure
export * from './reports/index';

// Default export for backward compatibility
export { reportsAPI, default } from './reports/index';
