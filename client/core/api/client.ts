import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

/**
 * Get tenant ID from environment
 * FR-005: System MUST include X-Tenant-ID header in all authentication requests
 */
function getTenantId(): string {
    // @ts-ignore - Expo environment variables
    return process.env.EXPO_PUBLIC_TENANT_ID || '';
}

/**
 * API Error class
 */
export class ApiError extends Error {
    status: number;
    data: unknown;
    /** Whether this is a network/timeout error vs server error */
    isNetworkError: boolean;

    constructor(status: number, message: string, data?: unknown, isNetworkError = false) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = 'ApiError';
        this.isNetworkError = isNetworkError;
    }
}

/** Default request timeout in milliseconds (FR-014a: 10 seconds) */
const DEFAULT_TIMEOUT = 10000;

/**
 * API Client configuration
 */
export interface RequestConfig extends RequestInit {
    token?: string;
    /** Skip token refresh on 401 (used internally to prevent loops) */
    skipRefresh?: boolean;
    /** Custom timeout in ms (default: 10000) */
    timeout?: number;
}

/**
 * Service request options for API service methods (FR-016)
 * Used by services to accept AbortSignal for request cancellation
 */
export interface ServiceRequestOptions {
    /** AbortSignal for request cancellation */
    signal?: AbortSignal;
}

/** Flag to prevent concurrent refresh attempts */
let isRefreshing = false;
/** Queue of pending requests waiting for token refresh */
let refreshQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: Error) => void;
}> = [];

/**
 * Process the refresh queue after token refresh completes
 */
function processRefreshQueue(error: Error | null, token: string | null) {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    refreshQueue = [];
}

/**
 * Base API Client
 */
