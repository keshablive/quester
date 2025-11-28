import * as React from 'react';
import { View } from 'react-native';
import { Text, Avatar, AvatarFallback, Icon } from '@/components/ui';
import { Clock } from 'lucide-react-native';
import type { Message } from './types';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
}

export function MessageItem({ message, isLast }: MessageItemProps) {
  return (
    <View 
      className={`p-4 flex-row items-center gap-3 ${
        !isLast ? 'border-b border-border' : ''
      } ${message.unread ? 'bg-primary/5' : ''}`}
    >
      <Avatar alt={message.sender} className="w-12 h-12">
        <AvatarFallback>
          <Text className="text-sm font-medium">{message.initials}</Text>
        </AvatarFallback>
      </Avatar>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <Text className={`font-semibold ${message.unread ? 'text-foreground' : 'text-foreground'}`}>
            {message.sender}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon as={Clock} size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">
              {message.time}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Text 
            className={`flex-1 text-sm ${
              message.unread ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}
            numberOfLines={1}
          >
            {message.preview}
          </Text>
          {message.unread && (
            <View className="w-2 h-2 bg-primary rounded-full" />
          )}
        </View>
      </View>
    </View>
  );
}
