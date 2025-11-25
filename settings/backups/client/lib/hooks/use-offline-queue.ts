/**
 * useOfflineQueue Hook
 * Phase 8, T128: Hook for managing offline action queue
 * 
 * Provides interface to offline queue with auto-sync on network reconnect.
 * 
 * Usage:
 * ```typescript
 * const {
 *   pendingCount,
 *   isSyncing,
 *   addToQueue,
 *   sync,
 *   clearQueue,
 * } = useOfflineQueue({
 *   processor: async (action) => {
 *     await api.executeAction(action);
 *   },
 *   autoSync: true,
 * });
 * 
 * // Queue action when offline
 * await addToQueue({
 *   type: 'like',
 *   payload: { contentId: '123' }
 * });
 * 
 * // Manual sync
 * await sync();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueue, QueuedAction, ActionToQueue } from '@/lib/services/offline-queue';

export interface UseOfflineQueueOptions {
  /** Function to process each queued action */
  processor?: (action: QueuedAction) => Promise<void>;
  /** Auto-sync when network comes back online (default: true) */
  autoSync?: boolean;
  /** Max retry attempts for failed actions (default: 3) */
  maxRetries?: number;
  /** Callback when sync starts */
  onSyncStart?: () => void;
  /** Callback when sync completes */
  onSyncComplete?: (successCount: number, failedCount: number) => void;
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void;
}

export interface UseOfflineQueueResult {
  /** Number of pending actions in queue */
  pendingCount: number;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Add action to offline queue */
  addToQueue: (action: ActionToQueue) => Promise<void>;
  /** Manually trigger sync */
  sync: () => Promise<void>;
  /** Clear all actions from queue */
  clearQueue: () => Promise<void>;
  /** Get all actions in queue */
  getActions: () => Promise<QueuedAction[]>;
}

/**
 * Hook for managing offline action queue
 */
export function useOfflineQueue(
  options: UseOfflineQueueOptions = {}
): UseOfflineQueueResult {
  const {
    processor,
    autoSync = true,
    maxRetries = 3,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const queueRef = useRef<OfflineQueue | null>(null);
  const isMountedRef = useRef(true);
  const cleanupFnRef = useRef<(() => void) | null>(null);

  /**
   * Initialize queue
   */
  useEffect(() => {
    isMountedRef.current = true;

    const initQueue = async () => {
      try {
        const queue = new OfflineQueue();
        await queue.initialize();
        queueRef.current = queue;

        // Load initial count
        const count = await queue.count();
        if (isMountedRef.current) {
          setPendingCount(count);
        }

        // Setup event listeners
        const handleAdded = async () => {
          const count = await queue.count();
          if (isMountedRef.current) {
            setPendingCount(count);
          }
        };

        const handleRemoved = async () => {
          const count = await queue.count();
          if (isMountedRef.current) {
            setPendingCount(count);
          }
        };

        const handleCleared = () => {
          if (isMountedRef.current) {
            setPendingCount(0);
          }
        };

        queue.on('added', handleAdded);
        queue.on('removed', handleRemoved);
        queue.on('cleared', handleCleared);

        // Store cleanup function
        cleanupFnRef.current = () => {
          queue.off('added', handleAdded);
          queue.off('removed', handleRemoved);
          queue.off('cleared', handleCleared);
        };
      } catch (error) {
        console.error('[useOfflineQueue] Failed to initialize queue:', error);
      }
    };

    initQueue();

    return () => {
      isMountedRef.current = false;
      if (cleanupFnRef.current) {
        cleanupFnRef.current();
      }
    };
  }, []);

  /**
   * Setup network listener for auto-sync
   */
  useEffect(() => {
    if (!autoSync || !processor) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        // Network came back - auto sync
        sync();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [autoSync, processor]);

  /**
   * Add action to queue
   */
  const addToQueue = useCallback(async (action: ActionToQueue): Promise<void> => {
    if (!queueRef.current) {
      console.error('[useOfflineQueue] Queue not initialized');
      return;
    }

    try {
      await queueRef.current.add(action);
    } catch (error) {
      console.error('[useOfflineQueue] Failed to add action to queue:', error);
      throw error;
    }
  }, []);

  /**
   * Sync queue with backend
   */
  const sync = useCallback(async (): Promise<void> => {
    if (!queueRef.current || !processor) {
      console.warn('[useOfflineQueue] Cannot sync - queue or processor not available');
      return;
    }

    if (isSyncing) {
      console.warn('[useOfflineQueue] Sync already in progress');
      return;
    }

    // Check network status
    try {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        console.log('[useOfflineQueue] Cannot sync - device is offline');
        return;
      }
    } catch (error) {
      console.error('[useOfflineQueue] Failed to check network status:', error);
      return;
    }

    setIsSyncing(true);
    onSyncStart?.();

    let successCount = 0;
    let failedCount = 0;

    try {
      const initialCount = await queueRef.current.count();

      await queueRef.current.processAll(processor, {
        maxRetries,
        onProgress: (current, total) => {
          console.log(`[useOfflineQueue] Processing ${current}/${total}`);
        },
      });

      const finalCount = await queueRef.current.count();
      successCount = initialCount - finalCount;
      failedCount = finalCount;

      if (isMountedRef.current) {
        setPendingCount(finalCount);
      }

      onSyncComplete?.(successCount, failedCount);
    } catch (error) {
      console.error('[useOfflineQueue] Sync failed:', error);
      onSyncError?.(error as Error);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [processor, isSyncing, maxRetries, onSyncStart, onSyncComplete, onSyncError]);

  /**
   * Clear queue
   */
  const clearQueue = useCallback(async (): Promise<void> => {
    if (!queueRef.current) {
      console.error('[useOfflineQueue] Queue not initialized');
      return;
    }

    try {
      await queueRef.current.clear();
      if (isMountedRef.current) {
        setPendingCount(0);
      }
    } catch (error) {
      console.error('[useOfflineQueue] Failed to clear queue:', error);
      throw error;
    }
  }, []);

  /**
   * Get all actions
   */
  const getActions = useCallback(async (): Promise<QueuedAction[]> => {
    if (!queueRef.current) {
      console.error('[useOfflineQueue] Queue not initialized');
      return [];
    }

    try {
      return await queueRef.current.getAll();
    } catch (error) {
      console.error('[useOfflineQueue] Failed to get actions:', error);
      return [];
    }
  }, []);

  return {
    pendingCount,
    isSyncing,
    addToQueue,
    sync,
    clearQueue,
    getActions,
  };
}
