/**
 * useAuth - Backward-compatible auth hook
 * Feature: 019-client-image-list-performance
 *
 * @description Combines all split auth contexts into a single hook.
 * This maintains backward compatibility with existing code that uses useAuth().
 *
 * Performance Note: This hook subscribes to ALL auth state - use specialized hooks
 * for better performance:
 * - useCoreAuth() - user, auth state, signIn, signOut
 * - useTwoFactor() - 2FA state, submitCode
 * - useBiometricAuth() - biometric state, enable/disable
 *
 * @example
 * ```tsx
 * // Backward compatible usage (subscribes to all state)
 * const { user, isAuthenticated, twoFactor, biometric, signIn } = useAuth();
 *
 * // Recommended: use specialized hooks for better performance
 * const { user, isAuthenticated, signIn } = useCoreAuth();
 * const { twoFactor, submitTwoFactorCode } = useTwoFactor();
 * const { biometric, enableBiometric } = useBiometricAuth();
 * ```
 */

import { useMemo } from 'react';

import { useCoreAuthContext } from '../contexts/CoreAuthContext';
import { useTwoFactorContext } from '../contexts/TwoFactorContext';
import { useBiometricContext } from '../contexts/BiometricContext';
import type { AuthContextType } from '../types';

/**
 * Combined auth hook - backward compatible
 * @returns Full auth context (subscribes to all auth state changes)
 * @deprecated For new code, use specialized hooks (useCoreAuth, useTwoFactor, useBiometricAuth)
 */
export function useAuth(): AuthContextType {
  const coreAuth = useCoreAuthContext();
  const twoFactorAuth = useTwoFactorContext();
  const biometricAuth = useBiometricContext();

  // Combine all contexts into legacy AuthContextType shape
  const combined = useMemo<AuthContextType>(
    () => ({
      // State from CoreAuth
      user: coreAuth.user,
      isLoading: coreAuth.isLoading,
      isInitializing: coreAuth.isInitializing,
      isAuthenticated: coreAuth.isAuthenticated,
      error: coreAuth.error,

      // State from TwoFactor
      twoFactor: twoFactorAuth.twoFactor,

      // State from Biometric
      biometric: biometricAuth.biometric,

      // Methods from CoreAuth
      signIn: async (email: string, password: string) => {
        const result = await coreAuth.signIn(email, password);
        // If 2FA is required, the CoreAuth context will trigger the TwoFactor context
        // via the onTwoFactorRequired callback
        if (result?.isRequired) {
          // 2FA was triggered - don't throw, just return
          return;
        }
      },
      signUp: coreAuth.signUp,
      signOut: coreAuth.signOut,
      signOutAll: coreAuth.signOutAll,
      forgotPassword: coreAuth.forgotPassword,
      resetPassword: coreAuth.resetPassword,
      clearError: coreAuth.clearError,

      // Methods from TwoFactor
      submitTwoFactorCode: twoFactorAuth.submitTwoFactorCode,
      cancelTwoFactor: twoFactorAuth.cancelTwoFactor,

      // Methods from Biometric
      enableBiometric: biometricAuth.enableBiometric,
      enableBiometricWithCredentials: biometricAuth.enableBiometricWithCredentials,
      disableBiometric: biometricAuth.disableBiometric,
      signInWithBiometric: biometricAuth.signInWithBiometric,
    }),
    [coreAuth, twoFactorAuth, biometricAuth]
  );

  return combined;
}

export type { AuthContextType };
