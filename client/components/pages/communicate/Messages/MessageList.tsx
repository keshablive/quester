import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Icon } from '@/components/ui';
import { MessageSquare } from 'lucide-react-native';
import { MessageItem } from './MessageItem';
import type { Message } from './types';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <View className="items-center justify-center py-12">
        <Icon as={MessageSquare} size={64} className="text-muted-foreground/50 mb-4" />
        <Text className="text-lg font-semibold">No messages yet</Text>
        <Text className="text-muted-foreground text-center mt-2">
          When you receive messages, they'll appear here
        </Text>
      </View>
    );
  }

  return (
    <Card>
      {messages.map((message, index) => (
        <MessageItem 
          key={index} 
          message={message} 
          isLast={index === messages.length - 1} 
        />
      ))}
    </Card>
  );
}
