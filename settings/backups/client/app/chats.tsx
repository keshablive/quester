import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  User,
  ChevronRight,
  Search,
  MessageCircle,
  CloudOff,
  X,
  Edit3,
} from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { useMessaging } from '@/lib/hooks/useMessaging';
import { NotificationBadge } from '@/components/messaging/NotificationBadge';

interface Thread {
  user_id?: string;
  group_id?: string;
  latest_message: {
    id: string;
    content: string;
    sender_id: string;
    message_type: 'text' | 'image' | 'video' | 'file';
    created_at: string;
  };
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
    avatar_url?: string;
  };
}

export default function ChatsScreen() {
  const router = useRouter();
  const {
    threads,
    isLoadingThreads,
    hasMoreThreads,
    loadMoreThreads,
    fetchThreads,
    isConnected,
    connect,
  } = useMessaging({ autoConnect: true });

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter threads based on search query (optimized with useMemo - Phase 7, T113)
  const filteredThreads = React.useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return threads.filter((thread) => {
        const name = thread.group?.name || thread.participant?.username || '';
        const content = thread.latest_message.content || '';
        return name.toLowerCase().includes(query) || content.toLowerCase().includes(query);
      });
    }
    return threads;
  }, [searchQuery, threads]);

  // Format message time
  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  // Get message preview
  const getMessagePreview = (message: any): string => {
    switch (message.message_type) {
      case 'image':
        return '📷 Image';
      case 'video':
        return '🎥 Video';
      case 'file':
        return '📎 File';
      default:
        return message.content || '';
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchThreads(1);
    } catch (error) {
      console.error('Error refreshing threads:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchThreads]);

  // Handle thread press
  const handleThreadPress = (thread: Thread) => {
    if (thread.group_id) {
      router.push({
        pathname: '/chat',
        params: {
          type: 'group',
          id: thread.group_id,
          name: thread.group?.name || 'Group Chat',
        },
      });
    } else if (thread.user_id) {
      router.push({
        pathname: '/chat',
        params: {
          type: 'direct',
          id: thread.user_id,
          name: thread.participant?.username || 'Chat',
        },
      });
    }
  };

  // Handle new chat press
  const handleNewChat = () => {
    router.push('/new-chat' as any);
  };

  // Retry connection
  const handleRetryConnection = () => {
    connect();
  };

  // Render thread item
  const renderThread = useCallback(
    ({ item }: { item: Thread }) => {
      const isGroup = !!item.group_id;
      const name = isGroup ? item.group?.name : item.participant?.username;
      const avatarUrl = isGroup ? item.group?.avatar_url : item.participant?.avatar_url;
      const messagePreview = getMessagePreview(item.latest_message);
      const hasUnread = item.unread_count > 0;

      return (
        <Pressable
          style={[styles.threadItem, hasUnread && styles.unreadThread]}
          onPress={() => handleThreadPress(item)}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                {isGroup ? <Users size={24} color="#999" /> : <User size={24} color="#999" />}
              </View>
            )}

            {/* Unread badge */}
            {hasUnread && (
              <View style={styles.badgeContainer}>
                <NotificationBadge count={item.unread_count} size="small" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.name, hasUnread && styles.unreadName]} numberOfLines={1}>
                {name || 'Unknown'}
              </Text>
              <Text style={styles.time}>{formatMessageTime(item.latest_message.created_at)}</Text>
            </View>

            <Text style={[styles.preview, hasUnread && styles.unreadPreview]} numberOfLines={1}>
              {messagePreview}
            </Text>
          </View>

          {/* Chevron */}
          <ChevronRight size={20} color="#C7C7CC" />
        </Pressable>
      );
    },
    [handleThreadPress]
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoadingThreads) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={64} color="#C7C7CC" />
          <Text style={styles.emptyText}>No chats found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MessageCircle size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>No chats yet</Text>
        <Text style={styles.emptySubtext}>Start a conversation to get started</Text>
        <Pressable style={styles.newChatButton} onPress={handleNewChat}>
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </Pressable>
      </View>
    );
  };

  // Render footer
  const renderFooter = () => {
    if (!isLoadingThreads || threads.length === 0) return null;
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Connection status */}
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <CloudOff size={16} color="#FFF" />
          <Text style={styles.connectionText}>Connecting...</Text>
          <Pressable onPress={handleRetryConnection}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={20} color="#999" />
          </Pressable>
        )}
      </View>

      {/* Thread list - Optimized (Phase 7, T115-T118) */}
      <FlatList
        data={filteredThreads}
        renderItem={renderThread}
        keyExtractor={(item) => item.group_id || item.user_id || Math.random().toString()}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={() => {
          if (hasMoreThreads && !isLoadingThreads) {
            loadMoreThreads();
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        windowSize={21}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
      />

      {/* Floating new chat button */}
      <Pressable style={styles.fab} onPress={handleNewChat}>
        <Edit3 size={24} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  connectionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  retryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  listContent: {
    flexGrow: 1,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  unreadThread: {
    backgroundColor: '#F0F8FF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  unreadName: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  preview: {
    fontSize: 14,
    color: '#666',
  },
  unreadPreview: {
    color: '#000',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  newChatButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newChatButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
