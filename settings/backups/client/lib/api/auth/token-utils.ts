/**
 * Token Utilities
 * 
 * Utilities for managing authentication tokens in secure storage.
 * Handles token storage, retrieval, and refresh operations.
 * 
 * @module lib/api/auth/token-utils
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { RefreshResponse } from './types';
import { API_BASE_URL, MAX_RETRY_ATTEMPTS, RETRY_DELAY_BASE } from './helpers';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TENANT_ID_KEY = 'tenant_id';

/**
 * Helper function to reliably detect web platform
 * 
 * @returns True if running in web browser environment
 */
const isWeb = (): boolean => {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return true;
    }
    // Fallback to Platform.OS check
    return Platform.OS === 'web';
  } catch {
    // If Platform is not available, assume we're on web if window exists
    return typeof window !== 'undefined';
  }
};

/**
 * Get authentication token from secure storage
 * 
 * @param tokenType - Type of token to retrieve ('auth_token' or 'refresh_token')
 * @returns Token string or null if not found
 */
export async function getAuthToken(
  tokenType: 'auth_token' | 'refresh_token' = 'auth_token'
): Promise<string | null> {
  try {
    const key = tokenType === 'refresh_token' ? REFRESH_TOKEN_KEY : AUTH_TOKEN_KEY;
    if (isWeb()) {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Failed to get ${tokenType}:`, error);
    return null;
  }
}

/**
 * Store authentication tokens in secure storage
 * 
 * @param accessToken - Access token (JWT)
 * @param refreshToken - Refresh token
 * @throws Error if storage operation fails
 */
export async function setAuthToken(accessToken: string, refreshToken: string): Promise<void> {
  try {
    if (isWeb()) {
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } else {
      await Promise.all([
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);
    }
  } catch (error) {
    console.error('Failed to store tokens:', error);
    throw error;
  }
}

/**
 * Clear all authentication tokens from storage
 * 
 * Removes access token, refresh token, and tenant ID.
 */
export async function clearAuthTokens(): Promise<void> {
  try {
    if (isWeb()) {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, TENANT_ID_KEY]);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(TENANT_ID_KEY),
      ]);
    }
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

/**
 * Graceful logout when refresh token expires
 * 
 * Clears all auth data and provides user-friendly feedback.
 * 
 * @param reason - Optional reason for logout (default: 'Session expired')
 * @returns Promise that resolves when logout is complete
 */
export async function logoutGracefully(reason: string = 'Session expired'): Promise<void> {
  try {
    // Step 1: Clear tokens from SecureStore
    await clearAuthTokens();

    // Step 2: Clear user data from AsyncStorage
    await AsyncStorage.multiRemove([
      '@quester_user',
      '@quester_auth_token', // Fallback token storage
      '@quester_tenant_id',
    ]);

    // Step 3: Log the logout event for debugging
    console.log(`Graceful logout triggered: ${reason}`);

    // Note: Navigation to login screen is handled by the caller
    // (typically the 401 interceptor in client.ts or a React component)
    // This keeps the auth module decoupled from navigation/routing
  } catch (error) {
    console.error('Error during graceful logout:', error);
    // Even if cleanup fails, we should still proceed with logout
    // to avoid leaving the user in a broken state
  }
}

/**
 * Refresh access token with auto-retry
 * 
 * Refreshes the access token using the refresh token.
 * Implements exponential backoff on network errors.
 * 
 * @param retryCount - Current retry attempt (internal use)
 * @returns RefreshResponse with new tokens
 * @throws Error if refresh fails after retries
 */
export async function refreshToken(retryCount = 0): Promise<RefreshResponse> {
  const refreshTokenValue = await getAuthToken('refresh_token');

  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }

  const maxRetries = MAX_RETRY_ATTEMPTS;
  const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid response from refresh endpoint: ${response.statusText}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Token refresh failed');
    }

    // Store new tokens
    if (data.data?.access_token && data.data?.refresh_token) {
      await setAuthToken(data.data.access_token, data.data.refresh_token);
    }

    return data as RefreshResponse;
  } catch (error) {
    // Retry on network errors
    if (retryCount < maxRetries && error instanceof Error &&
      (error.message.includes('Network') || error.message.includes('fetch'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return refreshToken(retryCount + 1);
    }
    throw error;
  }
}

/**
 * Get tenant ID from subdomain
 * 
 * Extracts tenant identifier from URL subdomain or query parameter.
 * 
 * Supports:
 * - Subdomain: https://acme.quester.app → "acme"
 * - Query param: http://localhost:8080?tenant=acme → "acme"
 * - Default: https://quester.app → "default"
 * 
 * @param url - Optional URL to parse (defaults to window.location.href)
 * @returns Tenant ID string
 */
export function getTenantId(url?: string): string {
  try {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    if (!targetUrl) {
      return 'default';
    }

    // Parse URL
    let parsedUrl: URL;
    try {
      // Try with protocol
      parsedUrl = new URL(targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`);
    } catch {
      return 'default';
    }

    // Check query parameter first (for localhost development)
    const tenantParam = parsedUrl.searchParams.get('tenant');
    if (tenantParam) {
      return tenantParam.toLowerCase();
    }

    // Extract subdomain
    const hostname = parsedUrl.hostname;
    const parts = hostname.split('.');

    // Root domain or www (quester.app or www.quester.app)
    if (parts.length <= 2 || parts[0] === 'www') {
      return 'default';
    }

    // Extract first subdomain (acme.quester.app or acme.staging.quester.app)
    return parts[0].toLowerCase();
  } catch (error) {
    console.error('Failed to extract tenant ID:', error);
    return 'default';
  }
}

/**
 * Store tenant ID in secure storage
 * 
 * @param tenantId - Tenant identifier to store
 */
export async function setTenantId(tenantId: string): Promise<void> {
  try {
    if (isWeb()) {
      await AsyncStorage.setItem(TENANT_ID_KEY, tenantId);
    } else {
      await SecureStore.setItemAsync(TENANT_ID_KEY, tenantId);
    }
  } catch (error) {
    console.error('Failed to store tenant ID:', error);
  }
}

/**
 * Get stored tenant ID from secure storage
 * 
 * @returns Tenant ID or null if not found
 */
export async function getStoredTenantId(): Promise<string | null> {
  try {
    if (isWeb()) {
      return await AsyncStorage.getItem(TENANT_ID_KEY);
    }
    return await SecureStore.getItemAsync(TENANT_ID_KEY);
  } catch (error) {
    console.error('Failed to get tenant ID:', error);
    return null;
  }
}
