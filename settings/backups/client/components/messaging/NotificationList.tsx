import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
import { formatSmartTime } from '@/lib/utils/date';
import {
  MessageCircle,
  AtSign,
  Heart,
  MessageSquare,
  UserPlus,
  Award,
  Trophy,
  GraduationCap,
  BookOpen,
  Video,
  Info,
  AlertTriangle,
  AlertCircle,
  Bell,
  CheckCircle,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { useAccessibility } from '@/lib/hooks/use-accessibility';

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

interface NotificationListProps {
  notifications: Notification[];
  onNotificationPress: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  showUnreadOnly?: boolean;
  emptyMessage?: string;
}

export function NotificationList({
  notifications,
  onNotificationPress,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  showUnreadOnly = false,
  emptyMessage = 'No notifications yet',
}: NotificationListProps) {
  const { announceForAccessibility } = useAccessibility();

  // Announce new unread notifications (T102)
  useEffect(() => {
    const unreadNotifications = notifications.filter((n) => !n.read_at);
    if (unreadNotifications.length > 0) {
      const latestUnread = unreadNotifications[0];
      announceForAccessibility(`New notification: ${latestUnread.title}. ${latestUnread.message}`);
    }
  }, [notifications.length, announceForAccessibility]);

  // Get icon component for notification type
  const getNotificationIcon = (type: string): LucideIcon => {
    const iconMap: Record<string, LucideIcon> = {
      message: MessageCircle,
      mention: AtSign,
      like: Heart,
      comment: MessageSquare,
      follow: UserPlus,
      badge_earned: Award,
      achievement: Trophy,
      course_completed: GraduationCap,
      lesson_available: BookOpen,
      stream_started: Video,
      system: Info,
      warning: AlertTriangle,
      error: AlertCircle,
    };

    return iconMap[type] || Bell;
  };

  // Get color for notification type
  const getNotificationColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      message: '#007AFF',
      mention: '#FF9500',
      like: '#FF3B30',
      comment: '#34C759',
      follow: '#5856D6',
      badge_earned: '#FFD700',
      achievement: '#FF9500',
      course_completed: '#34C759',
      lesson_available: '#007AFF',
      stream_started: '#FF2D55',
      system: '#8E8E93',
      warning: '#FF9500',
      error: '#FF3B30',
    };

    return colorMap[type] || '#007AFF';
  };

  // Format notification time
  const formatNotificationTime = (date: Date | string): string => {
    return formatSmartTime(date);
  };

  // Handle notification press
  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read if unread
      if (!notification.read_at && onMarkAsRead) {
        onMarkAsRead(notification.id);
      }

      // Navigate to related screen
      onNotificationPress(notification);
    },
    [onMarkAsRead, onNotificationPress]
  );

  // Render notification item
  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => {
      const isUnread = !item.read_at;
      const notificationDate = new Date(item.created_at);
      const IconComponent = getNotificationIcon(item.type);
      const iconColor = getNotificationColor(item.type);

      return (
        <Pressable
          className={`flex-row items-center border-b border-gray-300 bg-white p-4 ${isUnread ? 'bg-blue-50' : ''}`}
          onPress={() => handleNotificationPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.message}. ${formatNotificationTime(new Date(item.created_at))}${isUnread ? '. Unread' : ''}`}
          accessibilityHint="Double tap to view notification details"
          accessibilityState={{ selected: isUnread }}>
          {/* Unread indicator */}
          {isUnread && (
            <View className="absolute left-2 top-1/2 -mt-1 h-2 w-2 rounded-full bg-blue-500" />
          )}

          {/* Icon or Image */}
          <View
            className="ml-3 h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${iconColor}20` }}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} className="h-12 w-12 rounded-full" />
            ) : (
              <IconComponent size={24} color={iconColor} />
            )}
          </View>

          {/* Content */}
          <View className="ml-3 flex-1">
            <Text variant="h4" className={`mb-1 ${isUnread ? '' : ''}`} numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="small" className="mb-1 leading-[18px] text-gray-600" numberOfLines={2}>
              {item.message}
            </Text>
            <Text variant="small" className="text-gray-400">
              {formatNotificationTime(notificationDate)}
            </Text>
          </View>

          {/* Actions */}
          <View className="ml-2 flex-row items-center">
            {isUnread && (
              <Pressable
                className="mr-2 p-1"
                onPress={(e) => {
                  e.stopPropagation();
                  onMarkAsRead?.(item.id);
                }}
                accessibilityRole="button"
                accessibilityLabel="Mark as read"
                accessibilityHint="Mark this notification as read">
                <CheckCircle size={20} color="#007AFF" />
              </Pressable>
            )}
            <ChevronRight size={20} color="#C7C7CC" />
          </View>
        </Pressable>
      );
    },
    [handleNotificationPress, onMarkAsRead]
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-16">
      <Bell size={64} color="#C7C7CC" />
      <Text variant="p" className="mt-4 text-gray-400">
        {emptyMessage}
      </Text>
    </View>
  );

  // Render header with mark all as read button
  const renderHeader = () => {
    if (notifications.length === 0) return null;

    const unreadCount = notifications.filter((n) => !n.read_at).length;

    if (unreadCount === 0 || !onMarkAllAsRead) return null;

    return (
      <View className="flex-row items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
        <Text variant="small" className="font-semibold text-gray-600">
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </Text>
        <Pressable className="px-2 py-1" onPress={onMarkAllAsRead}>
          <Text variant="small" className="font-semibold text-blue-500">
            Mark all as read
          </Text>
        </Pressable>
      </View>
    );
  };

  // Render footer loader
  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  // Filter notifications if showing unread only
  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.read_at)
    : notifications;

  return (
    <View className="flex-1 bg-gray-100">
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasMore && !isLoading) {
            onLoadMore?.();
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}
