/**
 * Notification Content Component
 *
 * Displays notification list with actions
 */

import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Separator } from '@/components/ui';
import { Bell, MessageSquare } from 'lucide-react-native';
import { Stack } from '@/core';
import { NotificationCard } from './NotificationCard';
import type { NotificationContentProps } from './types';

export function NotificationContent({
  notifications,
  onMarkAsRead,
  onMarkAllRead,
  onViewMessages,
}: NotificationContentProps) {
  if (notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted/30">
          <Bell size={40} className="text-muted-foreground/50" />
        </View>
        <Text className="text-xl font-bold text-foreground">No notifications</Text>
        <Text className="mt-2 text-center text-muted-foreground">
          You're all caught up! Check back later.
        </Text>
      </View>
    );
  }

  return (
    <Stack className="flex-1">
      {/* Messages Button */}
      <View className="px-6 pb-4 pt-2">
        <Button variant="outline" size="lg" onPress={onViewMessages} className="w-full">
          <MessageSquare size={18} className="mr-2" />
          <Text>View All Messages</Text>
        </Button>
      </View>

      <Separator />

      {/* Notifications List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onPress={onMarkAsRead}
          />
        ))}
      </ScrollView>
    </Stack>
  );
}
