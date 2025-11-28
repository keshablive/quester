/**
 * Reset Password Route
 * Feature: 014-auth-api-integration / US4
 *
 * @description Deep link handler for password reset tokens.
 * URL format: /reset-password?token=<reset_token>
 *
 * T030: Create reset-password deep link route
 */

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

/**
 * Password Reset Page
 * Handles deep links from password reset emails
 */
export default function ResetPasswordPage() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Validate token presence
    if (!token) {
      setIsValidating(false);
      setIsValidToken(false);
      return;
    }

    // Token exists, allow form to render
    // Actual token validation happens on submit
    setIsValidToken(true);
    setIsValidating(false);
  }, [token]);

  const handleSuccess = () => {
    // Navigate to login after successful reset
    setTimeout(() => {
      router.replace('/');
    }, 2000);
  };

  const handleInvalidToken = () => {
    setIsValidToken(false);
  };

  // Loading state
  if (isValidating) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-muted-foreground">Validating reset link...</Text>
      </View>
    );
  }

  // Invalid or missing token
  if (!isValidToken || !token) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <Text className="text-3xl">⚠️</Text>
        </View>
        <Text className="mb-2 text-center text-2xl font-bold text-foreground">
          Invalid Reset Link
        </Text>
        <Text className="mb-6 text-center text-muted-foreground">
          This password reset link is invalid or has expired. Please request a new one.
        </Text>
        <View className="w-full max-w-sm">
          <View className="rounded-lg bg-primary px-4 py-3" onTouchEnd={() => router.replace('/')}>
            <Text className="text-center font-semibold text-primary-foreground">Go to Sign In</Text>
          </View>
        </View>
      </View>
    );
  }

  // Valid token - show reset form
  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-lg flex-1 justify-center">
        <ResetPasswordForm
          token={token}
          onSuccess={handleSuccess}
          onInvalidToken={handleInvalidToken}
        />
      </View>
    </View>
  );
}
