/**
 * Auth Module - Authentication state and providers
 * Feature: 019-client-image-list-performance
 *
 * @description Exports auth providers, hooks, and types.
 *
 * Performance: Use specialized hooks for optimized re-renders:
 * - useCoreAuth() - user, auth state only
 * - useTwoFactor() - 2FA state only
 * - useBiometricAuth() - biometric state only
 *
 * Backward Compatibility:
 * - useAuth() - combined hook (subscribes to all state)
 * - AuthProvider - now re-exported as AuthProviders
 */

// Legacy exports for backward compatibility
export { AuthProvider, useAuth } from './AuthContext';

// New split contexts
export * from './contexts';

// Specialized hooks
export * from './hooks';

// Composite provider (recommended for new apps)
export { AuthProviders } from './providers';

// Types
export * from './types';
