/**
 * TwoFactorContext - Two-factor authentication state and methods
 * Feature: 019-client-image-list-performance
 *
 * @description Focused context for 2FA operations (submitCode, cancel).
 * Split from monolithic AuthContext to reduce unnecessary re-renders.
 *
 * Performance: Only re-renders when 2FA state changes, not user/biometric state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { authService } from '../../api/services/auth.service';
import { TwoFactorState } from '../types';
import { mapAuthError } from '../../utils/auth-errors';
import { useCoreAuthContext } from './CoreAuthContext';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  TRUST_TOKEN: 'auth:trust_token',
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Initial 2FA state
 */
const initialTwoFactorState: TwoFactorState = {
  isRequired: false,
  pendingCredentials: undefined,
};

/**
 * Two-factor context type with methods
 */
export interface TwoFactorContextType {
  /** Current 2FA state */
  twoFactor: TwoFactorState;
  /** Submit 2FA verification code */
  submitTwoFactorCode: (code: string, trustDevice?: boolean) => Promise<void>;
  /** Cancel 2FA flow and return to login */
  cancelTwoFactor: () => void;
  /** Trigger 2FA flow (internal use) */
  triggerTwoFactor: (email: string, password: string) => void;
}

// ============================================================================
// Context
// ============================================================================

const TwoFactorContext = createContext<TwoFactorContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface TwoFactorProviderProps {
  children: React.ReactNode;
}

export function TwoFactorProvider({ children }: TwoFactorProviderProps) {
  // 2FA state
  const [twoFactor, setTwoFactor] = useState<TwoFactorState>(initialTwoFactorState);

  // Access core auth context for setting user after 2FA
  const coreAuth = useCoreAuthContext();

  /**
   * Trigger 2FA flow with pending credentials
   * Called by CoreAuthContext when login requires 2FA
   */
  const triggerTwoFactor = useCallback((email: string, password: string): void => {
    setTwoFactor({
      isRequired: true,
      pendingCredentials: { email, password },
    });

    if (__DEV__) {
      console.log('[TwoFactor] 2FA triggered for:', email);
    }
  }, []);

  /**
   * Submit 2FA verification code
   */
  const submitTwoFactorCode = useCallback(
    async (code: string, trustDevice = false): Promise<void> => {
      if (!twoFactor.pendingCredentials) {
        throw new Error('No pending 2FA credentials');
      }

      coreAuth.setIsLoading(true);
      coreAuth.setError(null);

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

        // Store auth data and set user
        const clientUser = await coreAuth.storeAuthData(response);
        coreAuth.setUser(clientUser);

        // Clear 2FA state
        setTwoFactor(initialTwoFactorState);

        if (__DEV__) {
          console.log('[TwoFactor] 2FA verification successful');
        }
      } catch (err) {
        const authError = mapAuthError(err);
        coreAuth.setError(authError.message);
        throw new Error(authError.message);
      } finally {
        coreAuth.setIsLoading(false);
      }
    },
    [twoFactor.pendingCredentials, coreAuth]
  );

  /**
   * Cancel 2FA flow
   */
  const cancelTwoFactor = useCallback((): void => {
    setTwoFactor(initialTwoFactorState);
    coreAuth.setError(null);

    if (__DEV__) {
      console.log('[TwoFactor] 2FA flow cancelled');
    }
  }, [coreAuth]);

  // Memoize context value
  const contextValue = useMemo<TwoFactorContextType>(
    () => ({
      twoFactor,
      submitTwoFactorCode,
      cancelTwoFactor,
      triggerTwoFactor,
    }),
    [twoFactor, submitTwoFactorCode, cancelTwoFactor, triggerTwoFactor]
  );

  return <TwoFactorContext.Provider value={contextValue}>{children}</TwoFactorContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access two-factor auth context
 * @throws Error if used outside TwoFactorProvider
 */
export function useTwoFactorContext(): TwoFactorContextType {
  const context = useContext(TwoFactorContext);

  if (!context) {
    throw new Error('useTwoFactorContext must be used within a TwoFactorProvider');
  }

  return context;
}

export { TwoFactorContext };
