import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: string;
}

export interface NotificationSettings {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notificationTypes: {
        likes: boolean;
        comments: boolean;
        follows: boolean;
        messages: boolean;
        achievements: boolean;
        quests: boolean;
    };
}

export const notificationsService = {
    /**
     * Get user notifications
     */
    async getNotifications(page: number = 1, limit: number = 20): Promise<Notification[]> {
        return apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS.BASE}?page=${page}&limit=${limit}`);
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount(): Promise<number> {
        const response: { count: number } = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
        return response.count || 0;
    },

    /**
     * Get notification by ID
     */
    async getNotification(id: string): Promise<Notification> {
        return apiClient.get(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
    },

    /**
     * Mark notification as read
     */
    async markAsRead(id: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    },

    /**
     * Delete notification
     */
    async deleteNotification(id: string): Promise<void> {
        return apiClient.del(API_ENDPOINTS.NOTIFICATIONS.BY_ID(id));
    },

    /**
     * Get notification settings
     */
    async getSettings(): Promise<NotificationSettings> {
        return apiClient.get(API_ENDPOINTS.NOTIFICATIONS.SETTINGS);
    },

    /**
     * Update notification settings
     */
    async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
        return apiClient.put(API_ENDPOINTS.NOTIFICATIONS.SETTINGS, settings);
    },

    /**
     * Register FCM token for push notifications
     */
    async registerFCMToken(token: string, deviceId: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.FCM_REGISTER, { token, deviceId });
    },

    /**
     * Unregister FCM token
     */
    async unregisterFCMToken(deviceId: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.FCM_UNREGISTER, { deviceId });
    },
};
