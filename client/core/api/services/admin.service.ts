import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface KMSEncryptionKey {
    id: string;
    version: number;
    algorithm: string;
    state: 'active' | 'rotated' | 'compromised';
    createdAt: string;
    rotatedAt?: string;
}

export interface KMSAuditLog {
    id: string;
    action: string;
    keyId: string;
    performedBy: string;
    timestamp: string;
    details?: string;
}

export interface KMSStats {
    totalKeys: number;
    activeKeys: number;
    rotatedKeys: number;
    lastRotation: string;
}

export const adminService = {
    /**
     * Rotate DEK
     */
    async rotateDEK(): Promise<void> {
        try {
            await apiClient.post(API_ENDPOINTS.ADMIN.KMS.ROTATE_DEK);
        } catch (error) {
            console.error('Failed to rotate DEK:', error);
            throw error;
        }
    },

    /**
     * List keys
     */
    async listKeys(): Promise<KMSEncryptionKey[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.ADMIN.KMS.KEYS);
        } catch (error) {
            console.error('Failed to list keys:', error);
            throw error;
        }
    },

    /**
     * Get audit log
     */
    async getAuditLog(): Promise<KMSAuditLog[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.ADMIN.KMS.AUDIT_LOG);
        } catch (error) {
            console.error('Failed to get audit log:', error);
            throw error;
        }
    },

    /**
     * Get stats
     */
    async getStats(): Promise<KMSStats> {
        try {
            return await apiClient.get(API_ENDPOINTS.ADMIN.KMS.STATS);
        } catch (error) {
            console.error('Failed to get KMS stats:', error);
            throw error;
        }
    }
};
