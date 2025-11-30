/**
 * BiometricContext - Biometric authentication state and methods
 * Feature: 019-client-image-list-performance
 *
 * @description Focused context for biometric operations (enable, disable, signIn).
 * Split from monolithic AuthContext to reduce unnecessary re-renders.
 *
 * Performance: Only re-renders when biometric state changes, not user/2FA state.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '../../api/services/auth.service';
import { BiometricState } from '../types';
import { mapAuthError } from '../../utils/auth-errors';
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  MAX_BIOMETRIC_ATTEMPTS,
} from '../../utils/biometrics';
import {
  storeCredentials,
  retrieveCredentials,
  clearCredentials,
  isBiometricEnabled,
} from '../../utils/secure-credentials';
import { useCoreAuthContext } from './CoreAuthContext';

// ============================================================================
// Types
// ============================================================================

/**
 * Initial biometric state
 */
const initialBiometricState: BiometricState = {
  isAvailable: false,
  isEnrolled: false,
  isEnabled: false,
  failedAttempts: 0,
};

/**
 * Biometric context type with methods
 */
export interface BiometricContextType {
  /** Current biometric state */
  biometric: BiometricState;
  /** Enable biometric login (requires authenticated user) */
  enableBiometric: () => Promise<void>;
  /** Enable biometric with explicit credentials (for setup flow) */
  enableBiometricWithCredentials: (email: string, password: string) => Promise<void>;
  /** Disable biometric login */
  disableBiometric: () => Promise<void>;
  /** Sign in using biometric authentication */
  signInWithBiometric: () => Promise<void>;
  /** Check and update biometric availability */
  checkBiometricStatus: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const BiometricContext = createContext<BiometricContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface BiometricProviderProps {
  children: React.ReactNode;
}

export function BiometricProvider({ children }: BiometricProviderProps) {
  // Biometric state
  const [biometric, setBiometric] = useState<BiometricState>(initialBiometricState);

  // Access core auth context for user and sign-in
  const coreAuth = useCoreAuthContext();

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
        console.log('[Biometric] Status:', {
          available: availability.isAvailable,
          enrolled: availability.isEnrolled,
          enabled,
          type: availability.biometricType,
        });
      }
    } catch (err) {
      console.error('[Biometric] Status check failed:', err);
    }
  }, []);

  // Check biometric status on mount
  useEffect(() => {
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  /**
   * Enable biometric login
   * Requires user to be authenticated first
   */
  const enableBiometric = useCallback(async (): Promise<void> => {
    if (!coreAuth.user) {
      throw new Error('Must be logged in to enable biometric login');
    }

    coreAuth.setIsLoading(true);
    coreAuth.setError(null);

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

      setBiometric((prev) => ({
        ...prev,
        isEnabled: true,
        failedAttempts: 0,
      }));

      if (__DEV__) {
        console.log('[Biometric] Login enabled for:', coreAuth.user.email);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable biometric login';
      coreAuth.setError(message);
      throw new Error(message);
    } finally {
      coreAuth.setIsLoading(false);
    }
  }, [coreAuth]);

  /**
   * Enable biometric with stored credentials
   * Called after user provides password for biometric setup
   */
  const enableBiometricWithCredentials = useCallback(
    async (email: string, password: string): Promise<void> => {
      coreAuth.setIsLoading(true);
      coreAuth.setError(null);

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
          console.log('[Biometric] Login enabled with credentials for:', email);
        }
      } catch (err) {
        const authError = mapAuthError(err);
        coreAuth.setError(authError.message);
        throw new Error(authError.message);
      } finally {
        coreAuth.setIsLoading(false);
      }
    },
    [coreAuth]
  );

  /**
   * Disable biometric login
   */
  const disableBiometric = useCallback(async (): Promise<void> => {
    coreAuth.setIsLoading(true);
    coreAuth.setError(null);

    try {
      // Clear stored credentials
      await clearCredentials();

      setBiometric((prev) => ({
        ...prev,
        isEnabled: false,
        failedAttempts: 0,
      }));

      if (__DEV__) {
        console.log('[Biometric] Login disabled');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable biometric login';
      coreAuth.setError(message);
      throw new Error(message);
    } finally {
      coreAuth.setIsLoading(false);
    }
  }, [coreAuth]);

  /**
   * Sign in with biometric authentication
   * Falls back to password after MAX_BIOMETRIC_ATTEMPTS failures
   */
  const signInWithBiometric = useCallback(async (): Promise<void> => {
    coreAuth.setIsLoading(true);
    coreAuth.setError(null);

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
      await coreAuth.signIn(credentials.email, credentials.password);

      // Reset failed attempts on success
      setBiometric((prev) => ({ ...prev, failedAttempts: 0 }));

      if (__DEV__) {
        console.log('[Biometric] Sign in successful');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Biometric sign in failed';
      coreAuth.setError(message);
      throw new Error(message);
    } finally {
      coreAuth.setIsLoading(false);
    }
  }, [biometric.isEnabled, biometric.failedAttempts, coreAuth, disableBiometric]);

  // Memoize context value
  const contextValue = useMemo<BiometricContextType>(
    () => ({
      biometric,
      enableBiometric,
      enableBiometricWithCredentials,
      disableBiometric,
      signInWithBiometric,
      checkBiometricStatus,
    }),
    [
      biometric,
      enableBiometric,
      enableBiometricWithCredentials,
      disableBiometric,
      signInWithBiometric,
      checkBiometricStatus,
    ]
  );

  return <BiometricContext.Provider value={contextValue}>{children}</BiometricContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access biometric auth context
 * @throws Error if used outside BiometricProvider
 */
export function useBiometricContext(): BiometricContextType {
  const context = useContext(BiometricContext);

  if (!context) {
    throw new Error('useBiometricContext must be used within a BiometricProvider');
  }

  return context;
}

export { BiometricContext };
