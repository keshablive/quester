/**
 * Auth Hooks - Specialized hooks for optimized state access
 * Feature: 019-client-image-list-performance
 *
 * @description Barrel exports for focused auth hooks.
 * Each hook only subscribes to its specific context - avoiding unnecessary re-renders.
 *
 * Performance Benefits:
 * - useCoreAuth(): Only re-renders on user/auth state changes
 * - useTwoFactor(): Only re-renders on 2FA state changes
 * - useBiometricAuth(): Only re-renders on biometric state changes
 *
 * Backward Compatibility:
 * - useAuth(): Combines all contexts (legacy, subscribes to all state)
 *
 * @example
 * ```tsx
 * // Profile screen - only needs user data
 * import { useCoreAuth } from '@/core/auth/hooks';
 * const { user, isAuthenticated } = useCoreAuth();
 *
 * // Settings screen - needs biometric toggle
 * import { useBiometricAuth } from '@/core/auth/hooks';
 * const { biometric, enableBiometric } = useBiometricAuth();
 *
 * // Login screen - needs 2FA handling
 * import { useTwoFactor } from '@/core/auth/hooks';
 * const { twoFactor, submitTwoFactorCode } = useTwoFactor();
 *
 * // Legacy: subscribes to all auth state (not recommended for new code)
 * import { useAuth } from '@/core/auth/hooks';
 * const { user, twoFactor, biometric } = useAuth();
 * ```
 */

// Specialized hooks (recommended)
export { useCoreAuth } from './useCoreAuth';
export type { CoreAuthContextType } from './useCoreAuth';

export { useTwoFactor } from './useTwoFactor';
export type { TwoFactorContextType } from './useTwoFactor';

export { useBiometricAuth } from './useBiometricAuth';
export type { BiometricContextType } from './useBiometricAuth';

// Backward compatible hook (legacy)
export { useAuth } from './useAuth';
export type { AuthContextType } from './useAuth';
