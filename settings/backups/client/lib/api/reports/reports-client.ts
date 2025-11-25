/**
 * Reports API Client
 * 
 * API methods for report CRUD operations and generation.
 */

import { BaseAPIClient } from './base-client';
import type {
  CreateReportRequest,
  Report,
  GetReportsParams,
  SearchReportsParams,
} from './types';

export class ReportsClient extends BaseAPIClient {
  /**
   * Create a new report
   */
  async createReport(data: CreateReportRequest): Promise<{ report: Report }> {
    return this.request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<{ report: Report }> {
    return this.request(`/api/reports/${id}`);
  }

  /**
   * Get user reports
   */
  async getUserReports(
    params?: GetReportsParams
  ): Promise<{ reports: Report[]; limit: number; offset: number; count: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return this.request(`/api/reports?${query}`);
  }

  /**
   * Generate report (async)
   */
  async generateReport(id: string): Promise<{ message: string; report_id: string }> {
    return this.request(`/api/reports/${id}/generate`, {
      method: 'POST',
    });
  }

  /**
   * Delete report
   */
  async deleteReport(id: string): Promise<{ message: string }> {
    return this.request(`/api/reports/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search reports
   */
  async searchReports(
    params: SearchReportsParams
  ): Promise<{ reports: Report[]; query: string; count: number }> {
    const query = new URLSearchParams({ q: params.q });
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return this.request(`/api/reports/search?${query}`);
  }
}
