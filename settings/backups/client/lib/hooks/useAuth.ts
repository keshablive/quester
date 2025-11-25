/**
 * useAuth Hook
 * 
 * Provides authentication state management and operations.
 * Manages user data, tokens, and authentication flows.
 */

import { useState, useEffect, useCallback } from 'react';
import { authAPI, LoginResponse, ApiError } from '../api/auth';
import {
  saveTokens,
  getTokens,
  clearTokens,
  isTokenExpired,
} from '../storage/secure-storage';

// User Interface
export interface User {
  id: string;
  tenantId: string;
  email: string;
  username: string;
  role: string;
  xp: number;
  level: number;
  tier: string;
  loginStreak: number;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// Auth State Interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth Actions Interface
export interface AuthActions {
  signup: (
    email: string,
    password: string,
    username: string,
    tenantId?: string
  ) => Promise<void>;
  login: (
    email: string,
    password: string,
    twoFactorCode?: string,
    trustDevice?: boolean,
    deviceFingerprint?: string,
    deviceName?: string,
    deviceType?: 'mobile' | 'desktop' | 'tablet' | 'web',
    trustToken?: string
  ) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

// Parse user from API response
const parseUser = (apiUser: any): User => {
  return {
    id: apiUser.id,
    tenantId: apiUser.tenant_id,
    email: apiUser.email,
    username: apiUser.username,
    role: apiUser.role,
    xp: apiUser.xp || 0,
    level: apiUser.level || 1,
    tier: apiUser.tier || 'BRONZE',
    loginStreak: apiUser.login_streak || 0,
    lastLogin: apiUser.last_login || null,
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
  };
};

/**
 * useAuth Hook
 * 
 * Usage:
 * ```tsx
 * const { user, isAuthenticated, isLoading, signup, login, logout } = useAuth();
 * 
 * // Sign up
 * await signup('user@example.com', 'Password123!', 'username', 'tenant-id');
 * 
 * // Login
 * await login('user@example.com', 'Password123!');
 * 
 * // Logout
 * await logout();
 * ```
 */
export const useAuth = (): AuthState & AuthActions => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize authentication state from stored tokens
   */
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const tokens = await getTokens();

      if (!tokens) {
        console.log('[useAuth] No tokens found, user not authenticated');
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // Check if token is expired
      const expired = await isTokenExpired(5); // 5-minute buffer

      if (expired) {
        console.log('[useAuth] Token expired, attempting refresh...');
        
        try {
          const refreshResponse = await authAPI.refresh(tokens.refreshToken);

          // Save new tokens
          await saveTokens(
            refreshResponse.data.access_token,
            refreshResponse.data.refresh_token,
            refreshResponse.data.expires_in
          );

          // Note: User data is not returned from refresh endpoint
          // We'll rely on the user data stored in state or re-login
          setIsAuthenticated(true);
          console.log('[useAuth] Token refreshed successfully');
        } catch (refreshError) {
          console.error('[useAuth] Token refresh failed:', refreshError);
          // Clear invalid tokens
          await clearTokens();
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        // Token still valid
        setIsAuthenticated(true);
        console.log('[useAuth] Valid token found, user authenticated');
      }
    } catch (error) {
      console.error('[useAuth] Failed to initialize auth:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Sign up a new user
   */
  const signup = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      tenantId?: string
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('[useAuth] Signing up user:', email);

        const response = await authAPI.signup(email, password, username, tenantId);

        // Save tokens
        await saveTokens(
          response.data.access_token,
          response.data.refresh_token,
          response.data.expires_in
        );

        // Parse and set user
        const userData = parseUser(response.data.user);
        setUser(userData);
        setIsAuthenticated(true);

        console.log('[useAuth] Signup successful, user:', userData.username);
      } catch (error) {
        console.error('[useAuth] Signup failed:', error);
        
        if (error instanceof ApiError) {
          setError(error.message);
        } else if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unexpected error occurred during signup');
        }
        
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Log in an existing user
   * Supports 2FA flow:
   * 1. First call without twoFactorCode - may return requires_2fa
   * 2. Second call with twoFactorCode - completes login
   * 
   * @param email - User's email address
   * @param password - User's password
   * @param twoFactorCode - Optional 2FA code (6-digit TOTP or 8-char backup code)
   * @param trustDevice - Whether to trust this device (skip 2FA for 30 days)
   * @param deviceFingerprint - Device identifier for trust
   * @param deviceName - User-friendly device name
   * @param deviceType - Device type
   * @param trustToken - Trust token from previous login
   * @returns LoginResponse - Contains user data or requires_2fa flag
   */
  const login = useCallback(
    async (
      email: string,
      password: string,
      twoFactorCode?: string,
      trustDevice?: boolean,
      deviceFingerprint?: string,
      deviceName?: string,
      deviceType?: 'mobile' | 'desktop' | 'tablet' | 'web',
      trustToken?: string
    ): Promise<LoginResponse> => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('[useAuth] Logging in user:', email, twoFactorCode ? '(with 2FA code)' : '');

        const response = await authAPI.login(
          email,
          password,
          twoFactorCode,
          trustDevice,
          deviceFingerprint,
          deviceName,
          deviceType,
          trustToken
        );

        // Check if 2FA is required
        if (response.requires_2fa) {
          console.log('[useAuth] 2FA required for login');
          setIsLoading(false);
          return response;
        }

        // Login successful - save tokens
        if (response.data) {
          await saveTokens(
            response.data.access_token,
            response.data.refresh_token,
            response.data.expires_in
          );

          // Parse and set user
          const userData = parseUser(response.data.user);
          setUser(userData);
          setIsAuthenticated(true);

          console.log('[useAuth] Login successful, user:', userData.username, 'streak:', userData.loginStreak);
        }

        return response;
      } catch (error) {
        console.error('[useAuth] Login failed:', error);
        
        if (error instanceof ApiError) {
          setError(error.message);
        } else if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unexpected error occurred during login');
        }
        
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Log out the current user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useAuth] Logging out user');

      const tokens = await getTokens();

      // Call logout API if tokens exist
      if (tokens) {
        try {
          await authAPI.logout(tokens.accessToken, tokens.refreshToken);
          console.log('[useAuth] Logout API call successful');
        } catch (apiError) {
          // Log error but continue with local logout
          console.warn('[useAuth] Logout API call failed:', apiError);
        }
      }

      // Clear tokens and state
      await clearTokens();
      setUser(null);
      setIsAuthenticated(false);

      console.log('[useAuth] Logout complete');
    } catch (error) {
      console.error('[useAuth] Logout failed:', error);
      
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred during logout');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manually refresh authentication (re-check tokens)
   */
  const refreshAuth = useCallback(async (): Promise<void> => {
    await initializeAuth();
  }, [initializeAuth]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    // Actions
    signup,
    login,
    logout,
    refreshAuth,
    clearError,
  };
};
