/**
 * Dashboards API Client
 * 
 * API methods for dashboard CRUD operations and management.
 */

import { BaseAPIClient } from './base-client';
import type {
  CreateDashboardRequest,
  UpdateDashboardRequest,
  CloneDashboardRequest,
  Dashboard,
  GetDashboardsParams,
  SearchDashboardsParams,
} from './types';

export class DashboardsClient extends BaseAPIClient {
  /**
   * Create dashboard
   */
  async createDashboard(data: CreateDashboardRequest): Promise<{ dashboard: Dashboard }> {
    return this.request('/api/dashboards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(id: string): Promise<{ dashboard: Dashboard }> {
    return this.request(`/api/dashboards/${id}`);
  }

  /**
   * Get user dashboards
   */
  async getUserDashboards(
    params?: GetDashboardsParams
  ): Promise<{ dashboards: Dashboard[]; limit: number; offset: number; count: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return this.request(`/api/dashboards?${query}`);
  }

  /**
   * Get default dashboard
   */
  async getDefaultDashboard(): Promise<{ dashboard: Dashboard }> {
    return this.request('/api/dashboards/default');
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    id: string,
    data: UpdateDashboardRequest
  ): Promise<{ dashboard: Dashboard }> {
    return this.request(`/api/dashboards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Set dashboard as default
   */
  async setDefaultDashboard(id: string): Promise<{ message: string }> {
    return this.request(`/api/dashboards/${id}/default`, {
      method: 'PATCH',
    });
  }

  /**
   * Clone dashboard
   */
  async cloneDashboard(
    id: string,
    data: CloneDashboardRequest
  ): Promise<{ dashboard: Dashboard }> {
    return this.request(`/api/dashboards/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string): Promise<{ message: string }> {
    return this.request(`/api/dashboards/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search dashboards
   */
  async searchDashboards(
    params: SearchDashboardsParams
  ): Promise<{ dashboards: Dashboard[]; query: string; count: number }> {
    const query = new URLSearchParams({ q: params.q });
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    return this.request(`/api/dashboards/search?${query}`);
  }

  /**
   * Refresh dashboard metrics
   */
  async refreshDashboard(id: string): Promise<{ message: string }> {
    return this.request(`/api/dashboards/${id}/refresh`, {
      method: 'POST',
    });
  }
}
