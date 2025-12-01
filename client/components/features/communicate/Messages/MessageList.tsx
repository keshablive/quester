import * as React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text, Card, Icon, Button, Skeleton } from '@/components/ui';
import { MessageSquare, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useMessageThreads } from '@/core/hooks/queries';
import { MessageItem } from './MessageItem';
import type { MessageThread, LegacyMessage } from './types';
import { threadToLegacyMessage } from './types';

interface MessageListProps {
  /**
   * Legacy messages array - for backward compatibility with CommunicateDashboard
   * When provided, will use these instead of fetching from API
   */
  messages?: LegacyMessage[];
  /**
   * Callback when a thread is selected
   */
  onThreadSelect?: (thread: MessageThread) => void;
}

/**
 * Message thread list component
 *
 * Displays a list of message threads sorted by most recent.
 * Integrates with useMessageThreads hook for real-time data.
 * Supports loading, error, and empty states.
 *
 * @example
 * ```tsx
 * // Standalone mode - fetches from API
 * <MessageList onThreadSelect={(thread) => navigate(thread.id)} />
 *
 * // Legacy mode - uses provided messages
 * <MessageList messages={legacyMessages} />
 * ```
 */
export function MessageList({ messages, onThreadSelect }: MessageListProps) {
  // If legacy messages are provided, use those (backward compatibility)
  if (messages !== undefined) {
    return <LegacyMessageList messages={messages} />;
  }

  // Otherwise, fetch from API using the hook
  return <ApiMessageList onThreadSelect={onThreadSelect} />;
}

/**
 * Legacy message list - for backward compatibility
 */
function LegacyMessageList({ messages }: { messages: LegacyMessage[] }) {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card>
      {messages.map((message, index) => (
        <MessageItem key={index} message={message} isLast={index === messages.length - 1} />
      ))}
    </Card>
  );
}

/**
 * API-powered message list with TanStack Query integration
 */
function ApiMessageList({ onThreadSelect }: { onThreadSelect?: (thread: MessageThread) => void }) {
  const { data: threads, isLoading, isError, error, refetch, isRefetching } = useMessageThreads();

  // Loading state (T018)
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state (T019)
  if (isError) {
    return <ErrorState error={error} onRetry={refetch} isRetrying={isRefetching} />;
  }

  // Empty state (T020)
  if (!threads || threads.length === 0) {
    return <EmptyState />;
  }

  // Render thread list
  return (
    <Card>
      {threads.map((thread, index) => (
        <Pressable key={thread.id} onPress={() => onThreadSelect?.(thread)}>
          <MessageItem
            message={threadToLegacyMessage(thread)}
            isLast={index === threads.length - 1}
            isGroup={thread.isGroup}
          />
        </Pressable>
      ))}
    </Card>
  );
}

/**
 * Loading skeleton state (T018)
 */
function LoadingSkeleton() {
  return (
    <Card>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className={`flex-row items-center gap-3 p-4 ${i < 4 ? 'border-b border-border' : ''}`}>
          {/* Avatar skeleton */}
          <Skeleton className="h-12 w-12 rounded-full" />

          <View className="flex-1 gap-2">
            {/* Name and time row */}
            <View className="flex-row items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </View>
            {/* Preview text */}
            <Skeleton className="h-3 w-full" />
          </View>
        </View>
      ))}
    </Card>
  );
}

/**
 * Error state with retry button (T019)
 */
function ErrorState({
  error,
  onRetry,
  isRetrying,
}: {
  error: Error | null;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <View className="items-center justify-center py-12">
      <Icon as={AlertCircle} size={64} className="mb-4 text-destructive/50" />
      <Text className="text-lg font-semibold">Failed to load messages</Text>
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

/**
 * Empty state when no conversations exist (T020)
 */
function EmptyState() {
  return (
    <View className="items-center justify-center py-12">
      <Icon as={MessageSquare} size={64} className="mb-4 text-muted-foreground/50" />
      <Text className="text-lg font-semibold">No messages yet</Text>
      <Text className="mt-2 text-center text-muted-foreground">
        When you receive messages, they'll appear here
      </Text>
    </View>
  );
}
