/**
 * Message Mutation Hooks
 *
 * TanStack Query mutations for messaging with optimistic updates,
 * automatic rollback, and cache invalidation.
 *
 * FR-005: Enable sending direct messages with optimistic UI updates
 * FR-014: Enable sending group messages with optimistic UI updates
 * FR-016: Allow users to delete their own messages only
 *
 * @module core/hooks/mutations/useMessageMutations
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  messagesService,
  type Message,
} from '../../services/messages.service';
import { queryKeys } from '../../query/keys';
import type { ApiError } from '../../types/query.types';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/**
 * Input for sending a direct message
 */
export interface SendDirectMessageInput {
  receiverId: string;
  content: string;
}

/**
 * Input for sending a group message
 */
export interface SendGroupMessageInput {
  groupId: string;
  content: string;
}

/**
 * Context for optimistic updates and rollback
 */
interface MessageMutationContext {
  previousMessages?: Message[];
  optimisticId: string;
}

/**
 * Optimistic message with pending state
 */
interface OptimisticMessage extends Message {
  isPending?: boolean;
  isError?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Send Direct Message Mutation
// ═══════════════════════════════════════════════════════════════

/**
 * Send a direct message with optimistic update
 *
 * FR-005: Enable sending direct messages with optimistic UI updates
 * FR-006: Show send failure states with retry capability
 *
 * The message appears immediately in the UI while the API call is in progress.
 * If the mutation fails, the cache is rolled back and error state is shown.
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for sending direct messages
 *
 * @example
 * ```tsx
 * function MessageComposer({ receiverId }) {
 *   const { mutate: sendMessage, isPending, isError } = useSendDirectMessage();
 *
 *   const handleSend = (content: string) => {
 *     sendMessage({ receiverId, content }, {
 *       onSuccess: () => {
 *         // Message sent successfully
 *       },
 *       onError: (error) => {
 *         Toast.show(`Failed to send: ${error.message}`);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <ComposerInput onSend={handleSend} isLoading={isPending} />
 *   );
 * }
 * ```
 */
export function useSendDirectMessage(
  options?: Omit<
    UseMutationOptions<Message, ApiError, SendDirectMessageInput, MessageMutationContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<Message, ApiError, SendDirectMessageInput, MessageMutationContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiverId, content }: SendDirectMessageInput) =>
      messagesService.sendDirectMessage(receiverId, content),

    // Optimistic update: immediately add message to cache
    onMutate: async ({ receiverId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages.conversationInfinite(receiverId),
      });

      // Snapshot previous messages for rollback
      const previousData = queryClient.getQueryData<{ pages: Message[][]; pageParams: number[] }>(
        queryKeys.messages.conversationInfinite(receiverId)
      );
      const previousMessages = previousData?.pages.flatMap((page) => page);

      // Create optimistic message
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: OptimisticMessage = {
        id: optimisticId,
        content,
        senderId: 'me', // Will be replaced by actual user ID from JWT
        receiverId,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPending: true,
      };

      // Update cache optimistically
      queryClient.setQueryData<{ pages: Message[][]; pageParams: number[] }>(
        queryKeys.messages.conversationInfinite(receiverId),
        (old) => {
          if (!old) {
            return { pages: [[optimisticMessage]], pageParams: [1] };
          }
          // Add to the first page (newest messages)
          const newPages = [...old.pages];
          newPages[0] = [...(newPages[0] || []), optimisticMessage];
          return { ...old, pages: newPages };
        }
      );

      return { previousMessages, optimisticId };
    },

    // Rollback on error
    onError: (err, { receiverId }, context) => {
      if (context?.previousMessages) {
        // Restore previous state
        queryClient.setQueryData<{ pages: Message[][]; pageParams: number[] }>(
          queryKeys.messages.conversationInfinite(receiverId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: [context.previousMessages || []],
            };
          }
        );
      }
    },

    // Refetch after success or error
    onSettled: (data, error, { receiverId }) => {
      // Invalidate conversation and threads to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.conversationInfinite(receiverId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.threads(),
      });
    },

    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════
// Send Group Message Mutation
// ═══════════════════════════════════════════════════════════════

/**
 * Send a group message with optimistic update
 *
 * FR-014: Enable sending group messages with optimistic UI updates
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for sending group messages
 *
 * @example
 * ```tsx
 * function GroupComposer({ groupId }) {
 *   const { mutate: sendMessage, isPending } = useSendGroupMessage();
 *
 *   const handleSend = (content: string) => {
 *     sendMessage({ groupId, content });
 *   };
 *
 *   return <ComposerInput onSend={handleSend} isLoading={isPending} />;
 * }
 * ```
 */
