/**
 * ConversationView Component
 *
 * Displays full conversation history with a user, supporting:
 * - Infinite scroll to load older messages (scroll up)
 * - Optimistic message display
 * - Loading, error, and empty states
 * - Delete own messages (FR-016)
 *
 * Feature 017: Messages API Integration
 * User Story 2: View Conversation Messages
 *
 * @module components/features/communicate/Messages/ConversationView
 */

import * as React from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
  Pressable,
  Alert,
} from 'react-native';
import { Text, Card, Icon, Button, Skeleton, Avatar, AvatarFallback } from '@/components/ui';
import {
  MessageSquare,
  RefreshCw,
  AlertCircle,
  ChevronUp,
  Clock,
  Trash2,
  MoreVertical,
} from 'lucide-react-native';
import { useConversationMessages } from '@/core/hooks/queries';
import { useDeleteMessage, useMarkMultipleAsRead } from '@/core/hooks/mutations';
import { MessageComposer } from './MessageComposer';
import type { Message, MessageThread } from './types';

interface ConversationViewProps {
  /**
   * The thread/participant to display conversation for
   */
  thread: MessageThread;
  /**
   * Current user ID to determine message alignment
   */
  currentUserId: string;
  /**
   * Callback when user wants to go back to thread list
   */
  onBack?: () => void;
}

/**
 * Conversation view with infinite scroll
 *
 * @example
 * ```tsx
 * <ConversationView
 *   thread={selectedThread}
 *   currentUserId={user.id}
 *   onBack={() => setSelectedThread(null)}
 * />
 * ```
 */
export function ConversationView({ thread, currentUserId, onBack }: ConversationViewProps) {
  const flatListRef = React.useRef<FlatList>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(thread.participantId);

  // Delete message mutation (T024.1)
  const deleteMessage = useDeleteMessage();

  // Mark as read mutation (T041 - US6)
  const markMultipleAsRead = useMarkMultipleAsRead();

  // Flatten paginated data
  const messages = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page);
  }, [data?.pages]);

  // Auto-mark unread messages as read when they're loaded (T041)
  React.useEffect(() => {
    if (messages.length > 0) {
      // Find unread messages that belong to the other user (received messages)
      const unreadMessageIds = messages
        .filter((msg) => !msg.read && msg.senderId !== currentUserId)
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0) {
        markMultipleAsRead.mutate(unreadMessageIds);
      }
    }
  }, [messages, currentUserId, markMultipleAsRead]);

  // Handle load more (older messages)
  const handleLoadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle message deletion (FR-016: own messages only)
  const handleDeleteMessage = React.useCallback(
    (messageId: string) => {
      deleteMessage.mutate({
        messageId,
        conversationId: thread.participantId,
        isGroup: false,
      });
    },
    [deleteMessage, thread.participantId]
  );

  // Render individual message
  const renderMessage: ListRenderItem<Message> = React.useCallback(
    ({ item: message }) => {
      const isOwnMessage = message.senderId === currentUserId;
      return (
        <ConversationMessage
          message={message}
          isOwnMessage={isOwnMessage}
          participantName={thread.participantName}
          onDelete={isOwnMessage ? handleDeleteMessage : undefined}
        />
      );
    },
    [currentUserId, thread.participantName, handleDeleteMessage]
  );

  // Key extractor
  const keyExtractor = React.useCallback((item: Message) => item.id, []);

  // Loading state (T025)
  if (isLoading) {
    return <ConversationLoadingSkeleton />;
  }

  // Error state (T026)
  if (isError) {
    return <ConversationErrorState error={error} onRetry={refetch} isRetrying={isRefetching} />;
  }

  // Empty state
  // Empty state with composer
  if (messages.length === 0) {
    return (
      <View className="flex-1">
        <View className="flex-1 items-center justify-center py-12">
          <Icon as={MessageSquare} size={64} className="mb-4 text-muted-foreground/50" />
          <Text className="text-lg font-semibold">No messages yet</Text>
          <Text className="mt-2 text-center text-muted-foreground">
            Start the conversation with {thread.participantName}
          </Text>
        </View>
        {/* Message composer (T032) */}
        <MessageComposer
          receiverId={thread.participantId}
          placeholder={`Message ${thread.participantName}...`}
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Load more indicator at top (T023) */}
      {isFetchingNextPage && (
        <View className="items-center py-2">
          <ActivityIndicator size="small" />
          <Text className="mt-1 text-xs text-muted-foreground">Loading older messages...</Text>
        </View>
      )}

      {/* Has more indicator */}
      {hasNextPage && !isFetchingNextPage && (
        <Button variant="ghost" size="sm" className="my-2 self-center" onPress={handleLoadMore}>
          <Icon as={ChevronUp} size={16} className="mr-1" />
          <Text className="text-sm">Load older messages</Text>
        </Button>
      )}

      {/* Messages list - inverted for chat style (newest at bottom) */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#666" />
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
      />

      {/* Message composer (T032) */}
      <MessageComposer
        receiverId={thread.participantId}
        placeholder={`Message ${thread.participantName}...`}
      />
    </View>
  );
}

