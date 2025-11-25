/**
 * Secure Storage Wrapper
 * 
 * Provides secure storage for authentication tokens using Expo SecureStore.
 * All token data is encrypted at rest on the device.
 */

import * as SecureStore from 'expo-secure-store';

// Storage Keys
const ACCESS_TOKEN_KEY = 'quester_access_token';
const REFRESH_TOKEN_KEY = 'quester_refresh_token';
const TOKEN_EXPIRY_KEY = 'quester_token_expiry';

// Token Data Interface
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (milliseconds)
}

/**
 * Save authentication tokens to secure storage
 * 
 * @param accessToken - JWT access token
 * @param refreshToken - Refresh token
 * @param expiresIn - Token expiry duration in seconds (default 3600 = 1 hour)
 * @throws Error if storage fails
 */
export const saveTokens = async (
  accessToken: string,
  refreshToken: string,
  expiresIn: number = 3600
): Promise<void> => {
  try {
    // Calculate expiry timestamp (current time + expiresIn seconds)
    const expiresAt = Date.now() + expiresIn * 1000;

    // Save tokens to secure storage
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiresAt.toString()),
    ]);

    console.log('[SecureStorage] Tokens saved successfully');
  } catch (error) {
    console.error('[SecureStorage] Failed to save tokens:', error);
    throw new Error('Failed to save authentication tokens');
  }
};

/**
 * Retrieve authentication tokens from secure storage
 * 
 * @returns TokenData object or null if no tokens found
 * @throws Error if storage access fails
 */
export const getTokens = async (): Promise<TokenData | null> => {
  try {
    // Retrieve tokens from secure storage
    const [accessToken, refreshToken, expiryString] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(TOKEN_EXPIRY_KEY),
    ]);

    // Check if all tokens exist
    if (!accessToken || !refreshToken || !expiryString) {
      console.log('[SecureStorage] No tokens found');
      return null;
    }

    const expiresAt = parseInt(expiryString, 10);

    // Validate expiry timestamp
    if (isNaN(expiresAt)) {
      console.warn('[SecureStorage] Invalid expiry timestamp, clearing tokens');
      await clearTokens();
      return null;
    }

    console.log('[SecureStorage] Tokens retrieved successfully');

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve tokens:', error);
    throw new Error('Failed to retrieve authentication tokens');
  }
};

/**
 * Clear all authentication tokens from secure storage
 * 
 * Used for logout or when tokens are invalid.
 * 
 * @throws Error if storage access fails
 */
export const clearTokens = async (): Promise<void> => {
  try {
    // Delete all token keys
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
    ]);

    console.log('[SecureStorage] Tokens cleared successfully');
  } catch (error) {
    console.error('[SecureStorage] Failed to clear tokens:', error);
    throw new Error('Failed to clear authentication tokens');
  }
};

/**
 * Check if access token is expired or about to expire
 * 
 * @param bufferMinutes - Minutes before expiry to consider token expired (default 5)
 * @returns true if token is expired or will expire within buffer time
 */
export const isTokenExpired = async (bufferMinutes: number = 5): Promise<boolean> => {
  try {
    const tokens = await getTokens();

    if (!tokens) {
      return true; // No tokens = expired
    }

    // Calculate buffer time in milliseconds
    const bufferMs = bufferMinutes * 60 * 1000;
    const now = Date.now();

    // Check if token is expired or within buffer time
    const isExpired = tokens.expiresAt - bufferMs <= now;

    if (isExpired) {
      console.log('[SecureStorage] Token is expired or expiring soon');
    }

    return isExpired;
  } catch (error) {
    console.error('[SecureStorage] Failed to check token expiry:', error);
    return true; // Assume expired on error
  }
};

/**
 * Get time remaining until token expiry (in milliseconds)
 * 
 * @returns milliseconds until expiry, or 0 if no tokens or already expired
 */
export const getTokenTimeRemaining = async (): Promise<number> => {
  try {
    const tokens = await getTokens();

    if (!tokens) {
      return 0;
    }

    const remaining = tokens.expiresAt - Date.now();
    return Math.max(0, remaining);
  } catch (error) {
    console.error('[SecureStorage] Failed to get token time remaining:', error);
    return 0;
  }
};

/**
 * Save any value to secure storage
 * Generic storage function for non-token data
 * 
 * @param key - Storage key
 * @param value - Value to store
 */
export const saveSecurely = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`[SecureStorage] Failed to save ${key}:`, error);
    throw new Error(`Failed to save ${key} to secure storage`);
  }
};

/**
 * Load any value from secure storage
 * Generic storage function for non-token data
 * 
 * @param key - Storage key
 * @returns stored value or null if not found
 */
export const loadSecurely = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[SecureStorage] Failed to load ${key}:`, error);
    return null;
  }
};
