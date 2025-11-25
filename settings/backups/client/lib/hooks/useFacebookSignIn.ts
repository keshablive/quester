/**
 * Facebook Sign-In Hook
 * 
 * Provides methods for Facebook OAuth authentication using
 * expo-auth-session for OAuth flow.
 */

import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { authAPI, type SocialAuthResponse } from '@/lib/api/auth';
import * as React from 'react';

interface UseFacebookSignInState {
  isLoading: boolean;
  error: string | null;
}

interface UseFacebookSignInActions {
  signIn: () => Promise<SocialAuthResponse | null>;
}

export type UseFacebookSignInReturn = UseFacebookSignInState & UseFacebookSignInActions;

const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

/**
 * Hook for Facebook Sign-In functionality
 * 
 * @param tenantId - Tenant ID for the authentication
 * @returns Facebook Sign-In state and actions
 * 
 * @example
 * ```tsx
 * const { signIn, isLoading, error } = useFacebookSignIn('tenant-123');
 * 
 * const handleSignIn = async () => {
 *   const response = await signIn();
 *   if (response) {
 *     console.log('User:', response.data.user);
 *   }
 * };
 * ```
 */
export function useFacebookSignIn(tenantId: string): UseFacebookSignInReturn {
  const [state, setState] = React.useState<UseFacebookSignInState>({
    isLoading: false,
    error: null,
  });

  const discovery = React.useMemo(
    () => ({
      authorizationEndpoint: 'https://www.facebook.com/v12.0/dialog/oauth',
      tokenEndpoint: 'https://graph.facebook.com/v12.0/oauth/access_token',
    }),
    []
  );

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'quester',
    path: 'auth/facebook',
  });

  /**
   * Sign in with Facebook
   * Opens Facebook OAuth flow and authenticates with backend
   */
  const signIn = React.useCallback(async (): Promise<SocialAuthResponse | null> => {
    if (!FACEBOOK_APP_ID) {
      setState((prev) => ({
        ...prev,
        error: 'Facebook App ID not configured',
      }));
      return null;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate code verifier for PKCE
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString()
      );

      // Create auth request
      const authRequest = new AuthSession.AuthRequest({
        clientId: FACEBOOK_APP_ID,
        redirectUri,
        scopes: ['public_profile', 'email'],
        responseType: AuthSession.ResponseType.Token,
        usePKCE: false, // Facebook doesn't support PKCE
      });

      // Perform authorization
      const result = await authRequest.promptAsync(discovery);

      if (result.type !== 'success') {
        if (result.type === 'cancel') {
          setState((prev) => ({ ...prev, isLoading: false, error: 'Sign-in cancelled' }));
        } else {
          setState((prev) => ({ ...prev, isLoading: false, error: 'Sign-in failed' }));
        }
        return null;
      }

      const accessToken = result.params.access_token;

      if (!accessToken) {
        throw new Error('No access token received from Facebook');
      }

      // Authenticate with backend using access token
      const response = await authAPI.loginWithFacebook(accessToken, tenantId);

      setState((prev) => ({ ...prev, isLoading: false }));
      return response;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during sign-in';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return null;
    }
  }, [tenantId, redirectUri, discovery]);

  return {
    ...state,
    signIn,
  };
}
