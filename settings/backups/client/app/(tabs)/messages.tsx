import * as React from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { messagingApi } from '@/lib/api/messaging';
import { getWebSocketClient } from '@/lib/websocket/client';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ScreenWrapper } from '@/components/screen-wrapper';

type MessageThread = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_group: boolean;
};

export default function MessagesScreen() {
  const router = useRouter();
  const [threads, setThreads] = React.useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const wsClient = React.useRef(getWebSocketClient()).current;

  // Fetch message threads
  const fetchThreads = React.useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await messagingApi.getThreads(1, 20);
      setThreads(data.threads || []);
    } catch (err: any) {
      console.error('Failed to fetch threads:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Subscribe to WebSocket messages for real-time updates
  React.useEffect(() => {
    const unsubscribe = wsClient.subscribe('message', (data) => {
      console.log('[Messages] New message received:', data);
      // Refresh threads to show new message
      fetchThreads(true);
    });

    return unsubscribe;
  }, [wsClient, fetchThreads]);

  const handleThreadPress = React.useCallback(
    (thread: MessageThread) => {
      if (thread.is_group) {
        router.push({
          pathname: '/messages/[id]',
          params: { id: thread.id, type: 'group' },
        });
      } else {
        router.push({
          pathname: '/messages/[id]',
          params: { id: thread.user_id, type: 'direct' },
        });
      }
    },
    [router]
  );

  // Phase 7, T115-T118: FlatList optimizations
  const THREAD_ITEM_HEIGHT = 88; // Estimated height for message thread item

  const getItemLayout = React.useCallback(
    (_data: unknown, index: number) => ({
      length: THREAD_ITEM_HEIGHT,
      offset: THREAD_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = React.useCallback((item: MessageThread) => item.id, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderThread: ListRenderItem<MessageThread> = React.useCallback(
    ({ item }) => (
      <Button
        variant="ghost"
        onPress={() => handleThreadPress(item)}
        className="w-full justify-start border-b border-border px-4 py-3">
        <View className="flex-row items-start">
          {/* Avatar */}
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Text className="text-lg font-bold text-primary-foreground">
              {item.user_name.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Content */}
          <View className="ml-3 flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-foreground">{item.user_name}</Text>
              <Text className="text-xs text-muted-foreground">
                {formatTime(item.last_message_at)}
              </Text>
            </View>

            <View className="mt-1 flex-row items-center justify-between">
              <Text
                className={`flex-1 text-sm ${
                  item.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
                numberOfLines={1}>
                {item.last_message}
              </Text>

              {item.unread_count > 0 && (
                <Badge variant="default" className="ml-2">
                  <Text className="text-xs font-bold">
                    {item.unread_count > 99 ? '99+' : item.unread_count}
                  </Text>
                </Badge>
              )}
            </View>
          </View>
        </View>
      </Button>
    ),
    [handleThreadPress, formatTime]
  );

  const renderEmpty = React.useCallback(() => {
    if (isLoading) return null;

    return (
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Icon as={MessageCircle} size={64} className="text-muted-foreground" />
        <Text className="mt-4 text-center text-lg font-semibold text-foreground">
          No messages yet
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          Start a conversation with someone
        </Text>
      </View>
    );
  }, [isLoading]);

  if (error && !isRefreshing) {
    return (
      <ScreenWrapper screenName="MessagesScreen">
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-destructive">{error}</Text>
            <Button onPress={() => fetchThreads()} variant="default" className="mt-4">
              <Text>Retry</Text>
            </Button>
          </View>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenName="MessagesScreen">
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {/* Header */}
        <View className="border-b border-border bg-card px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-foreground">Messages</Text>
            <Button variant="ghost" size="icon">
              <Icon as={Search} size={24} className="text-muted-foreground" />
            </Button>
          </View>
        </View>

        {/* Message threads list */}
        {isLoading && !isRefreshing ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
          <FlatList
            data={threads}
            renderItem={renderThread}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchThreads(true)}
                tintColor="#6366F1"
              />
            }
            // Phase 7, T115-T118: Performance optimizations
            removeClippedSubviews={true}
            windowSize={21}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
          />
        )}
      </SafeAreaView>
    </ScreenWrapper>
  );
}
