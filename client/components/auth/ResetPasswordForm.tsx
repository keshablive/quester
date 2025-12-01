/**
 * Reset Password Form Component
 * Feature: 014-auth-api-integration / US4
 *
 * @description Form for setting new password using reset token.
 * T029: Create ResetPasswordForm component
 */

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/core/auth/AuthContext';

interface ResetPasswordFormProps {
  /** Reset token from email/deep link */
  token: string;
  /** Callback on successful password reset */
  onSuccess: () => void;
  /** Callback when token is invalid/expired */
  onInvalidToken?: () => void;
}

/**
 * Form for resetting password with token
 * Implements FR-007: Password reset confirmation via /api/v1/auth/reset-password
 */
export function ResetPasswordForm({ token, onSuccess, onInvalidToken }: ResetPasswordFormProps) {
  const { resetPassword, isLoading, error, clearError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    clearError();
    setLocalError(null);

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setLocalError(passwordError);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await resetPassword(token, password);
      setSuccess(true);
      onSuccess();
    } catch (err) {
      // Check if token is invalid/expired
      const errorMsg = err instanceof Error ? err.message : 'Failed to reset password';
      if (errorMsg.includes('expired') || errorMsg.includes('invalid')) {
        onInvalidToken?.();
      }
    }
  };

  // Success state
  if (success) {
    return (
      <View className="p-6">
        <View className="mb-6 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Text className="text-3xl">✓</Text>
          </View>
          <Text className="mb-2 text-center text-2xl font-bold text-foreground">
            Password Reset!
          </Text>
          <Text className="text-center text-muted-foreground">
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="p-6">
      {/* Header */}
      <View className="mb-6">
        <Text className="mb-2 text-2xl font-bold text-foreground">Set New Password</Text>
        <Text className="text-muted-foreground">
          Enter your new password below. Make sure it's at least 8 characters.
        </Text>
      </View>

      {/* Error Message */}
      {(localError || error) && (
        <View className="mb-4 rounded-lg bg-destructive/10 p-3">
          <Text className="text-sm text-destructive">{localError || error}</Text>
        </View>
      )}

      {/* New Password Input */}
      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-foreground">New Password</Text>
        <TextInput
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setLocalError(null);
          }}
          placeholder="Enter new password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          editable={!isLoading}
          className="rounded-lg border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground"
        />
        {password.length > 0 && password.length < 8 && (
          <Text className="mt-1 text-xs text-muted-foreground">
            {8 - password.length} more characters needed
          </Text>
        )}
      </View>

      {/* Confirm Password Input */}
      <View className="mb-6">
        <Text className="mb-2 text-sm font-medium text-foreground">Confirm Password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setLocalError(null);
          }}
          placeholder="Confirm new password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          editable={!isLoading}
          className="rounded-lg border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground"
        />
        {confirmPassword.length > 0 && password !== confirmPassword && (
          <Text className="mt-1 text-xs text-destructive">Passwords do not match</Text>
        )}
      </View>

      {/* Submit Button - FR-021: Button spinner */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading || password.length < 8 || password !== confirmPassword}
        className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${
          isLoading || password.length < 8 || password !== confirmPassword
            ? 'bg-primary/50'
            : 'bg-primary'
        }`}>
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="font-semibold text-primary-foreground">Reset Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default ResetPasswordForm;
