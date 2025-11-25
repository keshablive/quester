import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi, websocket } from '../api/messaging';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface Notification {
  id: string;
  user_id: string;
  tenant_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read_at?: string;
  created_at: string;
  icon?: string;
  image_url?: string;
}

interface NotificationSettings {
  channels: {
    email: boolean;
    push: boolean;
    in_app: boolean;
    sms: boolean;
  };
  preferences: Record<string, boolean>;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

interface UseNotificationsOptions {
  autoSubscribe?: boolean;
  enablePushNotifications?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoSubscribe = true, enablePushNotifications = true } = options;

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Push notification state
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [fcmRegistered, setFcmRegistered] = useState(false);

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!enablePushNotifications || !Device.isDevice) {
      console.warn('Push notifications not available on simulator/emulator');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      const token = tokenData.data;
      setExpoPushToken(token);

      // Register with backend
      const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const deviceId = Constants.deviceId || Device.modelName || 'unknown';

      await notificationsApi.registerFCMToken(token, deviceType, deviceId);
      setFcmRegistered(true);

      console.log('Push notifications registered:', token);
      return token;
    } catch (error) {
      console.error('Error registering push notifications:', error);
      return null;
    }
  }, [enablePushNotifications]);

  // Unregister push notifications
  const unregisterPushNotifications = useCallback(async () => {
    if (expoPushToken) {
      try {
        await notificationsApi.unregisterFCMToken(expoPushToken);
        setFcmRegistered(false);
        setExpoPushToken(null);
        console.log('Push notifications unregistered');
      } catch (error) {
        console.error('Error unregistering push notifications:', error);
      }
    }
  }, [expoPushToken]);

  // Subscribe to WebSocket notifications
  const subscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      console.warn('Already subscribed to notifications');
      return;
    }

    const unsubscribe = websocket.subscribe('notification', (data: any) => {
      if (data.type === 'notification') {
        const newNotification: Notification = data.payload;
        
        // Add to notifications list
        setNotifications((prev) => [newNotification, ...prev]);
        
        // Update unread count
        setUnreadCount((prev) => prev + 1);

        // Show local notification if app is in foreground
        if (enablePushNotifications) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: newNotification.title,
              body: newNotification.message,
              data: newNotification.data,
            },
            trigger: null, // Show immediately
          });
        }
      }
    });

    unsubscribeRef.current = unsubscribe;
  }, [enablePushNotifications]);

  // Unsubscribe from WebSocket notifications
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (unreadOnly = false, pageNum = 1) => {
      setIsLoading(true);
      try {
        const response = await notificationsApi.getNotifications(unreadOnly, pageNum);
        
        if (pageNum === 1) {
          setNotifications(response.notifications || []);
        } else {
          setNotifications((prev) => [...prev, ...(response.notifications || [])]);
        }

        setHasMore(response.has_more || false);
        setPage(pageNum);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const response = await notificationsApi.getSettings();
      setSettings(response);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      throw error;
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationsApi.markAsRead(notificationId);
        
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, read_at: new Date().toISOString() }
              : notif
          )
        );
        
        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    []
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      
      // Update local state
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read_at: notif.read_at || now }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      
      // Remove from local state
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && !notification.read_at) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((notif) => notif.id !== notificationId);
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>) => {
      setIsLoadingSettings(true);
      try {
        await notificationsApi.updateSettings(newSettings);
        
        // Update local state
        setSettings((prev) => (prev ? { ...prev, ...newSettings } : null));
      } catch (error) {
        console.error('Error updating notification settings:', error);
        throw error;
      } finally {
        setIsLoadingSettings(false);
      }
    },
    []
  );

  // Load more notifications
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchNotifications(false, page + 1);
    }
  }, [isLoading, hasMore, page, fetchNotifications]);

  // Refresh notifications
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchNotifications(false, 1),
      fetchUnreadCount(),
    ]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Setup notification handlers
  useEffect(() => {
    if (!enablePushNotifications) return;

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        console.log('Notification response:', response);
        
        // Handle notification tap
        const data = response.notification.request.content.data;
        if (data) {
          // You can navigate to specific screen based on notification data
          console.log('Notification data:', data);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [enablePushNotifications]);

  // Auto-subscribe and register on mount
  useEffect(() => {
    if (autoSubscribe) {
      subscribe();
    }

    if (enablePushNotifications && !fcmRegistered) {
      registerForPushNotifications();
    }

    return () => {
      unsubscribe();
    };
  }, [autoSubscribe, enablePushNotifications, fcmRegistered, subscribe, unsubscribe, registerForPushNotifications]);

  // Fetch initial data
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    fetchSettings();
  }, [fetchNotifications, fetchUnreadCount, fetchSettings]);

  return {
    // Notifications
    notifications,
    unreadCount,
    settings,

    // Loading states
    isLoading,
    isLoadingSettings,
    hasMore,

    // Push notifications
    expoPushToken,
    fcmRegistered,
    registerForPushNotifications,
    unregisterPushNotifications,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    fetchSettings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    loadMore,
    refresh,

    // Subscription
    subscribe,
    unsubscribe,
  };
}
