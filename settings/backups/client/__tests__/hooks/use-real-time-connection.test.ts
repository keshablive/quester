/**
 * useRealTimeConnection Hook Tests (T151A)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 * 
 * Tests for WebSocket connection hook including:
 * - Connection lifecycle management
 * - Event subscriptions and cleanup
 * - Error handling and recovery
 * - State management
 * - Auto-reconnect logic
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRealTimeConnection } from '@/lib/hooks/use-real-time-connection';
import { WebSocketService } from '@/lib/services/websocket-service';

// Mock WebSocket service
jest.mock('@/lib/services/websocket-service');

describe('useRealTimeConnection', () => {
  let mockWebSocket: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock WebSocket instance
    mockWebSocket = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      getStatus: jest.fn().mockReturnValue('disconnected'),
      on: jest.fn(),
      off: jest.fn(),
      send: jest.fn(),
      emit: jest.fn(),
    } as any;

    (WebSocketService as jest.MockedClass<typeof WebSocketService>).mockImplementation(() => mockWebSocket);
  });

  describe('Connection Lifecycle', () => {
    test('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('should connect to WebSocket server', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        await result.current.connect();
      });

      expect(mockWebSocket.connect).toHaveBeenCalled();
    });

    test('should update state when connected', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      // Simulate connection
      await act(async () => {
        mockWebSocket.getStatus.mockReturnValue('connecting');
        await result.current.connect();
        
        // Trigger connected event
        const onCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'connected');
        if (onCall) {
          mockWebSocket.getStatus.mockReturnValue('connected');
          onCall[1]({});
        }
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });

    test('should disconnect from WebSocket server', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        await result.current.connect();
        result.current.disconnect();
      });

      expect(mockWebSocket.disconnect).toHaveBeenCalled();
    });

    test('should update state when disconnected', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        await result.current.connect();
        
        // Trigger disconnected event
        const onCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'disconnected');
        if (onCall) {
          mockWebSocket.getStatus.mockReturnValue('disconnected');
          onCall[1]({ reason: 'client disconnect' });
        }
      });

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });

    test('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        await result.current.connect();
      });

      unmount();

      expect(mockWebSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Event Subscriptions', () => {
    test('should subscribe to events', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));
      const handler = jest.fn();

      await act(async () => {
        await result.current.connect();
        result.current.on('message', handler);
      });

      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('should unsubscribe from events', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));
      const handler = jest.fn();

      await act(async () => {
        await result.current.connect();
        result.current.on('message', handler);
        result.current.off('message', handler);
      });

      expect(mockWebSocket.off).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('should handle multiple subscribers for same event', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      await act(async () => {
        await result.current.connect();
        result.current.on('message', handler1);
        result.current.on('message', handler2);
      });

      expect(mockWebSocket.on).toHaveBeenCalledTimes(6); // connected, disconnected, error, reconnecting + 2x message
    });

    test('should emit events to server', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));
      const data = { content: 'Hello' };

      await act(async () => {
        await result.current.connect();
        mockWebSocket.getStatus.mockReturnValue('connected');
        result.current.emit('chat:message', data);
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith('chat:message', data);
    });

    test('should not emit when disconnected', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      act(() => {
        result.current.emit('chat:message', { content: 'Hello' });
      });

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    test('should cleanup event listeners on unmount', async () => {
      const { result, unmount } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));
      const handler = jest.fn();

      await act(async () => {
        await result.current.connect();
        result.current.on('message', handler);
      });

      unmount();

      expect(mockWebSocket.off).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockWebSocket.connect.mockRejectedValue(error);

      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        try {
          await result.current.connect();
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.connectionState).toBe('disconnected');
    });

    test('should handle runtime errors', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));
      const error = new Error('Runtime error');

      await act(async () => {
        await result.current.connect();
        
        // Trigger error event
        const onCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'error');
        if (onCall) {
          onCall[1](error);
        }
      });

      expect(result.current.error).toEqual(error);
    });

    test('should clear error on successful reconnect', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));
      const error = new Error('Connection failed');

      await act(async () => {
        await result.current.connect();
        
        // Trigger error
        const errorCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'error');
        if (errorCall) {
          errorCall[1](error);
        }

        // Trigger reconnect success
        const connectedCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'connected');
        if (connectedCall) {
          mockWebSocket.getStatus.mockReturnValue('connected');
          connectedCall[1]({});
        }
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Reconnection Logic', () => {
    test('should update state when reconnecting', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        await result.current.connect();
        
        // Trigger reconnecting event
        const onCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'reconnecting');
        if (onCall) {
          mockWebSocket.getStatus.mockReturnValue('reconnecting');
          onCall[1]({ attempt: 1 });
        }
      });

      expect(result.current.connectionState).toBe('reconnecting');
      expect(result.current.isConnected).toBe(false);
    });

    test('should track reconnection attempts', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        await result.current.connect();
        
        // Trigger multiple reconnect attempts
        const onCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'reconnecting');
        if (onCall) {
          mockWebSocket.getStatus.mockReturnValue('reconnecting');
          onCall[1]({ attempt: 1 });
          onCall[1]({ attempt: 2 });
          onCall[1]({ attempt: 3 });
        }
      });

      expect(result.current.connectionState).toBe('reconnecting');
    });
  });

  describe('Connection State Management', () => {
    test('should not connect if already connecting', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        // First connect
        mockWebSocket.getStatus.mockReturnValue('disconnected');
        await result.current.connect();
        
        // Now set to connecting and try again
        mockWebSocket.getStatus.mockReturnValue('connecting');
        await result.current.connect(); // Should not call connect again
      });

      expect(mockWebSocket.connect).toHaveBeenCalledTimes(1);
    });

    test('should not connect if already connected', async () => {
      mockWebSocket.getStatus
        .mockReturnValueOnce('disconnected')
        .mockReturnValue('connected');
      
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      await act(async () => {
        await result.current.connect();
        await result.current.connect(); // Try to connect again
      });

      expect(mockWebSocket.connect).toHaveBeenCalledTimes(1);
    });

    test('should provide isConnected helper', async () => {
      const { result } = renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      expect(result.current.isConnected).toBe(false);

      await act(async () => {
        await result.current.connect();
        const onCall = mockWebSocket.on.mock.calls.find(call => call[0] === 'connected');
        if (onCall) {
          mockWebSocket.getStatus.mockReturnValue('connected');
          onCall[1]({});
        }
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Auto-connect on Mount', () => {
    test('should auto-connect when enabled', async () => {
      mockWebSocket.getStatus.mockReturnValue('disconnected');
      
      renderHook(() => useRealTimeConnection('ws://localhost:3000', { autoConnect: true }));

      await waitFor(() => {
        expect(mockWebSocket.connect).toHaveBeenCalled();
      });
    });

    test('should not auto-connect when disabled', async () => {
      mockWebSocket.getStatus.mockReturnValue('disconnected');
      
      renderHook(() => useRealTimeConnection('ws://localhost:3000', { autoConnect: false }));

      // Wait a bit to ensure no connection attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockWebSocket.connect).not.toHaveBeenCalled();
    });

    test('should not auto-connect by default', () => {
      renderHook(() => useRealTimeConnection('ws://localhost:3000'));

      expect(mockWebSocket.connect).not.toHaveBeenCalled();
    });
  });
});
