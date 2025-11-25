import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authAPI, ApiError, RateLimitError } from '@/lib/api/auth';
import * as React from 'react';
import { Alert, View } from 'react-native';

const RESEND_CODE_INTERVAL_SECONDS = 30;

interface VerifyEmailFormProps {
  email?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VerifyEmailForm({
  email: initialEmail,
  onSuccess,
  onCancel,
}: VerifyEmailFormProps) {
  const [email, setEmail] = React.useState(initialEmail || '');
  const [code, setCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [error, setError] = React.useState('');
  const { countdown, restartCountdown } = useCountdown(RESEND_CODE_INTERVAL_SECONDS);

  async function onSubmit() {
    // Reset error
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // Validate code
    if (!code.trim()) {
      setError('Verification code is required');
      return;
    }

    if (code.trim().length < 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.verifyEmail(email.trim().toLowerCase(), code.trim());

      // Show success alert
      Alert.alert(
        'Email verified!',
        'Your email has been successfully verified. You can now use all features.',
        [
          {
            text: 'OK',
            onPress: onSuccess,
          },
        ]
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          setError('Invalid or expired verification code. Please try again or request a new code.');
        } else if (err.statusCode === 404) {
          setError('Account not found. Please check your email address.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof RateLimitError) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Unable to verify email. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    if (countdown > 0 || isResending) {
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setError('');
    setIsResending(true);

    try {
      await authAPI.resendVerification(email.trim().toLowerCase());

      restartCountdown();

      Alert.alert('Code sent', 'A new verification code has been sent to your email.', [
        { text: 'OK' },
      ]);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          setError('Account not found or already verified.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof RateLimitError) {
        setError('Too many requests. Please try again later.');
      } else {
        setError('Unable to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 pb-4 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Verify your email</CardTitle>
          <CardDescription className="text-center sm:text-left">
            {initialEmail
              ? `Enter the verification code sent to ${initialEmail}`
              : 'Enter your email and the verification code'}
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
                  editable={!isLoading}
                />
              </View>
            )}

            {/* Verification Code Field */}
            <View className="gap-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
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
              <Button
                variant="link"
                size="sm"
                disabled={countdown > 0 || isResending}
                onPress={handleResendCode}>
                <Text className="text-center text-xs">
                  {isResending
                    ? 'Sending...'
                    : countdown > 0
                      ? `Resend code in ${countdown}s`
                      : "Didn't receive the code? Resend"}
                </Text>
              </Button>
            </View>

            <View className="gap-3">
              <Button
                className="w-full"
                onPress={onSubmit}
                disabled={isLoading || !email.trim() || !code.trim()}>
                <Text>{isLoading ? 'Verifying...' : 'Continue'}</Text>
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

function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(seconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = React.useCallback(() => {
    setCountdown(seconds);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  React.useEffect(() => {
    startCountdown();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startCountdown]);

  return { countdown, restartCountdown: startCountdown };
}
