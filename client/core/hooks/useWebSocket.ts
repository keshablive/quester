import { useEffect, useState } from 'react';
import { webSocketService, WS_MESSAGE_TYPES } from '../services/websocket.service';

/**
 * Hook to use WebSocket connection
 */
export function useWebSocket(token?: string) {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        webSocketService.connect(token);

        const checkConnection = setInterval(() => {
            setIsConnected(webSocketService.isConnected());
        }, 1000);

        return () => {
            clearInterval(checkConnection);
            webSocketService.disconnect();
        };
    }, [token]);

    return {
        isConnected,
        send: webSocketService.send.bind(webSocketService),
        on: webSocketService.on.bind(webSocketService),
    };
}

/**
 * Hook to listen for real-time notifications
 */
export function useRealtimeNotifications(onNotification: (notification: any) => void) {
    useEffect(() => {
        const unsubscribe = webSocketService.on(WS_MESSAGE_TYPES.NOTIFICATION, onNotification);
        return unsubscribe;
    }, [onNotification]);
}

/**
 * Hook to listen for real-time messages
 */
export function useRealtimeMessages(onMessage: (message: any) => void) {
    useEffect(() => {
        const unsubscribe = webSocketService.on(WS_MESSAGE_TYPES.MESSAGE, onMessage);
        return unsubscribe;
    }, [onMessage]);
}

/**
 * Hook to handle typing indicators
 */
export function useTypingIndicator() {
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = webSocketService.on(WS_MESSAGE_TYPES.TYPING, (data: { userId: string; isTyping: boolean }) => {
            setTypingUsers((prev) => {
                const next = new Set(prev);
                if (data.isTyping) {
                    next.add(data.userId);
                } else {
                    next.delete(data.userId);
                }
                return next;
            });
        });

        return unsubscribe;
    }, []);

    const setTyping = (userId: string, isTyping: boolean) => {
        webSocketService.send(WS_MESSAGE_TYPES.TYPING, { userId, isTyping });
    };

    return {
        typingUsers: Array.from(typingUsers),
        setTyping,
    };
}

/**
 * Hook to track online users
 */
export function useOnlineUsers() {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribeOnline = webSocketService.on(WS_MESSAGE_TYPES.USER_ONLINE, (data: { userId: string }) => {
            setOnlineUsers((prev) => new Set(prev).add(data.userId));
        });

        const unsubscribeOffline = webSocketService.on(WS_MESSAGE_TYPES.USER_OFFLINE, (data: { userId: string }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.delete(data.userId);
                return next;
            });
        });

        return () => {
            unsubscribeOnline();
            unsubscribeOffline();
        };
    }, []);

    return Array.from(onlineUsers);
}
