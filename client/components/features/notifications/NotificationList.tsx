import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { Text } from '@/components/ui';
import { Bell, CheckCheck, Trash2 } from 'lucide-react-native';
import { useNotifications } from '@/core/hooks/queries';
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/core/hooks/mutations';
import { MutationErrorToast } from '@/components/shared';
import { NotificationItem } from './NotificationItem';
import { NotificationListProps } from './types';

/**
 * NotificationList Component
 *
 * Displays notifications with infinite scroll using TanStack Query.
 * US5: Paginated Data with Infinite Scroll
 * US2: Optimistic updates for mark read/delete
 */
export function NotificationList({ onNotificationPress }: NotificationListProps) {
  const [mutationError, setMutationError] = useState<string | null>(null);

  // TanStack Query infinite query for notifications
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useNotifications();

  // Mutations with optimistic updates
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  // Watch mutation errors
  useEffect(() => {
    if (markReadMutation.error) {
      setMutationError(markReadMutation.error.message || 'Failed to mark as read');
    }
  }, [markReadMutation.error]);

  useEffect(() => {
    if (markAllReadMutation.error) {
      setMutationError(markAllReadMutation.error.message || 'Failed to mark all as read');
    }
  }, [markAllReadMutation.error]);

  useEffect(() => {
    if (deleteMutation.error) {
      setMutationError(deleteMutation.error.message || 'Failed to delete notification');
    }
  }, [deleteMutation.error]);

  // Flatten pages into single array
  const notifications = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data?.pages]);

  const hasUnread = useMemo(() => notifications.some((n) => !n.read), [notifications]);

  const handleMarkAsRead = useCallback(
    (id: string) => {
      setMutationError(null);
      markReadMutation.mutate(id);
    },
    [markReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    setMutationError(null);
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      setMutationError(null);
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderHeader = () => (
    <View className="border-b border-border bg-card p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Bell size={24} className="mr-2 text-primary" />
          <Text className="text-2xl font-bold text-foreground">Notifications</Text>
        </View>
        {hasUnread && (
          <Pressable
            className="flex-row items-center rounded-lg bg-primary/10 px-3 py-2"
            onPress={handleMarkAllAsRead}
            disabled={markAllReadMutation.isPending}>
            <CheckCheck size={16} className="mr-1 text-primary" />
            <Text className="text-sm font-semibold text-primary">
              {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Bell size={64} className="mb-4 text-muted-foreground/30" />
      <Text className="mb-2 text-lg font-semibold text-foreground">No notifications</Text>
      <Text className="text-sm text-muted-foreground">You're all caught up!</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" className="text-primary" />
      </View>
    );
  };

  // Initial loading state
  if (isLoading && notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading notifications...</Text>
      </View>
    );
  }

  // Error state
  if (error && notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="mb-4 text-center text-base text-destructive">
          {error.message || 'Failed to load notifications'}
        </Text>
        <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={() => refetch()}>
          <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={onNotificationPress}
            onMarkRead={handleMarkAsRead}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => refetch()}
          />
        }
      />
      <MutationErrorToast
        message={mutationError ?? ''}
        visible={!!mutationError}
        onDismiss={() => setMutationError(null)}
      />
    </View>
  );
}