export const apiClient = {
    /**
     * Get auth token from storage
     */
    async getToken(): Promise<string | null> {
        try {
            const session = await AsyncStorage.getItem('@user_session');
            if (session) {
                const user = JSON.parse(session);
                // Assuming the token is stored in the user object or separately
                // For now, let's assume we might store a separate token key
                // or the user object has a token field.
                // Adjusting based on AuthContext: currently it stores the whole user object.
                // We'll need to ensure the user object has a token, or store it separately.
                // For this implementation, let's assume we'll store '@auth_token' separately
                // to keep it clean, or extract it from the session if present.
                return await AsyncStorage.getItem('@auth_token');
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Get refresh token from storage
     */
    async getRefreshToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('@refresh_token');
        } catch (error) {
            return null;
        }
    },

    /**
     * Set auth token
     */
    async setToken(token: string): Promise<void> {
        await AsyncStorage.setItem('@auth_token', token);
    },

    /**
     * Set refresh token
     */
    async setRefreshToken(token: string): Promise<void> {
        await AsyncStorage.setItem('@refresh_token', token);
    },

    /**
     * Remove auth token
     */
    async removeToken(): Promise<void> {
        await AsyncStorage.removeItem('@auth_token');
    },

    /**
     * Remove all tokens (logout)
     */
    async removeAllTokens(): Promise<void> {
        await AsyncStorage.multiRemove(['@auth_token', '@refresh_token', '@user_session']);
    },

    /**
     * Attempt to refresh the access token
     * FR-010: System MUST handle token refresh transparently during background fetches
     */
    async refreshAccessToken(): Promise<string | null> {
        const refreshToken = await this.getRefreshToken();
        if (!refreshToken) {
            return null;
        }

        try {
            const url = `${ENV.API_URL}/api/v1/auth/refresh`;
            const tenantId = getTenantId();
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                // Refresh failed - clear tokens
                await this.removeAllTokens();
                return null;
            }

            const data = await response.json();
            const newToken = data.accessToken || data.token;
            
            if (newToken) {
                await this.setToken(newToken);
                // Update refresh token if provided
                if (data.refreshToken) {
                    await this.setRefreshToken(data.refreshToken);
                }
                return newToken;
            }

            return null;
        } catch (error) {
            console.error('Token refresh failed:', error);
            await this.removeAllTokens();
            return null;
        }
    },

    /**
     * Handle 401 response with automatic token refresh
     */
    async handleUnauthorized<T>(
        endpoint: string,
        config: RequestConfig
    ): Promise<T | null> {
        // If already refreshing, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                refreshQueue.push({
                    resolve: async (token) => {
                        if (token) {
                            try {
                                const result = await this.request<T>(endpoint, {
                                    ...config,
                                    token,
                                    skipRefresh: true,
                                });
                                resolve(result);
                            } catch (err) {
                                reject(err);
                            }
                        } else {
                            reject(new ApiError(401, 'Unauthorized'));
                        }
                    },
                    reject,
                });
            });
        }

        isRefreshing = true;

        try {
            const newToken = await this.refreshAccessToken();
            processRefreshQueue(null, newToken);

            if (newToken) {
                // Retry the original request with new token
                return await this.request<T>(endpoint, {
                    ...config,
                    token: newToken,
                    skipRefresh: true,
                });
            }

            return null;
        } catch (error) {
            processRefreshQueue(error as Error, null);
            throw error;
        } finally {
            isRefreshing = false;
        }
    },

    /**
     * Generic request handler
     * FR-014: Implements AbortController for request cancellation
     * FR-014a: 10-second default timeout
     */
    async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const { token, headers, skipRefresh, signal: externalSignal, timeout = DEFAULT_TIMEOUT, ...rest } = config;

        // Create timeout controller (FR-014a)
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

        // Combine external signal with timeout signal
        const combinedSignal = externalSignal
            ? this.combineAbortSignals(externalSignal, timeoutController.signal)
            : timeoutController.signal;

        // Get token if not provided
        const authToken = token || await this.getToken();
        
        // Get tenant ID (FR-005: Required for all auth requests)
        const tenantId = getTenantId();

        // Prepare headers with X-Tenant-ID (Constitution I: Multi-Tenancy)
        const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...headers,
        };

        // Build URL
        const url = `${ENV.API_URL}/api/v1${endpoint}`;

        try {
            const response = await fetch(url, {
                headers: requestHeaders,
                signal: combinedSignal,
                ...rest,
            });

            clearTimeout(timeoutId);

            // Handle 401 Unauthorized (Token expired)
            if (response.status === 401) {
                // FR-010: Handle token refresh transparently
                if (!skipRefresh) {
                    const retryResult = await this.handleUnauthorized<T>(endpoint, config);
                    if (retryResult !== null) {
                        return retryResult;
                    }
                }
                // Token refresh failed or was skipped
                await this.removeAllTokens();
                throw new ApiError(401, 'Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(response.status, data.message || 'API Error', data);
            }

            return data as T;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof ApiError) {
                throw error;
            }

            // Handle abort/timeout errors (FR-014, FR-014a)
            if (error instanceof Error && error.name === 'AbortError') {
                const isTimeout = timeoutController.signal.aborted;
                throw new ApiError(
                    408,
                    isTimeout ? 'Request timed out' : 'Request was cancelled',
                    undefined,
                    true
                );
            }

            // Network errors (FR-007: should show toast)
            throw new ApiError(
                500,
                error instanceof Error ? error.message : 'Network Error',
                undefined,
                true
            );
        }
    },

    /**
     * Combine multiple AbortSignals into one
     * Aborts when any of the signals abort
     */
    combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
        const controller = new AbortController();

        for (const signal of signals) {
            if (signal.aborted) {
                controller.abort();
                return controller.signal;
            }
            signal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        return controller.signal;
    },

    /**
     * GET request
     */
    get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    },

    /**
     * POST request
     */
    post<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: JSON.stringify(body),
        });
    },

    /**
     * PUT request
     */
    put<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    },

    /**
     * PATCH request
     */
    patch<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    },

    /**
     * DELETE request
     */
    del<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    },

    /**
     * DELETE request (alias for del)
     */
    delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.del<T>(endpoint, config);
    },

    /**
     * Upload file (Multipart)
     * FR-014: Supports AbortController for cancellation
     */
    async upload<T>(endpoint: string, formData: FormData, config: RequestConfig = {}): Promise<T> {
        const { token, headers, signal: externalSignal, timeout = DEFAULT_TIMEOUT, ...rest } = config;
        const authToken = token || await this.getToken();

        // Create timeout controller (FR-014a)
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

        // Combine external signal with timeout signal
        const combinedSignal = externalSignal
            ? this.combineAbortSignals(externalSignal, timeoutController.signal)
            : timeoutController.signal;

        const requestHeaders: HeadersInit = {
            'Accept': 'application/json',
            // Content-Type is automatically set for FormData
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...headers,
        };

        const url = `${ENV.API_URL}/api/v1${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: requestHeaders,
                body: formData,
                signal: combinedSignal,
                ...rest,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(response.status, data.message || 'Upload Failed', data);
            }

            return data as T;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof ApiError) throw error;

            // Handle abort/timeout errors
            if (error instanceof Error && error.name === 'AbortError') {
                const isTimeout = timeoutController.signal.aborted;
                throw new ApiError(
                    408,
                    isTimeout ? 'Upload timed out' : 'Upload was cancelled',
                    undefined,
                    true
                );
            }

            throw new ApiError(500, error instanceof Error ? error.message : 'Upload Error', undefined, true);
        }
    }
};
