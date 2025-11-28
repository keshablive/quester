type MessageHandler = (data: any) => void;

interface WebSocketConfig {
    url: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

class WebSocketService {
    private ws: WebSocket | null = null;
    private config: WebSocketConfig;
    private reconnectAttempts = 0;
    private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(config: WebSocketConfig) {
        this.config = {
            reconnectInterval: 5000,
            maxReconnectAttempts: 5,
            ...config,
        };
    }

    /**
     * Connect to WebSocket server
     */
    connect(token?: string): void {
        try {
            const url = token ? `${this.config.url}?token=${token}` : this.config.url;
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.attemptReconnect(token);
            };
        } catch (err) {
            console.error('Failed to connect WebSocket:', err);
            this.attemptReconnect(token);
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Send message to server
     */
    send(type: string, data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        } else {
            console.warn('WebSocket not connected');
        }
    }

    /**
     * Subscribe to message type
     */
    on(type: string, handler: MessageHandler): () => void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.messageHandlers.get(type);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.messageHandlers.delete(type);
                }
            }
        };
    }

    /**
     * Handle incoming message
     */
    private handleMessage(message: { type: string; data: any }): void {
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(message.data);
                } catch (err) {
                    console.error('Error in message handler:', err);
                }
            });
        }
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(token?: string): void {
        if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
            console.error('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect(token);
        }, this.config.reconnectInterval);
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// Create singleton instance
export const webSocketService = new WebSocketService({
    url: 'ws://localhost:8000/ws', // Update with your WebSocket URL
});

// Message type constants
export const WS_MESSAGE_TYPES = {
    NOTIFICATION: 'notification',
    MESSAGE: 'message',
    TYPING: 'typing',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
} as const;
