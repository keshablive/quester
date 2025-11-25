// Feature 003: Real-Time Collaboration Types

export interface WebSocketEvent {
  type: 'message' | 'notification' | 'presence' | 'typing' | 'reaction';
  payload: any;
  timestamp: number;
}

export interface WebSocketConnection {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  url: string;
  reconnectAttempts: number;
  lastHeartbeat?: number;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'message';
  title: string;
  message?: string;
  duration?: number; // milliseconds
  action?: {
    label: string;
    onPress: () => void;
  };
  avatar?: string;
  timestamp: number;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  roomId: string;
  avatar?: string;
  feature: 'chat' | 'comment';
  timestamp: number;
}

export interface OnlinePresence {
  userId: string;
  status: 'online' | 'away' | 'offline' | 'busy';
  lastSeen?: number;
}

export type ReactionType = 'heart' | 'thumbsup' | 'clap' | 'fire' | 'star';
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

export interface LiveReaction {
  id: string;
  type: ReactionType;
  userId: string;
  videoId?: string; // Optional video/stream ID for filtering
  x: number; // position on screen (0-1)
  y: number; // starting y position (0-1)
  timestamp: number;
}

export interface RealTimeState {
  connection: WebSocketConnection;
  notifications: ToastNotification[];
  typingIndicators: TypingIndicator[];
  onlineUsers: OnlinePresence[];
  reactions: LiveReaction[];
}
