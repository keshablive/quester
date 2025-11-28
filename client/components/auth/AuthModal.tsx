import * as React from 'react';
import { View } from 'react-native';
import {
  Text,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Icon,
} from '@/components/ui';
import { Mail, Lock, User, ArrowRight, Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/core/auth/AuthContext';
import { TwoFactorInput } from './TwoFactorInput';
import { BiometricPrompt } from './BiometricPrompt';

import { AuthView, AuthModalProps } from './types';

export function AuthModal({ isOpen, onClose, initialView = 'signin' }: AuthModalProps) {
  const [view, setView] = React.useState<AuthView>(initialView);
  const [showBiometric, setShowBiometric] = React.useState(false);
  const {
    signIn,
    signUp,
    forgotPassword,
    signInWithBiometric,
    isLoading,
    error,
    clearError,
    twoFactor,
    cancelTwoFactor,
    biometric,
  } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [localLoading, setLocalLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Use context loading or local loading
  const loading = isLoading || localLoading;

  React.useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setEmail('');
      setPassword('');
      setName('');
      setLocalError(null);
      clearError();
      // Show biometric prompt if enabled and signing in
      setShowBiometric(initialView === 'signin' && biometric.isEnabled);
    }
  }, [isOpen, initialView, clearError, biometric.isEnabled]);

  const handleSubmit = async () => {
    setLocalLoading(true);
    setLocalError(null);
    clearError();

    try {
      if (view === 'signin') {
        await signIn(email, password);
        onClose();
      } else if (view === 'signup') {
        // Validate password length (FR-019)
        if (password.length < 8) {
          setLocalError('Password must be at least 8 characters');
          setLocalLoading(false);
          return;
        }
        await signUp(name, email, password);
        onClose();
      } else if (view === 'forgot') {
        await forgotPassword(email);
        setView('verify');
      }
    } catch (err) {
      // Error is already set in context, but capture for local display
      const message = err instanceof Error ? err.message : 'An error occurred';
      setLocalError(message);
      console.error('[AuthModal]', message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    setLocalLoading(true);
    setLocalError(null);
    clearError();

    try {
      await signInWithBiometric();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Biometric sign in failed';
      // Don't show error for cancellation
      if (!message.includes('cancelled')) {
        setLocalError(message);
      }
      // Fall back to password form on failure
      setShowBiometric(false);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {twoFactor.isRequired
              ? 'Two-Factor Authentication'
              : showBiometric
                ? 'Sign In'
                : view === 'signin'
                  ? 'Welcome Back'
                  : view === 'signup'
                    ? 'Create Account'
                    : view === 'forgot'
                      ? 'Reset Password'
                      : 'Check Email'}
          </DialogTitle>
        </DialogHeader>

        <View className="gap-4 py-4">
          {/* Error Display */}
          {(localError || error) && !showBiometric && (
            <View className="rounded-lg bg-destructive/10 p-3">
              <Text className="text-sm text-destructive">{localError || error}</Text>
            </View>
          )}

          {/* Biometric Authentication View */}
          {showBiometric && !twoFactor.isRequired ? (
            <BiometricPrompt
              onSuccess={() => {
                handleBiometricSignIn();
              }}
              onFallback={() => {
                setShowBiometric(false);
              }}
              onCancel={() => {
                setShowBiometric(false);
              }}
              isLoading={loading}
            />
          ) : /* Two-Factor Authentication View */
          twoFactor.isRequired ? (
            <TwoFactorInput onCancel={cancelTwoFactor} onSuccess={onClose} />
          ) : (
            <>
              {view === 'signup' && (
                <View className="gap-2">
                  <Label nativeID="name">Full Name</Label>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <Icon as={User} size={16} className="text-muted-foreground" />
                    </View>
                    <Input
                      className="pl-9"
                      placeholder="John Doe"
                      value={name}
                      onChangeText={setName}
                      aria-labelledby="name"
                    />
                  </View>
                </View>
              )}

              {(view === 'signin' || view === 'signup' || view === 'forgot') && (
                <View className="gap-2">
                  <Label nativeID="email">Email</Label>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <Icon as={Mail} size={16} className="text-muted-foreground" />
                    </View>
                    <Input
                      className="pl-9"
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      aria-labelledby="email"
                    />
                  </View>
                </View>
              )}

              {(view === 'signin' || view === 'signup') && (
                <View className="gap-2">
                  <Label nativeID="password">Password</Label>
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <Icon as={Lock} size={16} className="text-muted-foreground" />
                    </View>
                    <Input
                      className="pl-9"
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      aria-labelledby="password"
                    />
                  </View>
                </View>
              )}

              {view === 'verify' && (
                <Text className="text-muted-foreground">
                  We've sent a verification code to {email}. Please check your inbox.
                </Text>
              )}

              <Button onPress={handleSubmit} disabled={loading} className="w-full">
                <Text>
                  {loading
                    ? 'Please wait...'
                    : view === 'signin'
                      ? 'Sign In'
                      : view === 'signup'
                        ? 'Create Account'
                        : view === 'forgot'
                          ? 'Send Reset Link'
                          : 'Close'}
                </Text>
                {!loading && <Icon as={ArrowRight} size={16} className="ml-2" />}
              </Button>
            </>
          )}
        </View>

        <DialogFooter className="flex-col gap-2 sm:justify-center">
          {/* Hide footer links during 2FA flow */}
          {!twoFactor.isRequired && (
            <>
              <View className="flex-row justify-center gap-1">
                {view === 'signin' ? (
                  <>
                    <Text className="text-sm text-muted-foreground">Don't have an account?</Text>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onPress={() => setView('signup')}>
                      <Text className="font-semibold text-primary">Sign Up</Text>
                    </Button>
                  </>
                ) : view === 'signup' ? (
                  <>
                    <Text className="text-sm text-muted-foreground">Already have an account?</Text>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onPress={() => setView('signin')}>
                      <Text className="font-semibold text-primary">Sign In</Text>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onPress={() => setView('signin')}>
                    <Text className="font-semibold text-primary">Back to Sign In</Text>
                  </Button>
                )}
              </View>

              {view === 'signin' && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onPress={() => setView('forgot')}>
                  <Text className="text-sm text-muted-foreground">Forgot password?</Text>
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
