/**
 * Google Sign-In Hook
 * 
 * Provides methods for Google OAuth authentication using
 * @react-native-google-signin/google-signin package.
 */

import {
  GoogleSignin,
  statusCodes,
  type User,
} from '@react-native-google-signin/google-signin';
import { authAPI, type SocialAuthResponse } from '@/lib/api/auth';
import * as React from 'react';

interface UseGoogleSignInState {
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
}

interface UseGoogleSignInActions {
  signIn: () => Promise<SocialAuthResponse | null>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  configure: (webClientId: string) => void;
}

export type UseGoogleSignInReturn = UseGoogleSignInState & UseGoogleSignInActions;

/**
 * Hook for Google Sign-In functionality
 * 
 * @param tenantId - Tenant ID for the authentication
 * @param webClientId - Optional Google Web Client ID (can be configured later)
 * @returns Google Sign-In state and actions
 * 
 * @example
 * ```tsx
 * const { signIn, isLoading, error } = useGoogleSignIn('tenant-123', 'YOUR_WEB_CLIENT_ID');
 * 
 * const handleSignIn = async () => {
 *   const response = await signIn();
 *   if (response) {
 *     console.log('User:', response.data.user);
 *   }
 * };
 * ```
 */
export function useGoogleSignIn(
  tenantId: string,
  webClientId?: string
): UseGoogleSignInReturn {
  const [state, setState] = React.useState<UseGoogleSignInState>({
    isLoading: false,
    isConfigured: false,
    error: null,
  });

  // Configure Google Sign-In
  const configure = React.useCallback((clientId: string) => {
    try {
      GoogleSignin.configure({
        webClientId: clientId,
        offlineAccess: false,
        forceCodeForRefreshToken: false,
      });

      setState((prev) => ({ ...prev, isConfigured: true, error: null }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to configure Google Sign-In';
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  }, []);

  // Configure on mount if webClientId provided
  React.useEffect(() => {
    if (webClientId && !state.isConfigured) {
      configure(webClientId);
    }
  }, [webClientId, state.isConfigured, configure]);

  /**
   * Sign in with Google
   * Opens Google Sign-In UI and authenticates with backend
   */
  const signIn = React.useCallback(async (): Promise<SocialAuthResponse | null> => {
    if (!state.isConfigured) {
      setState((prev) => ({
        ...prev,
        error: 'Google Sign-In not configured. Call configure() first.',
      }));
      return null;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Perform sign-in
      await GoogleSignin.signIn();

      // Get ID token
      const tokens = await GoogleSignin.getTokens();
      
      if (!tokens.idToken) {
        throw new Error('No ID token received from Google');
      }

      // Authenticate with backend using ID token
      const response = await authAPI.loginWithGoogle(tokens.idToken, tenantId);

      setState((prev) => ({ ...prev, isLoading: false }));
      return response;
    } catch (err: any) {
      let errorMessage = 'An error occurred during sign-in';

      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign-in cancelled';
      } else if (err.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign-in already in progress';
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return null;
    }
  }, [state.isConfigured, tenantId]);

  /**
   * Sign out from Google
   * Revokes access and signs out from Google account
   */
  const signOut = React.useCallback(async (): Promise<void> => {
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.error('Google sign-out error:', err);
    }
  }, []);

  /**
   * Get currently signed-in Google user
   * Returns user info if signed in, null otherwise
   */
  const getCurrentUser = React.useCallback(async (): Promise<User | null> => {
    try {
      const user = await GoogleSignin.getCurrentUser();
      return user;
    } catch (err) {
      return null;
    }
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    getCurrentUser,
    configure,
  };
}
