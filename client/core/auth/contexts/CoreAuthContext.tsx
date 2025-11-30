/**
 * CoreAuthContext - Core authentication state and methods
 * Feature: 019-client-image-list-performance
 *
 * @description Focused context for core auth operations (user, tokens, signIn, signOut).
 * Split from monolithic AuthContext to reduce unnecessary re-renders.
 *
 * Performance: Only re-renders when user/auth state changes, not 2FA/biometric state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '../../api/services/auth.service';
import { User, AuthResponse, mapServerUserToClient } from '../types';
import { mapAuthError } from '../../utils/auth-errors';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  USER_SESSION: 'auth:user_session',
  ACCESS_TOKEN: 'auth:access_token',
  REFRESH_TOKEN: 'auth:refresh_token',
  TRUST_TOKEN: 'auth:trust_token',
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Core auth state - user and authentication status
 */
export interface CoreAuthState {
  /** Current authenticated user (null if not logged in) */
  user: User | null;
  /** Authentication loading state */
  isLoading: boolean;
  /** Initial session check in progress */
  isInitializing: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Last authentication error */
  error: string | null;
}

/**
 * Two-factor auth trigger result
 * Returned when 2FA is required during sign-in
 */
export interface TwoFactorTrigger {
  isRequired: true;
  email: string;
  password: string;
}

/**
 * Core auth context type with methods
 */
export interface CoreAuthContextType extends CoreAuthState {
  /** Sign in with email/password - may trigger 2FA */
  signIn: (email: string, password: string) => Promise<TwoFactorTrigger | void>;
  /** Sign up new user */
  signUp: (name: string, email: string, password: string) => Promise<void>;
  /** Sign out from current device */
  signOut: () => Promise<void>;
  /** Sign out from all devices */
  signOutAll: () => Promise<void>;
  /** Request password reset email */
  forgotPassword: (email: string) => Promise<void>;
  /** Reset password with token */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  /** Clear authentication error */
  clearError: () => void;
  /** Store auth data after successful login (internal use) */
  storeAuthData: (response: AuthResponse) => Promise<User>;
  /** Clear auth data on logout (internal use) */
  clearAuthData: () => Promise<void>;
  /** Set user state (internal use by 2FA/biometric contexts) */
  setUser: (user: User | null) => void;
  /** Set error state (internal use by 2FA/biometric contexts) */
  setError: (error: string | null) => void;
  /** Set loading state (internal use by 2FA/biometric contexts) */
  setIsLoading: (loading: boolean) => void;
}

// ============================================================================
// Context
// ============================================================================

const CoreAuthContext = createContext<CoreAuthContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface CoreAuthProviderProps {
  children: React.ReactNode;
  /** Callback when 2FA is triggered */
  onTwoFactorRequired?: (email: string, password: string) => void;
}

