/**
 * Reports API - Unified Client
 * 
 * Combines reports, schedules, and dashboards clients into a single interface.
 * Maintains backward compatibility with the original monolithic client.
 */

import { ReportsClient } from './reports-client';
import { SchedulesClient } from './schedules-client';
import { DashboardsClient } from './dashboards-client';

// Re-export all types
export * from './types';

/**
 * Unified Reports API Client
 * Provides all methods from reports, schedules, and dashboards
 */
class ReportsAPIClient {
  private reportsClient: ReportsClient;
  private schedulesClient: SchedulesClient;
  private dashboardsClient: DashboardsClient;

  constructor() {
    this.reportsClient = new ReportsClient();
    this.schedulesClient = new SchedulesClient();
    this.dashboardsClient = new DashboardsClient();
  }

  // ==================== REPORTS ====================
  
  createReport(...args: Parameters<ReportsClient['createReport']>) {
    return this.reportsClient.createReport(...args);
  }
  
  getReport(...args: Parameters<ReportsClient['getReport']>) {
    return this.reportsClient.getReport(...args);
  }
  
  getUserReports(...args: Parameters<ReportsClient['getUserReports']>) {
    return this.reportsClient.getUserReports(...args);
  }
  
  generateReport(...args: Parameters<ReportsClient['generateReport']>) {
    return this.reportsClient.generateReport(...args);
  }
  
  deleteReport(...args: Parameters<ReportsClient['deleteReport']>) {
    return this.reportsClient.deleteReport(...args);
  }
  
  searchReports(...args: Parameters<ReportsClient['searchReports']>) {
    return this.reportsClient.searchReports(...args);
  }

  // ==================== SCHEDULES ====================
  
  createReportSchedule(...args: Parameters<SchedulesClient['createReportSchedule']>) {
    return this.schedulesClient.createReportSchedule(...args);
  }
  
  getReportSchedule(...args: Parameters<SchedulesClient['getReportSchedule']>) {
    return this.schedulesClient.getReportSchedule(...args);
  }
  
  getUserReportSchedules(...args: Parameters<SchedulesClient['getUserReportSchedules']>) {
    return this.schedulesClient.getUserReportSchedules(...args);
  }
  
  updateReportSchedule(...args: Parameters<SchedulesClient['updateReportSchedule']>) {
    return this.schedulesClient.updateReportSchedule(...args);
  }
  
  toggleReportSchedule(...args: Parameters<SchedulesClient['toggleReportSchedule']>) {
    return this.schedulesClient.toggleReportSchedule(...args);
  }
  
  deleteReportSchedule(...args: Parameters<SchedulesClient['deleteReportSchedule']>) {
    return this.schedulesClient.deleteReportSchedule(...args);
  }
  
  getReportExecutions(...args: Parameters<SchedulesClient['getReportExecutions']>) {
    return this.schedulesClient.getReportExecutions(...args);
  }
  
  getReportExecutionStats(...args: Parameters<SchedulesClient['getReportExecutionStats']>) {
    return this.schedulesClient.getReportExecutionStats(...args);
  }

  // ==================== DASHBOARDS ====================
  
  createDashboard(...args: Parameters<DashboardsClient['createDashboard']>) {
    return this.dashboardsClient.createDashboard(...args);
  }
  
  getDashboard(...args: Parameters<DashboardsClient['getDashboard']>) {
    return this.dashboardsClient.getDashboard(...args);
  }
  
  getUserDashboards(...args: Parameters<DashboardsClient['getUserDashboards']>) {
    return this.dashboardsClient.getUserDashboards(...args);
  }
  
  getDefaultDashboard(...args: Parameters<DashboardsClient['getDefaultDashboard']>) {
    return this.dashboardsClient.getDefaultDashboard(...args);
  }
  
  updateDashboard(...args: Parameters<DashboardsClient['updateDashboard']>) {
    return this.dashboardsClient.updateDashboard(...args);
  }
  
  setDefaultDashboard(...args: Parameters<DashboardsClient['setDefaultDashboard']>) {
    return this.dashboardsClient.setDefaultDashboard(...args);
  }
  
  cloneDashboard(...args: Parameters<DashboardsClient['cloneDashboard']>) {
    return this.dashboardsClient.cloneDashboard(...args);
  }
  
  deleteDashboard(...args: Parameters<DashboardsClient['deleteDashboard']>) {
    return this.dashboardsClient.deleteDashboard(...args);
  }
  
  searchDashboards(...args: Parameters<DashboardsClient['searchDashboards']>) {
    return this.dashboardsClient.searchDashboards(...args);
  }
  
  refreshDashboard(...args: Parameters<DashboardsClient['refreshDashboard']>) {
    return this.dashboardsClient.refreshDashboard(...args);
  }
}

// Export singleton instance
export const reportsAPI = new ReportsAPIClient();

// Export default
export default reportsAPI;

// Export individual clients for direct use
export { ReportsClient, SchedulesClient, DashboardsClient };
