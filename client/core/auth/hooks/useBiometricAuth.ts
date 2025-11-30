/**
 * useBiometricAuth - Hook for biometric authentication operations
 * Feature: 019-client-image-list-performance
 *
 * @description Provides access to biometric auth state and methods.
 * Use this hook only in components that handle biometric login - avoids unnecessary re-renders.
 *
 * Performance: Components using this hook don't re-render on user/2FA state changes.
 *
 * @example
 * ```tsx
 * const { biometric, enableBiometric, signInWithBiometric } = useBiometricAuth();
 *
 * if (biometric.isAvailable && biometric.isEnrolled) {
 *   return (
 *     <BiometricToggle
 *       enabled={biometric.isEnabled}
 *       onToggle={biometric.isEnabled ? disableBiometric : enableBiometric}
 *       onSignIn={signInWithBiometric}
 *     />
 *   );
 * }
 * ```
 */

import { useBiometricContext } from '../contexts/BiometricContext';
import type { BiometricContextType } from '../contexts/BiometricContext';

/**
 * Access biometric authentication state and methods
 * @returns Biometric context with state and enable/disable/signIn methods
 * @throws Error if used outside AuthProviders
 */
export function useBiometricAuth(): BiometricContextType {
  return useBiometricContext();
}

export type { BiometricContextType };
