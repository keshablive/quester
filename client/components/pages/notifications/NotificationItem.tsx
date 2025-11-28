import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { Bell, Heart, MessageCircle, UserPlus, Trophy, CheckCircle, Trash2 } from 'lucide-react-native';
import { cn } from '@/core';
import { NotificationItemProps } from './types';

export function NotificationItem({ notification, onPress, onMarkRead, onDelete }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart size={20} className="text-red-500" />;
      case 'comment':
        return <MessageCircle size={20} className="text-blue-500" />;
      case 'follow':
        return <UserPlus size={20} className="text-green-500" />;
      case 'achievement':
        return <Trophy size={20} className="text-yellow-500" />;
      default:
        return <Bell size={20} className="text-muted-foreground" />;
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diff = now.getTime() - notifDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <Pressable
      className={cn(
        "flex-row items-start p-4 border-b border-border",
        !notification.read && "bg-primary/5"
      )}
      onPress={() => onPress?.(notification.id)}
    >
      <View className="w-10 h-10 rounded-full bg-card items-center justify-center mr-3 border border-border">
        {getIcon()}
      </View>

      <View className="flex-1">
        <Text className={cn(
          "text-base mb-1",
          notification.read ? "text-muted-foreground" : "text-foreground font-semibold"
        )}>
          {notification.title}
        </Text>
        <Text className="text-sm text-muted-foreground mb-2">
          {notification.message}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {formatTime(notification.createdAt)}
        </Text>
      </View>

      <View className="flex-row gap-2 ml-2">
        {!notification.read && (
          <Pressable
            className="w-8 h-8 items-center justify-center rounded-full bg-primary/10"
            onPress={() => onMarkRead?.(notification.id)}
          >
            <CheckCircle size={16} className="text-primary" />
          </Pressable>
        )}
        <Pressable
          className="w-8 h-8 items-center justify-center rounded-full bg-destructive/10"
          onPress={() => onDelete?.(notification.id)}
        >
          <Trash2 size={16} className="text-destructive" />
        </Pressable>
      </View>
    </Pressable>
  );
}
