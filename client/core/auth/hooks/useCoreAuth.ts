/**
 * useCoreAuth - Hook for core authentication operations
 * Feature: 019-client-image-list-performance
 *
 * @description Provides access to core auth state and methods.
 * Use this hook when you only need user/auth state - avoids re-renders from 2FA/biometric.
 *
 * Performance: Components using this hook don't re-render on 2FA/biometric state changes.
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, signIn, signOut } = useCoreAuth();
 *
 * if (!isAuthenticated) {
 *   return <LoginScreen onSubmit={signIn} />;
 * }
 *
 * return <ProfileScreen user={user} onLogout={signOut} />;
 * ```
 */

import { useCoreAuthContext } from '../contexts/CoreAuthContext';
import type { CoreAuthContextType } from '../contexts/CoreAuthContext';

/**
 * Access core authentication state and methods
 * @returns Core auth context with user, tokens, and basic auth methods
 * @throws Error if used outside AuthProviders
 */
export function useCoreAuth(): CoreAuthContextType {
  return useCoreAuthContext();
}

export type { CoreAuthContextType };
