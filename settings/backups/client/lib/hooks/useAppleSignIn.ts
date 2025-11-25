/**
 * Apple Sign-In Hook
 * 
 * Provides methods for Apple ID authentication using
 * expo-apple-authentication package (iOS only).
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { authAPI, type SocialAuthResponse } from '@/lib/api/auth';
import * as React from 'react';

interface UseAppleSignInState {
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseAppleSignInActions {
  signIn: () => Promise<SocialAuthResponse | null>;
  checkAvailability: () => Promise<void>;
}

export type UseAppleSignInReturn = UseAppleSignInState & UseAppleSignInActions;

/**
 * Hook for Apple Sign-In functionality (iOS only)
 * 
 * @param tenantId - Tenant ID for the authentication
 * @returns Apple Sign-In state and actions
 * 
 * @example
 * ```tsx
 * const { signIn, isAvailable, isLoading } = useAppleSignIn('tenant-123');
 * 
 * const handleSignIn = async () => {
 *   if (!isAvailable) {
 *     alert('Apple Sign-In is not available on this device');
 *     return;
 *   }
 *   
 *   const response = await signIn();
 *   if (response) {
 *     console.log('User:', response.data.user);
 *   }
 * };
 * ```
 */
export function useAppleSignIn(tenantId: string): UseAppleSignInReturn {
  const [state, setState] = React.useState<UseAppleSignInState>({
    isAvailable: false,
    isLoading: false,
    error: null,
  });

  /**
   * Check if Apple Sign-In is available on this device
   * Only available on iOS 13+ devices
   */
  const checkAvailability = React.useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      setState((prev) => ({ ...prev, isAvailable: false }));
      return;
    }

    try {
      const available = await AppleAuthentication.isAvailableAsync();
      setState((prev) => ({ ...prev, isAvailable: available }));
    } catch (err) {
      setState((prev) => ({ ...prev, isAvailable: false }));
    }
  }, []);

  // Check availability on mount
  React.useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  /**
   * Sign in with Apple
   * Opens Apple Sign-In UI and authenticates with backend
   */
  const signIn = React.useCallback(async (): Promise<SocialAuthResponse | null> => {
    if (!state.isAvailable) {
      setState((prev) => ({
        ...prev,
        error: 'Apple Sign-In is not available on this device',
      }));
      return null;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Authenticate with backend using identity token
      const response = await authAPI.loginWithApple(credential.identityToken, tenantId);

      setState((prev) => ({ ...prev, isLoading: false }));
      return response;
    } catch (err: any) {
      let errorMessage = 'An error occurred during sign-in';

      if (err.code === 'ERR_REQUEST_CANCELED') {
        errorMessage = 'Sign-in cancelled';
      } else if (err.code === 'ERR_REQUEST_FAILED') {
        errorMessage = 'Sign-in request failed';
      } else if (err.code === 'ERR_REQUEST_NOT_HANDLED') {
        errorMessage = 'Sign-in not handled';
      } else if (err.code === 'ERR_REQUEST_NOT_INTERACTIVE') {
        errorMessage = 'Sign-in not available in this context';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return null;
    }
  }, [state.isAvailable, tenantId]);

  return {
    ...state,
    signIn,
    checkAvailability,
  };
}
