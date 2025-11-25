import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authAPI, ApiError, ValidationError, RateLimitError } from '@/lib/api/auth';
import { validateEmail, validateRequired } from '@/lib/utils/validation';
import * as React from 'react';
import { Alert, View } from 'react-native';

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void;
  onCancel?: () => void;
}

export function ForgotPasswordForm({ onSuccess, onCancel }: ForgotPasswordFormProps) {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  async function onSubmit() {
    // Reset state
    setError('');
    setSuccess(false);

    // Validate email
    if (!validateRequired(email)) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());

      setSuccess(true);

      // Show success alert
      Alert.alert(
        'Check your email',
        `We've sent a password reset code to ${email}. Please check your inbox and spam folder.`,
        [
          {
            text: 'OK',
            onPress: () => onSuccess?.(email.trim().toLowerCase()),
          },
        ]
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(err.message);
      } else if (err instanceof RateLimitError) {
        setError('Too many requests. Please try again later.');
      } else if (err instanceof ApiError) {
        // Don't reveal if email exists or not (security best practice)
        setError('If an account exists with this email, you will receive a password reset code.');
        setSuccess(true);
      } else {
        setError('Unable to send reset email. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Forgot password?</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Enter your email to receive a password reset code
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            {/* Error Message */}
            {error && !success && (
              <View className="rounded-lg bg-destructive/10 p-3">
                <Text variant="small" className="text-destructive">
                  {error}
                </Text>
              </View>
            )}

            {/* Success Message */}
            {success && (
              <View className="rounded-lg bg-green-500/10 p-3">
                <Text variant="small" className="text-green-600">
                  Password reset email sent! Check your inbox.
                </Text>
              </View>
            )}

            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="m@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(''); // Clear error on input change
                }}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={onSubmit}
                editable={!isLoading}
              />
            </View>

            <View className="gap-3">
              <Button className="w-full" onPress={onSubmit} disabled={isLoading || !email.trim()}>
                <Text>{isLoading ? 'Sending...' : 'Send reset code'}</Text>
              </Button>

              {onCancel && (
                <Button variant="link" className="mx-auto" onPress={onCancel} disabled={isLoading}>
                  <Text>Back to sign in</Text>
                </Button>
              )}
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
