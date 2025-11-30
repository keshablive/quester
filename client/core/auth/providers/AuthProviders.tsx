/**
 * AuthProviders - Composite provider for all auth contexts
 * Feature: 019-client-image-list-performance
 *
 * @description Wraps all split auth contexts in the correct order.
 * Use this at app root to provide full auth functionality.
 *
 * Provider Order (innermost to outermost):
 * 1. CoreAuthProvider - Base auth state (user, tokens)
 * 2. TwoFactorProvider - 2FA state (depends on CoreAuth)
 * 3. BiometricProvider - Biometric state (depends on CoreAuth)
 *
 * @example
 * ```tsx
 * // _layout.tsx
 * import { AuthProviders } from '@/core/auth/providers';
 *
 * export default function RootLayout() {
 *   return (
 *     <AuthProviders>
 *       <Slot />
 *     </AuthProviders>
 *   );
 * }
 * ```
 */

import { useCallback, useRef, type ReactNode } from 'react';

import { CoreAuthProvider } from '../contexts/CoreAuthContext';
import { TwoFactorProvider, useTwoFactorContext } from '../contexts/TwoFactorContext';
import { BiometricProvider } from '../contexts/BiometricContext';

// ============================================================================
// Internal Components
// ============================================================================

/**
 * Bridge component to connect CoreAuth 2FA trigger to TwoFactorContext
 */
function TwoFactorBridge({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Inner providers that depend on CoreAuth
 */
function InnerProviders({ children }: { children: ReactNode }) {
  return (
    <TwoFactorProvider>
      <BiometricProvider>
        <TwoFactorBridge>{children}</TwoFactorBridge>
      </BiometricProvider>
    </TwoFactorProvider>
  );
}

// ============================================================================
// Main Provider
// ============================================================================

interface AuthProvidersProps {
  children: ReactNode;
}

/**
 * Composite auth provider that wraps all split contexts
 *
 * Usage:
 * ```tsx
 * <AuthProviders>
 *   <App />
 * </AuthProviders>
 * ```
 *
 * After wrapping, use specialized hooks for optimized re-renders:
 * - useCoreAuth() - user, auth state, signIn, signOut
 * - useTwoFactor() - 2FA state, submitCode, cancel
 * - useBiometricAuth() - biometric state, enable, disable, signIn
 *
 * Or use legacy useAuth() for backward compatibility (subscribes to all states)
 */
export function AuthProviders({ children }: AuthProvidersProps) {
  // Ref to hold the TwoFactor trigger callback
  // This allows CoreAuth to trigger 2FA without circular dependency
  const twoFactorTriggerRef = useRef<((email: string, password: string) => void) | null>(null);

  // Callback to be passed to CoreAuthProvider
  const onTwoFactorRequired = useCallback((email: string, password: string) => {
    if (twoFactorTriggerRef.current) {
      twoFactorTriggerRef.current(email, password);
    }
  }, []);

  return (
    <CoreAuthProvider onTwoFactorRequired={onTwoFactorRequired}>
      <TwoFactorProvider>
        <TwoFactorTriggerSetter triggerRef={twoFactorTriggerRef} />
        <BiometricProvider>{children}</BiometricProvider>
      </TwoFactorProvider>
    </CoreAuthProvider>
  );
}

/**
 * Helper component to connect the trigger ref to TwoFactorContext
 */
function TwoFactorTriggerSetter({
  triggerRef,
}: {
  triggerRef: React.MutableRefObject<((email: string, password: string) => void) | null>;
}) {
  const { triggerTwoFactor } = useTwoFactorContext();

  // Set the ref to point to the trigger function
  triggerRef.current = triggerTwoFactor;

  return null;
}

export default AuthProviders;
