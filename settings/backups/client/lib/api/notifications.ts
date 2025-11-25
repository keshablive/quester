import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Types
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

export type NotificationSettings = {
  in_app: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
  notification_types?: {
    [key: string]: boolean;
  };
};

export type NotificationStats = {
  total: number;
  unread: number;
  by_type: {
    [key: string]: number;
  };
  by_priority: {
    [key: string]: number;
  };
};

// Get auth token
async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('auth_token');
}

// HTTP request helper
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

/**
 * Notifications API client
 */
export const notificationsApi = {
  /**
   * Get notifications with optional filters
   */
  getNotifications: async (params: {
    unread_only?: boolean;
    notification_type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const {
      unread_only = false,
      notification_type,
      priority,
      page = 1,
      limit = 20,
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(unread_only && { unread: 'true' }),
      ...(notification_type && { type: notification_type }),
      ...(priority && { priority }),
    });

    return request(`/notifications?${queryParams}`);
  },

  /**
   * Get single notification by ID
   */
  getNotification: async (notificationId: string) => {
    return request(`/notifications/${notificationId}`);
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    return request('/notifications/unread/count');
  },

  /**
   * Get notification statistics
   */
  getStats: async (): Promise<NotificationStats> => {
    return request('/notifications/stats');
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: string) => {
    return request(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    return request('/notifications/read-all', {
      method: 'POST',
    });
  },

  /**
   * Delete notification
   */
  deleteNotification: async (notificationId: string) => {
    return request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get notification settings
   */
  getSettings: async (): Promise<NotificationSettings> => {
    return request('/notifications/settings');
  },

  /**
   * Update notification settings
   */
  updateSettings: async (settings: Partial<NotificationSettings>) => {
    return request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  /**
   * Register FCM token for push notifications
   */
  registerFCMToken: async (token: string, deviceInfo?: {
    platform?: string;
    device_model?: string;
    os_version?: string;
    app_version?: string;
  }) => {
    return request('/notifications/fcm/register', {
      method: 'POST',
      body: JSON.stringify({
        token,
        ...deviceInfo,
      }),
    });
  },

  /**
   * Unregister FCM token
   */
  unregisterFCMToken: async (token: string) => {
    return request('/notifications/fcm/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  /**
   * Get user's registered FCM tokens
   */
  getFCMTokens: async () => {
    return request('/notifications/fcm/tokens');
  },

  /**
   * Send test notification (development only)
   */
  sendTestNotification: async (params: {
    title: string;
    message: string;
    notification_type?: string;
    priority?: string;
    action_url?: string;
  }) => {
    return request('/notifications/test', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
