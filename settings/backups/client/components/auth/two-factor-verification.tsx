/**
 * Two-Factor Authentication Verification Component
 *
 * Used during login when user has 2FA enabled
 * Supports:
 * - TOTP code verification
 * - Backup code usage
 * - "Trust this device" option
 */

import { use2FA } from '@/lib/hooks/use2FA';
import { Alert } from 'react-native';
import * as React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';

interface TwoFactorVerificationProps {
  email: string;
  onVerificationSuccess: (trustDevice: boolean) => void;
  onCancel: () => void;
}

export function TwoFactorVerification({
  email,
  onVerificationSuccess,
  onCancel,
}: TwoFactorVerificationProps) {
  const { validateCode, isLoading, error } = use2FA();

  const [code, setCode] = React.useState('');
  const [useBackupCode, setUseBackupCode] = React.useState(false);
  const [trustDevice, setTrustDevice] = React.useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Invalid Code', 'Please enter a verification code');
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code');
      return;
    }

    const isValid = await validateCode(email, code);
    if (isValid) {
      onVerificationSuccess(trustDevice);
    }
  };

  const handleToggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
  };

  return (
    <View className="flex-1 justify-center p-6">
      <View className="w-full max-w-md">
        <Text variant="h1" className="mb-2">
          Two-Factor Authentication
        </Text>
        <Text className="mb-6 text-muted-foreground">
          {useBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </Text>

        <Label nativeID="verification-code" className="mb-2">
          {useBackupCode ? 'Backup Code' : 'Verification Code'}
        </Label>
        <Input
          aria-labelledby="verification-code"
          placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
          value={code}
          onChangeText={setCode}
          keyboardType={useBackupCode ? 'default' : 'number-pad'}
          maxLength={useBackupCode ? 8 : 6}
          autoFocus
          autoCapitalize="characters"
          className="mb-2"
        />

        <Button onPress={handleToggleBackupCode} variant="link" className="mb-4 self-start">
          <Text variant="small">
            {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code'}
          </Text>
        </Button>

        {error && (
          <Text variant="small" className="mb-4 text-destructive">
            {error}
          </Text>
        )}

        {/* Trust this device option */}
        <View className="mb-6 flex-row items-center rounded-lg bg-muted p-4">
          <Switch checked={trustDevice} onCheckedChange={setTrustDevice} />
          <View className="ml-3 flex-1">
            <Text variant="small" className="font-medium">
              Trust this device
            </Text>
            <Text variant="small" className="text-muted-foreground">
              Don't ask for codes on this device for 30 days
            </Text>
          </View>
        </View>

        <Button onPress={handleVerify} disabled={isLoading || !code.trim()} className="mb-4">
          <Text>{isLoading ? 'Verifying...' : 'Verify'}</Text>
        </Button>

        <Button onPress={onCancel} variant="ghost">
          <Text>Cancel</Text>
        </Button>

        {/* Help text */}
        <View className="mt-6 rounded-lg bg-muted/50 p-4">
          <Text variant="small" className="text-muted-foreground">
            Lost access to your authenticator? Use a backup code. Don't have backup codes? Contact
            support.
          </Text>
        </View>
      </View>
    </View>
  );
}
