/**
 * Real-Time Integration Example
 *
 * Complete example showing how to integrate all real-time components:
 * - useRealTimeConnection (WebSocket hook)
 * - useToastNotifications (Toast system)
 * - TypingIndicator (Typing indicators)
 * - OnlineStatusBadge (Presence)
 * - LiveReactionOverlay (Video reactions)
 *
 * This example demonstrates:
 * - WebSocket connection management
 * - Event subscription patterns
 * - State synchronization
 * - Component integration
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRealTimeConnection } from '@/lib/hooks/use-real-time-connection';
import { useToastNotifications } from '@/lib/hooks/use-toast-notifications';
import { TypingIndicator } from '@/components/real-time/typing-indicator';
import type { TypingIndicator as TypingIndicatorType } from '@/lib/types/real-time';
import { OnlineStatusBadge } from '@/components/real-time/online-status-badge';
import { LiveReactionOverlay } from '@/components/real-time/live-reaction-overlay';
import { LiveReaction } from '@/lib/types/real-time';

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000';

export function RealTimeIntegrationExample() {
  // 1. WebSocket Connection
  const {
    isConnected,
    connectionState,
    error: wsError,
    on,
    off,
    emit,
  } = useRealTimeConnection(WEBSOCKET_URL, {
    autoConnect: true,
  });

  // 2. Toast Notifications
  const { show: showToast } = useToastNotifications();

  // 3. Typing Indicators
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([]);

  // 4. Online Presence
  const [onlineUsers, setOnlineUsers] = useState<
    Map<string, { lastSeen?: number; status: 'online' | 'offline' | 'away' | 'busy' }>
  >(new Map());

  // 5. Live Reactions
  const [liveReactions, setLiveReactions] = useState<LiveReaction[]>([]);

  // Handle WebSocket connection status
  useEffect(() => {
    if (isConnected) {
      showToast({
        type: 'success',
        title: 'Connected',
        message: 'Real-time features enabled',
        duration: 2000,
      });
    }

    if (wsError) {
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: wsError.message,
      });
    }
  }, [isConnected, wsError, showToast]);

  // Subscribe to real-time events
  useEffect(() => {
    if (!isConnected) return;

    // === Quest Completion Notifications ===
    const handleQuestCompleted = (data: { questId: string; title: string; xp: number }) => {
      showToast({
        type: 'success',
        title: 'Quest Completed!',
        message: `${data.title} (+${data.xp} XP)`,
        action: {
          label: 'View',
          onPress: () => {
            // Navigate to quest details
          },
        },
      });
    };

    // === New Message Notifications ===
    const handleNewMessage = (data: { sender: string; content: string; chatId: string }) => {
      showToast({
        type: 'info',
        title: `Message from ${data.sender}`,
        message: data.content,
        action: {
          label: 'Reply',
          onPress: () => {
            // Navigate to chat
          },
        },
      });
    };

    // === Achievement Unlocked ===
    const handleAchievement = (data: { title: string; description: string }) => {
      showToast({
        type: 'success',
        title: '🏆 Achievement Unlocked!',
        message: `${data.title} - ${data.description}`,
        duration: 5000,
      });
    };

    // === Typing Indicators ===
    const handleUserTyping = (data: { userId: string; username: string; avatar?: string }) => {
      setTypingUsers((prev) => {
        const existing = prev.find((u) => u.userId === data.userId);
        if (existing) return prev;

        return [
          ...prev,
          {
            userId: data.userId,
            username: data.username,
            roomId: 'example-room',
            avatar: data.avatar,
            feature: 'chat' as const,
            timestamp: Date.now(),
          },
        ];
      });

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }, 3000);
    };

    const handleUserStoppedTyping = (data: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    // === Online Presence ===
    const handleUserOnline = (data: { userId: string; status: 'online' | 'away' | 'busy' }) => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        updated.set(data.userId, { status: data.status });
        return updated;
      });
    };

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        updated.set(data.userId, {
          status: 'offline',
          lastSeen: Date.now(),
        });
        return updated;
      });
    };

    // === Live Reactions (Video Streaming) ===
    const handleReaction = (data: LiveReaction) => {
      setLiveReactions((prev) => [...prev, data]);
    };

    // Subscribe to all events
    on('quest:completed', handleQuestCompleted);
    on('chat:message', handleNewMessage);
    on('achievement:unlocked', handleAchievement);
    on('user:typing:start', handleUserTyping);
    on('user:typing:stop', handleUserStoppedTyping);
    on('user:online', handleUserOnline);
    on('user:offline', handleUserOffline);
    on('video:reaction', handleReaction);

    // Cleanup
    return () => {
      off('quest:completed', handleQuestCompleted);
      off('chat:message', handleNewMessage);
      off('achievement:unlocked', handleAchievement);
      off('user:typing:start', handleUserTyping);
      off('user:typing:stop', handleUserStoppedTyping);
      off('user:online', handleUserOnline);
      off('user:offline', handleUserOffline);
      off('video:reaction', handleReaction);
    };
  }, [isConnected, on, off, showToast]);

  // === Example: Send Typing Indicator ===
  const startTyping = () => {
    emit('user:typing:start', {
      userId: 'current-user-id',
      username: 'You',
    });
  };

  const stopTyping = () => {
    emit('user:typing:stop', {
      userId: 'current-user-id',
    });
  };

  // === Example: Send Reaction ===
  const sendReaction = (type: LiveReaction['type']) => {
    const reaction: LiveReaction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      userId: 'current-user-id',
      x: Math.random(), // Random horizontal position
      y: 0.9, // Start near bottom
      timestamp: Date.now(),
    };

    // Add to local state immediately (optimistic update)
    setLiveReactions((prev) => [...prev, reaction]);

    // Broadcast to other users
    emit('video:reaction', reaction);
  };

  // === Example: Remove Reaction After Animation ===
  const handleReactionComplete = (id: string) => {
    setLiveReactions((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        {/* Connection Status */}
        <View className="mb-6 rounded-lg border border-border p-4">
          <Text className="mb-2 text-lg font-semibold">WebSocket Connection</Text>
          <View className="flex-row items-center">
            <OnlineStatusBadge status={isConnected ? 'online' : 'offline'} size="medium" />
            <Text className="ml-2">Status: {connectionState}</Text>
          </View>
        </View>

        {/* Typing Indicators Example */}
        <View className="mb-6 rounded-lg border border-border p-4">
          <Text className="mb-2 text-lg font-semibold">Typing Indicators</Text>

          {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

          <View className="mt-4 flex-row gap-2">
            <Button onPress={startTyping} variant="outline" size="sm">
              <Text>Start Typing</Text>
            </Button>
            <Button onPress={stopTyping} variant="outline" size="sm">
              <Text>Stop Typing</Text>
            </Button>
          </View>
        </View>

        {/* Live Reactions Example */}
        <View className="relative mb-6 h-80 rounded-lg border border-border p-4">
          <Text className="mb-2 text-lg font-semibold">Live Reactions</Text>

          {/* Reaction overlay */}
          <LiveReactionOverlay
            reactions={liveReactions}
            onReactionComplete={handleReactionComplete}
            className="z-10"
          />

          {/* Reaction buttons */}
          <View className="absolute bottom-4 left-4 right-4 flex-row justify-around">
            <Pressable onPress={() => sendReaction('heart')}>
              <Text className="text-4xl">❤️</Text>
            </Pressable>
            <Pressable onPress={() => sendReaction('thumbsup')}>
              <Text className="text-4xl">👍</Text>
            </Pressable>
            <Pressable onPress={() => sendReaction('clap')}>
              <Text className="text-4xl">👏</Text>
            </Pressable>
            <Pressable onPress={() => sendReaction('fire')}>
              <Text className="text-4xl">🔥</Text>
            </Pressable>
            <Pressable onPress={() => sendReaction('star')}>
              <Text className="text-4xl">⭐</Text>
            </Pressable>
          </View>
        </View>

        {/* Online Users Example */}
        <View className="mb-6 rounded-lg border border-border p-4">
          <Text className="mb-2 text-lg font-semibold">Online Users</Text>

          <View className="flex-row flex-wrap gap-4">
            {Array.from(onlineUsers.entries()).map(([userId, data]) => (
              <View key={userId} className="items-center">
                <View className="relative">
                  <View className="h-12 w-12 rounded-full bg-muted" />
                  <OnlineStatusBadge
                    status={data.status}
                    lastSeen={data.lastSeen}
                    showAbsolute
                    size="medium"
                  />
                </View>
                <Text className="mt-1 text-xs">{userId}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Test Notifications */}
        <View className="mb-6 rounded-lg border border-border p-4">
          <Text className="mb-2 text-lg font-semibold">Test Notifications</Text>

          <View className="gap-2">
            <Button
              onPress={() => {
                showToast({
                  type: 'success',
                  title: 'Quest Completed!',
                  message: 'Dragon Slayer Quest (+500 XP)',
                });
              }}
              variant="outline">
              <Text>Quest Complete</Text>
            </Button>

            <Button
              onPress={() => {
                showToast({
                  type: 'info',
                  title: 'New Message',
                  message: 'Alice: Hey, want to join my party?',
                });
              }}
              variant="outline">
              <Text>New Message</Text>
            </Button>

            <Button
              onPress={() => {
                showToast({
                  type: 'warning',
                  title: 'Low Health',
                  message: 'Your health is below 20%',
                });
              }}
              variant="outline">
              <Text>Warning</Text>
            </Button>

            <Button
              onPress={() => {
                showToast({
                  type: 'error',
                  title: 'Connection Lost',
                  message: 'Failed to connect to game server',
                });
              }}
              variant="outline">
              <Text>Error</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// === Usage in App ===
//
// 1. Add ToastNotificationManager to root layout:
//
// ```tsx
// // app/_layout.tsx
// import { ToastNotificationManager } from '@/components/real-time/toast-notification-manager';
//
// export default function RootLayout() {
//   return (
//     <>
//       <Stack />
//       <ToastNotificationManager />
//     </>
//   );
// }
// ```
//
// 2. Use in any screen:
//
// ```tsx
// // app/(tabs)/chat.tsx
// export default function ChatScreen() {
//   return <RealTimeIntegrationExample />;
// }
// ```
