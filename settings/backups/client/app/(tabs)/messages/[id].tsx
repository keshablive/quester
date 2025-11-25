import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatWindow } from '@/components/messaging/chat-window';
import { messagingApi, type Message } from '@/lib/api/messaging';
import { getWebSocketClient } from '@/lib/websocket/client';
import { useRealTimeConnection } from '@/lib/hooks/use-real-time-connection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import type { TypingIndicator as TypingUser } from '@/lib/types/real-time';

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string; type?: string }>();
  const router = useRouter();
  const { id, type = 'direct' } = params;
  const isGroupChat = type === 'group';

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string>('');
  const [recipientName, setRecipientName] = React.useState<string>('');
  const [typingUsers, setTypingUsers] = React.useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const typingTimeoutRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const wsClient = React.useRef(getWebSocketClient()).current;
  const { isConnected, on, off, emit } = useRealTimeConnection(
    process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080',
    { autoConnect: true }
  );

  // Get current user ID
  React.useEffect(() => {
    AsyncStorage.getItem('user_id').then((userId) => {
      if (userId) setCurrentUserId(userId);
    });
  }, []);

  // Fetch messages
  const fetchMessages = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = isGroupChat
        ? await messagingApi.getGroupMessages(id, 1, 50)
        : await messagingApi.getDirectMessages(id, 1, 50);

      setMessages(data.messages || []);

      // Set recipient name (from first message or fetch user data)
      if (data.messages && data.messages.length > 0) {
        setRecipientName(data.recipient_name || 'Unknown User');
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [id, isGroupChat]);

  // Initial load
  React.useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to WebSocket for real-time messages
  React.useEffect(() => {
    const messageUnsubscribe = wsClient.subscribe('message', (data) => {
      if (
        (isGroupChat && data.group_id === id) ||
        (!isGroupChat && (data.sender_id === id || data.recipient_id === id))
      ) {
        // Add new message to list
        setMessages((prev) => [data.message, ...prev]);

        // Mark as read
        messagingApi.markAsRead(data.message.id).catch(console.error);
      }
    });

    const typingUnsubscribe = wsClient.subscribe('typing', (data) => {
      if ((isGroupChat && data.group_id === id) || (!isGroupChat && data.user_id === id)) {
        // Handle old WebSocket format for backward compatibility
        if (data.is_typing) {
          const typingUser: TypingUser = {
            userId: data.user_id,
            username: data.username || 'User',
            roomId: id,
            feature: 'chat' as const,
            timestamp: Date.now(),
          };
          setTypingUsers((prev) => {
            const exists = prev.some((u) => u.userId === data.user_id);
            return exists ? prev : [...prev, typingUser];
          });
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.user_id));
        }
      }
    });

    return () => {
      messageUnsubscribe();
      typingUnsubscribe();
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [wsClient, id, isGroupChat]);

  // Subscribe to real-time typing events
  React.useEffect(() => {
    if (!isConnected) return;

    const handleTypingStart = (data: TypingUser) => {
      if ((isGroupChat && data.roomId === id) || (!isGroupChat && data.userId !== currentUserId)) {
        setTypingUsers((prev) => {
          const exists = prev.some((u) => u.userId === data.userId);
          if (exists) return prev;
          return [...prev, { ...data, timestamp: Date.now() }];
        });

        // Auto-clear after 3 seconds
        const existingTimeout = typingTimeoutRef.current.get(data.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
          typingTimeoutRef.current.delete(data.userId);
        }, 3000) as any;

        typingTimeoutRef.current.set(data.userId, timeout);
      }
    };

    const handleTypingStop = (data: { userId: string; chatId?: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      const timeout = typingTimeoutRef.current.get(data.userId);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutRef.current.delete(data.userId);
      }
    };

    on('user:typing:start', handleTypingStart);
    on('user:typing:stop', handleTypingStop);

    return () => {
      off('user:typing:start', handleTypingStart);
      off('user:typing:stop', handleTypingStop);
    };
  }, [isConnected, id, isGroupChat, currentUserId, on, off]);

  const handleSendMessage = React.useCallback(
    async (content: string) => {
      try {
        const message = isGroupChat
          ? await messagingApi.sendGroupMessage(id, content)
          : await messagingApi.sendDirectMessage(id, content);

        // Add message to list optimistically
        setMessages((prev) => [message, ...prev]);

        // Send via WebSocket for real-time delivery
        wsClient.send({
          type: 'message',
          payload: {
            ...message,
            group_id: isGroupChat ? id : undefined,
            recipient_id: isGroupChat ? undefined : id,
          },
        });
      } catch (err: any) {
        console.error('Failed to send message:', err);
        // TODO: Show error toast
      }
    },
    [id, isGroupChat, wsClient]
  );

  const handleTyping = React.useCallback(
    (isTyping: boolean) => {
      // Send old WebSocket format for backward compatibility
      wsClient.send({
        type: 'typing',
        payload: {
          is_typing: isTyping,
          group_id: isGroupChat ? id : undefined,
          recipient_id: isGroupChat ? undefined : id,
          user_id: currentUserId,
        },
      });

      // Emit real-time typing events
      if (isTyping) {
        emit('user:typing:start', {
          userId: currentUserId,
          username: recipientName, // Will be replaced with actual username from auth
          chatId: id,
        });
      } else {
        emit('user:typing:stop', {
          userId: currentUserId,
          chatId: id,
        });
      }
    },
    [id, isGroupChat, currentUserId, recipientName, wsClient, emit]
  );

  if (error) {
    return (
      <ScreenWrapper screenName="Chat">
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-destructive">{error}</Text>
            <Button onPress={fetchMessages} className="mt-4 rounded-lg bg-primary px-6 py-3">
              <Text className="font-semibold text-primary-foreground">Retry</Text>
            </Button>
          </View>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: recipientName || 'Chat',
          headerLeft: () => (
            <Button variant="ghost" size="icon" onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#000000" />
            </Button>
          ),
        }}
      />

      <ScreenWrapper screenName="Chat">
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : (
            <ChatWindow
              messages={messages}
              currentUserId={currentUserId}
              recipientId={isGroupChat ? undefined : id}
              groupId={isGroupChat ? id : undefined}
              typingUsers={typingUsers}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
            />
          )}
        </SafeAreaView>
      </ScreenWrapper>
    </>
  );
}
