import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Report {
    id: string;
    type: 'user' | 'post' | 'comment' | 'message';
    reportedById: string;
    reportedId: string;
    reason: string;
    description?: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    createdAt: string;
    updatedAt: string;
}

export interface ReportStats {
    total: number;
    pending: number;
    reviewed: number;
    resolved: number;
    dismissed: number;
}

export const reportsService = {
    /**
     * Get all reports (admin only)
     */
    async getReports(status?: string, page: number = 1, limit: number = 20): Promise<Report[]> {
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            if (status) params.append('status', status);
            return await apiClient.get(`${API_ENDPOINTS.REPORTS.BASE}?${params.toString()}`);
        } catch (error) {
            console.error('Failed to get reports:', error);
            throw error;
        }
    },

    /**
     * Get report by ID
     */
    async getReport(id: string): Promise<Report> {
        try {
            return await apiClient.get(`${API_ENDPOINTS.REPORTS.BASE}/${id}`);
        } catch (error) {
            console.error(`Failed to get report ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create report
     */
    async createReport(data: {
        type: Report['type'];
        reportedId: string;
        reason: string;
        description?: string;
    }): Promise<Report> {
        try {
            return await apiClient.post(API_ENDPOINTS.REPORTS.BASE, data);
        } catch (error) {
            console.error('Failed to create report:', error);
            throw error;
        }
    },

    /**
     * Update report status
     */
    async updateReportStatus(id: string, status: Report['status']): Promise<Report> {
        try {
            return await apiClient.put(`${API_ENDPOINTS.REPORTS.BASE}/${id}/status`, { status });
        } catch (error) {
            console.error(`Failed to update report status ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get report statistics
     */
    async getStats(): Promise<ReportStats> {
        try {
            return await apiClient.get(API_ENDPOINTS.REPORTS.STATS);
        } catch (error) {
            console.error('Failed to get report stats:', error);
            throw error;
        }
    },

    /**
     * Delete report
     */
    async deleteReport(id: string): Promise<void> {
        try {
            await apiClient.del(`${API_ENDPOINTS.REPORTS.BASE}/${id}`);
        } catch (error) {
            console.error(`Failed to delete report ${id}:`, error);
            throw error;
        }
    },
};
