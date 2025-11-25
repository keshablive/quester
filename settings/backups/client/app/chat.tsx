import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Info, CloudOff } from 'lucide-react-native';
import { MessageList } from '@/components/messaging/MessageList';
import { ChatInput } from '@/components/messaging/ChatInput';
import { useMessaging } from '@/lib/hooks/useMessaging';
import { uploadFile } from '@/lib/api/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Attachment {
  uri: string;
  type: 'image' | 'video' | 'file';
  name?: string;
  size?: number;
  mimeType?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type: 'direct' | 'group';
    id: string;
    name: string;
  }>();

  const { type, id, name } = params;
  const isGroupChat = type === 'group';

  const {
    messages,
    typingUsers,
    isLoadingMessages,
    hasMoreMessages,
    isSending,
    fetchMessages,
    sendDirectMessage,
    sendGroupMessage,
    markAsRead,
    setTyping,
    loadMoreMessages,
    setCurrentChatId,
    setCurrentGroupId,
    isConnected,
  } = useMessaging({ autoConnect: true });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const initialLoadDone = useRef(false);

  // Get current user ID
  useEffect(() => {
    AsyncStorage.getItem('user_id').then((userId) => {
      if (userId) {
        setCurrentUserId(userId);
      }
    });
  }, []);

  // Set current chat/group and fetch messages
  useEffect(() => {
    if (!id) return;

    if (isGroupChat) {
      setCurrentGroupId(id);
      setCurrentChatId(null);
    } else {
      setCurrentChatId(id);
      setCurrentGroupId(null);
    }

    // Fetch messages on mount
    if (!initialLoadDone.current) {
      if (isGroupChat) {
        fetchMessages(undefined, id);
      } else {
        fetchMessages(id, undefined);
      }
      initialLoadDone.current = true;
    }

    // Cleanup on unmount
    return () => {
      setCurrentChatId(null);
      setCurrentGroupId(null);
    };
  }, [id, isGroupChat, fetchMessages, setCurrentChatId, setCurrentGroupId]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!content.trim() && !attachments?.length) return;

      try {
        let mediaUrl: string | undefined;

        // Upload attachments if any
        if (attachments && attachments.length > 0) {
          setIsUploading(true);

          try {
            // Upload first attachment (for now, single attachment support)
            const attachment = attachments[0];
            mediaUrl = await uploadFile({
              uri: attachment.uri,
              type: attachment.mimeType || 'application/octet-stream',
              name: attachment.name || `file_${Date.now()}`,
            });
          } catch (error) {
            console.error('Error uploading file:', error);
            Alert.alert('Upload Failed', 'Failed to upload attachment. Please try again.');
            return;
          } finally {
            setIsUploading(false);
          }
        }

        // Send message
        if (isGroupChat) {
          await sendGroupMessage(id, content, mediaUrl);
        } else {
          await sendDirectMessage(id, content, mediaUrl);
        }

        // Stop typing indicator
        setTyping(false, isGroupChat ? undefined : id, isGroupChat ? id : undefined);
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
        throw error;
      }
    },
    [id, isGroupChat, sendDirectMessage, sendGroupMessage, setTyping]
  );

  // Handle typing
  const handleTyping = useCallback(
    (isTyping: boolean) => {
      setTyping(isTyping, isGroupChat ? undefined : id, isGroupChat ? id : undefined);
    },
    [id, isGroupChat, setTyping]
  );

  // Handle message press
  const handleMessagePress = useCallback(
    (message: any) => {
      // Mark as read if not already read
      if (!message.read_at && currentUserId && message.recipient_id === currentUserId) {
        markAsRead(message.id);
      }
    },
    [currentUserId, markAsRead]
  );

  // Handle media press
  const handleMediaPress = useCallback(
    (mediaUrl: string, type: 'image' | 'video') => {
      // Navigate to media viewer
      router.push({
        pathname: '/media-viewer' as any,
        params: { url: mediaUrl, type },
      } as any);
    },
    [router]
  );

  // Handle back press
  const handleBack = () => {
    router.back();
  };

  // Handle info press
  const handleInfo = () => {
    if (isGroupChat) {
      router.push({
        pathname: '/group-info' as any,
        params: { id },
      } as any);
    } else {
      router.push({
        pathname: '/user-profile' as any,
        params: { id },
      } as any);
    }
  };

  // Get typing users names
  const typingUsersNames = typingUsers
    .filter((u) => u.user_id !== currentUserId)
    .map((u) => u.username);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={24} color="#007AFF" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name || 'Chat'}
          </Text>
          {!isConnected && <Text style={styles.headerSubtitle}>Connecting...</Text>}
          {isConnected && typingUsersNames.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {typingUsersNames.length === 1
                ? `${typingUsersNames[0]} is typing...`
                : `${typingUsersNames.length} people typing...`}
            </Text>
          )}
        </View>

        <Pressable style={styles.infoButton} onPress={handleInfo}>
          <Info size={24} color="#007AFF" />
        </Pressable>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {isLoadingMessages && messages.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loaderText}>Loading messages...</Text>
          </View>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUserId || ''}
            onLoadMore={loadMoreMessages}
            isLoading={isLoadingMessages}
            hasMore={hasMoreMessages}
            typingUsers={typingUsersNames}
            onMessagePress={handleMessagePress}
            onMediaPress={handleMediaPress}
          />
        )}

        {/* Upload indicator */}
        {isUploading && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator size="small" color="#FFF" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}

        {/* Chat input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          placeholder={`Message ${name || 'chat'}...`}
          disabled={isSending || isUploading || !isConnected}
          allowAttachments={true}
          allowEmoji={true}
        />
      </KeyboardAvoidingView>

      {/* Connection lost banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <CloudOff size={16} color="#FFF" />
          <Text style={styles.offlineText}>No connection</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loaderText: {
    fontSize: 16,
    color: '#999',
  },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  uploadingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
