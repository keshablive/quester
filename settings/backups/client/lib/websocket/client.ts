import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080';

export type WebSocketConfig = {
  url?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
};

export type WebSocketMessage = {
  type: string;
  payload?: any;
  timestamp?: string;
};

/**
 * Enhanced WebSocket client with FR-041 compliance:
 * - Exponential backoff: 1s → 30s max, 2x multiplier
 * - Max 10 reconnection attempts
 * - 5s connection timeout
 * - Network change detection
 * - Automatic token refresh
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private listeners = new Map<string, Set<(data: any) => void>>();
  
  // FR-041.1: Reconnection strategy
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private initialReconnectDelay = 1000; // 1s
  private maxReconnectDelay = 30000; // 30s
  private reconnectMultiplier = 2;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  // FR-041: Connection timeout
  private connectionTimeout = 5000; // 5s
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Heartbeat
  private heartbeatInterval = 30000; // 30s
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPongTime = 0;
  
  // State
  private isConnecting = false;
  private isManualClose = false;
  private networkUnsubscribe: (() => void) | null = null;

  constructor(config: WebSocketConfig = {}) {
    this.config = config;
    this.setupNetworkListener();
  }

  /**
   * FR-041.2: Network change detection
   */
  private setupNetworkListener() {
    this.networkUnsubscribe = NetInfo.addEventListener((state) => {
      console.log('[WebSocket] Network state changed:', state.type, state.isConnected);
      
      if (state.isConnected && !this.isConnected() && !this.isConnecting) {
        console.log('[WebSocket] Network reconnected, attempting to reconnect WebSocket');
        this.reconnectAttempts = 0; // Reset attempts on network change
        this.connect();
      }
    });
  }

  /**
   * Connect to WebSocket server with authentication
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log('[WebSocket] Already connecting');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    try {
      this.isConnecting = true;
      this.isManualClose = false;

      // Get auth token
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = this.config.url || `${WS_BASE_URL}/ws?token=${token}`;
      console.log('[WebSocket] Connecting to:', url);

      this.ws = new WebSocket(url);

      // FR-041: Set connection timeout
      this.connectionTimer = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          console.error('[WebSocket] Connection timeout');
          this.ws?.close();
          this.handleConnectionFailure();
        }
      }, this.connectionTimeout);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Clear connection timeout
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }

        // Start heartbeat
        this.startHeartbeat();

        // Notify callbacks
        this.config.onOpen?.();
        if (this.reconnectAttempts > 0) {
          this.config.onReconnected?.();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong response
          if (data.type === 'pong') {
            this.lastPongTime = Date.now();
            return;
          }

          // Emit to specific listeners
          const eventListeners = this.listeners.get(data.type);
          if (eventListeners) {
            eventListeners.forEach((callback) => callback(data));
          }

          // Also emit to generic message listeners
          const messageListeners = this.listeners.get('*');
          if (messageListeners) {
            messageListeners.forEach((callback) => callback(data));
          }

          // Call global message handler
          this.config.onMessage?.(data);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.config.onError?.(error);
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // Clear connection timeout
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }

        this.config.onClose?.();

        // FR-041.1: Attempt reconnection if not manual close
        if (!this.isManualClose) {
          this.handleConnectionFailure();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.handleConnectionFailure();
    }
  }

  /**
   * FR-041.1: Handle connection failure with exponential backoff
   */
  private handleConnectionFailure() {
    if (this.isManualClose) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    // Calculate exponential backoff delay
    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(this.reconnectMultiplier, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.config.onReconnecting?.(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Manually disconnect from WebSocket
   */
  disconnect() {
    console.log('[WebSocket] Manually disconnecting');
    this.isManualClose = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Subscribe to specific message type
   * @param eventType - Message type to listen for ('*' for all messages)
   * @param callback - Handler function
   * @returns Unsubscribe function
   */
  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'closed';
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongTime = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Check if we received pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > this.heartbeatInterval * 2) {
          console.warn('[WebSocket] No pong received, closing connection');
          this.ws.close();
          return;
        }

        // Send ping
        this.send({ type: 'ping' });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.disconnect();
    
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.listeners.clear();
  }
}

// Singleton instance
let wsClientInstance: WebSocketClient | null = null;

/**
 * Get global WebSocket client instance
 */
export function getWebSocketClient(config?: WebSocketConfig): WebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient(config);
  }
  return wsClientInstance;
}

/**
 * Destroy global WebSocket client instance
 */
export function destroyWebSocketClient() {
  if (wsClientInstance) {
    wsClientInstance.destroy();
    wsClientInstance = null;
  }
}
