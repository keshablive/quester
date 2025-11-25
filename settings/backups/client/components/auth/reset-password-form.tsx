import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { authAPI, ApiError, ValidationError, RateLimitError } from '@/lib/api/auth';
import * as React from 'react';
import { Alert, TextInput, View } from 'react-native';

interface ResetPasswordFormProps {
  email?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ResetPasswordForm({
  email: initialEmail,
  onSuccess,
  onCancel,
}: ResetPasswordFormProps) {
  const [email, setEmail] = React.useState(initialEmail || '');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const passwordInputRef = React.useRef<TextInput>(null);
  const confirmPasswordInputRef = React.useRef<TextInput>(null);
  const codeInputRef = React.useRef<TextInput>(null);

  function onPasswordSubmitEditing() {
    confirmPasswordInputRef.current?.focus();
  }

  function onConfirmPasswordSubmitEditing() {
    codeInputRef.current?.focus();
  }

  async function onSubmit() {
    // Reset error
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Validate password
    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Check password strength
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate code
    if (!code.trim()) {
      setError('Verification code is required');
      return;
    }

    if (code.trim().length < 6) {
      setError('Please enter a valid verification code');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword(email.trim().toLowerCase(), code.trim(), password);

      // Show success alert
      Alert.alert(
        'Password reset successful',
        'Your password has been reset successfully. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: onSuccess,
          },
        ]
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(err.message);
      } else if (err instanceof RateLimitError) {
        setError('Too many requests. Please try again later.');
      } else if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          setError('Invalid or expired verification code. Please request a new one.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to reset password. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Reset password</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Enter the code sent to your email and set a new password
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            {/* Error Message */}
            {error && (
              <View className="rounded-lg bg-destructive/10 p-3">
                <Text variant="small" className="text-destructive">
                  {error}
                </Text>
              </View>
            )}

            {/* Email Field (if not provided) */}
            {!initialEmail && (
              <View className="gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="m@example.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError('');
                  }}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!isLoading}
                />
              </View>
            )}

            {/* New Password Field */}
            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password">New password</Label>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={onPasswordSubmitEditing}
                editable={!isLoading}
              />
              {/* Password Strength Meter */}
              {password && <PasswordStrengthMeter password={password} />}
            </View>

            {/* Confirm Password Field */}
            <View className="gap-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                ref={confirmPasswordInputRef}
                id="confirmPassword"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                }}
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={onConfirmPasswordSubmitEditing}
                editable={!isLoading}
              />
              {/* Password Match Indicator */}
              {confirmPassword && password && (
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-xs"
                    style={{
                      color: password === confirmPassword ? '#22c55e' : '#ef4444',
                    }}>
                    {password === confirmPassword
                      ? '✓ Passwords match'
                      : '✗ Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>

            {/* Verification Code Field */}
            <View className="gap-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                ref={codeInputRef}
                id="code"
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  setError('');
                }}
                autoCapitalize="none"
                returnKeyType="send"
                keyboardType="numeric"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                onSubmitEditing={onSubmit}
                editable={!isLoading}
                placeholder="Enter 6-digit code"
              />
            </View>

            <View className="gap-3">
              <Button
                className="w-full"
                onPress={onSubmit}
                disabled={
                  isLoading || !email.trim() || !password || !confirmPassword || !code.trim()
                }>
                <Text>{isLoading ? 'Resetting...' : 'Reset Password'}</Text>
              </Button>

              {onCancel && (
                <Button variant="link" className="mx-auto" onPress={onCancel} disabled={isLoading}>
                  <Text>Cancel</Text>
                </Button>
              )}
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