export function CoreAuthProvider({ children, onTwoFactorRequired }: CoreAuthProviderProps) {
  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const isAuthenticated = !!user;

  /**
   * Clear error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Store auth data in secure storage
   */
  const storeAuthData = useCallback(async (response: AuthResponse): Promise<User> => {
    const clientUser = mapServerUserToClient(response.user);

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(clientUser)),
      AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token),
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token),
      response.trust_token
        ? AsyncStorage.setItem(STORAGE_KEYS.TRUST_TOKEN, response.trust_token)
        : Promise.resolve(),
    ]);

    if (__DEV__) {
      console.log('[CoreAuth] Stored auth data for:', clientUser.email);
    }

    return clientUser;
  }, []);

  /**
   * Clear all stored auth data
   */
  const clearAuthData = useCallback(async (): Promise<void> => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION),
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
    ]);

    if (__DEV__) {
      console.log('[CoreAuth] Cleared stored auth data');
    }
  }, []);

  /**
   * Load stored session on mount
   */
  const loadStoredSession = useCallback(async (): Promise<void> => {
    try {
      const [storedUser, accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION),
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);

      if (storedUser && accessToken && refreshToken) {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);

        if (__DEV__) {
          console.log('[CoreAuth] Restored session for:', parsedUser.email);
        }
      }
    } catch (err) {
      console.error('[CoreAuth] Failed to load stored session:', err);
      await clearAuthData();
    } finally {
      setIsInitializing(false);
    }
  }, [clearAuthData]);

  // Load session on mount
  useEffect(() => {
    loadStoredSession();
  }, [loadStoredSession]);

  /**
   * Sign in with email and password
   * Returns TwoFactorTrigger if 2FA is required
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<TwoFactorTrigger | void> => {
      setIsLoading(true);
      setError(null);

      try {
        const trustToken = await AsyncStorage.getItem(STORAGE_KEYS.TRUST_TOKEN);

        const response = await authService.login({
          email,
          password,
          device_fingerprint: trustToken || undefined,
          device_type: 'mobile',
        });

        // Check if 2FA is required
        if (response.requires_2fa) {
          if (__DEV__) {
            console.log('[CoreAuth] 2FA required for:', email);
          }

          // Notify callback if provided
          onTwoFactorRequired?.(email, password);

          // Return trigger for external handling
          return {
            isRequired: true,
            email,
            password,
          };
        }

        // Standard login success
        const clientUser = await storeAuthData(response);
        setUser(clientUser);

        if (__DEV__) {
          console.log('[CoreAuth] Login successful:', clientUser.email);
        }
      } catch (err) {
        const authError = mapAuthError(err);
        setError(authError.message);
        throw new Error(authError.message);
      } finally {
        setIsLoading(false);
      }
    },
    [storeAuthData, onTwoFactorRequired]
  );

  /**
   * Sign up new user
   */
  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authService.signup({
          email,
          username: name,
          password,
        });

        const clientUser = await storeAuthData(response);
        setUser(clientUser);

        if (__DEV__) {
          console.log('[CoreAuth] Signup successful:', clientUser.email);
        }
      } catch (err) {
        const authError = mapAuthError(err);
        setError(authError.message);
        throw new Error(authError.message);
      } finally {
        setIsLoading(false);
      }
    },
    [storeAuthData]
  );

  /**
   * Sign out from current device
   */
  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        try {
          await authService.logout(refreshToken);
        } catch (err) {
          // Ignore API errors - proceed with local logout
          console.warn('[CoreAuth] Logout API call failed:', err);
        }
      }

      await clearAuthData();
      setUser(null);

      if (__DEV__) {
        console.log('[CoreAuth] Signed out');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthData]);

  /**
   * Sign out from all devices
   */
  const signOutAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logoutAll();
      await clearAuthData();
      setUser(null);

      if (__DEV__) {
        console.log('[CoreAuth] Signed out from all devices');
      }
    } catch (err) {
      const authError = mapAuthError(err);
      setError(authError.message);
      throw new Error(authError.message);
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthData]);

  /**
   * Request password reset email
   */
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(email);

      if (__DEV__) {
        console.log('[CoreAuth] Password reset email sent to:', email);
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
   * Reset password with token
   */
  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token, newPassword);

      if (__DEV__) {
        console.log('[CoreAuth] Password reset successful');
      }
    } catch (err) {
      const authError = mapAuthError(err);
      setError(authError.message);
      throw new Error(authError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize context value
  const contextValue = useMemo<CoreAuthContextType>(
    () => ({
      // State
      user,
      isLoading,
      isInitializing,
      isAuthenticated,
      error,
      // Methods
      signIn,
      signUp,
      signOut,
      signOutAll,
      forgotPassword,
      resetPassword,
      clearError,
      storeAuthData,
      clearAuthData,
      setUser,
      setError,
      setIsLoading,
    }),
    [
      user,
      isLoading,
      isInitializing,
      isAuthenticated,
      error,
      signIn,
      signUp,
      signOut,
      signOutAll,
      forgotPassword,
      resetPassword,
      clearError,
      storeAuthData,
      clearAuthData,
    ]
  );

  return <CoreAuthContext.Provider value={contextValue}>{children}</CoreAuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access core auth context
 * @throws Error if used outside CoreAuthProvider
 */
export function useCoreAuthContext(): CoreAuthContextType {
  const context = useContext(CoreAuthContext);

  if (!context) {
    throw new Error('useCoreAuthContext must be used within a CoreAuthProvider');
  }

  return context;
}

export { CoreAuthContext };
