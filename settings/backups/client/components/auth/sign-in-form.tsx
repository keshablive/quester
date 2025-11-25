import { SocialConnections } from '@/components/auth/social-connections';
import { TwoFactorVerification } from '@/components/auth/two-factor-verification';
import { ValidationError } from '@/components/validation-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBiometric } from '@/lib/hooks/useBiometric';
import { useNetwork } from '@/lib/hooks/useNetwork';
import { useAccessibility } from '@/lib/hooks/use-accessibility';
import { ApiError, RateLimitError } from '@/lib/api/auth';
import { getDeviceFingerprint, getDeviceName, getDeviceType } from '@/lib/utils/device';
import { loadSecurely } from '@/lib/storage/secure-storage';
import {
  FingerprintIcon,
  ScanFaceIcon,
  WifiOffIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { useEffect } from 'react';
import { Pressable, type TextInput, View, Alert, ActivityIndicator } from 'react-native';

interface SignInFormProps {
  onSuccess?: () => void;
  onNavigateToSignUp?: () => void;
  onNavigateToForgotPassword?: () => void;
  enableBiometric?: boolean; // Enable biometric authentication option
  enableRememberMe?: boolean; // Enable remember me checkbox
}

export function SignInForm({
  onSuccess,
  onNavigateToSignUp,
  onNavigateToForgotPassword,
  enableBiometric = true,
  enableRememberMe = true,
}: SignInFormProps) {
  const { login, isLoading, error, user } = useAuth();
  const biometric = useBiometric();
  const { isOffline } = useNetwork();
  const { announceForAccessibility } = useAccessibility();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [requires2FA, setRequires2FA] = React.useState(false);
  const [savedCredentials, setSavedCredentials] = React.useState<{
    email: string;
    password: string;
  } | null>(null);

  const passwordInputRef = React.useRef<TextInput>(null);

  /**
   * Try biometric authentication on mount
   */
  React.useEffect(() => {
    const tryBiometricLogin = async () => {
      if (!enableBiometric || !biometric.isEnabled || biometric.isLoading) {
        return;
      }

      // Auto-fill email from saved biometric data
      const savedEmail = await biometric.getSavedEmail();
      if (savedEmail) {
        setEmail(savedEmail);

        // Prompt for biometric authentication
        const authenticated = await biometric.authenticate('Sign in to Quester with biometrics');

        if (authenticated) {
          console.log('[SignInForm] Biometric authentication successful, showing prompt');
          Alert.alert('Quick Sign In', 'Use your saved password to sign in quickly?', [
            { text: 'Use Password', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                // Focus password field for quick entry
                passwordInputRef.current?.focus();
              },
            },
          ]);
        }
      }
    };

    tryBiometricLogin();
  }, [enableBiometric, biometric.isEnabled, biometric.isLoading]);

  // Announce loading state changes for screen readers (T102)
  useEffect(() => {
    if (isLoading) {
      announceForAccessibility('Signing in, please wait');
    }
  }, [isLoading, announceForAccessibility]);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    // Clear previous errors
    setFormError(null);
    setEmailError(null);
    setPasswordError(null);

    // Check network status
    if (isOffline) {
      const errorMsg = 'No internet connection. Please check your network and try again.';
      setFormError(errorMsg);
      announceForAccessibility(errorMsg); // T102: Announce error
      return;
    }

    // Client-side validation
    let hasError = false;
    if (!email || !email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!password || !password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    if (hasError) {
      announceForAccessibility('Please fix the validation errors'); // T102: Announce validation error
      return;
    }

    try {
      // Load trust token if available
      const trustToken = await loadSecurely('trust_token');
      const deviceFingerprint = await getDeviceFingerprint();

      // Attempt login (may require 2FA)
      const response = await login(
        email,
        password,
        undefined, // no 2FA code yet
        undefined, // trust device decision comes later
        deviceFingerprint,
        undefined,
        undefined,
        trustToken || undefined
      );

      // Check if 2FA is required
      if (response.requires_2fa) {
        console.log('[SignInForm] 2FA required, showing verification screen');
        setSavedCredentials({ email, password });
        setRequires2FA(true);
        return;
      }

      // Login successful
      // Enable biometric for this account if requested
      if (rememberMe && enableBiometric && biometric.capabilities?.isAvailable) {
        try {
          await biometric.enableBiometric(email);
          console.log('[SignInForm] Biometric enabled for future logins');
        } catch (biometricError) {
          console.warn('[SignInForm] Failed to enable biometric:', biometricError);
          // Don't block login success for biometric failure
        }
      }

      // Show welcome back message with login streak
      const streakMessage =
        user?.loginStreak && user.loginStreak > 1 ? ` ${user.loginStreak}-day streak! 🔥` : '';

      Alert.alert('Welcome back!', `Signed in successfully.${streakMessage}`, [
        { text: 'OK', onPress: onSuccess },
      ]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Login failed:', err);

      // Handle specific error types
      let errorMsg: string;
      if (err instanceof RateLimitError) {
        const retryMsg = err.retryAfter
          ? ` Please try again in ${Math.ceil(err.retryAfter / 60)} minutes.`
          : '';
        errorMsg = `Too many login attempts.${retryMsg}`;
      } else if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          errorMsg = 'Invalid email or password';
          // Show as field error for better UX
          setPasswordError('Invalid email or password');
        } else {
          errorMsg = err.message;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      } else {
        errorMsg = 'An unexpected error occurred. Please try again.';
      }

      setFormError(errorMsg);
      announceForAccessibility(`Error: ${errorMsg}`); // T102: Announce error
    }
  }

  /**
   * Cancel 2FA and return to login
   */
  function handle2FACancel() {
    setRequires2FA(false);
    setSavedCredentials(null);
  }

  // Show 2FA verification screen if required
  if (requires2FA && savedCredentials) {
    // Create a wrapper for the verification component
    // The TwoFactorVerification component validates internally,
    // so we need to handle this through the use2FA hook
    return (
      <TwoFactorVerification
        email={savedCredentials.email}
        onVerificationSuccess={async (_trustDevice: boolean) => {
          // The validateCode was already called by TwoFactorVerification
          // We just need to get the device info and complete the flow
          try {
            await getDeviceFingerprint();
            await getDeviceName();
            getDeviceType();

            // Note: Since TwoFactorVerification already validated,
            // we need to modify our approach
            // For now, complete the login without device trust
            // TODO: Refactor TwoFactorVerification to return the code

            setSavedCredentials(null);
            setRequires2FA(false);

            if (onSuccess) {
              onSuccess();
            }
          } catch (err) {
            console.error('Login completion failed:', err);
          }
        }}
        onCancel={handle2FACancel}
      />
    );
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Sign in to Quester</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome back! Please sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          {(formError || error) && (
            <View className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <Text variant="small" className="text-destructive">
                {formError || error}
              </Text>
            </View>
          )}

          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email" nativeID="email-label">
                Email
              </Label>
              <Input
                id="email"
                nativeID="email-input"
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(null); // Clear error on edit
                }}
                editable={!isLoading}
                aria-labelledby="email-label"
                aria-describedby={emailError ? 'email-input-error' : undefined}
                aria-invalid={!!emailError}
              />
              <ValidationError error={emailError} fieldId="email-input" />
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password" nativeID="password-label">
                  Password
                </Label>
                <Button
                  variant="link"
                  size="sm"
                  className="ml-auto h-4 px-1 py-0 web:h-fit sm:h-4"
                  onPress={onNavigateToForgotPassword}
                  disabled={isLoading}>
                  <Text className="font-normal leading-4">Forgot your password?</Text>
                </Button>
              </View>
              <View className="relative">
                <Input
                  ref={passwordInputRef}
                  id="password"
                  nativeID="password-input"
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError(null); // Clear error on edit
                  }}
                  editable={!isLoading}
                  className="pr-12"
                  aria-labelledby="password-label"
                  aria-describedby={passwordError ? 'password-input-error' : undefined}
                  aria-invalid={!!passwordError}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full items-center justify-center px-3"
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityHint="Toggles password visibility"
                  style={{ minWidth: 44, minHeight: 44 }}>
                  <Icon
                    as={showPassword ? EyeOffIcon : EyeIcon}
                    className="size-5 text-muted-foreground"
                  />
                </Pressable>
              </View>
              <ValidationError error={passwordError} fieldId="password-input" />
            </View>

            {/* Remember Me / Biometric Option */}
            {(enableRememberMe || (enableBiometric && biometric.capabilities?.isAvailable)) && (
              <View className="flex-row items-center justify-between">
                {enableRememberMe && biometric.capabilities?.isAvailable && (
                  <Pressable
                    onPress={() => setRememberMe(!rememberMe)}
                    disabled={isLoading}
                    className="flex-row items-center gap-2"
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Enable ${biometric.capabilities.biometricType === 'facial' ? 'Face ID' : 'biometric login'}`}
                    accessibilityState={{ checked: rememberMe }}
                    accessibilityHint="Enable biometric authentication for future sign-ins"
                    style={{ minWidth: 44, minHeight: 44 }}>
                    <View
                      className={`h-4 w-4 rounded border ${rememberMe ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {rememberMe && <View className="m-auto h-2 w-2 rounded-sm bg-white" />}
                    </View>
                    <Text variant="small">
                      Enable{' '}
                      {biometric.capabilities.biometricType === 'facial'
                        ? 'Face ID'
                        : 'biometric login'}
                    </Text>
                  </Pressable>
                )}

                {isOffline && (
                  <View className="ml-auto flex-row items-center gap-1">
                    <Icon as={WifiOffIcon} className="size-3 text-muted-foreground" />
                    <Text variant="small" className="text-muted-foreground">
                      Offline
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Button className="w-full" onPress={onSubmit} disabled={isLoading || isOffline}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : isOffline ? (
                <>
                  <Icon as={WifiOffIcon} className="size-4" />
                  <Text>No Connection</Text>
                </>
              ) : (
                <Text>Sign In</Text>
              )}
            </Button>

            {/* Biometric Quick Sign In Button */}
            {enableBiometric && biometric.isEnabled && !isLoading && (
              <Button
                variant="outline"
                className="w-full"
                onPress={async () => {
                  const authenticated = await biometric.authenticate();
                  if (authenticated) {
                    passwordInputRef.current?.focus();
                  }
                }}
                disabled={isOffline}>
                <Icon
                  as={
                    biometric.capabilities?.biometricType === 'facial'
                      ? ScanFaceIcon
                      : FingerprintIcon
                  }
                  className="size-4"
                />
                <Text>
                  Sign in with{' '}
                  {biometric.capabilities?.biometricType === 'facial' ? 'Face ID' : 'Biometrics'}
                </Text>
              </Button>
            )}
          </View>

          <Text variant="small" className="text-center">
            Don&apos;t have an account?{' '}
            <Pressable
              onPress={onNavigateToSignUp}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel="Sign up for a new account"
              accessibilityHint="Navigate to sign up screen">
              <Text variant="small" className="underline underline-offset-4">
                Sign up
              </Text>
            </Pressable>
          </Text>

          <View className="flex-row items-center">
            <Separator className="flex-1" />
            <Text variant="small" className="px-4 text-muted-foreground">
              or
            </Text>
            <Separator className="flex-1" />
          </View>
          <SocialConnections />
        </CardContent>
      </Card>
    </View>
  );
}
