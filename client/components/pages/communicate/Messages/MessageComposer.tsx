/**
 * MessageComposer Component
 *
 * Text input for composing and sending messages with:
 * - Character limit validation (2000 chars - FR-017)
 * - Send button enabled/disabled state
 * - Optimistic message sending
 * - Error handling with retry
 *
 * Feature 017: Messages API Integration
 * User Story 3: Send Direct Messages
 *
 * @module components/pages/communicate/Messages/MessageComposer
 */

import * as React from 'react';
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Icon, Button } from '@/components/ui';
import { Send, AlertCircle, RefreshCw, X } from 'lucide-react-native';
import { useSendDirectMessage, useSendGroupMessage } from '@/core/hooks/mutations';

// FR-017: Maximum message length
const MAX_MESSAGE_LENGTH = 2000;

interface MessageComposerProps {
  /**
   * Recipient user ID for direct messages
   */
  receiverId?: string;
  /**
   * Group ID for group messages
   */
  groupId?: string;
  /**
   * Placeholder text for the input
   */
  placeholder?: string;
  /**
   * Callback when message is sent successfully
   */
  onSent?: () => void;
  /**
   * Auto-focus the input
   */
  autoFocus?: boolean;
}

/**
 * Message composer with send functionality
 *
 * @example
 * ```tsx
 * // Direct message
 * <MessageComposer
 *   receiverId={thread.participantId}
 *   onSent={() => scrollToBottom()}
 * />
 *
 * // Group message
 * <MessageComposer
 *   groupId={group.id}
 *   placeholder="Message the group..."
 * />
 * ```
 */
export function MessageComposer({
  receiverId,
  groupId,
  placeholder = 'Type a message...',
  onSent,
  autoFocus = false,
}: MessageComposerProps) {
  const [message, setMessage] = React.useState('');
  const [lastError, setLastError] = React.useState<Error | null>(null);
  const [retryPayload, setRetryPayload] = React.useState<{
    receiverId?: string;
    groupId?: string;
    content: string;
  } | null>(null);
  const inputRef = React.useRef<TextInput>(null);

  // Mutations for sending messages
  const sendDirect = useSendDirectMessage();
  const sendGroup = useSendGroupMessage();

  // Determine if sending is in progress
  const isSending = sendDirect.isPending || sendGroup.isPending;

  // Character count and validation (FR-017)
  const charCount = message.length;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;
  const isEmpty = message.trim().length === 0;
  const canSend = !isEmpty && !isOverLimit && !isSending;

  // Handle send action
  const handleSend = React.useCallback(() => {
    if (!canSend) return;

    const content = message.trim();

    if (receiverId) {
      sendDirect.mutate(
        { receiverId, content },
        {
          onSuccess: () => {
            setMessage('');
            setLastError(null);
            setRetryPayload(null);
            onSent?.();
          },
          onError: (error: Error) => {
            setLastError(error);
            setRetryPayload({ receiverId, content });
          },
        }
      );
    } else if (groupId) {
      sendGroup.mutate(
        { groupId, content },
        {
          onSuccess: () => {
            setMessage('');
            setLastError(null);
            setRetryPayload(null);
            onSent?.();
          },
          onError: (error: Error) => {
            setLastError(error);
            setRetryPayload({ groupId, content });
          },
        }
      );
    }
  }, [canSend, message, receiverId, groupId, sendDirect, sendGroup, onSent]);

  // Handle retry after error
  const handleRetry = React.useCallback(() => {
    if (!retryPayload) return;

    if (retryPayload.receiverId) {
      sendDirect.mutate(
        {
          receiverId: retryPayload.receiverId,
          content: retryPayload.content,
        },
        {
          onSuccess: () => {
            setLastError(null);
            setRetryPayload(null);
            onSent?.();
          },
        }
      );
    } else if (retryPayload.groupId) {
      sendGroup.mutate(
        {
          groupId: retryPayload.groupId,
          content: retryPayload.content,
        },
        {
          onSuccess: () => {
            setLastError(null);
            setRetryPayload(null);
            onSent?.();
          },
        }
      );
    }
  }, [retryPayload, sendDirect, sendGroup, onSent]);

  // Clear error state
  const handleDismissError = React.useCallback(() => {
    setLastError(null);
    setRetryPayload(null);
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Error banner with retry (T031) */}
      {lastError && (
        <View className="flex-row items-center gap-2 bg-destructive/10 px-4 py-2">
          <Icon as={AlertCircle} size={16} className="text-destructive" />
          <Text className="flex-1 text-sm text-destructive">
            Failed to send message. Tap retry to try again.
          </Text>
          <Pressable onPress={handleRetry} className="p-2">
            <Icon as={RefreshCw} size={16} className="text-destructive" />
          </Pressable>
          <Pressable onPress={handleDismissError} className="p-2">
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        </View>
      )}

      <View className="border-t border-border bg-background px-4 py-2">
        {/* Character count warning */}
        {charCount > MAX_MESSAGE_LENGTH * 0.9 && (
          <View className="mb-1 flex-row justify-end">
            <Text
              className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {charCount}/{MAX_MESSAGE_LENGTH}
            </Text>
          </View>
        )}

        <View className="flex-row items-end gap-2">
          {/* Text input */}
          <View className="max-h-[120px] min-h-[40px] flex-1 rounded-2xl bg-muted px-4 py-2">
            <TextInput
              ref={inputRef}
              value={message}
              onChangeText={setMessage}
              placeholder={placeholder}
              placeholderTextColor="#999"
              multiline
              maxLength={MAX_MESSAGE_LENGTH + 100} // Allow typing over limit to show error
              editable={!isSending}
              autoFocus={autoFocus}
              className="text-foreground"
              style={{
                minHeight: 24,
                maxHeight: 100,
                fontSize: 16,
              }}
              returnKeyType="default"
            />
          </View>

          {/* Send button (T030) */}
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className={`h-10 w-10 items-center justify-center rounded-full ${
              canSend ? 'bg-primary' : 'bg-muted'
            }`}>
            {isSending ? (
              <ActivityIndicator size="small" color={canSend ? '#fff' : '#999'} />
            ) : (
              <Icon
                as={Send}
                size={20}
                className={canSend ? 'text-primary-foreground' : 'text-muted-foreground'}
              />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
