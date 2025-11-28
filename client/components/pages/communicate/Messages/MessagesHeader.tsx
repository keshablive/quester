import * as React from 'react';
import { View } from 'react-native';
import { Text, Badge } from '@/components/ui';

interface MessagesHeaderProps {
  unreadCount: number;
}

export function MessagesHeader({ unreadCount }: MessagesHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View>
        <Text className="text-3xl font-bold">Messages</Text>
        <Text className="text-muted-foreground">
          {unreadCount} unread messages
        </Text>
      </View>
      <Badge variant="default" className="px-3 py-1">
        <Text className="text-primary-foreground font-semibold">
          {unreadCount}
        </Text>
      </Badge>
    </View>
  );
}
