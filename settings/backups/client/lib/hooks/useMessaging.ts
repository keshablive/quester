import { useState, useEffect, useCallback, useRef } from 'react';
import { messagingApi, websocket } from '../api/messaging';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id?: string;
  group_id?: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  media_url?: string;
  thumbnail_url?: string;
  file_name?: string;
  file_size?: number;
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface Thread {
  user_id?: string;
  group_id?: string;
  latest_message: Message;
  unread_count: number;
  participant?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  group?: {
    id: string;
    name: string;
    group_type: string;
  };
}

interface TypingUser {
  user_id: string;
  username: string;
  chat_id?: string;
  group_id?: string;
}

interface UseMessagingOptions {
  autoConnect?: boolean;
  currentUserId?: string;
}

export function useMessaging(options: UseMessagingOptions = {}) {
  const { autoConnect = true, currentUserId } = options;

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Loading states
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Pagination
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);
  const [messagesPage, setMessagesPage] = useState(1);
  const [threadsPage, setThreadsPage] = useState(1);

  // Current chat
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  // Refs for cleanup
  const unsubscribeRefs = useRef<(() => void)[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    try {
      await websocket.connect(
        () => {
          setIsConnected(true);
          setIsConnecting(false);
          console.log('Messaging WebSocket connected');
        },
        (error) => {
          console.error('Messaging WebSocket error:', error);
          setIsConnecting(false);
          setIsConnected(false);
        }
      );
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [isConnecting, isConnected]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocket.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to new messages
    const unsubscribeMessage = websocket.subscribe('message', (data: any) => {
      if (data.type === 'message') {
        const newMessage: Message = data.payload;
        
        // Add to messages if it's for current chat
        if (
          (currentChatId && 
            (newMessage.sender_id === currentChatId || newMessage.recipient_id === currentChatId)) ||
          (currentGroupId && newMessage.group_id === currentGroupId)
        ) {
          setMessages((prev) => [newMessage, ...prev]);
          
          // Mark as read if recipient
          if (currentUserId && newMessage.recipient_id === currentUserId) {
            messagingApi.markAsRead(newMessage.id).catch(console.error);
          }
        }

        // Update threads
        fetchThreads();
        fetchUnreadCount();
      }
    });

    // Subscribe to read receipts
    const unsubscribeRead = websocket.subscribe('read', (data: any) => {
      if (data.type === 'read') {
        const { message_id, read_at } = data.payload;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message_id ? { ...msg, read_at } : msg
          )
        );
      }
    });

    // Subscribe to typing indicators
    const unsubscribeTyping = websocket.subscribe('typing', (data: any) => {
      if (data.type === 'typing') {
        const { user_id, username, chat_id, group_id, is_typing } = data.payload;
        
        if (is_typing) {
          setTypingUsers((prev) => {
            // Check if user already typing
            const exists = prev.some(
              (u) => u.user_id === user_id && 
              (u.chat_id === chat_id || u.group_id === group_id)
            );
            
            if (!exists) {
              return [...prev, { user_id, username, chat_id, group_id }];
            }
            return prev;
          });

          // Auto-remove after 3 seconds
          setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((u) => u.user_id !== user_id)
            );
          }, 3000);
        } else {
          setTypingUsers((prev) =>
            prev.filter((u) => u.user_id !== user_id)
          );
        }
      }
    });

    // Subscribe to group messages
    const unsubscribeGroup = websocket.subscribe('group_message', (data: any) => {
      if (data.type === 'group_message') {
        const newMessage: Message = data.payload;
        
        if (currentGroupId && newMessage.group_id === currentGroupId) {
          setMessages((prev) => [newMessage, ...prev]);
        }

        fetchThreads();
        fetchUnreadCount();
      }
    });

    // Store unsubscribe functions
    unsubscribeRefs.current = [
      unsubscribeMessage,
      unsubscribeRead,
      unsubscribeTyping,
      unsubscribeGroup,
    ];

    return () => {
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [isConnected, currentChatId, currentGroupId, currentUserId]);

  // Fetch messages for a chat
  const fetchMessages = useCallback(
    async (userId?: string, groupId?: string, page = 1) => {
      setIsLoadingMessages(true);
      try {
        let response;
        if (userId) {
          response = await messagingApi.getDirectMessages(userId, page);
        } else if (groupId) {
          response = await messagingApi.getGroupMessages(groupId, page);
        } else {
          throw new Error('Either userId or groupId must be provided');
        }

        if (page === 1) {
          setMessages(response.messages || []);
        } else {
          setMessages((prev) => [...prev, ...(response.messages || [])]);
        }

        setHasMoreMessages(response.has_more || false);
        setMessagesPage(page);
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  // Fetch conversation threads
  const fetchThreads = useCallback(async (page = 1) => {
    setIsLoadingThreads(true);
    try {
      const response = await messagingApi.getThreads(page);
      
      if (page === 1) {
        setThreads(response.threads || []);
      } else {
        setThreads((prev) => [...prev, ...(response.threads || [])]);
      }

      setHasMoreThreads(response.has_more || false);
      setThreadsPage(page);
    } catch (error) {
      console.error('Error fetching threads:', error);
      throw error;
    } finally {
      setIsLoadingThreads(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await messagingApi.getUnreadCount();
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Send direct message
  const sendDirectMessage = useCallback(
    async (recipientId: string, content: string, mediaUrl?: string) => {
      setIsSending(true);
      try {
        const message = await messagingApi.sendDirectMessage(recipientId, content, mediaUrl);
        
        // Add to local messages immediately
        setMessages((prev) => [message, ...prev]);
        
        // Update threads
        fetchThreads();
        
        return message;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [fetchThreads]
  );

  // Send group message
  const sendGroupMessage = useCallback(
    async (groupId: string, content: string, mediaUrl?: string) => {
      setIsSending(true);
      try {
        const message = await messagingApi.sendGroupMessage(groupId, content, mediaUrl);
        
        // Add to local messages immediately
        setMessages((prev) => [message, ...prev]);
        
        // Update threads
        fetchThreads();
        
        return message;
      } catch (error) {
        console.error('Error sending group message:', error);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [fetchThreads]
  );

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await messagingApi.markAsRead(messageId);
      
      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, read_at: new Date().toISOString() } : msg
        )
      );
      
      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [fetchUnreadCount]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await messagingApi.deleteMessage(messageId);
      
      // Remove from local state
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);

  // Set typing indicator
  const setTyping = useCallback(
    async (isTyping: boolean, recipientId?: string, groupId?: string) => {
      if (!isTyping) {
        // Clear typing immediately
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        return;
      }

      try {
        await messagingApi.setTyping(recipientId, groupId);
        
        // Auto-clear typing after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          messagingApi.setTyping(undefined, undefined).catch(console.error);
        }, 3000);
      } catch (error) {
        console.error('Error setting typing indicator:', error);
      }
    },
    []
  );

  // Load more messages
  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMessages && hasMoreMessages) {
      if (currentChatId) {
        fetchMessages(currentChatId, undefined, messagesPage + 1);
      } else if (currentGroupId) {
        fetchMessages(undefined, currentGroupId, messagesPage + 1);
      }
    }
  }, [
    isLoadingMessages,
    hasMoreMessages,
    currentChatId,
    currentGroupId,
    messagesPage,
    fetchMessages,
  ]);

  // Load more threads
  const loadMoreThreads = useCallback(() => {
    if (!isLoadingThreads && hasMoreThreads) {
      fetchThreads(threadsPage + 1);
    }
  }, [isLoadingThreads, hasMoreThreads, threadsPage, fetchThreads]);

  // Search messages
  const searchMessages = useCallback(async (keyword: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await messagingApi.searchMessages(keyword);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting) {
      connect();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [autoConnect, isConnected, isConnecting, connect]);

  // Fetch initial data
  useEffect(() => {
    if (isConnected) {
      fetchThreads();
      fetchUnreadCount();
    }
  }, [isConnected, fetchThreads, fetchUnreadCount]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connect,
    disconnect,

    // Messages
    messages,
    threads,
    unreadCount,
    typingUsers: currentChatId
      ? typingUsers.filter((u) => u.chat_id === currentChatId)
      : currentGroupId
      ? typingUsers.filter((u) => u.group_id === currentGroupId)
      : [],

    // Loading states
    isLoadingMessages,
    isLoadingThreads,
    isSending,

    // Pagination
    hasMoreMessages,
    hasMoreThreads,
    loadMoreMessages,
    loadMoreThreads,

    // Actions
    fetchMessages,
    fetchThreads,
    fetchUnreadCount,
    sendDirectMessage,
    sendGroupMessage,
    markAsRead,
    deleteMessage,
    setTyping,
    searchMessages,

    // Current chat
    setCurrentChatId,
    setCurrentGroupId,
  };
}
