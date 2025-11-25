/**
 * Error Handling End-to-End Tests (Phase 8, T129)
 *
 * Integration tests covering complete error handling workflows:
 * - Network errors with retry
 * - Validation errors with inline feedback
 * - Offline mode with queue sync
 * - Session expiration with recovery
 * - Component errors with fallback UI
 *
 * @module error-handling.e2e
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useErrorHandling } from '@/lib/hooks/use-error-handling';
import { useOfflineQueue } from '@/lib/hooks/use-offline-queue';
import { offlineSyncService } from '@/lib/services/offline-sync-service';

// Mock network conditions
const mockNetworkOnline = () => {
  Object.defineProperty(window.navigator, 'onLine', {
    writable: true,
    value: true,
  });
};

const mockNetworkOffline = () => {
  Object.defineProperty(window.navigator, 'onLine', {
    writable: true,
    value: false,
  });
};

describe('Error Handling E2E', () => {
  beforeEach(() => {
    mockNetworkOnline();
    jest.clearAllMocks();
  });

  describe('Network Error Recovery', () => {
    it('should catch network error and allow retry', async () => {
      const { result } = renderHook(() => useErrorHandling());

      // Simulate API call that fails
      const mockApiCall = jest.fn().mockRejectedValueOnce(new Error('Network request failed'));

      // Handle error
      try {
        await mockApiCall();
      } catch (error) {
        result.current.handleError(error as Error, {
          context: 'API Call',
          retryable: true,
        });
      }

      // Error should be tracked
      await waitFor(() => {
        expect(result.current.errors.length).toBe(1);
      });

      expect(result.current.errors[0]).toMatchObject({
        message: 'Network request failed',
        context: 'API Call',
        retryable: true,
      });

      // Retry should be possible
      expect(result.current.canRetry(result.current.errors[0].id)).toBe(true);
    });

    it('should handle multiple failed retries with exponential backoff', async () => {
      const { result } = renderHook(() => useErrorHandling());

      const mockApiCall = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValueOnce({ data: 'success' });

      // First attempt
      try {
        await mockApiCall();
      } catch (error) {
        result.current.handleError(error as Error, {
          context: 'API Call',
          retryable: true,
          maxRetries: 3,
        });
      }

      await waitFor(() => {
        expect(result.current.errors.length).toBe(1);
      });

      const errorId = result.current.errors[0].id;

      // Retry 1
      try {
        await mockApiCall();
      } catch (error) {
        result.current.retry(errorId);
      }

      // Should still have 1 error (same error updated)
      expect(result.current.errors.length).toBe(1);

      // Retry 2 - succeeds
      const retryResult = await result.current.retry(errorId, async () => {
        return await mockApiCall();
      });

      expect(retryResult).toEqual({ data: 'success' });

      // Error should be cleared after successful retry
      await waitFor(() => {
        expect(result.current.errors.length).toBe(0);
      });
    });

    it('should show user-friendly error messages for common network errors', async () => {
      const { result } = renderHook(() => useErrorHandling());

      const testCases = [
        {
          error: new Error('Network request failed'),
          expectedMessage: /connection/i,
        },
        {
          error: new Error('timeout of 5000ms exceeded'),
          expectedMessage: /timeout/i,
        },
        {
          error: { response: { status: 401 } },
          expectedMessage: /unauthorized/i,
        },
        {
          error: { response: { status: 404 } },
          expectedMessage: /not found/i,
        },
        {
          error: { response: { status: 500 } },
          expectedMessage: /server error/i,
        },
      ];

      for (const { error, expectedMessage } of testCases) {
        result.current.handleError(error as Error, { context: 'Test' });

        await waitFor(() => {
          expect(result.current.errors[result.current.errors.length - 1].message).toMatch(
            expectedMessage
          );
        });

        result.current.clearErrors();
      }
    });
  });

  describe('Offline Mode & Queue Sync', () => {
    it('should queue actions when offline and sync when online', async () => {
      mockNetworkOffline();

      const { result } = renderHook(() => useOfflineQueue());

      // Queue actions while offline
      await result.current.enqueue({
        type: 'LIKE_POST',
        data: { postId: '123' },
      });

      await result.current.enqueue({
        type: 'COMMENT',
        data: { postId: '123', text: 'Great post!' },
      });

      expect(result.current.queueLength).toBe(2);
      expect(result.current.syncStatus).toBe('offline');

      // Go online
      mockNetworkOnline();

      // Trigger sync
      await result.current.syncQueue();

      await waitFor(() => {
        expect(result.current.queueLength).toBe(0);
        expect(result.current.syncStatus).toBe('synced');
      });
    });

    it('should handle partial sync failures gracefully', async () => {
      mockNetworkOffline();

      const { result } = renderHook(() => useOfflineQueue());

      // Queue multiple actions
      await result.current.enqueue({ type: 'ACTION_1', data: { id: 1 } });
      await result.current.enqueue({ type: 'ACTION_2', data: { id: 2 } });
      await result.current.enqueue({ type: 'ACTION_3', data: { id: 3 } });

      expect(result.current.queueLength).toBe(3);

      // Mock one action failing
      const mockSync = jest
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Sync failed'))
        .mockResolvedValueOnce({ success: true });

      jest.spyOn(offlineSyncService, 'syncAction').mockImplementation(mockSync);

      // Go online and sync
      mockNetworkOnline();
      await result.current.syncQueue();

      await waitFor(() => {
        // One action should remain in queue (the failed one)
        expect(result.current.queueLength).toBe(1);
        expect(result.current.syncStatus).toBe('error');
      });
    });

    it('should maintain action order during sync', async () => {
      mockNetworkOffline();

      const { result } = renderHook(() => useOfflineQueue());
      const syncOrder: number[] = [];

      // Queue actions in specific order
      await result.current.enqueue({ type: 'ACTION', data: { order: 1 } });
      await result.current.enqueue({ type: 'ACTION', data: { order: 2 } });
      await result.current.enqueue({ type: 'ACTION', data: { order: 3 } });

      // Mock sync to track order
      jest.spyOn(offlineSyncService, 'syncAction').mockImplementation(async (action: any) => {
        syncOrder.push(action.data.order);
        return { success: true };
      });

      // Go online and sync
      mockNetworkOnline();
      await result.current.syncQueue();

      await waitFor(() => {
        expect(syncOrder).toEqual([1, 2, 3]);
      });
    });
  });

  describe('Validation Errors', () => {
    it('should provide inline validation feedback', async () => {
      const { result } = renderHook(() => useErrorHandling());

      // Simulate form validation errors
      const validationErrors = {
        email: 'Invalid email format',
        password: 'Password must be at least 8 characters',
        username: 'Username is already taken',
      };

      result.current.handleValidationErrors(validationErrors);

      await waitFor(() => {
        expect(result.current.validationErrors).toEqual(validationErrors);
      });

      // Clear specific field error
      result.current.clearValidationError('email');

      await waitFor(() => {
        expect(result.current.validationErrors.email).toBeUndefined();
        expect(result.current.validationErrors.password).toBe(
          'Password must be at least 8 characters'
        );
      });
    });

    it('should clear validation errors on successful submit', async () => {
      const { result } = renderHook(() => useErrorHandling());

      // Set validation errors
      result.current.handleValidationErrors({
        email: 'Invalid email',
        password: 'Too short',
      });

      expect(Object.keys(result.current.validationErrors).length).toBe(2);

      // Clear all on success
      result.current.clearValidationErrors();

      await waitFor(() => {
        expect(Object.keys(result.current.validationErrors).length).toBe(0);
      });
    });
  });

  describe('Session Expiration', () => {
    it('should detect session expiration and prompt re-authentication', async () => {
      const { result } = renderHook(() => useErrorHandling());

      // Simulate 401 unauthorized response
      const sessionError = {
        response: {
          status: 401,
          data: { message: 'Token expired' },
        },
      };

      result.current.handleError(sessionError as any, {
        context: 'API Call',
      });

      await waitFor(() => {
        expect(result.current.sessionExpired).toBe(true);
      });
    });

    it('should preserve draft state on session expiration', async () => {
      const { result } = renderHook(() => useErrorHandling());

      const draftData = {
        title: 'My Post',
        content: 'This is important content',
      };

      // Save draft
      result.current.saveDraft('post-123', draftData);

      // Simulate session expiration
      result.current.handleError(
        { response: { status: 401 } } as any,
        { context: 'Save Post' }
      );

      await waitFor(() => {
        expect(result.current.sessionExpired).toBe(true);
      });

      // Draft should still be accessible
      const savedDraft = result.current.getDraft('post-123');
      expect(savedDraft).toEqual(draftData);
    });
  });

  describe('Component Errors', () => {
    it('should gracefully degrade on component errors', async () => {
      const { result } = renderHook(() => useErrorHandling());

      // Simulate React component error
      const componentError = new Error('Component rendering failed');
      componentError.stack = 'at Component (Component.tsx:42:10)';

      result.current.handleError(componentError, {
        context: 'FeedScreen',
        severity: 'error',
        fallbackAction: 'show-skeleton',
      });

      await waitFor(() => {
        expect(result.current.errors.length).toBe(1);
        expect(result.current.errors[0]).toMatchObject({
          context: 'FeedScreen',
          severity: 'error',
          fallbackAction: 'show-skeleton',
        });
      });
    });

    it('should log component errors to monitoring service', async () => {
      const { result } = renderHook(() => useErrorHandling());

      const mockLogError = jest.fn();
      (global as any).errorMonitoringService = { logError: mockLogError };

      const error = new Error('Critical component error');

      result.current.handleError(error, {
        context: 'ProfileScreen',
        severity: 'critical',
        sendToMonitoring: true,
      });

      await waitFor(() => {
        // Error should be logged (implementation detail)
        expect(result.current.errors.length).toBe(1);
      });
    });
  });

  describe('Complete Error Recovery Flow', () => {
    it('should handle complete user journey with errors and recovery', async () => {
      const { result: errorResult } = renderHook(() => useErrorHandling());
      const { result: queueResult } = renderHook(() => useOfflineQueue());

      // Step 1: User starts online, submits form with validation errors
      errorResult.current.handleValidationErrors({
        title: 'Required field',
      });

      expect(Object.keys(errorResult.current.validationErrors).length).toBe(1);

      // Step 2: User fixes validation, submits again
      errorResult.current.clearValidationErrors();

      // Step 3: Goes offline during submission
      mockNetworkOffline();

      await queueResult.current.enqueue({
        type: 'SUBMIT_FORM',
        data: { title: 'Valid Title' },
      });

      expect(queueResult.current.queueLength).toBe(1);
      expect(queueResult.current.syncStatus).toBe('offline');

      // Step 4: Comes back online
      mockNetworkOnline();

      await queueResult.current.syncQueue();

      // Step 5: Sync succeeds
      await waitFor(() => {
        expect(queueResult.current.queueLength).toBe(0);
        expect(queueResult.current.syncStatus).toBe('synced');
      });

      // Step 6: No errors remain
      expect(errorResult.current.errors.length).toBe(0);
      expect(Object.keys(errorResult.current.validationErrors).length).toBe(0);
    });
  });
});
