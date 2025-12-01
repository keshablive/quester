/**
 * Authentication Context Provider
 * Feature: 014-auth-api-integration
 *
 * @description Provides authentication state and methods throughout the app.
 * Implements real API integration with JWT tokens.
 *
 * Implements:
 * - US1: Real login with JWT tokens
 * - US2: User registration
 * - US3: Session persistence
 * - US5: Logout (single/all devices)
 * - US6: 2FA support
 * - US7: Biometric authentication
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth.service';
import { apiClient } from '../api/client';
import { mapAuthError } from '../utils/auth-errors';
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  MAX_BIOMETRIC_ATTEMPTS,
} from '../utils/biometrics';
import {
  storeCredentials,
  retrieveCredentials,
  clearCredentials,
  isBiometricEnabled,
} from '../utils/secure-credentials';
import type {
  User,
  AuthState,
  AuthContextType,
  TwoFactorState,
  BiometricState,
  AuthResponse,
} from './types';
import { mapServerUserToClient } from './types';

// Storage keys
const STORAGE_KEYS = {
  USER_SESSION: '@user_session',
  ACCESS_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  TRUST_TOKEN: '@trust_token',
} as const;

// Initial states
const initialTwoFactorState: TwoFactorState = {
  isRequired: false,
  pendingCredentials: undefined,
};

const initialBiometricState: BiometricState = {
  isAvailable: false,
  isEnrolled: false,
  isEnabled: false,
  failedAttempts: 0,
};

const initialAuthState: AuthState = {
  user: null,
  isLoading: false,
  isInitializing: true,
  isAuthenticated: false,
  twoFactor: initialTwoFactorState,
  biometric: initialBiometricState,
  error: null,
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Authentication Provider Component
 * Manages auth state and provides auth methods to children
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<TwoFactorState>(initialTwoFactorState);
  const [biometric, setBiometric] = useState<BiometricState>(initialBiometricState);

  // Derived state
  const isAuthenticated = !!user;

  /**
   * Clear authentication error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Store authentication data after successful login/signup
   * FR-003: Store access token, refresh token, and user session
   */
  const storeAuthData = async (authResponse: AuthResponse): Promise<User> => {
    const { access_token, refresh_token, user: serverUser, trust_token } = authResponse;

    // Store tokens
    await apiClient.setToken(access_token);
    await apiClient.setRefreshToken(refresh_token);

    // Map server user to client format and store
    const clientUser = mapServerUserToClient(serverUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(clientUser));

    // Store trust token if provided (for 2FA bypass)
    if (trust_token) {
      await AsyncStorage.setItem(STORAGE_KEYS.TRUST_TOKEN, trust_token);
    }

    if (__DEV__) {
      console.log('[Auth] Session stored for user:', clientUser.email);
    }
    return clientUser;
  };

  /**
   * Clear all authentication data
   * FR-013: Clear local state on logout
   */
  const clearAuthData = async (): Promise<void> => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.USER_SESSION, STORAGE_KEYS.TRUST_TOKEN]);
    await apiClient.removeAllTokens();
    setUser(null);
    setTwoFactor(initialTwoFactorState);
    if (__DEV__) {
      console.log('[Auth] Session cleared');
    }
  };

  /**
   * Load stored session on app launch
   * US3/FR-015: Persist authentication state across app restarts
   */
  const loadStoredSession = useCallback(async (): Promise<void> => {
    try {
      const [token, refreshToken, userJson] = await Promise.all([
        apiClient.getToken(),
        apiClient.getRefreshToken(),
        AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION),
      ]);

      if (token && refreshToken && userJson) {
        const storedUser = JSON.parse(userJson) as User;
        setUser(storedUser);
        if (__DEV__) {
          console.log('[Auth] Session restored for:', storedUser.email);
        }
      } else if (refreshToken && userJson) {
        // Token missing but refresh token exists - try to refresh
        if (__DEV__) {
          console.log('[Auth] Access token missing, attempting refresh...');
        }
        try {
          await authService.refreshToken();
          const storedUser = JSON.parse(userJson) as User;
          setUser(storedUser);
          if (__DEV__) {
            console.log('[Auth] Session refreshed for:', storedUser.email);
          }
        } catch (refreshError) {
          if (__DEV__) {
            console.warn('[Auth] Token refresh failed, clearing session');
          }
          await clearAuthData();
        }
      } else {
        // No valid session
        await clearAuthData();
      }
    } catch (err) {
      console.error('[Auth] Session load failed:', err);
      await clearAuthData();
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Load session on mount
  useEffect(() => {
    loadStoredSession();
  }, [loadStoredSession]);

  /**
   * Sign in with email and password
   * US1/FR-001: Authenticate users via real API
   */
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get trust token if available (for 2FA bypass)
      const trustToken = await AsyncStorage.getItem(STORAGE_KEYS.TRUST_TOKEN);

      const response = await authService.login({
        email,
        password,
        device_fingerprint: trustToken || undefined,
        device_type: 'mobile',
      });

      // FR-008: Handle 2FA challenge
      if (response.requires_2fa) {
        setTwoFactor({
          isRequired: true,
          pendingCredentials: { email, password },
        });
        if (__DEV__) {
          console.log('[Auth] 2FA required for:', email);
        }
        return;
      }

      // FR-003: Store tokens and session
      const clientUser = await storeAuthData(response);
      setUser(clientUser);
      if (__DEV__) {
        console.log('[Auth] Login successful:', email);
      }
    } catch (err) {
      const authError = mapAuthError(err);
      setError(authError.message);
      console.error('[Auth] Login failed:', authError.type);
      throw new Error(authError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign up new user
   * US2/FR-002: Create new user accounts via real API
   */
  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authService.signup({
          email,
          username: name, // Server expects 'username' field
          password,
        });

        // Store tokens and session (same as login)
        const clientUser = await storeAuthData(response);
        setUser(clientUser);
        if (__DEV__) {
          console.log('[Auth] Signup successful:', email);
        }
      } catch (err) {
        const authError = mapAuthError(err);
        setError(authError.message);
        console.error('[Auth] Signup failed:', authError.type);
        throw new Error(authError.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Sign out from current device
   * US5/FR-011: Revoke refresh token on server
   * FR-013: Always clear local state even if API fails
   */
  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const refreshToken = await apiClient.getRefreshToken();
      if (refreshToken) {
        try {
          await authService.logout(refreshToken);
          if (__DEV__) {
            console.log('[Auth] Server logout successful');
          }
        } catch (err) {
          // FR-013: Don't block on server failure
          if (__DEV__) {
            console.warn('[Auth] Server logout failed, continuing with local cleanup:', err);
          }
        }
      }
    } finally {
      // Always clear local state
      await clearAuthData();
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign out from all devices
   * US5/FR-012: Revoke all user tokens
   */
  const signOutAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      try {
        await authService.logoutAll();
        if (__DEV__) {
          console.log('[Auth] All devices logout successful');
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[Auth] All devices logout failed:', err);
        }
      }
    } finally {
      await clearAuthData();
      setIsLoading(false);
    }
  }, []);

  /**
   * Request password reset email
   * US4/FR-006: Implement password reset request
   */
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(email);
      // Always show success (security - no email enumeration)
      if (__DEV__) {
        console.log('[Auth] Password reset requested for:', email);
      }
    } catch (err) {
      // Still don't reveal if email exists
      if (__DEV__) {
        console.log('[Auth] Password reset request completed');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset password with token
   * US4/FR-007: Implement password reset confirmation
   */
  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token, newPassword);
      if (__DEV__) {
        console.log('[Auth] Password reset successful');
      }
    } catch (err) {
      const authError = mapAuthError(err);
      setError(authError.message);
      throw new Error(authError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Submit 2FA verification code
   * US6/FR-008: Handle 2FA challenge flow
   * FR-009: Support device trust tokens
   */
  const submitTwoFactorCode = useCallback(
    async (code: string, trustDevice = false): Promise<void> => {
      if (!twoFactor.pendingCredentials) {
        throw new Error('No pending 2FA verification');
      }

      setIsLoading(true);
      setError(null);

      try {
        const { email, password } = twoFactor.pendingCredentials;
        const trustToken = await AsyncStorage.getItem(STORAGE_KEYS.TRUST_TOKEN);

        const response = await authService.login({
          email,
          password,
          two_factor_code: code,
          trust_device: trustDevice,
          device_fingerprint: trustToken || undefined,
          device_type: 'mobile',
        });

        const clientUser = await storeAuthData(response);
        setUser(clientUser);
        setTwoFactor(initialTwoFactorState);
        if (__DEV__) {
          console.log('[Auth] 2FA verification successful');
        }
      } catch (err) {
        const authError = mapAuthError(err);
        setError(authError.message);
        throw new Error(authError.message);
      } finally {
        setIsLoading(false);
      }
    },
    [twoFactor.pendingCredentials]
  );

  /**
   * Cancel 2FA flow
   */
  const cancelTwoFactor = useCallback((): void => {
    setTwoFactor(initialTwoFactorState);
    setError(null);
  }, []);

  // =========================================================================
  // Biometric methods (US7)
  // =========================================================================

  /**
   * Check and update biometric availability status
   * Called on mount and after enable/disable
   */
  const checkBiometricStatus = useCallback(async (): Promise<void> => {
    try {
      const availability = await checkBiometricAvailability();
      const enabled = await isBiometricEnabled();

      setBiometric((prev) => ({
        ...prev,
        isAvailable: availability.isAvailable,
        isEnrolled: availability.isEnrolled,
        isEnabled: enabled && availability.isAvailable && availability.isEnrolled,
      }));

      if (__DEV__) {
        console.log('[Auth] Biometric status:', {
          available: availability.isAvailable,
          enrolled: availability.isEnrolled,
          enabled,
          type: availability.biometricType,
        });
      }
    } catch (err) {
      console.error('[Auth] Biometric status check failed:', err);
    }
  }, []);

  // Check biometric status on mount
  useEffect(() => {
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  /**
   * Enable biometric login
   * US7/FR-014: Store credentials securely for biometric access
   * Requires user to be authenticated first
   */
  const enableBiometric = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('Must be logged in to enable biometric login');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if biometrics are available
      const availability = await checkBiometricAvailability();
      if (!availability.isAvailable) {
        throw new Error('Biometric authentication is not available on this device');
      }
      if (!availability.isEnrolled) {
        throw new Error(
          `No biometrics enrolled. Please set up ${availability.biometricLabel} in your device settings.`
        );
      }

      // Require biometric auth to confirm intent
      const authResult = await authenticateWithBiometric('Authenticate to enable biometric login');
      if (!authResult.success) {
        if (authResult.cancelled) {
          throw new Error('Biometric setup cancelled');
        }
        throw new Error(authResult.error || 'Biometric authentication failed');
      }

      // Get current session credentials (user needs to provide password again for security)
      // For now, we'll prompt user to re-enter password in the UI layer
      // This method will be called after password confirmation

      // Note: In a real implementation, we'd need the password here
      // For MVP, we store a flag and use the session to authenticate
      // Full implementation would require password re-entry

      setBiometric((prev) => ({
        ...prev,
        isEnabled: true,
        failedAttempts: 0,
      }));

      if (__DEV__) {
        console.log('[Auth] Biometric login enabled for:', user.email);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable biometric login';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Enable biometric with stored credentials
   * Called after user provides password for biometric setup
   */
  const enableBiometricWithCredentials = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Verify credentials are valid by attempting login
        const response = await authService.login({
          email,
          password,
          device_type: 'mobile',
        });

        // If 2FA is required, can't enable biometric without completing auth
        if (response.requires_2fa) {
          throw new Error('Please complete 2FA verification before enabling biometric login');
        }

        // Require biometric auth to confirm intent
        const authResult = await authenticateWithBiometric(
          'Authenticate to enable biometric login'
        );
        if (!authResult.success) {
          if (authResult.cancelled) {
            throw new Error('Biometric setup cancelled');
          }
          throw new Error(authResult.error || 'Biometric authentication failed');
        }

        // Store credentials securely
        const storeResult = await storeCredentials(email, password);
        if (!storeResult.success) {
          throw new Error(storeResult.error || 'Failed to store credentials');
        }

        setBiometric((prev) => ({
          ...prev,
          isEnabled: true,
          failedAttempts: 0,
        }));

        if (__DEV__) {
          console.log('[Auth] Biometric login enabled with credentials for:', email);
        }
      } catch (err) {
        const authError = mapAuthError(err);
        setError(authError.message);
        throw new Error(authError.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Disable biometric login
   * US7: Clear stored credentials
   */
  const disableBiometric = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear stored credentials
      await clearCredentials();

      setBiometric((prev) => ({
        ...prev,
        isEnabled: false,
        failedAttempts: 0,
      }));

      if (__DEV__) {
        console.log('[Auth] Biometric login disabled');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable biometric login';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign in with biometric authentication
   * US7/FR-014: Authenticate using stored credentials after biometric verification
   * Falls back to password after MAX_BIOMETRIC_ATTEMPTS failures
   */
  const signInWithBiometric = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if biometric is enabled
      if (!biometric.isEnabled) {
        throw new Error('Biometric login is not enabled');
      }

      // Check for max failed attempts
      if (biometric.failedAttempts >= MAX_BIOMETRIC_ATTEMPTS) {
        setBiometric((prev) => ({ ...prev, failedAttempts: 0 }));
        throw new Error('Too many failed attempts. Please use your password.');
      }

      // Authenticate with biometric
      const authResult = await authenticateWithBiometric('Sign in to Quester');

      if (!authResult.success) {
        // Increment failed attempts
        setBiometric((prev) => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1,
        }));

        if (authResult.cancelled) {
          throw new Error('Authentication cancelled');
        }
        if (authResult.usedFallback) {
          throw new Error('Fallback requested');
        }
        throw new Error(authResult.error || 'Biometric authentication failed');
      }

      // Retrieve stored credentials
      const credentials = await retrieveCredentials();
      if (!credentials) {
        // Credentials missing - disable biometric and require password
        await disableBiometric();
        throw new Error('Stored credentials not found. Please sign in with your password.');
      }

      // Sign in with stored credentials
      await signIn(credentials.email, credentials.password);

      // Reset failed attempts on success
      setBiometric((prev) => ({ ...prev, failedAttempts: 0 }));

      if (__DEV__) {
        console.log('[Auth] Biometric sign in successful');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Biometric sign in failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [biometric.isEnabled, biometric.failedAttempts, signIn, disableBiometric]);

  // =========================================================================
  // Context value
  // =========================================================================

  const contextValue: AuthContextType = {
    // State
    user,
    isLoading,
    isInitializing,
    isAuthenticated,
    twoFactor,
    biometric,
    error,
    // Methods
    signIn,
    signUp,
    signOut,
    signOutAll,
    forgotPassword,
    resetPassword,
    submitTwoFactorCode,
    cancelTwoFactor,
    enableBiometric,
    enableBiometricWithCredentials,
    disableBiometric,
    signInWithBiometric,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Re-export types for convenience
export type { User, AuthContextType, AuthState } from './types';
