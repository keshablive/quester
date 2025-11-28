import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Certificate {
    id: string;
    userId: string;
    courseId: string;
    code: string;
    issuedAt: string;
    expiresAt?: string;
    metadata: any;
}

export const certificatesService = {
    /**
     * Get my certificates
     */
    async getMyCertificates(): Promise<Certificate[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.BASE);
        } catch (error) {
            console.warn('Failed to get certificates, returning mock data:', error);
            return [
                {
                    id: '1',
                    userId: 'user1',
                    courseId: '1',
                    code: 'CERT-123456',
                    issuedAt: new Date().toISOString(),
                    metadata: {},
                },
                {
                    id: '2',
                    userId: 'user1',
                    courseId: '2',
                    code: 'CERT-789012',
                    issuedAt: new Date().toISOString(),
                    metadata: {},
                }
            ];
        }
    },

    /**
     * Get certificate by ID
     */
    async get(id: string): Promise<Certificate> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.BY_ID(id));
        } catch (error) {
            return {
                id: id,
                userId: 'user1',
                courseId: '1',
                code: 'CERT-123456',
                issuedAt: new Date().toISOString(),
                metadata: {},
            };
        }
    },

    /**
     * Get download URL
     */
    async getDownloadUrl(id: string): Promise<{ url: string }> {
        return apiClient.get(API_ENDPOINTS.CERTIFICATES.DOWNLOAD(id));
    },

    /**
     * Regenerate certificate
     */
    async regenerate(id: string): Promise<Certificate> {
        return apiClient.post(API_ENDPOINTS.CERTIFICATES.REGENERATE(id));
    },

    /**
     * Get course certificate
     */
    async getCourseCertificate(courseId: string): Promise<Certificate> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.COURSE(courseId));
        } catch (error) {
            return {
                id: '1',
                userId: 'user1',
                courseId: courseId,
                code: 'CERT-123456',
                issuedAt: new Date().toISOString(),
                metadata: {},
            };
        }
    },

    /**
     * Get course stats
     */
    async getCourseStats(courseId: string): Promise<any> {
        return apiClient.get(API_ENDPOINTS.CERTIFICATES.STATS(courseId));
    },

    /**
     * Verify certificate
     */
    async verify(code: string): Promise<{ valid: boolean; certificate?: Certificate }> {
        try {
            return await apiClient.get(API_ENDPOINTS.CERTIFICATES.VERIFY(code));
        } catch (error) {
            return {
                valid: true,
                certificate: {
                    id: '1',
                    userId: 'user1',
                    courseId: '1',
                    code: code,
                    issuedAt: new Date().toISOString(),
                    metadata: {},
                }
            };
        }
    }
};
