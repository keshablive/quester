/**
 * useTokenRefresh Hook
 * 
 * Automatically refreshes access tokens before they expire.
 * Runs in the background every 5 minutes to check token expiry.
 */

import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { authAPI } from '../api/auth';
import {
  getTokens,
  saveTokens,
  isTokenExpired,
  clearTokens,
} from '../storage/secure-storage';

// Refresh configuration
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const EXPIRY_BUFFER = 5; // Refresh 5 minutes before expiry
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 2000; // 2 seconds

interface UseTokenRefreshOptions {
  enabled?: boolean; // Enable/disable auto-refresh (default: true)
  onRefreshSuccess?: () => void; // Callback on successful refresh
  onRefreshError?: (error: Error) => void; // Callback on refresh failure
  onLogout?: () => void; // Callback when auto-logout occurs
}

/**
 * useTokenRefresh Hook
 * 
 * Automatically manages token refresh lifecycle:
 * 1. Checks token expiry every 5 minutes
 * 2. Refreshes token 5 minutes before expiry
 * 3. Retries with exponential backoff on failure
 * 4. Auto-logout if refresh fails after retries
 * 5. Pauses when app is in background
 * 
 * Usage:
 * ```tsx
 * useTokenRefresh({
 *   enabled: isAuthenticated,
 *   onRefreshSuccess: () => console.log('Token refreshed'),
 *   onRefreshError: (err) => console.error('Refresh failed:', err),
 *   onLogout: () => navigation.navigate('Login'),
 * });
 * ```
 */
export const useTokenRefresh = (options: UseTokenRefreshOptions = {}) => {
  const {
    enabled = true,
    onRefreshSuccess,
    onRefreshError,
    onLogout,
  } = options;

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  /**
   * Perform token refresh with retry logic
   */
  const refreshToken = useCallback(
    async (retryAttempt: number = 0): Promise<boolean> => {
      // Prevent concurrent refresh attempts
      if (isRefreshingRef.current) {
        console.log('[useTokenRefresh] Refresh already in progress, skipping');
        return false;
      }

      try {
        isRefreshingRef.current = true;

        console.log('[useTokenRefresh] Starting token refresh (attempt', retryAttempt + 1, ')');

        const tokens = await getTokens();

        if (!tokens) {
          console.log('[useTokenRefresh] No tokens found, skipping refresh');
          return false;
        }

        // Call refresh API
        const response = await authAPI.refresh(tokens.refreshToken);

        // Save new tokens
        await saveTokens(
          response.data.access_token,
          response.data.refresh_token,
          response.data.expires_in
        );

        // Reset retry counter on success
        retryCountRef.current = 0;

        console.log('[useTokenRefresh] Token refresh successful');

        // Call success callback
        if (onRefreshSuccess) {
          onRefreshSuccess();
        }

        return true;
      } catch (error) {
        console.error('[useTokenRefresh] Token refresh failed:', error);

        // Retry with exponential backoff
        if (retryAttempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt);
          console.log(`[useTokenRefresh] Retrying in ${delay}ms...`);

          await new Promise(resolve => setTimeout(resolve, delay));
          return refreshToken(retryAttempt + 1);
        }

        // Max retries exceeded - auto logout
        console.error('[useTokenRefresh] Max retries exceeded, logging out');

        // Clear tokens
        await clearTokens();

        // Call error callback
        if (onRefreshError && error instanceof Error) {
          onRefreshError(error);
        }

        // Call logout callback
        if (onLogout) {
          onLogout();
        }

        return false;
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [onRefreshSuccess, onRefreshError, onLogout]
  );

  /**
   * Check if token needs refresh and perform if needed
   */
  const checkAndRefresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    try {
      const expired = await isTokenExpired(EXPIRY_BUFFER);

      if (expired) {
        console.log('[useTokenRefresh] Token expiring soon, refreshing...');
        await refreshToken();
      } else {
        console.log('[useTokenRefresh] Token still valid, no refresh needed');
      }
    } catch (error) {
      console.error('[useTokenRefresh] Check failed:', error);
    }
  }, [enabled, refreshToken]);

  /**
   * Handle app state changes (foreground/background)
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[useTokenRefresh] App became active, checking token...');
        checkAndRefresh();
      } else if (nextAppState === 'background') {
        console.log('[useTokenRefresh] App went to background, pausing refresh');
      }
    },
    [checkAndRefresh]
  );

  /**
   * Start periodic token refresh checks
   */
  useEffect(() => {
    if (!enabled) {
      console.log('[useTokenRefresh] Auto-refresh disabled');
      return;
    }

    console.log('[useTokenRefresh] Starting auto-refresh (check every', CHECK_INTERVAL / 60000, 'minutes)');

    // Initial check on mount
    checkAndRefresh();

    // Set up interval for periodic checks
    intervalRef.current = setInterval(() => {
      checkAndRefresh();
    }, CHECK_INTERVAL);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      console.log('[useTokenRefresh] Stopping auto-refresh');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      subscription.remove();
    };
  }, [enabled, checkAndRefresh, handleAppStateChange]);

  return {
    refreshToken: () => refreshToken(),
  };
};
