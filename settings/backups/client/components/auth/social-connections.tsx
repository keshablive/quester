import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useColorScheme } from 'nativewind';
import { useGoogleSignIn } from '@/lib/hooks/useGoogleSignIn';
import { useAppleSignIn } from '@/lib/hooks/useAppleSignIn';
import { useFacebookSignIn } from '@/lib/hooks/useFacebookSignIn';
import { useAuth } from '@/lib/hooks/useAuth';
import * as React from 'react';
import { Image, Platform, View, Alert, ActivityIndicator } from 'react-native';

interface SocialConnectionsProps {
  tenantId?: string;
  onSuccess?: () => void;
  googleWebClientId?: string;
  mode?: 'signin' | 'link'; // 'signin' for authentication, 'link' for linking accounts
}

const SOCIAL_CONNECTION_STRATEGIES = [
  {
    type: 'oauth_apple',
    source: { uri: 'https://img.clerk.com/static/apple.png?width=160' },
    useTint: true,
    name: 'Apple',
  },
  {
    type: 'oauth_google',
    source: { uri: 'https://img.clerk.com/static/google.png?width=160' },
    useTint: false,
    name: 'Google',
  },
  {
    type: 'oauth_facebook',
    source: { uri: 'https://img.clerk.com/static/facebook.png?width=160' },
    useTint: false,
    name: 'Facebook',
  },
];

export function SocialConnections({
  tenantId = 'default-tenant-id',
  onSuccess,
  googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  mode: _mode = 'signin',
}: SocialConnectionsProps) {
  const { colorScheme } = useColorScheme();
  const { login: _loginWithAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = React.useState<string | null>(null);

  // Initialize social sign-in hooks
  const googleSignIn = useGoogleSignIn(tenantId, googleWebClientId);
  const appleSignIn = useAppleSignIn(tenantId);
  const facebookSignIn = useFacebookSignIn(tenantId);

  /**
   * Handle social authentication success
   */
  const handleSocialAuthSuccess = React.useCallback(
    async (provider: string, response: any) => {
      if (!response) return;

      try {
        // If new user, show welcome message
        if (response.is_new_user) {
          Alert.alert(
            'Welcome to Quester!',
            `Account created successfully with ${provider}. You're now Level 1!`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', `Signed in with ${provider}!`, [{ text: 'OK' }]);
        }

        // Update auth context with user data and tokens
        // Note: In a real app, you'd want to update the useAuth context here
        // For now, we'll just call the onSuccess callback

        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        console.error(`${provider} auth success handler error:`, err);
      }
    },
    [onSuccess]
  );

  /**
   * Handle social authentication error
   */
  const handleSocialAuthError = React.useCallback((provider: string, error: string | null) => {
    if (error && error !== 'Sign-in cancelled') {
      Alert.alert(`${provider} Sign-In Failed`, error, [{ text: 'OK' }]);
    }
  }, []);

  /**
   * Handle Apple Sign-In
   */
  const handleAppleSignIn = React.useCallback(async () => {
    if (!appleSignIn.isAvailable) {
      Alert.alert('Not Available', 'Apple Sign-In is only available on iOS 13+', [{ text: 'OK' }]);
      return;
    }

    setLoadingProvider('oauth_apple');
    const response = await appleSignIn.signIn();
    setLoadingProvider(null);

    if (response) {
      await handleSocialAuthSuccess('Apple', response);
    } else if (appleSignIn.error) {
      handleSocialAuthError('Apple', appleSignIn.error);
    }
  }, [appleSignIn, handleSocialAuthSuccess, handleSocialAuthError]);

  /**
   * Handle Google Sign-In
   */
  const handleGoogleSignIn = React.useCallback(async () => {
    if (!googleSignIn.isConfigured) {
      Alert.alert(
        'Not Configured',
        'Google Sign-In is not configured. Please add your Google Web Client ID to the environment variables.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoadingProvider('oauth_google');
    const response = await googleSignIn.signIn();
    setLoadingProvider(null);

    if (response) {
      await handleSocialAuthSuccess('Google', response);
    } else if (googleSignIn.error) {
      handleSocialAuthError('Google', googleSignIn.error);
    }
  }, [googleSignIn, handleSocialAuthSuccess, handleSocialAuthError]);

  /**
   * Handle Facebook Sign-In
   */
  const handleFacebookSignIn = React.useCallback(async () => {
    setLoadingProvider('oauth_facebook');
    const response = await facebookSignIn.signIn();
    setLoadingProvider(null);

    if (response) {
      await handleSocialAuthSuccess('Facebook', response);
    } else if (facebookSignIn.error) {
      handleSocialAuthError('Facebook', facebookSignIn.error);
    }
  }, [facebookSignIn, handleSocialAuthSuccess, handleSocialAuthError]);

  /**
   * Get handler for each provider
   */
  const getProviderHandler = React.useCallback(
    (type: string) => {
      switch (type) {
        case 'oauth_apple':
          return handleAppleSignIn;
        case 'oauth_google':
          return handleGoogleSignIn;
        case 'oauth_facebook':
          return handleFacebookSignIn;
        default:
          return () => {};
      }
    },
    [handleAppleSignIn, handleGoogleSignIn, handleFacebookSignIn]
  );

  return (
    <View className="gap-2 sm:flex-row sm:gap-3">
      {SOCIAL_CONNECTION_STRATEGIES.map((strategy) => {
        const isLoading = loadingProvider === strategy.type;
        const handler = getProviderHandler(strategy.type);

        return (
          <Button
            key={strategy.type}
            variant="outline"
            size="sm"
            className="sm:flex-1"
            disabled={isLoading || loadingProvider !== null}
            onPress={handler}>
            {isLoading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Image
                className={cn(
                  'size-4',
                  strategy.useTint && Platform.select({ web: 'dark:invert' })
                )}
                tintColor={Platform.select({
                  native: strategy.useTint
                    ? colorScheme === 'dark'
                      ? 'white'
                      : 'black'
                    : undefined,
                })}
                source={strategy.source}
              />
            )}
          </Button>
        );
      })}
    </View>
  );
}
