import * as React from 'react';

export type WebSocketMessage = {
  type: string;
  payload: any;
  timestamp?: string;
};

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type UseWebSocketOptions = {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
};

export function useWebSocket({
  url,
  reconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onOpen,
  onClose,
  onError,
  onMessage,
}: UseWebSocketOptions) {
  const [status, setStatus] = React.useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = React.useState<WebSocketMessage | null>(null);
  
  const socketRef = React.useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = React.useRef(0);
  const reconnectTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageHandlersRef = React.useRef<Map<string, Set<(payload: any) => void>>>(new Map());

  const connect = React.useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus('connecting');
      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('[WebSocket] Connected');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      socket.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setStatus('disconnected');
        onClose?.();

        // Attempt reconnection
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[WebSocket] Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setStatus('error');
        onError?.(error);
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);

          // Trigger registered handlers for this message type
          const handlers = messageHandlersRef.current.get(message.type);
          if (handlers) {
            handlers.forEach((handler) => handler(message.payload));
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      socketRef.current = socket;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setStatus('error');
    }
  }, [url, reconnect, reconnectInterval, maxReconnectAttempts, onOpen, onClose, onError, onMessage]);

  const disconnect = React.useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  const send = React.useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, socket is not connected');
    }
  }, []);

  const subscribe = React.useCallback((eventType: string, handler: (payload: any) => void) => {
    if (!messageHandlersRef.current.has(eventType)) {
      messageHandlersRef.current.set(eventType, new Set());
    }
    messageHandlersRef.current.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = messageHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          messageHandlersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Auto-connect on mount
  React.useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    lastMessage,
    send,
    connect,
    disconnect,
    subscribe,
  };
}
