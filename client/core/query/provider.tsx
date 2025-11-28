/**
 * QueryProvider Component
 *
 * Wraps the application with TanStack Query's QueryClientProvider
 * and PersistQueryClientProvider for offline cache persistence.
 *
 * Also integrates React Native's AppState for focus management.
 *
 * @module core/query/provider
 */

import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import NetInfo from '@react-native-community/netinfo';
import { queryClient } from './client';
import { asyncStoragePersister, persisterOptions } from './persister';

/**
 * Setup React Native focus manager
 *
 * This ensures TanStack Query correctly detects when the app
 * comes to the foreground (for refetch on focus behavior).
 */
function setupFocusManager() {
  // Only needed for React Native (mobile)
  if (Platform.OS === 'web') {
    return () => {};
  }

  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    // App is in foreground when status is 'active'
    focusManager.setFocused(status === 'active');
  });

  return () => {
    subscription.remove();
  };
}

/**
 * Setup online manager for network state detection
 *
 * This ensures TanStack Query correctly detects network connectivity
 * for offline support and automatic retries on reconnection.
 */
function setupOnlineManager() {
  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline =
      state.isConnected != null && state.isConnected && Boolean(state.isInternetReachable);
    onlineManager.setOnline(isOnline);
  });

  return unsubscribe;
}

/**
 * Props for QueryProvider
 */
interface QueryProviderProps {
  children: React.ReactNode;
  /**
   * Enable cache persistence to AsyncStorage
   * @default true
   */
  enablePersistence?: boolean;
}

/**
 * QueryProvider Component
 *
 * Provides TanStack Query context to the application with:
 * - QueryClient with optimized defaults
 * - AsyncStorage persistence for offline support
 * - React Native focus management
 * - Network connectivity detection
 *
 * @example
 * ```tsx
 * // In _layout.tsx
 * export default function RootLayout() {
 *   return (
 *     <QueryProvider>
 *       <App />
 *     </QueryProvider>
 *   );
 * }
 * ```
 */
export function QueryProvider({ children, enablePersistence = true }: QueryProviderProps) {
  // Setup focus and online managers
  useEffect(() => {
    const cleanupFocus = setupFocusManager();
    const cleanupOnline = setupOnlineManager();

    return () => {
      cleanupFocus();
      cleanupOnline();
    };
  }, []);

  // Use PersistQueryClientProvider if persistence is enabled
  if (enablePersistence) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: persisterOptions.maxAge,
          buster: persisterOptions.buster,
        }}>
        {children}
      </PersistQueryClientProvider>
    );
  }

  // Fallback to standard QueryClientProvider
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Hook to check if the device is online
 *
 * @returns Whether the device has network connectivity
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = React.useState(onlineManager.isOnline());

  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isOnline;
}

/**
 * Hook to check if the app is focused (foreground)
 *
 * @returns Whether the app is in the foreground
 */
export function useIsFocused(): boolean {
  const [isFocused, setIsFocused] = React.useState(focusManager.isFocused());

  useEffect(() => {
    const unsubscribe = focusManager.subscribe((focused) => {
      setIsFocused(focused ?? true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isFocused;
}

export default QueryProvider;
