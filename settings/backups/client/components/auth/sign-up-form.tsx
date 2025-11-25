import { SocialConnections } from '@/components/auth/social-connections';
import { ValidationError as ValidationErrorComponent } from '@/components/validation-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAccessibility } from '@/lib/hooks/use-accessibility';
import { ApiError, ValidationError, RateLimitError } from '@/lib/api/auth';
import * as React from 'react';
import { Pressable, TextInput, View, Alert, ActivityIndicator } from 'react-native';

interface SignUpFormProps {
  onSuccess?: () => void;
  onNavigateToSignIn?: () => void;
  defaultTenantId?: string; // Optional default tenant ID
}

export function SignUpForm({
  onSuccess,
  onNavigateToSignIn,
  defaultTenantId, // Will auto-resolve from subdomain if not provided
}: SignUpFormProps) {
  const { signup, isLoading, error } = useAuth();
  const { announceForAccessibility } = useAccessibility();

  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = React.useState<string | null>(null);

  const usernameInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const confirmPasswordInputRef = React.useRef<TextInput>(null);

  // Announce loading state changes for screen readers (T102)
  React.useEffect(() => {
    if (isLoading) {
      announceForAccessibility('Creating account, please wait');
    }
  }, [isLoading, announceForAccessibility]);

  function onEmailSubmitEditing() {
    usernameInputRef.current?.focus();
  }

  function onUsernameSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  function onPasswordSubmitEditing() {
    confirmPasswordInputRef.current?.focus();
  }

  async function onSubmit() {
    // Clear previous errors
    setFormError(null);
    setEmailError(null);
    setUsernameError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    // Client-side validation
    let hasError = false;

    // Email validation
    if (!email || !email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    // Username validation
    if (!username || !username.trim()) {
      setUsernameError('Username is required');
      hasError = true;
    } else if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      hasError = true;
    } else if (username.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      hasError = true;
    }

    // Password validation
    if (!password || !password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    // Confirm password validation
    if (!confirmPassword || !confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) {
      announceForAccessibility('Please fix the validation errors'); // T102: Announce validation error
      return;
    }

    try {
      await signup(email, password, username, defaultTenantId);

      // Show success message
      Alert.alert('Welcome to Quester!', `Account created successfully. You're now Level 1!`, [
        { text: 'OK', onPress: onSuccess },
      ]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Signup failed:', err);

      // Handle specific error types
      let errorMsg: string;
      if (err instanceof ValidationError) {
        errorMsg = err.message;
      } else if (err instanceof RateLimitError) {
        const retryMsg = err.retryAfter
          ? ` Please try again in ${Math.ceil(err.retryAfter / 60)} minutes.`
          : '';
        errorMsg = `Too many signup attempts.${retryMsg}`;
      } else if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          errorMsg = 'Email already registered. Please sign in instead.';
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

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Create your account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome! Please fill in the details to get started.
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
                  if (emailError) setEmailError(null);
                }}
                editable={!isLoading}
                aria-labelledby="email-label"
                aria-describedby={emailError ? 'email-input-error' : undefined}
                aria-invalid={!!emailError}
              />
              <ValidationErrorComponent error={emailError} fieldId="email-input" />
            </View>

            <View className="gap-1.5">
              <Label htmlFor="username" nativeID="username-label">
                Username
              </Label>
              <Input
                ref={usernameInputRef}
                id="username"
                nativeID="username-input"
                placeholder="your_username"
                autoCapitalize="none"
                onSubmitEditing={onUsernameSubmitEditing}
                returnKeyType="next"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (usernameError) setUsernameError(null);
                }}
                editable={!isLoading}
                aria-labelledby="username-label"
                aria-describedby={usernameError ? 'username-input-error' : undefined}
                aria-invalid={!!usernameError}
              />
              <ValidationErrorComponent error={usernameError} fieldId="username-input" />
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password" nativeID="password-label">
                  Password
                </Label>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                nativeID="password-input"
                placeholder="Min. 8 characters"
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={onPasswordSubmitEditing}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError(null);
                }}
                editable={!isLoading}
                aria-labelledby="password-label"
                aria-describedby={passwordError ? 'password-input-error' : undefined}
                aria-invalid={!!passwordError}
              />
              <ValidationErrorComponent error={passwordError} fieldId="password-input" />
              {/* Password Strength Meter */}
              {password && <PasswordStrengthMeter password={password} showCriteria={true} />}
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="confirmPassword" nativeID="confirm-password-label">
                  Confirm Password
                </Label>
              </View>
              <Input
                ref={confirmPasswordInputRef}
                id="confirmPassword"
                nativeID="confirm-password-input"
                placeholder="Re-enter password"
                secureTextEntry
                returnKeyType="send"
                onSubmitEditing={onSubmit}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                editable={!isLoading}
                aria-labelledby="confirm-password-label"
                aria-describedby={confirmPasswordError ? 'confirm-password-input-error' : undefined}
                aria-invalid={!!confirmPasswordError}
              />
              <ValidationErrorComponent
                error={confirmPasswordError}
                fieldId="confirm-password-input"
              />
            </View>

            <Button className="w-full" onPress={onSubmit} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text>Create Account</Text>
              )}
            </Button>
          </View>

          <Text variant="small" className="text-center">
            Already have an account?{' '}
            <Pressable
              onPress={onNavigateToSignIn}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel="Sign in to existing account"
              accessibilityHint="Navigate to sign in screen">
              <Text variant="small" className="underline underline-offset-4">
                Sign in
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
