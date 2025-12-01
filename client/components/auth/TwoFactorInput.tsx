/**
 * Two-Factor Authentication Input Component
 * Feature: 014-auth-api-integration / US6
 *
 * @description Input component for 2FA verification codes.
 * T040: Create TwoFactorInput component
 */

import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/core/auth/AuthContext';

interface TwoFactorInputProps {
  /** Callback when 2FA is cancelled */
  onCancel: () => void;
  /** Callback when 2FA succeeds */
  onSuccess?: () => void;
}

/**
 * 2FA Code Input Component
 * Implements FR-008: Handle 2FA challenge flow
 * Implements FR-009: Support device trust tokens
 */
export function TwoFactorInput({ onCancel, onSuccess }: TwoFactorInputProps) {
  const { submitTwoFactorCode, cancelTwoFactor, isLoading, error, clearError } = useAuth();

  // 6-digit code input
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [trustDevice, setTrustDevice] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Refs for input focus management
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    // Only accept numbers
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = numericValue;
      setCode(newCode);
      setLocalError(null);
      clearError();

      // Auto-advance to next input
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits entered
      if (numericValue && index === 5) {
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
          handleSubmit(fullCode);
        }
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    // Handle backspace
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const codeToSubmit = fullCode || code.join('');

    if (codeToSubmit.length !== 6) {
      setLocalError('Please enter all 6 digits');
      return;
    }

    try {
      await submitTwoFactorCode(codeToSubmit, trustDevice);
      onSuccess?.();
    } catch (err) {
      // Clear code on error for retry
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleCancel = () => {
    cancelTwoFactor();
    onCancel();
  };

  const handlePaste = (text: string) => {
    // Handle pasted codes
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
    if (numericText.length > 0) {
      const newCode = numericText.split('').concat(Array(6 - numericText.length).fill(''));
      setCode(newCode.slice(0, 6));

      if (numericText.length === 6) {
        handleSubmit(numericText);
      } else {
        inputRefs.current[numericText.length]?.focus();
      }
    }
  };

  return (
    <View className="p-6">
      {/* Header */}
      <View className="mb-6 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-3xl">🔐</Text>
        </View>
        <Text className="mb-2 text-center text-2xl font-bold text-foreground">
          Two-Factor Authentication
        </Text>
        <Text className="text-center text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </Text>
      </View>

      {/* Error Message */}
      {(localError || error) && (
        <View className="mb-4 rounded-lg bg-destructive/10 p-3">
          <Text className="text-center text-sm text-destructive">{localError || error}</Text>
        </View>
      )}

      {/* Code Input - 6 digit boxes */}
      <View className="mb-6 flex-row justify-center gap-2">
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => {
              // Detect paste: if text is longer than 1 char, it's likely a paste
              if (text.length > 1) {
                handlePaste(text);
              } else {
                handleCodeChange(index, text);
              }
            }}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
            editable={!isLoading}
            className={`h-14 w-12 rounded-lg border text-center text-2xl font-bold ${
              digit ? 'border-primary bg-primary/5' : 'border-border bg-input'
            } text-foreground`}
          />
        ))}
      </View>

      {/* Trust Device Checkbox */}
      <TouchableOpacity
        onPress={() => setTrustDevice(!trustDevice)}
        disabled={isLoading}
        className="mb-6 flex-row items-center justify-center">
        <View
          className={`mr-2 h-5 w-5 items-center justify-center rounded border ${
            trustDevice ? 'border-primary bg-primary' : 'border-border'
          }`}>
          {trustDevice && <Text className="text-xs text-white">✓</Text>}
        </View>
        <Text className="text-muted-foreground">Trust this device for 30 days</Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={() => handleSubmit()}
        disabled={isLoading || code.join('').length !== 6}
        className={`mb-4 flex-row items-center justify-center rounded-lg px-4 py-3 ${
          isLoading || code.join('').length !== 6 ? 'bg-primary/50' : 'bg-primary'
        }`}>
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="font-semibold text-primary-foreground">Verify Code</Text>
        )}
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity onPress={handleCancel} disabled={isLoading} className="py-2">
        <Text className="text-center text-muted-foreground">
          Cancel and use a different account
        </Text>
      </TouchableOpacity>

      {/* Help Text */}
      <View className="mt-6 rounded-lg bg-muted/30 p-3">
        <Text className="text-center text-xs text-muted-foreground">
          Can't access your authenticator app?{' '}
          <Text className="text-primary">Use a recovery code</Text>
        </Text>
      </View>
    </View>
  );
}

export default TwoFactorInput;
