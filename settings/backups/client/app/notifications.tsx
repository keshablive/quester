import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { Settings, Bell } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationList } from '@/components/messaging/NotificationList';
import { useNotifications } from '@/lib/hooks/useNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    fetchNotifications,
  } = useNotifications({ autoSubscribe: true, enablePushNotifications: true });

  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [_refreshing, _setRefreshing] = useState(false);

  // Handle notification press
  const handleNotificationPress = useCallback(
    (notification: any) => {
      // Mark as read
      if (!notification.read_at) {
        markAsRead(notification.id);
      }

      // Navigate based on notification type
      const { type, data } = notification;

      switch (type) {
        case 'message':
          if (data?.user_id) {
            router.push({
              pathname: '/chat',
              params: {
                type: 'direct',
                id: data.user_id,
                name: data.username || 'Chat',
              },
            });
          } else if (data?.group_id) {
            router.push({
              pathname: '/chat',
              params: {
                type: 'group',
                id: data.group_id,
                name: data.group_name || 'Group Chat',
              },
            });
          }
          break;

        case 'badge_earned':
          if (data?.badge_id) {
            router.push({
              pathname: '/badges/[id]' as any,
              params: { id: data.badge_id },
            } as any);
          }
          break;

        case 'course_completed':
        case 'lesson_available':
          if (data?.course_id) {
            router.push({
              pathname: '/courses/[id]' as any,
              params: { id: data.course_id },
            } as any);
          }
          break;

        case 'stream_started':
          if (data?.stream_id) {
            router.push({
              pathname: '/live-stream/[id]' as any,
              params: { id: data.stream_id },
            } as any);
          }
          break;

        case 'follow':
          if (data?.user_id) {
            router.push({
              pathname: '/profile/[userId]' as any, // Changed from [id] to [userId]
              params: { userId: data.user_id }, // Changed param name
            } as any);
          }
          break;

        default:
          console.log('Unhandled notification type:', type);
      }
    },
    [markAsRead, router]
  );

  // Handle filter toggle
  const handleFilterToggle = useCallback(() => {
    setShowUnreadOnly((prev) => {
      const newValue = !prev;
      fetchNotifications(newValue, 1);
      return newValue;
    });
  }, [fetchNotifications]);

  // Handle settings press
  const handleSettingsPress = () => {
    router.push('/notification-settings');
  };

  // Filter notifications based on unread filter
  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.read_at)
    : notifications;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {/* Filter button */}
          <Pressable
            style={[styles.filterButton, showUnreadOnly && styles.filterButtonActive]}
            onPress={handleFilterToggle}>
            <Ionicons
              name={showUnreadOnly ? 'filter' : 'filter-outline'}
              size={20}
              color={showUnreadOnly ? '#007AFF' : '#666'}
            />
            <Text
              style={[styles.filterButtonText, showUnreadOnly && styles.filterButtonTextActive]}>
              Unread
            </Text>
          </Pressable>

          {/* Settings button */}
          <Pressable style={styles.settingsButton} onPress={handleSettingsPress}>
            <Settings size={24} color="#007AFF" />
          </Pressable>
        </View>
      </View>

      {/* Unread count badge */}
      {unreadCount > 0 && !showUnreadOnly && (
        <View style={styles.unreadBanner}>
          <Bell size={16} color="#007AFF" />
          <Text style={styles.unreadBannerText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <Pressable onPress={markAllAsRead}>
            <Text style={styles.markAllButton}>Mark all as read</Text>
          </Pressable>
        </View>
      )}

      {/* Notifications list */}
      <NotificationList
        notifications={filteredNotifications}
        onNotificationPress={handleNotificationPress}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onLoadMore={loadMore}
        isLoading={isLoading}
        hasMore={hasMore}
        showUnreadOnly={showUnreadOnly}
        emptyMessage={showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#007AFF',
  },
  settingsButton: {
    padding: 4,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
    gap: 8,
  },
  unreadBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  markAllButton: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
