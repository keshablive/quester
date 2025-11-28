import * as React from 'react';
import { View } from 'react-native';
import {
  Text,
  Card,
  Icon,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  Separator,
  Switch,
  type Option,
} from '@/components/ui';
import { User, Globe, Info, Trash2, LogOut, Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/core/auth/AuthContext';

const LANGUAGE_OPTIONS = [
  { label: 'English (US)', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' },
  { label: 'Deutsch', value: 'de' },
  { label: '日本語', value: 'ja' },
] as const satisfies readonly { label: string; value: string }[];

export function AccountSettings() {
  const [language, setLanguage] = React.useState<Option>({ label: 'English (US)', value: 'en' });
  const { signOutAll, biometric, enableBiometric, disableBiometric, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [isBiometricToggling, setIsBiometricToggling] = React.useState(false);

  const handleSignOutAll = async () => {
    setIsSigningOut(true);
    try {
      await signOutAll();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleBiometricToggle = async (checked: boolean) => {
    setIsBiometricToggling(true);
    try {
      if (checked) {
        await enableBiometric();
      } else {
        await disableBiometric();
      }
    } catch (err) {
      // Error is handled in context
      console.warn('[Settings] Biometric toggle failed:', err);
    } finally {
      setIsBiometricToggling(false);
    }
  };

  return (
    <Card className="p-4">
      <View className="gap-4">
        <View className="flex-row items-center gap-3">
          <Icon as={User} size={20} className="text-muted-foreground" />
          <View className="flex-1">
            <Text className="font-medium">Edit Profile</Text>
            <Text className="text-sm text-muted-foreground">Update your personal information</Text>
          </View>
        </View>

        <Separator />

        <View className="gap-2">
          <View className="mb-2 flex-row items-center gap-3">
            <Icon as={Globe} size={20} className="text-muted-foreground" />
            <Text className="font-medium">Language</Text>
          </View>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} label={option.label} value={option.value} />
              ))}
            </SelectContent>
          </Select>
        </View>

        <Separator />

        {/* Biometric Login Toggle - T048 */}
        {biometric.isAvailable && (
          <>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 flex-row items-center gap-3">
                <Icon as={Fingerprint} size={20} className="text-muted-foreground" />
                <View className="flex-1">
                  <Text className="font-medium">Biometric Login</Text>
                  <Text className="text-sm text-muted-foreground">
                    {biometric.isEnrolled
                      ? 'Use Face ID or fingerprint to sign in'
                      : 'Set up biometrics in device settings first'}
                  </Text>
                </View>
              </View>
              <Switch
                checked={biometric.isEnabled}
                onCheckedChange={handleBiometricToggle}
                disabled={!biometric.isEnrolled || isBiometricToggling || isLoading}
              />
            </View>
            <Separator />
          </>
        )}

        <View className="flex-row items-center gap-3">
          <Icon as={Info} size={20} className="text-muted-foreground" />
          <View className="flex-1">
            <Text className="font-medium">About</Text>
            <Text className="text-sm text-muted-foreground">Version 1.0.0</Text>
          </View>
        </View>

        <Separator />

        {/* Sign Out from All Devices - T035 */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Icon as={LogOut} size={16} className="mr-2" />
              <Text>Sign Out from All Devices</Text>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign you out from all devices where you're currently logged in, including
                this one.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSigningOut}>
                <Text>Cancel</Text>
              </AlertDialogCancel>
              <AlertDialogAction onPress={handleSignOutAll} disabled={isSigningOut}>
                <Text>{isSigningOut ? 'Signing out...' : 'Sign Out All'}</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Separator />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Icon as={Trash2} size={16} className="mr-2" />
              <Text>Delete Account</Text>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove
                your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <Text>Cancel</Text>
              </AlertDialogCancel>
              <AlertDialogAction>
                <Text>Delete Account</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </View>
    </Card>
  );
}
