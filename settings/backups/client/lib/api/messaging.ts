import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080';

// Types
export type Message = {
  id: string;
  tenant_id: string;
  sender_id: string;
  recipient_id?: string;
  group_id?: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  content: string;
  media_url?: string;
  metadata?: Record<string, any>;
  read_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  tenant_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channels: string[];
  metadata?: Record<string, any>;
  read_at?: string;
  sent_at?: string;
  created_at: string;
};

// WebSocket connection state
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();
const reconnectDelay = 3000;
const heartbeatInterval = 30000;

// Get auth token
async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('auth_token');
}

// WebSocket connection management
export const websocket = {
  connect: async (onOpen?: () => void, onError?: (error: Event) => void) => {
    if (ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      console.error('No auth token available');
      return;
    }

    try {
      ws = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        onOpen?.();
        
        // Start heartbeat
        websocket.startHeartbeat();
        
        // Clear reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);

          // Emit to all listeners for this event type
          const eventListeners = listeners.get(data.type);
          if (eventListeners) {
            eventListeners.forEach((callback) => callback(data));
          }

          // Also emit to 'message' listeners for all messages
          const messageListeners = listeners.get('message');
          if (messageListeners) {
            messageListeners.forEach((callback) => callback(data));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        websocket.stopHeartbeat();
        
        // Attempt to reconnect
        reconnectTimer = setTimeout(() => {
          console.log('Attempting to reconnect...');
          websocket.connect(onOpen, onError);
        }, reconnectDelay);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  },

  disconnect: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    websocket.stopHeartbeat();

    if (ws) {
      ws.close();
      ws = null;
    }
  },

  send: (data: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  },

  subscribe: (eventType: string, callback: (data: any) => void) => {
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.get(eventType)?.delete(callback);
    };
  },

  isConnected: (): boolean => {
    return ws?.readyState === WebSocket.OPEN;
  },

  startHeartbeat: () => {
    websocket.stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  },

  stopHeartbeat: () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  },
};

// HTTP API client
async function request(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Messaging API
export const messagingApi = {
  // Direct messages
  sendDirectMessage: async (recipientId: string, content: string, mediaUrl?: string) => {
    return request('/messages/direct', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: recipientId,
        content,
        message_type: mediaUrl ? 'image' : 'text',
        media_url: mediaUrl,
      }),
    });
  },

  getDirectMessages: async (userId: string, page = 1, limit = 50) => {
    return request(`/messages/users/${userId}?page=${page}&limit=${limit}`);
  },

  // Group messages
  sendGroupMessage: async (groupId: string, content: string, mediaUrl?: string) => {
    return request(`/messages/groups/${groupId}`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        message_type: mediaUrl ? 'image' : 'text',
        media_url: mediaUrl,
      }),
    });
  },

  getGroupMessages: async (groupId: string, page = 1, limit = 50) => {
    return request(`/messages/groups/${groupId}?page=${page}&limit=${limit}`);
  },

  // Message operations
  getMessage: async (messageId: string) => {
    return request(`/messages/${messageId}`);
  },

  markAsRead: async (messageId: string) => {
    return request(`/messages/${messageId}/read`, { method: 'POST' });
  },

  markMultipleAsRead: async (messageIds: string[]) => {
    return request('/messages/read', {
      method: 'POST',
      body: JSON.stringify({ message_ids: messageIds }),
    });
  },

  deleteMessage: async (messageId: string) => {
    return request(`/messages/${messageId}`, { method: 'DELETE' });
  },

  getUnreadCount: async () => {
    return request('/messages/unread/count');
  },

  getThreads: async (page = 1, limit = 20) => {
    return request(`/messages/threads?page=${page}&limit=${limit}`);
  },

  searchMessages: async (keyword: string, page = 1, limit = 50) => {
    return request(`/messages/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`);
  },

  getStats: async () => {
    return request('/messages/stats');
  },

  // Typing indicator
  setTyping: async (recipientId?: string, groupId?: string) => {
    return request('/messages/typing', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: recipientId,
        group_id: groupId,
      }),
    });
  },

  // Groups
  createGroup: async (name: string, groupType: 'private' | 'public', maxMembers = 100) => {
    return request('/groups', {
      method: 'POST',
      body: JSON.stringify({
        name,
        group_type: groupType,
        max_members: maxMembers,
      }),
    });
  },

  getGroup: async (groupId: string) => {
    return request(`/groups/${groupId}`);
  },

  getUserGroups: async (page = 1, limit = 20) => {
    return request(`/groups?page=${page}&limit=${limit}`);
  },

  addGroupMember: async (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member' = 'member') => {
    return request(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  },

  removeGroupMember: async (groupId: string, userId: string) => {
    return request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  updateMemberRole: async (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member') => {
    return request(`/groups/${groupId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  getGroupMembers: async (groupId: string, page = 1, limit = 50) => {
    return request(`/groups/${groupId}/members?page=${page}&limit=${limit}`);
  },

  leaveGroup: async (groupId: string) => {
    return request(`/groups/${groupId}/leave`, { method: 'POST' });
  },
};

// Notifications API
export const notificationsApi = {
  getNotifications: async (unreadOnly = false, page = 1, limit = 20) => {
    return request(`/notifications?${unreadOnly ? 'unread=true&' : ''}page=${page}&limit=${limit}`);
  },

  getNotification: async (notificationId: string) => {
    return request(`/notifications/${notificationId}`);
  },

  markAsRead: async (notificationId: string) => {
    return request(`/notifications/${notificationId}/read`, { method: 'POST' });
  },

  markAllAsRead: async () => {
    return request('/notifications/read-all', { method: 'POST' });
  },

  deleteNotification: async (notificationId: string) => {
    return request(`/notifications/${notificationId}`, { method: 'DELETE' });
  },

  getUnreadCount: async () => {
    return request('/notifications/unread/count');
  },

  getStats: async () => {
    return request('/notifications/stats');
  },

  // Settings
  getSettings: async () => {
    return request('/notifications/settings');
  },

  updateSettings: async (settings: {
    channels?: {
      email?: boolean;
      push?: boolean;
      in_app?: boolean;
      sms?: boolean;
    };
    preferences?: Record<string, boolean>;
    quiet_hours?: {
      enabled?: boolean;
      start?: string;
      end?: string;
      timezone?: string;
    };
  }) => {
    return request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // FCM tokens
  registerFCMToken: async (token: string, deviceType: 'ios' | 'android' | 'web', deviceId: string) => {
    return request('/notifications/fcm/register', {
      method: 'POST',
      body: JSON.stringify({
        token,
        device_type: deviceType,
        device_id: deviceId,
      }),
    });
  },

  unregisterFCMToken: async (token: string) => {
    return request('/notifications/fcm/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  getFCMTokens: async () => {
    return request('/notifications/fcm/tokens');
  },

  sendTestNotification: async () => {
    return request('/notifications/test', { method: 'POST' });
  },
};

// Upload file helper
export async function uploadFile(file: {
  uri: string;
  type: string;
  name: string;
}): Promise<string> {
  const token = await getAuthToken();
  const formData = new FormData();
  
  formData.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('File upload failed');
  }

  const data = await response.json();
  return data.url;
}
