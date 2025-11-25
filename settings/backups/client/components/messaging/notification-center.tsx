import * as React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Bell, X } from 'lucide-react-native';
import type { Notification } from '@/lib/api/messaging';

export type NotificationCenterProps = {
  notifications: Notification[];
  unreadCount: number;
  onNotificationPress: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
  className?: string;
};

type NotificationItemProps = {
  notification: Notification;
  onPress: () => void;
  onMarkAsRead: () => void;
};

function NotificationItem({ notification, onPress, onMarkAsRead }: NotificationItemProps) {
  const isUnread = !notification.read_at;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Pressable
      onPress={onPress}
      className={`border-b border-border px-4 py-3 ${isUnread ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-card'}`}>
      <View className="flex-row items-start">
        {/* Priority indicator */}
        <View
          className={`mt-1.5 h-2 w-2 rounded-full ${getPriorityColor(notification.priority)}`}
        />

        {/* Content */}
        <View className="ml-3 flex-1">
          <Text className={`text-sm ${isUnread ? 'font-semibold' : 'font-normal'} text-foreground`}>
            {notification.title}
          </Text>
          <Text variant="small" className="mt-0.5 text-muted-foreground" numberOfLines={2}>
            {notification.message}
          </Text>
          <Text variant="small" className="mt-1 text-muted-foreground">
            {getTimeAgo(notification.created_at)}
          </Text>
        </View>

        {/* Mark as read button */}
        {isUnread && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            className="ml-2 p-1">
            <View className="h-2 w-2 rounded-full bg-blue-500" />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export function NotificationCenter({
  notifications,
  unreadCount,
  onNotificationPress,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  className,
}: NotificationCenterProps) {
  return (
    <View className={`flex-1 bg-background ${className || ''}`}>
      {/* Header */}
      <View className="border-b border-border bg-card px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Bell size={20} color="#6366F1" />
            <Text variant="h3" className="ml-2">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View className="ml-2 rounded-full bg-red-500 px-2 py-0.5">
                <Text variant="small" className="font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center space-x-3">
            {unreadCount > 0 && (
              <Pressable onPress={onMarkAllAsRead}>
                <Text variant="small" className="font-medium text-primary">
                  Mark all read
                </Text>
              </Pressable>
            )}
            <Pressable onPress={onClose}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Notifications list */}
      <ScrollView className="flex-1">
        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Bell size={48} color="#9CA3AF" />
            <Text className="mt-4 text-center text-muted-foreground">No notifications yet</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onPress={() => onNotificationPress(notification)}
              onMarkAsRead={() => onMarkAsRead(notification.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
