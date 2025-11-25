import * as React from 'react';
import { View, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Send } from 'lucide-react-native';
import { MessageList } from './message-list';
import { TypingIndicator } from '@/components/real-time/typing-indicator';
import type { Message } from '@/lib/api/messaging';
import type { TypingIndicator as TypingUser } from '@/lib/types/real-time';

export type ChatWindowProps = {
  messages: Message[];
  currentUserId: string;
  recipientId?: string;
  groupId?: string;
  typingUsers?: TypingUser[];
  onSendMessage: (content: string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onTyping?: (isTyping: boolean) => void;
  className?: string;
};

export function ChatWindow({
  messages,
  currentUserId,
  recipientId: _recipientId,
  groupId: _groupId,
  typingUsers = [],
  onSendMessage,
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
  onTyping,
  className,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [isUserTyping, setIsUserTyping] = React.useState(false);
  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle typing indicator
  const handleInputChange = React.useCallback(
    (text: string) => {
      setInputValue(text);

      // Start typing indicator
      if (!isUserTyping && text.length > 0) {
        setIsUserTyping(true);
        onTyping?.(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator after 2s of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsUserTyping(false);
        onTyping?.(false);
      }, 2000);
    },
    [isUserTyping, onTyping]
  );

  // Stop typing when unmounting
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isUserTyping) {
        onTyping?.(false);
      }
    };
  }, [isUserTyping, onTyping]);

  const handleSend = React.useCallback(() => {
    const trimmedMessage = inputValue.trim();
    if (trimmedMessage.length === 0) return;

    onSendMessage(trimmedMessage);
    setInputValue('');
    setIsUserTyping(false);
    onTyping?.(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [inputValue, onSendMessage, onTyping]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 bg-background ${className || ''}`}
      keyboardVerticalOffset={100}>
      <View className="flex-1">
        {/* Message list */}
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          onLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
        />

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View className="px-4 py-2">
            <TypingIndicator users={typingUsers} size="compact" />
          </View>
        )}
      </View>

      {/* Message input */}
      <View className="border-t border-border bg-card p-4">
        <View className="flex-row items-center space-x-3">
          <TextInput
            value={inputValue}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={1000}
            className="max-h-24 flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-foreground"
            style={{ minHeight: 40 }}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />

          <Pressable
            onPress={handleSend}
            disabled={inputValue.trim().length === 0}
            className={`rounded-full p-3 ${
              inputValue.trim().length > 0 ? 'bg-primary' : 'bg-muted'
            }`}>
            <Send size={20} color={inputValue.trim().length > 0 ? '#FFFFFF' : '#9CA3AF'} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
