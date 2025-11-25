// Feature 003: WebSocket Service for Real-Time Communication

import { io, Socket } from 'socket.io-client';
import { WebSocketConnection } from '@/lib/types/real-time';

type EventCallback = (data: any) => void;
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export class WebSocketService {
  private socket: Socket | null = null;
  private url: string;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.url, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected', {});
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.status = 'disconnected';
          this.stopHeartbeat();
          this.emit('disconnected', { reason });
        });

        this.socket.on('reconnect_attempt', () => {
          this.status = 'reconnecting';
          this.reconnectAttempts++;
          this.emit('reconnecting', { attempt: this.reconnectAttempts });
        });

        this.socket.on('reconnect_failed', () => {
          this.status = 'disconnected';
          this.emit('reconnect_failed', {});
        });

        this.socket.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        // Listen for all server events
        this.socket.onAny((eventName, ...args: any[]) => {
          const listeners = this.eventListeners.get(eventName);
          if (listeners) {
            listeners.forEach(callback => callback(args.length === 1 ? args[0] : args));
          }
        });

      } catch (error) {
        this.status = 'disconnected';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.status = 'disconnected';
    this.stopHeartbeat();
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit an event (for testing purposes)
   */
  emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Send data to server
   */
  send(event: string, data: any): void {
    if (this.socket && this.status === 'connected') {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot send event "${event}": WebSocket not connected`);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.status === 'connected') {
        this.socket.emit('ping');
        this.lastHeartbeat = Date.now();
        this.emit('heartbeat', { timestamp: this.lastHeartbeat });
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get number of reconnection attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Set maximum reconnection attempts
   */
  setMaxReconnectAttempts(max: number): void {
    this.maxReconnectAttempts = max;
  }

  /**
   * Register heartbeat callback (for testing)
   */
  onHeartbeat(callback: EventCallback): void {
    this.on('heartbeat', callback);
  }

  /**
   * Register timeout callback (for testing)
   */
  onTimeout(callback: EventCallback): void {
    this.on('timeout', callback);
  }

  /**
   * Simulate disconnect (for testing)
   */
  simulateDisconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Simulate timeout (for testing)
   */
  simulateTimeout(): void {
    this.emit('timeout', {});
  }

  /**
   * Simulate error (for testing)
   */
  simulateError(error: Error): void {
    this.emit('error', error);
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): WebSocketConnection {
    return {
      id: this.socket?.id || '',
      status: this.status,
      url: this.url,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat || undefined,
    };
  }
}

// Singleton instance
let instance: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!instance) {
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080';
    instance = new WebSocketService(wsUrl);
  }
  return instance;
};
