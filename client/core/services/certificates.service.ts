import { apiClient, ApiError } from '../api/client';
import type { ServiceRequestOptions } from '../api/client';
import { API_ENDPOINTS } from '../config/env';

/**
 * Certificate metadata structure
 * FR-011: Replaced `any` with proper interface
 */
export interface CertificateMetadata {
    issuerName?: string;
    courseName?: string;
    completionDate?: string;
    grade?: string;
    skills?: string[];
    [key: string]: unknown;
}

export interface Certificate {
    id: string;
    userId: string;
    courseId: string;
    code: string;
    issuedAt: string;
    expiresAt?: string;
    metadata: CertificateMetadata;
}

/**
 * Course statistics structure
 * FR-011: Replaced `any` with proper interface
 */
export interface CourseStats {
    totalCertificates: number;
    totalCompletions: number;
    averageCompletionTime?: number;
    [key: string]: unknown;
}

export const certificatesService = {
    /**
     * Get my certificates
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async getMyCertificates(options?: ServiceRequestOptions): Promise<Certificate[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.BASE, {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[certificatesService.getMyCertificates] Failed to fetch certificates', {
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
                isNetworkError: error instanceof ApiError ? error.isNetworkError : false,
            });
            throw error;
        }
    },

    /**
     * Get certificate by ID
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async get(id: string, options?: ServiceRequestOptions): Promise<Certificate> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.BY_ID(id), {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[certificatesService.get] Failed to fetch certificate', {
                certificateId: id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
            });
            throw error;
        }
    },

    /**
     * Get download URL
     */
    async getDownloadUrl(id: string, options?: ServiceRequestOptions): Promise<{ url: string }> {
        return apiClient.get(API_ENDPOINTS.CERTIFICATES.DOWNLOAD(id), {
            signal: options?.signal,
        });
    },

    /**
     * Regenerate certificate
     */
    async regenerate(id: string, options?: ServiceRequestOptions): Promise<Certificate> {
        return apiClient.post(API_ENDPOINTS.CERTIFICATES.REGENERATE(id), undefined, {
            signal: options?.signal,
        });
    },

    /**
     * Get course certificate
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async getCourseCertificate(courseId: string, options?: ServiceRequestOptions): Promise<Certificate> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.COURSE(courseId), {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[certificatesService.getCourseCertificate] Failed to fetch certificate', {
                courseId,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
            });
            throw error;
        }
    },

    /**
     * Get course stats
     * FR-011: Fixed return type from `any` to `CourseStats`
     */
    async getCourseStats(courseId: string, options?: ServiceRequestOptions): Promise<CourseStats> {
        return apiClient.get(API_ENDPOINTS.CERTIFICATES.STATS(courseId), {
            signal: options?.signal,
        });
    },

    /**
     * Verify certificate
     * FR-001: Removed mock data fallback - errors propagate to UI
     */
    async verify(code: string, options?: ServiceRequestOptions): Promise<{ valid: boolean; certificate?: Certificate }> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.VERIFY(code), {
                signal: options?.signal,
            });
        } catch (error) {
            console.error('[certificatesService.verify] Failed to verify certificate', {
                code,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStatus: error instanceof ApiError ? error.status : undefined,
            });
            throw error;
        }
    }
};
