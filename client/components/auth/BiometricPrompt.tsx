/**
 * Biometric Prompt Component
 * Feature: 014-auth-api-integration / US7
 *
 * @description Displays biometric authentication UI with fallback options.
 * Shows Face ID/fingerprint prompt and handles authentication flow.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Fingerprint, ShieldAlert, KeyRound, X } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  MAX_BIOMETRIC_ATTEMPTS,
  type BiometricAvailability,
} from '@/core/utils/biometrics';

// ============================================================================
// Types
// ============================================================================

export interface BiometricPromptProps {
  /**
   * Callback when biometric auth succeeds
   */
  onSuccess: () => void;

  /**
   * Callback when user chooses password fallback
   */
  onFallback: () => void;

  /**
   * Callback to cancel/dismiss the prompt
   */
  onCancel?: () => void;

  /**
   * Whether authentication is in progress
   */
  isLoading?: boolean;

  /**
   * Custom prompt message
   */
  promptMessage?: string;

  /**
   * Email to display (for context)
   */
  email?: string;
}

// ============================================================================
// Component
// ============================================================================

export function BiometricPrompt({
  onSuccess,
  onFallback,
  onCancel,
  isLoading = false,
  promptMessage = 'Sign in with biometrics',
  email,
}: BiometricPromptProps) {
  // State
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability().then(setAvailability);
  }, []);

  /**
   * Handle biometric authentication attempt
   */
  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating || isLoading) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await authenticateWithBiometric(promptMessage);

      if (result.success) {
        setFailedAttempts(0);
        onSuccess();
        return;
      }

      // Handle cancellation
      if (result.cancelled) {
        // User cancelled, don't count as failure
        return;
      }

      // Handle fallback request
      if (result.usedFallback) {
        onFallback();
        return;
      }

      // Handle failure
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      if (newFailedAttempts >= MAX_BIOMETRIC_ATTEMPTS) {
        setError('Too many failed attempts. Please use your password.');
        // Auto-fallback after max attempts
        setTimeout(() => onFallback(), 1500);
      } else {
        setError(result.error || 'Authentication failed. Try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, isLoading, promptMessage, failedAttempts, onSuccess, onFallback]);

  // Auto-trigger authentication on mount if available
  useEffect(() => {
    if (availability?.isAvailable && availability?.isEnrolled && !isAuthenticating) {
      // Small delay to let UI render first
      const timer = setTimeout(() => {
        handleAuthenticate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [availability]); // Only on initial load

  // Get appropriate icon based on biometric type
  const BiometricIcon = availability?.biometricType === 'face' ? ShieldAlert : Fingerprint;
  const biometricLabel = availability?.biometricLabel || 'Biometric';

  // If biometrics not available, show message and fallback
  if (availability && !availability.isAvailable) {
    return (
      <View className="items-center gap-4 py-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon as={ShieldAlert} size={32} className="text-muted-foreground" />
        </View>
        <Text className="text-center text-muted-foreground">
          Biometric authentication is not available on this device.
        </Text>
        <Button onPress={onFallback} className="w-full">
          <Icon as={KeyRound} size={16} className="mr-2" />
          <Text>Use Password</Text>
        </Button>
      </View>
    );
  }

  // If biometrics not enrolled
  if (availability && !availability.isEnrolled) {
    return (
      <View className="items-center gap-4 py-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon as={Fingerprint} size={32} className="text-muted-foreground" />
        </View>
        <Text className="text-center text-muted-foreground">
          No biometrics enrolled on this device. Please set up {biometricLabel} in your device
          settings.
        </Text>
        <Button onPress={onFallback} className="w-full">
          <Icon as={KeyRound} size={16} className="mr-2" />
          <Text>Use Password</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="items-center gap-4 py-6">
      {/* Cancel button (top right) */}
      {onCancel && (
        <Pressable onPress={onCancel} className="absolute right-0 top-0 p-2">
          <Icon as={X} size={20} className="text-muted-foreground" />
        </Pressable>
      )}

      {/* Biometric icon */}
      <Pressable
        onPress={handleAuthenticate}
        disabled={isAuthenticating || isLoading}
        className="h-20 w-20 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20">
        <Icon
          as={BiometricIcon}
          size={40}
          className={isAuthenticating ? 'text-primary/50' : 'text-primary'}
        />
      </Pressable>

      {/* Email context */}
      {email && <Text className="text-sm text-muted-foreground">{email}</Text>}

      {/* Prompt text */}
      <Text className="text-center font-medium">
        {isAuthenticating
          ? `Authenticating with ${biometricLabel}...`
          : `Tap to use ${biometricLabel}`}
      </Text>

      {/* Error message */}
      {error && (
        <View className="w-full rounded-lg bg-destructive/10 p-3">
          <Text className="text-center text-sm text-destructive">{error}</Text>
        </View>
      )}

      {/* Failed attempts indicator */}
      {failedAttempts > 0 && failedAttempts < MAX_BIOMETRIC_ATTEMPTS && (
        <Text className="text-xs text-muted-foreground">
          {MAX_BIOMETRIC_ATTEMPTS - failedAttempts} attempts remaining
        </Text>
      )}

      {/* Actions */}
      <View className="w-full gap-2">
        <Button
          onPress={handleAuthenticate}
          disabled={isAuthenticating || isLoading}
          className="w-full">
          <Icon as={BiometricIcon} size={16} className="mr-2" />
          <Text>{isAuthenticating ? 'Authenticating...' : `Use ${biometricLabel}`}</Text>
        </Button>

        <Button
          variant="outline"
          onPress={onFallback}
          disabled={isAuthenticating}
          className="w-full">
          <Icon as={KeyRound} size={16} className="mr-2" />
          <Text>Use Password Instead</Text>
        </Button>
      </View>
    </View>
  );
}

export default BiometricPrompt;