/**
 * Individual message bubble in conversation
 */
interface ConversationMessageProps {
  message: Message;
  isOwnMessage: boolean;
  participantName: string;
  onDelete?: (messageId: string) => void;
}

function ConversationMessage({
  message,
  isOwnMessage,
  participantName,
  onDelete,
}: ConversationMessageProps) {
  const [showActions, setShowActions] = React.useState(false);

  const formattedTime = React.useMemo(() => {
    const date = new Date(message.createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.createdAt]);

  // Handle delete with confirmation (FR-016: own messages only)
  const handleDelete = React.useCallback(() => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(message.id),
        },
      ]
    );
  }, [message.id, onDelete]);

  return (
    <Pressable
      onLongPress={() => isOwnMessage && setShowActions(!showActions)}
      delayLongPress={300}>
      <View className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
            isOwnMessage ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-muted'
          }`}>
          {/* Sender name (only for received messages) */}
          {!isOwnMessage && (
            <Text className="mb-1 text-xs font-medium text-muted-foreground">
              {participantName}
            </Text>
          )}

          {/* Message content */}
          <Text className={isOwnMessage ? 'text-primary-foreground' : 'text-foreground'}>
            {message.content}
          </Text>

          {/* Timestamp and actions row */}
          <View className="mt-1 flex-row items-center justify-end gap-1">
            <Icon
              as={Clock}
              size={10}
              className={isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}
            />
            <Text
              className={`text-xs ${
                isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
              {formattedTime}
            </Text>
            {/* Read indicator for own messages */}
            {isOwnMessage && message.read && (
              <Text className="text-xs text-primary-foreground/70">✓✓</Text>
            )}
          </View>
        </View>

        {/* Delete button for own messages (T024.1 - FR-016) */}
        {isOwnMessage && showActions && (
          <Pressable
            className="ml-2 self-center rounded-full bg-destructive/10 p-2"
            onPress={handleDelete}>
            <Icon as={Trash2} size={16} className="text-destructive" />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Loading skeleton for conversation (T025)
 */
function ConversationLoadingSkeleton() {
  return (
    <View className="flex-1 px-4 py-2">
      {/* Received message skeleton */}
      <View className="mb-2 flex-row justify-start">
        <View className="max-w-[80%]">
          <Skeleton className="mb-1 h-4 w-24" />
          <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-sm" />
        </View>
      </View>

      {/* Sent message skeleton */}
      <View className="mb-2 flex-row justify-end">
        <Skeleton className="h-12 w-48 rounded-2xl rounded-br-sm" />
      </View>

      {/* Received message skeleton */}
      <View className="mb-2 flex-row justify-start">
        <Skeleton className="h-10 w-56 rounded-2xl rounded-bl-sm" />
      </View>

      {/* Sent message skeleton */}
      <View className="mb-2 flex-row justify-end">
        <Skeleton className="h-20 w-52 rounded-2xl rounded-br-sm" />
      </View>

      {/* More received */}
      <View className="mb-2 flex-row justify-start">
        <Skeleton className="h-8 w-40 rounded-2xl rounded-bl-sm" />
      </View>
    </View>
  );
}

/**
 * Error state for conversation (T026)
 */
function ConversationErrorState({
  error,
  onRetry,
  isRetrying,
}: {
  error: Error | null;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <Icon as={AlertCircle} size={64} className="mb-4 text-destructive/50" />
      <Text className="text-lg font-semibold">Failed to load conversation</Text>
      <Text className="mt-2 px-4 text-center text-muted-foreground">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </Text>
      <Button variant="outline" className="mt-4" onPress={onRetry} disabled={isRetrying}>
        {isRetrying ? (
          <ActivityIndicator size="small" className="mr-2" />
        ) : (
          <Icon as={RefreshCw} size={16} className="mr-2" />
        )}
        <Text>{isRetrying ? 'Retrying...' : 'Retry'}</Text>
      </Button>
    </View>
  );
}
