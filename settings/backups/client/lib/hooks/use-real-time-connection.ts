/**
 * useRealTimeConnection Hook (T151)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 * 
 * React hook for managing WebSocket connections with automatic
 * lifecycle management, event subscriptions, and error handling.
 * 
 * Features:
 * - Automatic connection/disconnection on mount/unmount
 * - Event subscription management
 * - Connection state tracking
 * - Error handling and recovery
 * - Reconnection state tracking
 * 
 * Usage:
 * ```tsx
 * const {
 *   isConnected,
 *   connectionState,
 *   error,
 *   connect,
 *   disconnect,
 *   on,
 *   off,
 *   emit,
 * } = useRealTimeConnection('ws://localhost:3000', {
 *   autoConnect: true,
 * });
 * 
 * // Subscribe to events
 * useEffect(() => {
 *   const handleMessage = (data) => {
 *     console.log('Message received:', data);
 *   };
 *   
 *   on('chat:message', handleMessage);
 *   
 *   return () => {
 *     off('chat:message', handleMessage);
 *   };
 * }, [on, off]);
 * 
 * // Emit events
 * const sendMessage = (message: string) => {
 *   emit('chat:message', { content: message });
 * };
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketService } from '@/lib/services/websocket-service';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
type EventCallback = (data: any) => void;

interface UseRealTimeConnectionOptions {
  /**
   * Automatically connect on mount
   * @default false
   */
  autoConnect?: boolean;
}

interface UseRealTimeConnectionReturn {
  /**
   * Whether the WebSocket is connected
   */
  isConnected: boolean;

  /**
   * Current connection state
   */
  connectionState: ConnectionStatus;

  /**
   * Last error that occurred
   */
  error: Error | null;

  /**
   * Connect to WebSocket server
   */
  connect: () => Promise<void>;

  /**
   * Disconnect from WebSocket server
   */
  disconnect: () => void;

  /**
   * Subscribe to an event
   */
  on: (event: string, callback: EventCallback) => void;

  /**
   * Unsubscribe from an event
   */
  off: (event: string, callback: EventCallback) => void;

  /**
   * Emit an event to the server
   */
  emit: (event: string, data: any) => void;
}

/**
 * Hook for managing WebSocket real-time connections
 */
export function useRealTimeConnection(
  url: string,
  options: UseRealTimeConnectionOptions = {}
): UseRealTimeConnectionReturn {
  const { autoConnect = false } = options;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  // WebSocket service instance (persistent across renders)
  const wsRef = useRef<WebSocketService | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<EventCallback>>>(new Map());

  // Initialize WebSocket service
  useEffect(() => {
    if (!wsRef.current) {
      wsRef.current = new WebSocketService(url);

      // Set up internal event listeners
      wsRef.current.on('connected', () => {
        setConnectionState('connected');
        setError(null);
      });

      wsRef.current.on('disconnected', () => {
        setConnectionState('disconnected');
      });

      wsRef.current.on('reconnecting', () => {
        setConnectionState('reconnecting');
      });

      wsRef.current.on('error', (err: Error) => {
        setError(err);
      });
    }

    // Auto-connect if enabled
    if (autoConnect && wsRef.current) {
      const ws = wsRef.current;
      const currentStatus = ws.getStatus();
      
      if (currentStatus === 'disconnected') {
        setConnectionState('connecting');
        ws.connect().catch((err) => {
          setError(err);
          setConnectionState('disconnected');
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        // Remove all event listeners
        eventHandlersRef.current.forEach((handlers, event) => {
          handlers.forEach(handler => {
            wsRef.current?.off(event, handler);
          });
        });
        eventHandlersRef.current.clear();

        // Disconnect
        wsRef.current.disconnect();
      }
    };
  }, [url, autoConnect]);

  // Connect function
  const connect = useCallback(async () => {
    if (!wsRef.current) return;

    const currentStatus = wsRef.current.getStatus();
    
    // Don't connect if already connecting or connected
    if (currentStatus === 'connecting' || currentStatus === 'connected') {
      return;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      await wsRef.current.connect();
      setConnectionState(wsRef.current.getStatus() as ConnectionStatus);
    } catch (err) {
      setError(err as Error);
      setConnectionState('disconnected');
      throw err;
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      setConnectionState('disconnected');
    }
  }, []);

  // Subscribe to event
  const on = useCallback((event: string, callback: EventCallback) => {
    if (!wsRef.current) return;

    // Track handlers for cleanup
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(callback);

    // Subscribe to WebSocket event
    wsRef.current.on(event, callback);
  }, []);

  // Unsubscribe from event
  const off = useCallback((event: string, callback: EventCallback) => {
    if (!wsRef.current) return;

    // Remove from tracked handlers
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(event);
      }
    }

    // Unsubscribe from WebSocket event
    wsRef.current.off(event, callback);
  }, []);

  // Emit event to server
  const emit = useCallback((event: string, data: any) => {
    if (!wsRef.current) return;

    const currentStatus = wsRef.current.getStatus();
    
    if (currentStatus === 'connected') {
      wsRef.current.send(event, data);
    } else {
      console.warn(`Cannot emit event "${event}": WebSocket not connected (status: ${currentStatus})`);
    }
  }, []);

  // Compute isConnected
  const isConnected = connectionState === 'connected';

  return {
    isConnected,
    connectionState,
    error,
    connect,
    disconnect,
    on,
    off,
    emit,
  };
}
