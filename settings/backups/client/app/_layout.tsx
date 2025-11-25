import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useAchievementToast } from '@/components/gamification/achievement-toast';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useInvalidateBadges } from '@/lib/hooks/useBadges';
import type { Badge, UserBadge } from '@/lib/api/badges';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, View } from 'react-native';
import { notificationsApi } from '@/lib/api/notifications';
import { DeveloperModeProvider } from '@/lib/contexts/developer-mode-context';
import { AccessibilityProvider } from '@/lib/hooks/use-accessibility';
import { useRouter } from 'expo-router';
import { ToastNotificationManager } from '@/components/real-time/toast-notification-manager';
import { RealTimeNotificationsProvider } from '@/lib/providers/real-time-notifications-provider';
import { OfflineProvider } from '@/lib/contexts/offline-context';
import { NavigationProvider } from '@/lib/contexts/navigation-context';
import { GamificationProvider } from '@/lib/contexts/gamification-context';
import { AppBar } from '@/components/navigation/app-bar';
import { Sidebar } from '@/components/navigation/sidebar';
import { SidebarProvider, useSidebar } from '@/lib/contexts/sidebar-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

function RootLayoutContent() {
  const { colorScheme } = useColorScheme();
  const achievementToast = useAchievementToast();
  const invalidateBadges = useInvalidateBadges();
  const router = useRouter();

  // WebSocket configuration
  // TODO: Replace with actual WebSocket URL from environment config
  const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

  const { status: _status, subscribe } = useWebSocket({
    url: wsUrl,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    onOpen: () => {
      console.log('[Badge System] WebSocket connected - listening for badge events');
    },
    onClose: () => {
      console.log('[Badge System] WebSocket disconnected');
    },
    onError: (error) => {
      console.error('[Badge System] WebSocket error:', error);
    },
  });

  // FR-049: FCM token registration on app launch with AsyncStorage persistence
  React.useEffect(() => {
    async function registerFCM() {
      // Only register on physical devices
      if (!Device.isDevice) {
        console.log('[FCM] Skipping registration on simulator/emulator');
        return;
      }

      try {
        // Check if already registered
        const storedToken = await AsyncStorage.getItem('fcm_token');
        const storedTimestamp = await AsyncStorage.getItem('fcm_token_timestamp');

        // Re-register every 7 days or if no token exists
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const shouldRegister =
          !storedToken || !storedTimestamp || parseInt(storedTimestamp) < sevenDaysAgo;

        if (!shouldRegister) {
          console.log('[FCM] Token already registered recently');
          return;
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('[FCM] Push notification permission denied');
          return;
        }

        // Get FCM token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
        });
        const token = tokenData.data;

        console.log('[FCM] Token obtained:', token);

        // Register with backend
        await notificationsApi.registerFCMToken(token, {
          platform: Platform.OS,
          device_model: Device.modelName || 'unknown',
          os_version: Device.osVersion || 'unknown',
          app_version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        });

        // Store token and timestamp in AsyncStorage
        await AsyncStorage.setItem('fcm_token', token);
        await AsyncStorage.setItem('fcm_token_timestamp', Date.now().toString());

        console.log('[FCM] Token registered successfully');
      } catch (error) {
        console.error('[FCM] Registration error:', error);
      }
    }

    registerFCM();

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  // Subscribe to badge:earned events
  React.useEffect(() => {
    const unsubscribe = subscribe(
      'badge:earned',
      (payload: { badge: Badge; userBadge: UserBadge }) => {
        console.log('[Badge System] Badge earned event received:', payload);

        // Show achievement toast with confetti
        if (payload.badge) {
          // Convert API Badge (snake_case) to BadgeData (camelCase)
          const badgeData = {
            id: payload.badge.id,
            name: payload.badge.name,
            description: payload.badge.description,
            iconUrl: payload.badge.icon_url,
            tier: payload.badge.tier,
            pointsThreshold: payload.badge.points_threshold,
            autoAward: payload.badge.auto_award,
            category: payload.badge.category,
            earnedAt: payload.userBadge?.earned_at,
            approvalStatus: payload.userBadge?.approval_status,
            approvedAt: payload.userBadge?.approved_at,
            approvedBy: payload.userBadge?.approved_by,
          };

          achievementToast.show(badgeData);
        }

        // Invalidate badge queries to refresh UI
        invalidateBadges();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [subscribe, achievementToast, invalidateBadges]);

  // Subscribe to badge:revoked events (optional)
  React.useEffect(() => {
    const unsubscribe = subscribe(
      'badge:revoked',
      (payload: { badgeId: number; userId: number; reason?: string }) => {
        console.log('[Badge System] Badge revoked event received:', payload);

        // Invalidate badge queries to refresh UI
        invalidateBadges();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [subscribe, invalidateBadges]);

  // T104: Keyboard navigation support for web platform
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Tab navigation - handled natively by browser
      if (event.key === 'Tab') {
        // Allow default tab behavior, but ensure focus is visible
        // This is primarily handled by CSS :focus-visible styles
        return;
      }

      // Escape key - close modals, go back
      if (event.key === 'Escape') {
        // Check if we can go back in navigation stack
        if (router.canGoBack?.()) {
          event.preventDefault();
          router.back();
        }
      }

      // Enter key - activate focused element (if not already handled)
      if (event.key === 'Enter') {
        const activeElement = document.activeElement as HTMLElement;

        // Only handle if it's a non-interactive element with onClick
        // (buttons, links, inputs handle Enter natively)
        if (
          activeElement &&
          activeElement.tagName !== 'BUTTON' &&
          activeElement.tagName !== 'A' &&
          activeElement.tagName !== 'INPUT' &&
          activeElement.tagName !== 'TEXTAREA' &&
          activeElement.hasAttribute('role')
        ) {
          const role = activeElement.getAttribute('role');
          if (role === 'button' || role === 'link' || role === 'checkbox') {
            event.preventDefault();
            activeElement.click();
          }
        }
      }

      // Arrow keys for radio groups and tab lists
      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        const activeElement = document.activeElement as HTMLElement;

        if (activeElement) {
          const role = activeElement.getAttribute('role');

          // Handle radio groups
          if (role === 'radio') {
            event.preventDefault();
            const radioGroup = activeElement.closest('[role="radiogroup"]');
            if (radioGroup) {
              const radios = Array.from(
                radioGroup.querySelectorAll('[role="radio"]')
              ) as HTMLElement[];
              const currentIndex = radios.indexOf(activeElement);

              let nextIndex = currentIndex;
              if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % radios.length;
              } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                nextIndex = (currentIndex - 1 + radios.length) % radios.length;
              }

              radios[nextIndex]?.focus();
              radios[nextIndex]?.click();
            }
          }

          // Handle tab lists
          if (role === 'tab') {
            event.preventDefault();
            const tabList = activeElement.closest('[role="tablist"]');
            if (tabList) {
              const tabs = Array.from(tabList.querySelectorAll('[role="tab"]')) as HTMLElement[];
              const currentIndex = tabs.indexOf(activeElement);

              let nextIndex = currentIndex;
              if (event.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % tabs.length;
              } else if (event.key === 'ArrowLeft') {
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              }

              tabs[nextIndex]?.focus();
              tabs[nextIndex]?.click();
            }
          }
        }
      }

      // Home/End keys for lists and grids
      if (event.key === 'Home' || event.key === 'End') {
        const activeElement = document.activeElement as HTMLElement;

        if (activeElement) {
          const role = activeElement.getAttribute('role');

          if (role === 'gridcell' || role === 'row' || role === 'option') {
            event.preventDefault();
            const container = activeElement.closest(
              '[role="grid"], [role="listbox"], [role="list"]'
            );

            if (container) {
              const items = Array.from(
                container.querySelectorAll(`[role="${role}"]`)
              ) as HTMLElement[];

              if (event.key === 'Home' && items[0]) {
                items[0].focus();
              } else if (event.key === 'End' && items[items.length - 1]) {
                items[items.length - 1].focus();
              }
            }
          }
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  const { isMobile } = useSidebar();

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Mobile Layout: Sidebar (Bottom Bar) is separate from content */}
      {isMobile ? (
        <View className="flex-1">
          <View className="flex-1">
            <AppBar />
            <RealTimeNotificationsProvider>
              <Stack />
              <PortalHost />
              {achievementToast.component}
              <ToastNotificationManager notifications={[]} onDismiss={() => {}} />
            </RealTimeNotificationsProvider>
          </View>
          <Sidebar />
        </View>
      ) : (
        /* Desktop/Tablet Layout: Sidebar is side-by-side with content */
        <View className="flex-1 flex-row">
          <Sidebar />
          <View className="flex-1">
            <AppBar />
            <RealTimeNotificationsProvider>
              <Stack />
              <PortalHost />
              {achievementToast.component}
              <ToastNotificationManager notifications={[]} onDismiss={() => {}} />
            </RealTimeNotificationsProvider>
          </View>
        </View>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <DeveloperModeProvider>
          <OfflineProvider>
            <NavigationProvider>
              {/* GamificationProvider with default userId for development.
                  TODO: Replace with actual userId from AuthContext once implemented. */}
              <GamificationProvider userId="dev-user">
                <SidebarProvider>
                  <RootLayoutContent />
                </SidebarProvider>
              </GamificationProvider>
            </NavigationProvider>
          </OfflineProvider>
        </DeveloperModeProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
