import * as React from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import type { Message } from '@/lib/api/messaging';

export type MessageListProps = {
  messages: Message[];
  currentUserId: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
};

type MessageItemProps = {
  message: Message;
  isOwnMessage: boolean;
  showTimestamp?: boolean;
};

function MessageItem({ message, isOwnMessage, showTimestamp = true }: MessageItemProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View className={`mb-3 flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <View className="max-w-[75%]">
        {/* Message bubble */}
        <View
          className={`rounded-2xl px-4 py-2.5 ${
            isOwnMessage ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-muted'
          }`}>
          <Text
            className={`text-base ${isOwnMessage ? 'text-primary-foreground' : 'text-foreground'}`}>
            {message.content}
          </Text>
        </View>

        {/* Timestamp and read status */}
        {showTimestamp && (
          <View
            className={`mt-1 flex-row items-center ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <Text className="text-muted-foreground">
              {formatTime(message.created_at)}
            </Text>
            {isOwnMessage && message.read_at && (
              <Text className="ml-1 text-blue-500">
                • Read
              </Text>
            )}
            {isOwnMessage && message.delivered_at && !message.read_at && (
              <Text className="ml-1 text-muted-foreground">
                • Delivered
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export function MessageList({
  messages,
  currentUserId,
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
  onRefresh,
  isRefreshing = false,
  className,
}: MessageListProps) {
  const flatListRef = React.useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderMessage: ListRenderItem<Message> = React.useCallback(
    ({ item, index }) => {
      const isOwnMessage = item.sender_id === currentUserId;
      const nextMessage = messages[index + 1];
      const showTimestamp =
        !nextMessage ||
        new Date(item.created_at).getTime() - new Date(nextMessage.created_at).getTime() > 300000; // 5 minutes

      return (
        <MessageItem message={item} isOwnMessage={isOwnMessage} showTimestamp={showTimestamp} />
      );
    },
    [currentUserId, messages]
  );

  const renderFooter = React.useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = React.useCallback(() => {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-center text-muted-foreground">
          No messages yet. Start the conversation!
        </Text>
      </View>
    );
  }, []);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id}
      inverted // Display messages from bottom to top
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      className={className}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        ) : undefined
      }
    />
  );
}
