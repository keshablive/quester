/**
 * Forgot Password Form Component
 * Feature: 014-auth-api-integration / US4
 *
 * @description Form for requesting password reset email.
 * T028: Create ForgotPasswordForm component
 */

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/core/auth/AuthContext';

interface ForgotPasswordFormProps {
  /** Callback when user wants to go back to login */
  onBack: () => void;
  /** Callback when reset email sent successfully */
  onSuccess?: () => void;
}

/**
 * Form for requesting password reset email
 * Implements FR-006: Password reset request via /api/v1/auth/forgot-password
 */
export function ForgotPasswordForm({ onBack, onSuccess }: ForgotPasswordFormProps) {
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Clear previous errors
    clearError();
    setLocalError(null);

    // Validate email
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    try {
      await forgotPassword(email);
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      // Error is already handled by forgotPassword (always shows success for security)
      setSubmitted(true);
    }
  };

  // Success state - always show same message (security - no email enumeration)
  if (submitted) {
    return (
      <View className="p-6">
        <View className="mb-6">
          <Text className="mb-2 text-2xl font-bold text-foreground">Check Your Email</Text>
          <Text className="text-muted-foreground">
            If an account exists for {email}, you will receive a password reset link shortly.
          </Text>
        </View>

        <TouchableOpacity onPress={onBack} className="rounded-lg bg-primary px-4 py-3">
          <Text className="text-center font-semibold text-primary-foreground">
            Return to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="p-6">
      {/* Header */}
      <View className="mb-6">
        <Text className="mb-2 text-2xl font-bold text-foreground">Reset Password</Text>
        <Text className="text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </Text>
      </View>

      {/* Error Message */}
      {(localError || error) && (
        <View className="mb-4 rounded-lg bg-destructive/10 p-3">
          <Text className="text-sm text-destructive">{localError || error}</Text>
        </View>
      )}

      {/* Email Input */}
      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-foreground">Email Address</Text>
        <TextInput
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setLocalError(null);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!isLoading}
          className="rounded-lg border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground"
        />
      </View>

      {/* Submit Button - FR-021: Button spinner */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading}
        className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${
          isLoading ? 'bg-primary/70' : 'bg-primary'
        }`}>
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="font-semibold text-primary-foreground">Send Reset Link</Text>
        )}
      </TouchableOpacity>

      {/* Back Link */}
      <TouchableOpacity onPress={onBack} disabled={isLoading} className="mt-4">
        <Text className="text-center text-muted-foreground">
          Remember your password? <Text className="font-medium text-primary">Sign in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default ForgotPasswordForm;
