import { apiClient } from './client';
import { handleApiResponse } from '../utils/error-handler';

/**
 * KMS Key information
 */
export interface KMSKey {
  id: string;
  key_type: 'DEK' | 'KEK' | 'master';
  algorithm: string;
  created_at: string;
  rotated_at?: string;
  status: 'active' | 'rotated' | 'revoked';
  version: number;
}

/**
 * KMS Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  operation: 'encrypt' | 'decrypt' | 'rotate' | 'create' | 'revoke';
  key_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure';
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * KMS Statistics
 */
export interface KMSStats {
  total_keys: number;
  active_keys: number;
  rotated_keys: number;
  total_operations: number;
  operations_by_type: Record<string, number>;
  last_rotation: string;
  next_rotation_due?: string;
  encryption_operations_24h: number;
  decryption_operations_24h: number;
}

/**
 * Parameters for audit log query
 */
export interface AuditLogParams {
  page?: number;
  limit?: number;
  operation?: string;
  key_id?: string;
  user_id?: string;
  status?: 'success' | 'failure';
  from_date?: string;
  to_date?: string;
}

/**
 * Rotate Data Encryption Key (DEK)
 * Creates a new DEK and marks the old one as rotated.
 * 
 * **Admin Only**: This endpoint requires administrator privileges.
 * 
 * @returns Promise<KMSKey> - The newly created DEK
 * @throws ApiError with 403 if user is not admin
 * 
 * @example
 * ```typescript
 * const newKey = await rotateDEK();
 * console.log(`New DEK version: ${newKey.version}`);
 * ```
 */
export const rotateDEK = async (): Promise<KMSKey> => {
  try {
    const response = await apiClient.post('/kms/rotate-dek');
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * List all KMS keys
 * Returns information about all encryption keys in the system.
 * 
 * **Admin Only**: This endpoint requires administrator privileges.
 * 
 * @returns Promise<KMSKey[]> - List of all keys
 * @throws ApiError with 403 if user is not admin
 * 
 * @example
 * ```typescript
 * const keys = await listKeys();
 * const activeKeys = keys.filter(k => k.status === 'active');
 * console.log(`Active keys: ${activeKeys.length}`);
 * ```
 */
export const listKeys = async (): Promise<KMSKey[]> => {
  try {
    const response = await apiClient.get('/kms/keys');
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get KMS audit log
 * Retrieves audit trail of all KMS operations for security monitoring.
 * 
 * **Admin Only**: This endpoint requires administrator privileges.
 * 
 * @param params - Filter and pagination parameters
 * @returns Promise<AuditLogEntry[]> - List of audit log entries
 * @throws ApiError with 403 if user is not admin
 * 
 * @example
 * ```typescript
 * const logs = await getAuditLog({
 *   operation: 'rotate',
 *   status: 'success',
 *   page: 1,
 *   limit: 50,
 * });
 * ```
 */
export const getAuditLog = async (params?: AuditLogParams): Promise<AuditLogEntry[]> => {
  try {
    const response = await apiClient.get('/kms/audit-log', { params });
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get KMS statistics
 * Provides metrics and statistics about KMS operations and key usage.
 * 
 * **Admin Only**: This endpoint requires administrator privileges.
 * 
 * @returns Promise<KMSStats> - KMS statistics
 * @throws ApiError with 403 if user is not admin
 * 
 * @example
 * ```typescript
 * const stats = await getKMSStats();
 * console.log(`Total operations: ${stats.total_operations}`);
 * console.log(`Last rotation: ${stats.last_rotation}`);
 * ```
 */
export const getKMSStats = async (): Promise<KMSStats> => {
  try {
    const response = await apiClient.get('/kms/stats');
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * KMS API client
 * 
 * **Security Note**: All KMS endpoints require administrator privileges.
 * These endpoints manage encryption keys and are critical for system security.
 * 
 * **Operations**:
 * - Key rotation for periodic security updates
 * - Key listing for key management dashboards
 * - Audit logging for compliance and security monitoring
 * - Statistics for operational insights
 * 
 * @admin-only
 */
const kmsApi = {
  rotateDEK,
  listKeys,
  getAuditLog,
  getKMSStats,
};

export default kmsApi;
