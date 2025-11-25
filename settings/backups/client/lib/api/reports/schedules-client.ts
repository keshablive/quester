/**
 * Schedules API Client
 * 
 * API methods for report schedule management and execution tracking.
 */

import { BaseAPIClient } from './base-client';
import type {
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
  ReportSchedule,
  ReportExecution,
  ReportExecutionStats,
  GetReportExecutionsParams,
  GetReportExecutionStatsParams,
} from './types';

export class SchedulesClient extends BaseAPIClient {
  /**
   * Create report schedule
   */
  async createReportSchedule(
    data: CreateReportScheduleRequest
  ): Promise<{ schedule: ReportSchedule }> {
    return this.request('/api/reports/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get schedule by ID
   */
  async getReportSchedule(id: string): Promise<{ schedule: ReportSchedule }> {
    return this.request(`/api/reports/schedules/${id}`);
  }

  /**
   * Get user schedules
   */
  async getUserReportSchedules(): Promise<{ schedules: ReportSchedule[]; count: number }> {
    return this.request('/api/reports/schedules');
  }

  /**
   * Update report schedule
   */
  async updateReportSchedule(
    id: string,
    data: UpdateReportScheduleRequest
  ): Promise<{ schedule: ReportSchedule }> {
    return this.request(`/api/reports/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Toggle report schedule active status
   */
  async toggleReportSchedule(
    id: string,
    isActive: boolean
  ): Promise<{ message: string }> {
    return this.request(`/api/reports/schedules/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  /**
   * Delete report schedule
   */
  async deleteReportSchedule(id: string): Promise<{ message: string }> {
    return this.request(`/api/reports/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get report executions
   */
  async getReportExecutions(
    scheduleId: string,
    params?: GetReportExecutionsParams
  ): Promise<{ executions: ReportExecution[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return this.request(`/api/reports/schedules/${scheduleId}/executions?${query}`);
  }

  /**
   * Get report execution stats
   */
  async getReportExecutionStats(
    scheduleId: string,
    params?: GetReportExecutionStatsParams
  ): Promise<{ stats: ReportExecutionStats; start_date: string; end_date: string }> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);

    return this.request(`/api/reports/schedules/${scheduleId}/stats?${query}`);
  }
}
