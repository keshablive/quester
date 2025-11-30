import '@/global.css';
import { MainLayout } from '@/components/layout';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import {
  getNavigationTheme,
  XPNotificationProvider,
  AchievementNotificationProvider,
} from '@/core';
import { AuthProviders } from '@/core/auth/providers';
import { useAuth } from '@/core/auth/hooks';
import { SplashScreen } from '@/components/ui';
import { isProtectedRoute } from '@/core/routes';
import { QueryProvider } from '@/core/query';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

import { useSegments, useRouter } from 'expo-router';
import { useEffect } from 'react';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // If not authenticated and not on the root index page
    // segments for '/' is empty array or ['index'] depending on setup,
    // but usually empty for root. Let's check if we are on a protected route.
    const currentRoute = segments[0];

    if (!isAuthenticated && currentRoute && isProtectedRoute(currentRoute)) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      <StatusBar style="auto" />
      {isAuthenticated ? (
        <MainLayout>
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </MainLayout>
      ) : (
        <>
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </>
      )}
    </>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <QueryProvider>
      <ThemeProvider value={getNavigationTheme(colorScheme ?? 'light')}>
        <AuthProviders>
          <XPNotificationProvider>
            <AchievementNotificationProvider>
              <AppContent />
            </AchievementNotificationProvider>
          </XPNotificationProvider>
        </AuthProviders>
      </ThemeProvider>
    </QueryProvider>
  );
}
