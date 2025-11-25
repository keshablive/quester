/**
 * useOfflineQueue Hook Tests
 * Phase 8, T128: Tests for offline queue hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOfflineQueue } from '@/lib/hooks/use-offline-queue';
import { OfflineQueue } from '@/lib/services/offline-queue';
import NetInfo from '@react-native-community/netinfo';

// Mock OfflineQueue
jest.mock('@/lib/services/offline-queue');

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

describe('useOfflineQueue Hook', () => {
  let mockQueue: jest.Mocked<OfflineQueue>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock queue
    mockQueue = {
      initialize: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue({
        id: '1',
        type: 'like',
        payload: {},
        timestamp: Date.now(),
        retries: 0,
      }),
      remove: jest.fn().mockResolvedValue(undefined),
      getAll: jest.fn().mockResolvedValue([]),
      getById: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      clear: jest.fn().mockResolvedValue(undefined),
      incrementRetry: jest.fn().mockResolvedValue(undefined),
      processAll: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    (OfflineQueue as jest.Mock).mockImplementation(() => mockQueue);

    // Mock NetInfo
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(jest.fn());
  });

  describe('Initialization', () => {
    it('should initialize queue on mount', async () => {
      renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });
    });

    it('should setup event listeners', async () => {
      renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(mockQueue.on).toHaveBeenCalledWith('added', expect.any(Function));
        expect(mockQueue.on).toHaveBeenCalledWith('removed', expect.any(Function));
        expect(mockQueue.on).toHaveBeenCalledWith('cleared', expect.any(Function));
      });
    });

    it('should load initial queue count', async () => {
      mockQueue.count.mockResolvedValue(5);

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(5);
      });
    });
  });

  describe('Adding Actions', () => {
    it('should add action to queue', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.addToQueue({
          type: 'like',
          payload: { contentId: '123' },
        });
      });

      expect(mockQueue.add).toHaveBeenCalledWith({
        type: 'like',
        payload: { contentId: '123' },
      });
    });

    it('should update pending count after adding', async () => {
      mockQueue.count.mockResolvedValue(0).mockResolvedValueOnce(1);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.addToQueue({ type: 'like', payload: {} });
      });

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(1);
      });
    });
  });

  describe('Syncing', () => {
    it('should sync queue when online', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useOfflineQueue({ processor }));

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(mockQueue.processAll).toHaveBeenCalledWith(
        processor,
        expect.any(Object)
      );
    });

    it('should set syncing state during sync', async () => {
      // Mock processAll to take time
      mockQueue.processAll.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 300))
      );

      const processor = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useOfflineQueue({ processor }));

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      // Start sync (not awaited so it runs in background)
      act(() => {
        result.current.sync();
      });

      // Should be syncing now
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true);
      }, { timeout: 1000 });

      // Wait for sync to complete
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      }, { timeout: 1000 });
    });

    it('should not sync when already syncing', async () => {
      // Mock processAll to take time
      mockQueue.processAll.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 300))
      );

      const processor = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useOfflineQueue({ processor }));

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      // Start first sync (not awaited)
      act(() => {
        result.current.sync();
      });

      // Verify syncing started
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true);
      }, { timeout: 1000 });

      // Try to start second sync while first is in progress
      act(() => {
        result.current.sync(); // This should be ignored
      });

      // Wait for sync to complete
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      }, { timeout: 1000 });

      // Should have only processed once
      expect(mockQueue.processAll).toHaveBeenCalledTimes(1);
    });

    it('should not sync when offline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const processor = jest.fn();
      const { result } = renderHook(() => useOfflineQueue({ processor }));

      await act(async () => {
        await result.current.sync();
      });

      expect(mockQueue.processAll).not.toHaveBeenCalled();
    });

    it('should update pending count after sync', async () => {
      mockQueue.count.mockResolvedValue(5).mockResolvedValueOnce(0);
      const processor = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useOfflineQueue({ processor }));

      await act(async () => {
        await result.current.sync();
      });

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(0);
      });
    });
  });

  describe('Auto-sync', () => {
    it('should auto-sync when coming online', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      let networkListener: any;

      (NetInfo.addEventListener as jest.Mock).mockImplementation((listener) => {
        networkListener = listener;
        return jest.fn();
      });

      renderHook(() => useOfflineQueue({ processor, autoSync: true }));

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      // Simulate coming online
      await act(async () => {
        networkListener({ isConnected: true, isInternetReachable: true });
        // Give time for async sync to start
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(mockQueue.processAll).toHaveBeenCalled();
      });
    });

    it('should not auto-sync when disabled', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);

      // Clear previous mock calls
      (NetInfo.addEventListener as jest.Mock).mockClear();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(jest.fn());

      renderHook(() => useOfflineQueue({ processor, autoSync: false }));

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      // With autoSync: false, network listener should NOT be setup
      expect(NetInfo.addEventListener).not.toHaveBeenCalled();

      // processAll should not be called since there's no auto-sync
      expect(mockQueue.processAll).not.toHaveBeenCalled();
    });
  });

  describe('Clearing Queue', () => {
    it('should clear all actions', async () => {
      const { result } = renderHook(() => useOfflineQueue());

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.clearQueue();
      });

      expect(mockQueue.clear).toHaveBeenCalled();
    });

    it('should update pending count after clear', async () => {
      mockQueue.count.mockResolvedValue(5).mockResolvedValueOnce(0);

      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.clearQueue();
      });

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(0);
      });
    });
  });

  describe('Getting Actions', () => {
    it('should get all actions', async () => {
      const mockActions = [
        { id: '1', type: 'like', payload: {}, timestamp: Date.now(), retries: 0 },
        { id: '2', type: 'comment', payload: {}, timestamp: Date.now(), retries: 0 },
      ];
      mockQueue.getAll.mockResolvedValue(mockActions);

      const { result } = renderHook(() => useOfflineQueue());

      // Wait for initialization
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
      });

      await act(async () => {
        const actions = await result.current.getActions();
        expect(actions).toEqual(mockActions);
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', async () => {
      const { unmount } = renderHook(() => useOfflineQueue());

      // Wait for initialization to complete
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
        expect(mockQueue.on).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockQueue.off).toHaveBeenCalledWith('added', expect.any(Function));
        expect(mockQueue.off).toHaveBeenCalledWith('removed', expect.any(Function));
        expect(mockQueue.off).toHaveBeenCalledWith('cleared', expect.any(Function));
      });
    });

    it('should unsubscribe from network changes', async () => {
      const unsubscribe = jest.fn();
      const processor = jest.fn().mockResolvedValue(undefined);
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useOfflineQueue({ processor }));

      // Wait for initialization and network listener setup
      await waitFor(() => {
        expect(mockQueue.initialize).toHaveBeenCalled();
        expect(NetInfo.addEventListener).toHaveBeenCalled();
      });

      unmount();

      // Give time for cleanup to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('Sync failed'));
      const { result } = renderHook(() => useOfflineQueue({ processor }));

      await act(async () => {
        await result.current.sync();
      });

      // Should not throw, and syncing should be false
      expect(result.current.isSyncing).toBe(false);
    });

    it('should handle queue initialization errors', async () => {
      mockQueue.initialize.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useOfflineQueue());

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(0);
      });
    });
  });
});
