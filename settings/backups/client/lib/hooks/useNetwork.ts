/**
 * useNetwork Hook
 * 
 * Monitors network connectivity status and provides offline/online state.
 * Useful for disabling network requests and showing offline indicators.
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isOffline: boolean;
  isLoading: boolean;
}

export interface NetworkActions {
  refresh: () => Promise<void>;
}

/**
 * useNetwork Hook
 * 
 * Monitors network status and provides connectivity information.
 * 
 * Usage:
 * ```tsx
 * const { isConnected, isOffline, type } = useNetwork();
 * 
 * if (isOffline) {
 *   return <OfflineBanner />;
 * }
 * 
 * // Disable submit button when offline
 * <Button disabled={isOffline} onPress={handleSubmit} />
 * ```
 */
export const useNetwork = (): NetworkState & NetworkActions => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Update network state from NetInfo
   */
  const updateNetworkState = useCallback((state: NetInfoState) => {
    setIsConnected(state.isConnected ?? false);
    setIsInternetReachable(state.isInternetReachable);
    setType(state.type);
    setIsLoading(false);

    console.log('[useNetwork] Network state updated:', {
      connected: state.isConnected,
      reachable: state.isInternetReachable,
      type: state.type,
    });
  }, []);

  /**
   * Manually refresh network state
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const state = await NetInfo.fetch();
      updateNetworkState(state);
    } catch (error) {
      console.error('[useNetwork] Failed to refresh network state:', error);
    }
  }, [updateNetworkState]);

  /**
   * Subscribe to network changes on mount
   */
  useEffect(() => {
    let unsubscribe: NetInfoSubscription | null = null;

    const initialize = async () => {
      try {
        // Get initial state
        const state = await NetInfo.fetch();
        updateNetworkState(state);

        // Subscribe to network changes
        unsubscribe = NetInfo.addEventListener(updateNetworkState);

        console.log('[useNetwork] Initialized and subscribed to network changes');
      } catch (error) {
        console.error('[useNetwork] Initialization failed:', error);
        setIsLoading(false);
      }
    };

    initialize();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('[useNetwork] Unsubscribed from network changes');
      }
    };
  }, [updateNetworkState]);

  // Calculate offline status (not connected OR internet not reachable)
  const isOffline = !isConnected || isInternetReachable === false;

  return {
    // State
    isConnected,
    isInternetReachable,
    type,
    isOffline,
    isLoading,
    // Actions
    refresh,
  };
};
