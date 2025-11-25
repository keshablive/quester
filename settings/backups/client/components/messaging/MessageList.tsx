import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { format, isToday, isYesterday, isThisWeek, differenceInMinutes } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id?: string;
  group_id?: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  media_url?: string;
  thumbnail_url?: string;
  file_name?: string;
  file_size?: number;
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  typingUsers?: string[];
  onMessagePress?: (message: Message) => void;
  onMediaPress?: (mediaUrl: string, type: 'image' | 'video') => void;
}

export function MessageList({
  messages,
  currentUserId,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  typingUsers = [],
  onMessagePress,
  onMediaPress,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages.length]);

  // Format timestamp for message grouping
  const formatMessageTime = (date: Date): string => {
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE h:mm a');
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  // Group messages by date for date separators
  const shouldShowDateSeparator = (currentMsg: Message, previousMsg?: Message): boolean => {
    if (!previousMsg) return true;

    const currentDate = new Date(currentMsg.created_at);
    const previousDate = new Date(previousMsg.created_at);

    return currentDate.toDateString() !== previousDate.toDateString();
  };

  // Check if messages should be grouped (within 5 minutes from same sender)
  const shouldGroupMessage = (currentMsg: Message, previousMsg?: Message): boolean => {
    if (!previousMsg) return false;
    if (currentMsg.sender_id !== previousMsg.sender_id) return false;

    const currentDate = new Date(currentMsg.created_at);
    const previousDate = new Date(previousMsg.created_at);

    return differenceInMinutes(currentDate, previousDate) < 5;
  };

  const renderDateSeparator = (date: Date) => (
    <View className="my-4 flex-row items-center">
      <View className="h-px flex-1 bg-gray-300" />
      <Text className="mx-3 font-semibold text-gray-500">
        {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMM d, yyyy')}
      </Text>
      <View className="h-px flex-1 bg-gray-300" />
    </View>
  );

  const renderMediaContent = (message: Message) => {
    if (message.message_type === 'image' && message.media_url) {
      return (
        <Pressable onPress={() => onMediaPress?.(message.media_url!, 'image')}>
          <Image
            source={{ uri: message.thumbnail_url || message.media_url }}
            className="w-50 h-50 mb-1 rounded-lg"
            resizeMode="cover"
          />
          {message.content && <Text className="mt-1 text-white">{message.content}</Text>}
        </Pressable>
      );
    }

    if (message.message_type === 'video' && message.media_url) {
      return (
        <Pressable onPress={() => onMediaPress?.(message.media_url!, 'video')}>
          <View className="relative">
            {message.thumbnail_url && (
              <Image
                source={{ uri: message.thumbnail_url }}
                className="w-50 h-50 mb-1 rounded-lg"
                resizeMode="cover"
              />
            )}
            <View
              className="absolute left-1/2 top-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/60"
              style={{ transform: [{ translateX: -20 }, { translateY: -20 }] }}>
              <Text className="text-white">▶</Text>
            </View>
          </View>
          {message.content && <Text className="mt-1 text-white">{message.content}</Text>}
        </Pressable>
      );
    }

    if (message.message_type === 'file') {
      return (
        <View className="flex-row items-center rounded-lg bg-gray-200 p-2">
          <Text className="mr-3 text-2xl">📄</Text>
          <View className="flex-1">
            <Text className="font-semibold text-black" numberOfLines={1}>
              {message.file_name || 'File attachment'}
            </Text>
            {message.file_size && (
              <Text className="mt-0.5 text-gray-600">
                {(message.file_size / 1024 / 1024).toFixed(2)} MB
              </Text>
            )}
          </View>
        </View>
      );
    }

    return <Text className="leading-5 text-black">{message.content}</Text>;
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isSentByMe = item.sender_id === currentUserId;
      const previousMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
      const showDateSeparator = shouldShowDateSeparator(item, previousMessage);
      const grouped = shouldGroupMessage(item, previousMessage);
      const messageDate = new Date(item.created_at);

      return (
        <View>
          {showDateSeparator && renderDateSeparator(messageDate)}

          <Pressable
            onPress={() => onMessagePress?.(item)}
            className={`my-0.5 flex-row items-end ${isSentByMe ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : ''}`}>
            {!isSentByMe && !grouped && item.sender?.avatar_url && (
              <Image
                source={{ uri: item.sender.avatar_url }}
                className="mr-2 h-8 w-8 rounded-full"
              />
            )}

            {!isSentByMe && !grouped && <View className="w-10" />}

            <View
              className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${isSentByMe ? 'rounded-br bg-blue-500' : 'rounded-bl bg-white'}`}>
              {!isSentByMe && !grouped && item.sender && (
                <Text className="mb-1 font-semibold text-gray-600">{item.sender.username}</Text>
              )}

              {renderMediaContent(item)}

              <View className="mt-1 flex-row items-center justify-end">
                <Text className="text-[11px] text-gray-500">{formatMessageTime(messageDate)}</Text>

                {isSentByMe && (
                  <View className="ml-1">
                    <Text className="text-green-500">{item.read_at ? '✓✓' : '✓'}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </View>
      );
    },
    [messages, currentUserId, onMessagePress, onMediaPress]
  );

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View className="flex-row items-center p-4">
        <View className="mr-2 flex-row items-center rounded-2xl bg-gray-300 p-2">
          <View className="mx-0.5 h-1.5 w-1.5 rounded-full bg-gray-600" />
          <View className="mx-0.5 h-1.5 w-1.5 rounded-full bg-gray-600" />
          <View className="mx-0.5 h-1.5 w-1.5 rounded-full bg-gray-600" />
        </View>
        <Text className="italic text-gray-600">
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.length} people are typing...`}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        onEndReached={() => {
          if (hasMore && !isLoading) {
            onLoadMore?.();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        showsVerticalScrollIndicator={false}
      />
      {renderTypingIndicator()}
    </View>
  );
}
