/**
 * Auth Contexts - Split contexts for optimized re-rendering
 * Feature: 019-client-image-list-performance
 *
 * @description Barrel exports for focused auth contexts.
 * Each context only triggers re-renders for its specific state changes.
 */

// Core auth (user, tokens, signIn, signOut)
export {
  CoreAuthProvider,
  useCoreAuthContext,
  CoreAuthContext,
} from './CoreAuthContext';
export type { CoreAuthState, CoreAuthContextType, TwoFactorTrigger } from './CoreAuthContext';

// Two-factor auth (2FA state, submitCode)
export {
  TwoFactorProvider,
  useTwoFactorContext,
  TwoFactorContext,
} from './TwoFactorContext';
export type { TwoFactorContextType } from './TwoFactorContext';

// Biometric auth (biometric state, enable/disable)
export {
  BiometricProvider,
  useBiometricContext,
  BiometricContext,
} from './BiometricContext';
export type { BiometricContextType } from './BiometricContext';