export function useSendGroupMessage(
  options?: Omit<
    UseMutationOptions<Message, ApiError, SendGroupMessageInput, MessageMutationContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<Message, ApiError, SendGroupMessageInput, MessageMutationContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, content }: SendGroupMessageInput) =>
      messagesService.sendGroupMessage(groupId, content),

    // Optimistic update
    onMutate: async ({ groupId, content }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.messages.groupInfinite(groupId),
      });

      const previousData = queryClient.getQueryData<{ pages: Message[][]; pageParams: number[] }>(
        queryKeys.messages.groupInfinite(groupId)
      );
      const previousMessages = previousData?.pages.flatMap((page) => page);

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: OptimisticMessage = {
        id: optimisticId,
        content,
        senderId: 'me',
        groupId,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPending: true,
      };

      queryClient.setQueryData<{ pages: Message[][]; pageParams: number[] }>(
        queryKeys.messages.groupInfinite(groupId),
        (old) => {
          if (!old) {
            return { pages: [[optimisticMessage]], pageParams: [1] };
          }
          const newPages = [...old.pages];
          newPages[0] = [...(newPages[0] || []), optimisticMessage];
          return { ...old, pages: newPages };
        }
      );

      return { previousMessages, optimisticId };
    },

    onError: (err, { groupId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData<{ pages: Message[][]; pageParams: number[] }>(
          queryKeys.messages.groupInfinite(groupId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: [context.previousMessages || []],
            };
          }
        );
      }
    },

    onSettled: (data, error, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.groupInfinite(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.threads(),
      });
    },

    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════
// Mark as Read Mutation
// ═══════════════════════════════════════════════════════════════

/**
 * Mark a message as read
 *
 * FR-008: Automatically mark messages as read when conversation is viewed
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for marking messages as read
 *
 * @example
 * ```tsx
 * function ConversationView({ userId }) {
 *   const { mutate: markAsRead } = useMarkAsRead();
 *
 *   useEffect(() => {
 *     // Mark messages as read when conversation opens
 *     messages.filter(m => !m.read).forEach(m => markAsRead(m.id));
 *   }, [messages]);
 * }
 * ```
 */
export function useMarkAsRead(
  options?: Omit<
    UseMutationOptions<void, ApiError, string>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => messagesService.markAsRead(messageId),

    onSuccess: () => {
      // Invalidate unread count and threads to reflect new read status
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.unreadCount(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.threads(),
      });
    },

    ...options,
  });
}

/**
 * Mark multiple messages as read at once
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for marking multiple messages as read
 */
export function useMarkMultipleAsRead(
  options?: Omit<
    UseMutationOptions<void, ApiError, string[]>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<void, ApiError, string[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageIds: string[]) => messagesService.markMultipleAsRead(messageIds),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.unreadCount(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.threads(),
      });
    },

    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════
// Delete Message Mutation
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a message with optimistic update
 *
 * FR-016: Allow users to delete their own messages only
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for deleting messages
 *
 * @example
 * ```tsx
 * function MessageItem({ message, currentUserId }) {
 *   const { mutate: deleteMessage, isPending } = useDeleteMessage();
 *
 *   // Only show delete for own messages
 *   const canDelete = message.senderId === currentUserId;
 *
 *   const handleDelete = () => {
 *     if (confirm('Delete this message?')) {
 *       deleteMessage({
 *         messageId: message.id,
 *         conversationId: message.receiverId || message.groupId,
 *         isGroup: !!message.groupId,
 *       });
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Text>{message.content}</Text>
 *       {canDelete && (
 *         <IconButton icon="delete" onPress={handleDelete} disabled={isPending} />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export interface DeleteMessageInput {
  messageId: string;
  conversationId: string;
  isGroup: boolean;
}

interface DeleteMessageContext {
  previousMessages?: Message[];
}

export function useDeleteMessage(
  options?: Omit<
    UseMutationOptions<void, ApiError, DeleteMessageInput, DeleteMessageContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<void, ApiError, DeleteMessageInput, DeleteMessageContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }: DeleteMessageInput) =>
      messagesService.deleteMessage(messageId),

    // Optimistic update: remove message from cache
    onMutate: async ({ messageId, conversationId, isGroup }) => {
      const queryKey = isGroup
        ? queryKeys.messages.groupInfinite(conversationId)
        : queryKeys.messages.conversationInfinite(conversationId);

      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<{ pages: Message[][]; pageParams: number[] }>(
        queryKey
      );
      const previousMessages = previousData?.pages.flatMap((page) => page);

      // Remove message from cache
      queryClient.setQueryData<{ pages: Message[][]; pageParams: number[] }>(
        queryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.filter((msg) => msg.id !== messageId)
            ),
          };
        }
      );

      return { previousMessages };
    },

    // Rollback on error
    onError: (err, { conversationId, isGroup }, context) => {
      if (context?.previousMessages) {
        const queryKey = isGroup
          ? queryKeys.messages.groupInfinite(conversationId)
          : queryKeys.messages.conversationInfinite(conversationId);

        queryClient.setQueryData<{ pages: Message[][]; pageParams: number[] }>(
          queryKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: [context.previousMessages || []],
            };
          }
        );
      }
    },

    // Refetch to ensure consistency
    onSettled: (data, error, { conversationId, isGroup }) => {
      const queryKey = isGroup
        ? queryKeys.messages.groupInfinite(conversationId)
        : queryKeys.messages.conversationInfinite(conversationId);

      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.threads(),
      });
    },

    ...options,
  });
}
