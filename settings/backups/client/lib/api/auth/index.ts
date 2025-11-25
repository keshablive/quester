/**
 * Authentication API
 * 
 * Main export point for authentication functionality.
 * Provides backward compatibility with the original monolithic auth.ts file.
 * 
 * @module lib/api/auth
 */

// Export all types
export * from './types';

// Export all helpers
export {
  API_BASE_URL,
  API_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_BASE,
  DEFAULT_TENANT_ID,
  getRetryDelay,
  sleep,
  parseErrorResponse,
  makeRequest,
  getTenantIdFromSubdomain,
} from './helpers';

// Export AuthAPI class
export { AuthAPI } from './auth-service';

// Export all token utilities
export {
  getAuthToken,
  setAuthToken,
  clearAuthTokens,
  logoutGracefully,
  refreshToken,
  getTenantId,
  setTenantId,
  getStoredTenantId,
} from './token-utils';

// Export singleton instance for backward compatibility
import { AuthAPI } from './auth-service';
export const authAPI = new AuthAPI();
