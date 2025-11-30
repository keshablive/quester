/**
 * useTwoFactor - Hook for two-factor authentication operations
 * Feature: 019-client-image-list-performance
 *
 * @description Provides access to 2FA state and methods.
 * Use this hook only in components that handle 2FA - avoids unnecessary re-renders elsewhere.
 *
 * Performance: Components using this hook don't re-render on user/biometric state changes.
 *
 * @example
 * ```tsx
 * const { twoFactor, submitTwoFactorCode, cancelTwoFactor } = useTwoFactor();
 *
 * if (twoFactor.isRequired) {
 *   return (
 *     <TwoFactorInput
 *       onSubmit={(code) => submitTwoFactorCode(code, true)}
 *       onCancel={cancelTwoFactor}
 *     />
 *   );
 * }
 * ```
 */

import { useTwoFactorContext } from '../contexts/TwoFactorContext';
import type { TwoFactorContextType } from '../contexts/TwoFactorContext';

/**
 * Access two-factor authentication state and methods
 * @returns 2FA context with state and submit/cancel methods
 * @throws Error if used outside AuthProviders
 */
export function useTwoFactor(): TwoFactorContextType {
  return useTwoFactorContext();
}

export type { TwoFactorContextType };
