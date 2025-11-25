/**
 * LiveStreamScreen (T110)
 *
 * Live stream viewing screen with:
 * - LiveStreamPlayer component with HLS playback
 * - Chat overlay for real-time interaction
 * - Viewer count display
 * - Stream metadata (title, creator, description)
 * - Like/share actions
 * - DVR controls (rewind up to 2 hours)
 */

import * as React from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LiveStreamPlayer } from '@/components/video/live-stream-player';
import { LiveReactionOverlay } from '@/components/real-time/live-reaction-overlay';
import { useStream } from '@/lib/hooks/useStream';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRealTimeConnection } from '@/lib/hooks/use-real-time-connection';
import type { LiveReaction, ReactionType } from '@/lib/types/real-time';
import {
  UserIcon,
  UsersIcon,
  HeartIcon,
  ShareIcon,
  MessageCircleIcon,
  XIcon,
} from 'lucide-react-native';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [showChat, setShowChat] = React.useState(true);
  const [chatMessage, setChatMessage] = React.useState('');
  const [reactions, setReactions] = React.useState<LiveReaction[]>([]);

  const { stream, stats, isLoading, error, refetch } = useStream(id || null);

  // Real-time connection for live reactions
  const { isConnected, on, off, emit } = useRealTimeConnection(
    process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080',
    { autoConnect: true }
  );

  // Subscribe to video reactions
  React.useEffect(() => {
    if (!isConnected || !id) return;

    const handleReaction = (data: LiveReaction) => {
      // Only show reactions for this video
      if (data.videoId === id) {
        setReactions((prev) => [...prev, data]);
      }
    };

    on('video:reaction', handleReaction);
    return () => off('video:reaction', handleReaction);
  }, [isConnected, id, on, off]);

  // Send reaction to server and update local state
  const sendReaction = React.useCallback(
    (type: ReactionType) => {
      if (!id || !user) return;

      const reaction: LiveReaction = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        userId: user.id,
        videoId: id,
        x: Math.random(), // Random horizontal position (0-1)
        y: 0.9, // Start near bottom
        timestamp: Date.now(),
      };

      // Optimistic update - show immediately
      setReactions((prev) => [...prev, reaction]);

      // Broadcast to other viewers
      emit('video:reaction', reaction);
    },
    [id, user, emit]
  );

  // Remove reaction when animation completes
  const handleReactionComplete = React.useCallback((reactionId: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== reactionId));
  }, []);

  const handleLike = React.useCallback(() => {
    // TODO: Implement like functionality
    Alert.alert('Coming Soon', 'Like functionality will be available soon');
  }, []);

  const handleShare = React.useCallback(() => {
    // TODO: Implement share functionality
    Alert.alert('Coming Soon', 'Share functionality will be available soon');
  }, []);

  const handleSendMessage = React.useCallback(() => {
    if (!chatMessage.trim()) return;

    // TODO: Send message via WebSocket
    console.log('Send message:', chatMessage);
    setChatMessage('');
  }, [chatMessage]);

  if (isLoading) {
    return (
      <ScreenWrapper screenName="LiveStream">
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="mt-4 text-white">Loading stream...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !stream) {
    return (
      <ScreenWrapper screenName="LiveStream">
        <View className="flex-1 items-center justify-center bg-black p-4">
          <Text className="mb-4 text-center text-red-500">
            {error?.message || 'Failed to load stream'}
          </Text>
          <Button onPress={() => refetch()}>
            <Text className="text-white">Retry</Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  if (stream.status !== 'live') {
    return (
      <ScreenWrapper screenName="LiveStream">
        <View className="flex-1 items-center justify-center bg-black p-4">
          <Text className="mb-4 text-center text-lg text-white">
            This stream is not currently live
          </Text>
          <Text className="mb-6 text-center text-gray-400">Status: {stream.status}</Text>
          <Button onPress={() => router.back()}>
            <Text className="text-white">Go Back</Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenName="LiveStream">
      <KeyboardAvoidingView
        className="flex-1 bg-black"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Stack.Screen
          options={{
            title: stream.title,
            headerShown: true,
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
          }}
        />

        {/* Live Stream Player */}
        <View className="flex-1">
          <LiveStreamPlayer
            streamUrl={stream.playbackUrl || ''}
            isLive={stream.status === 'live'}
            dvrEnabled={stream.dvrEnabled}
            onError={(error) => {
              Alert.alert('Playback Error', error);
            }}
          />

          {/* Live Reaction Overlay */}
          <LiveReactionOverlay
            reactions={reactions}
            onReactionComplete={handleReactionComplete}
            animationDuration={3000}
            className="pointer-events-none absolute inset-0"
          />

          {/* Overlay UI */}
          <View className="pointer-events-none absolute inset-0">
            {/* Top Bar */}
            <View className="pointer-events-auto flex-row items-center justify-between p-4">
              <View className="flex-row items-center rounded-full bg-black/60 px-3 py-2">
                <View className="mr-2 h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <Text className="text-sm font-semibold text-white">LIVE</Text>
              </View>

              <View className="flex-row items-center rounded-full bg-black/60 px-3 py-2">
                <UsersIcon size={16} color="#fff" />
                <Text className="ml-2 text-sm font-semibold text-white">
                  {stats?.currentViewers || stream.viewerCount || 0}
                </Text>
              </View>
            </View>

            {/* Bottom Info */}
            <View className="pointer-events-auto absolute bottom-0 left-0 right-0 p-4">
              {/* Stream Info */}
              <View className="mb-4">
                <Text className="mb-1 text-lg font-bold text-white">{stream.title}</Text>
                <View className="flex-row items-center">
                  <UserIcon size={14} color="#9ca3af" />
                  <Text className="ml-1 text-sm text-gray-400">{stream.userId}</Text>
                </View>
              </View>

              {/* Reaction Buttons */}
              {user && (
                <View className="mb-4 flex-row justify-around px-4">
                  <ReactionButton icon="❤️" onPress={() => sendReaction('heart')} />
                  <ReactionButton icon="👍" onPress={() => sendReaction('thumbsup')} />
                  <ReactionButton icon="👏" onPress={() => sendReaction('clap')} />
                  <ReactionButton icon="🔥" onPress={() => sendReaction('fire')} />
                  <ReactionButton icon="⭐" onPress={() => sendReaction('star')} />
                </View>
              )}

              {/* Action Buttons */}
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-row space-x-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={handleLike}
                    className="rounded-full bg-black/60 p-3">
                    <HeartIcon size={24} color="#fff" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={handleShare}
                    className="rounded-full bg-black/60 p-3">
                    <ShareIcon size={24} color="#fff" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => setShowChat(!showChat)}
                    className="rounded-full bg-black/60 p-3">
                    <MessageCircleIcon size={24} color="#fff" />
                  </Button>
                </View>
              </View>

              {/* Chat Overlay */}
              {showChat && stream.chatEnabled && (
                <View className="max-h-64 rounded-lg bg-black/80 p-3">
                  {/* Chat Header */}
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="font-semibold text-white">Live Chat</Text>
                    <Button variant="ghost" size="icon" onPress={() => setShowChat(false)}>
                      <XIcon size={20} color="#fff" />
                    </Button>
                  </View>

                  {/* Chat Messages (Placeholder) */}
                  <ScrollView className="mb-2 flex-1" style={{ maxHeight: 150 }}>
                    <Text className="py-4 text-center text-sm text-gray-400">
                      Chat messages will appear here
                    </Text>
                  </ScrollView>

                  {/* Chat Input */}
                  {user && (
                    <View className="flex-row items-center space-x-2">
                      <Input
                        placeholder="Send a message..."
                        placeholderTextColor="#9ca3af"
                        value={chatMessage}
                        onChangeText={setChatMessage}
                        onSubmitEditing={handleSendMessage}
                        returnKeyType="send"
                        className="flex-1 border-gray-700 bg-gray-800 text-white"
                      />
                      <Button onPress={handleSendMessage} disabled={!chatMessage.trim()} size="sm">
                        <Text className="text-white">Send</Text>
                      </Button>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stream Metadata (Below Player) */}
        <View className="bg-gray-900 p-4">
          {stream.description && (
            <Text className="mb-3 text-sm text-gray-300">{stream.description}</Text>
          )}

          {stream.category && (
            <Badge variant="secondary" className="self-start">
              <Text className="text-xs">{stream.category}</Text>
            </Badge>
          )}

          {/* Stream Stats */}
          <View className="mt-3 flex-row items-center space-x-4">
            <View className="flex-row items-center">
              <UsersIcon size={14} color="#9ca3af" />
              <Text className="ml-1 text-xs text-gray-400">
                Peak: {stream.peakViewerCount || stream.peakViewers || 0} viewers
              </Text>
            </View>

            {stats?.duration && (
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-400">
                  Duration: {Math.floor(stats.duration / 60)}m {stats.duration % 60}s
                </Text>
              </View>
            )}

            {stats?.bitrateKbps && (
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-400">
                  {Math.round(stats.bitrateKbps / 1000)} Mbps
                </Text>
              </View>
            )}

            {stats?.resolution && (
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-400">{stats.resolution}</Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

/**
 * ReactionButton Component
 * Displays emoji reaction button with accessibility support
 */
function ReactionButton({ icon, onPress }: { icon: string; onPress: () => void }) {
  const reactionMap: Record<string, string> = {
    '❤️': 'heart',
    '👍': 'thumbs up',
    '👏': 'clap',
    '🔥': 'fire',
    '⭐': 'star',
  };

  const label = reactionMap[icon] || 'reaction';

  return (
    <Pressable
      onPress={onPress}
      className="h-14 w-14 items-center justify-center rounded-full bg-black/60 active:bg-black/80"
      accessibilityRole="button"
      accessibilityLabel={`Send ${label} reaction`}
      accessibilityHint={`Sends a ${label} emoji that floats up on the screen`}>
      <Text className="text-3xl" accessibilityElementsHidden>
        {icon}
      </Text>
    </Pressable>
  );
}
