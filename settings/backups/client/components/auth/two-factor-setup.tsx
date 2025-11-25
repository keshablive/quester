/**
 * Two-Factor Authentication Setup Component
 *
 * Guides users through enabling 2FA:
 * 1. Display QR code for scanning
 * 2. Show manual entry key
 * 3. Verify setup with 6-digit code
 * 4. Display backup codes for saving
 */

import { use2FA } from '@/lib/hooks/use2FA';
import { Alert } from 'react-native';
import * as React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import * as Clipboard from 'expo-clipboard';

interface TwoFactorSetupProps {
  accessToken: string;
  onSetupComplete: () => void;
  onCancel: () => void;
}

type SetupStep = 'scan' | 'verify' | 'backup-codes';

export function TwoFactorSetup({ accessToken, onSetupComplete, onCancel }: TwoFactorSetupProps) {
  const {
    enableTwoFactor,
    verifyAndActivate,
    isLoading,
    error,
    qrCodeUrl,
    backupCodes,
    clearSetupData,
  } = use2FA();

  const [currentStep, setCurrentStep] = React.useState<SetupStep>('scan');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [savedBackupCodes, setSavedBackupCodes] = React.useState(false);

  // Initialize 2FA setup on mount
  React.useEffect(() => {
    enableTwoFactor(accessToken);
  }, [accessToken, enableTwoFactor]);

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code');
      return;
    }

    const success = await verifyAndActivate(accessToken, verificationCode);
    if (success) {
      setCurrentStep('backup-codes');
    }
  };

  const handleCopyManualKey = async () => {
    if (!qrCodeUrl) return;

    // Extract secret from QR code URL (otpauth://totp/...)
    const secretMatch = qrCodeUrl.match(/secret=([A-Z0-9]+)/);
    if (secretMatch) {
      await Clipboard.setStringAsync(secretMatch[1]);
      Alert.alert('Copied', 'Manual entry key copied to clipboard');
    }
  };

  const handleCopyBackupCodes = async () => {
    if (!backupCodes) return;
    await Clipboard.setStringAsync(backupCodes.join('\n'));
    Alert.alert('Copied', 'Backup codes copied to clipboard');
  };

  const handleComplete = () => {
    if (!savedBackupCodes) {
      Alert.alert(
        'Warning',
        "Are you sure you want to continue without saving your backup codes? You won't be able to access your account if you lose your authenticator device.",
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              clearSetupData();
              onSetupComplete();
            },
          },
        ]
      );
      return;
    }

    clearSetupData();
    onSetupComplete();
  };

  const handleCancelSetup = () => {
    Alert.alert('Cancel Setup', 'Are you sure you want to cancel 2FA setup?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          clearSetupData();
          onCancel();
        },
      },
    ]);
  };

  // Render loading state
  if (isLoading && currentStep === 'scan') {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3">Setting up 2FA...</Text>
      </View>
    );
  }

  // Render error state
  if (error && currentStep === 'scan') {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3" className="mb-4 text-destructive">
          {error}
        </Text>
        <Button onPress={onCancel}>
          <Text>Go Back</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 p-6">
      {/* Step 1: Scan QR Code */}
      {currentStep === 'scan' && qrCodeUrl && (
        <View>
          <Text variant="h1" className="mb-2">
            Set Up 2FA
          </Text>
          <Text className="mb-6 text-muted-foreground">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password,
            etc.)
          </Text>

          <Card className="mb-6 items-center p-6">
            <QRCode value={qrCodeUrl} size={200} />
          </Card>

          <Text variant="small" className="mb-2 font-medium">
            Can't scan the QR code?
          </Text>
          <Text variant="small" className="mb-2 text-muted-foreground">
            Enter this key manually in your authenticator app:
          </Text>

          <View className="mb-6 flex-row">
            <Input
              value={qrCodeUrl.match(/secret=([A-Z0-9]+)/)?.[1] || ''}
              editable={false}
              className="flex-1"
            />
            <Button onPress={handleCopyManualKey} variant="outline" className="ml-2">
              <Text>Copy</Text>
            </Button>
          </View>

          <Button onPress={() => setCurrentStep('verify')} className="mb-4">
            <Text>Next: Verify Setup</Text>
          </Button>

          <Button onPress={handleCancelSetup} variant="ghost">
            <Text>Cancel</Text>
          </Button>
        </View>
      )}

      {/* Step 2: Verify Code */}
      {currentStep === 'verify' && (
        <View>
          <Text variant="h1" className="mb-2">
            Verify Setup
          </Text>
          <Text className="mb-6 text-muted-foreground">
            Enter the 6-digit code from your authenticator app to confirm setup
          </Text>

          <Label nativeID="verification-code" className="mb-2">
            Verification Code
          </Label>
          <Input
            aria-labelledby="verification-code"
            placeholder="000000"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            className="mb-6"
          />

          {error && (
            <Text variant="small" className="mb-4 text-destructive">
              {error}
            </Text>
          )}

          <Button onPress={handleVerifyCode} disabled={isLoading || verificationCode.length !== 6}>
            <Text>{isLoading ? 'Verifying...' : 'Verify Code'}</Text>
          </Button>

          <Button onPress={() => setCurrentStep('scan')} variant="ghost" className="mt-4">
            <Text>Back</Text>
          </Button>
        </View>
      )}

      {/* Step 3: Save Backup Codes */}
      {currentStep === 'backup-codes' && backupCodes && (
        <View>
          <Text variant="h1" className="mb-2">
            Save Your Backup Codes
          </Text>
          <Text className="mb-6 text-muted-foreground">
            Store these codes safely. You can use each code once if you lose access to your
            authenticator app.
          </Text>

          <Card className="mb-6 p-4">
            <View className="flex-row flex-wrap">
              {backupCodes.map((code, index) => (
                <View key={index} className="w-1/2 p-2">
                  <Text variant="code">
                    {index + 1}. {code}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Button onPress={handleCopyBackupCodes} variant="outline" className="mb-4">
            <Text>Copy All Codes</Text>
          </Button>

          <View className="mb-6 flex-row items-center">
            <Button
              onPress={() => setSavedBackupCodes(!savedBackupCodes)}
              variant={savedBackupCodes ? 'default' : 'outline'}
              className="mr-2">
              <Text>{savedBackupCodes ? '✓' : ' '}</Text>
            </Button>
            <Text variant="small" className="flex-1">
              I have saved my backup codes in a safe place
            </Text>
          </View>

          <Button onPress={handleComplete} disabled={!savedBackupCodes}>
            <Text>Complete Setup</Text>
          </Button>
        </View>
      )}
    </View>
  );
}
