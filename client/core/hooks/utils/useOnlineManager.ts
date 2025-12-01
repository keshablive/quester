/**
 * Online Manager Hook
 *
 * React hook for accessing TanStack Query's online state.
 * Provides reactive isOnline state for components.
 *
 * @module core/hooks/useOnlineManager
 */

import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

/**
 * Subscribe to online manager state changes
 */
function subscribe(callback: () => void): () => void {
  return onlineManager.subscribe(callback);
}

/**
 * Get current online state
 */
function getSnapshot(): boolean {
  return onlineManager.isOnline();
}

/**
 * Server-side rendering snapshot (always online)
 */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Hook to access TanStack Query's online manager state
 *
 * Uses useSyncExternalStore for proper React 18+ integration.
 *
 * @returns Object containing isOnline state and setOnline function
 *
 * @example
 * ```tsx
 * function NetworkStatus() {
 *   const { isOnline } = useOnlineManager();
 *
 *   return (
 *     <Text>
 *       {isOnline ? 'Connected' : 'Offline'}
 *     </Text>
 *   );
 * }
 * ```
 */
export function useOnlineManager(): {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
} {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return {
    isOnline,
    setOnline: (online: boolean) => onlineManager.setOnline(online),
  };
}

export default useOnlineManager;
