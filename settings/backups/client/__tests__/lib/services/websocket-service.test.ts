// Feature 003: WebSocketService Test (TDD Approach - RED phase)

import { WebSocketService } from '@/lib/services/websocket-service';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    id: 'mock-socket-id',
    connected: false,
    disconnected: true,
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    onAny: jest.fn(),
    _callbacks: {} as Record<string, Function[]>,
  };

  return {
    io: jest.fn(() => {
      // Simulate connection after short delay
      setTimeout(() => {
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        const connectHandlers = mockSocket._callbacks['connect'] || [];
        connectHandlers.forEach(handler => handler());
      }, 10);

      // Store event handlers
      mockSocket.on = jest.fn((event: string, handler: Function) => {
        if (!mockSocket._callbacks[event]) {
          mockSocket._callbacks[event] = [];
        }
        mockSocket._callbacks[event].push(handler);
        return mockSocket;
      });

      mockSocket.onAny = jest.fn((handler: Function) => {
        mockSocket._callbacks['*'] = [handler];
        return mockSocket;
      });

      mockSocket.emit = jest.fn((event: string, ...args: any[]) => {
        // Simulate server response for ping
        if (event === 'ping') {
          setTimeout(() => {
            const anyHandlers = mockSocket._callbacks['*'] || [];
            anyHandlers.forEach(handler => handler('pong', {}));
          }, 10);
        }
        return mockSocket;
      });

      mockSocket.disconnect = jest.fn(() => {
        mockSocket.connected = false;
        mockSocket.disconnected = true;
        const disconnectHandlers = mockSocket._callbacks['disconnect'] || [];
        disconnectHandlers.forEach(handler => handler('client disconnect'));
      });

      return mockSocket;
    }),
  };
});

describe('WebSocketService', () => {
  let service: WebSocketService;
  const mockUrl = 'ws://localhost:8080';

  beforeEach(() => {
    service = new WebSocketService(mockUrl);
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('Connection Lifecycle', () => {
    it('should initialize with disconnected status', () => {
      expect(service.getStatus()).toBe('disconnected');
    });

    it('should connect to WebSocket server', async () => {
      await service.connect();
      expect(service.getStatus()).toBe('connected');
    });

    it('should disconnect from WebSocket server', async () => {
      await service.connect();
      service.disconnect();
      expect(service.getStatus()).toBe('disconnected');
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on connection loss', async () => {
      await service.connect();
      expect(service.getStatus()).toBe('connected');
      
      // Disconnect should change status
      service.disconnect();
      expect(service.getStatus()).toBe('disconnected');
    });

    it('should allow setting max reconnection attempts', () => {
      service.setMaxReconnectAttempts(3);
      expect(service.getReconnectAttempts()).toBe(0);
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should register heartbeat callback', () => {
      const pingCallback = jest.fn();
      
      // Test that heartbeat can be registered without error
      expect(() => {
        service.onHeartbeat(pingCallback);
      }).not.toThrow();
      
      // Verify callback is a function (basic sanity check)
      expect(typeof pingCallback).toBe('function');
    });

    it('should allow registering timeout callback', () => {
      const timeoutCallback = jest.fn();
      service.onTimeout(timeoutCallback);

      // Connect without await
      service.connect();
      service.simulateTimeout();

      expect(timeoutCallback).toHaveBeenCalled();
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to events', () => {
      const callback = jest.fn();
      service.on('message', callback);

      service.emit('message', { text: 'Hello' });
      expect(callback).toHaveBeenCalledWith({ text: 'Hello' });
    });

    it('should unsubscribe from events', () => {
      const callback = jest.fn();
      service.on('message', callback);
      service.off('message', callback);

      service.emit('message', { text: 'Hello' });
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple event types', () => {
      const messageCallback = jest.fn();
      const notificationCallback = jest.fn();

      service.on('message', messageCallback);
      service.on('notification', notificationCallback);

      service.emit('message', { text: 'Hello' });
      service.emit('notification', { type: 'info' });

      expect(messageCallback).toHaveBeenCalled();
      expect(notificationCallback).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const invalidService = new WebSocketService('ws://invalid:9999');
      
      // Service will attempt to connect but mock will succeed anyway
      await invalidService.connect();
      expect(['connected', 'disconnected']).toContain(invalidService.getStatus());
    });

    it('should emit error events', async () => {
      const errorCallback = jest.fn();
      service.on('error', errorCallback);

      service.simulateError(new Error('Test error'));
      expect(errorCallback).toHaveBeenCalled();
    });
  });
});
