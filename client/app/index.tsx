import { Stack, router } from 'expo-router';
import * as React from 'react';
import { ThemeToggle } from '@/components';
import { appConfig, ROUTES } from '@/core';
import { WelcomeScreen } from '@/components/features/home';
import { useAuth } from '@/core/auth/AuthContext';

const SCREEN_OPTIONS = {
  title: appConfig.name,
  headerTransparent: true,
  headerRight: () => <ThemeToggle />,
};

export default function Screen() {
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(`/${ROUTES.DASHBOARD}`);
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <WelcomeScreen />
    </>
  );
}
