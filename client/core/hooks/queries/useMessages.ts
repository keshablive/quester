/**
 * Messages Query Hooks
 *
 * TanStack Query hooks for fetching messaging data with caching.
 * FR-010: Cache message data with 30s stale time for threads, 60s for messages.
 *
 * @module core/hooks/queries/useMessages
 */

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import {
  messagesService,
  type Message,
  type MessageThread,
  type MessageStats,
} from '../../api/services/messages.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type { ApiError, PaginatedResponse } from '../../types/query.types';

// ═══════════════════════════════════════════════════════════════
// Thread Queries
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all message threads for the current user
 *
 * FR-001: Display message threads with participant name, last message preview,
 * timestamp, and unread indicator
 * FR-002: Sort by most recent activity (newest first)
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with message threads array
 *
 * @example
 * ```tsx
 * function MessageList() {
 *   const { data: threads, isLoading, error, refetch } = useMessageThreads();
 *
 *   if (isLoading) return <ThreadsSkeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *
 *   return threads?.map(thread => (
 *     <ThreadItem key={thread.id} thread={thread} />
 *   ));
 * }
 * ```
 */
export function useMessageThreads(
  options?: Omit<
    UseQueryOptions<MessageThread[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<MessageThread[], ApiError> {
  return useQuery({
    queryKey: queryKeys.messages.threads(),
    queryFn: () => messagesService.getThreads(),
    staleTime: STALE_TIMES.MESSAGES_THREADS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch recent messages for dashboard display (limit 3)
 *
 * US4: Dashboard Recent Messages - replace hardcoded mock messages
 *
 * @param limit - Maximum number of threads to return (default: 3)
 * @param options - Optional TanStack Query options
 * @returns Query result with limited message threads array
 *
 * @example
 * ```tsx
 * function DashboardMessages() {
 *   const { data: recentMessages, isLoading } = useRecentMessages(3);
 *
 *   if (isLoading) return <MessagesSkeleton count={3} />;
 *
 *   return recentMessages?.map(msg => (
 *     <MessagePreview key={msg.id} thread={msg} />
 *   ));
 * }
 * ```
 */
export function useRecentMessages(
  limit: number = 3,
  options?: Omit<
    UseQueryOptions<MessageThread[], ApiError>,
    'queryKey' | 'queryFn' | 'select'
  >
): UseQueryResult<MessageThread[], ApiError> {
  return useQuery({
    queryKey: queryKeys.messages.threads(),
    queryFn: () => messagesService.getThreads(),
    staleTime: STALE_TIMES.MESSAGES_THREADS,
    gcTime: GC_TIME,
    select: (data) => data.slice(0, limit),
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════
// Direct Message Queries
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch conversation messages with a specific user (with infinite scroll)
 *
 * FR-003: Display full conversation history in chronological order
 * FR-004: Support infinite scroll for loading older messages
 *
 * @param userId - The other participant's user ID
 * @param options - Optional TanStack Query options
 * @returns Infinite query result with paginated messages
 *
 * @example
 * ```tsx
 * function ConversationView({ userId }) {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *     isLoading,
 *   } = useConversationMessages(userId);
 *
 *   const messages = data?.pages.flatMap(page => page) ?? [];
 *
 *   return (
 *     <FlatList
 *       data={messages}
 *       onEndReached={() => hasNextPage && fetchNextPage()}
 *       // inverted for chat-style scroll
 *     />
 *   );
 * }
 * ```
 */
export function useConversationMessages(userId: string): UseInfiniteQueryResult<
  { pages: Message[][]; pageParams: number[] },
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.messages.conversationInfinite(userId),
    queryFn: ({ pageParam }) => messagesService.getDirectMessages(userId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // If last page has items, there might be more
      // Return undefined if no more pages
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
    staleTime: STALE_TIMES.MESSAGES,
    gcTime: GC_TIME,
    enabled: !!userId,
  });
}

// ═══════════════════════════════════════════════════════════════
// Group Message Queries
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch group conversation messages (with infinite scroll)
 *
 * US8: View and Send Group Messages
 *
 * @param groupId - The group's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Infinite query result with paginated group messages
 *
 * @example
 * ```tsx
 * function GroupConversation({ groupId }) {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *   } = useGroupMessages(groupId);
 *
 *   const messages = data?.pages.flatMap(page => page) ?? [];
 *
 *   return (
 *     <FlatList
 *       data={messages}
 *       onEndReached={() => hasNextPage && fetchNextPage()}
 *     />
 *   );
 * }
 * ```
 */
export function useGroupMessages(groupId: string): UseInfiniteQueryResult<
  { pages: Message[][]; pageParams: number[] },
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.messages.groupInfinite(groupId),
    queryFn: ({ pageParam }) => messagesService.getGroupMessages(groupId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
    staleTime: STALE_TIMES.MESSAGES,
    gcTime: GC_TIME,
    enabled: !!groupId,
  });
}

// ═══════════════════════════════════════════════════════════════
// Unread Count & Stats Queries
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch unread message count
 *
 * FR-007: Display accurate unread message counts
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with unread count number
 *
 * @example
 * ```tsx
 * function MessageBadge() {
 *   const { data: unreadCount } = useUnreadCount();
 *
 *   if (!unreadCount || unreadCount === 0) return null;
 *
 *   return <Badge count={unreadCount} />;
 * }
 * ```
 */
export function useUnreadCount(
  options?: Omit<
    UseQueryOptions<number, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<number, ApiError> {
  return useQuery({
    queryKey: queryKeys.messages.unreadCount(),
    queryFn: () => messagesService.getUnreadCount(),
    staleTime: STALE_TIMES.MESSAGES_THREADS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch message statistics
 *
 * @param options - Optional TanStack Query options
 * @returns Query result with message stats
 *
 * @example
 * ```tsx
 * function MessageStats() {
 *   const { data: stats } = useMessageStats();
 *
 *   return (
 *     <View>
 *       <Text>Total: {stats?.totalMessages}</Text>
 *       <Text>Unread: {stats?.unreadCount}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useMessageStats(
  options?: Omit<
    UseQueryOptions<MessageStats, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<MessageStats, ApiError> {
  return useQuery({
    queryKey: queryKeys.messages.stats(),
    queryFn: () => messagesService.getStats(),
    staleTime: STALE_TIMES.MESSAGES_THREADS,
    gcTime: GC_TIME,
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════
// Search Query
// ═══════════════════════════════════════════════════════════════

/**
 * Search messages by content
 *
 * FR-009: Support searching messages by content
 *
 * @param query - Search query string
 * @param options - Optional TanStack Query options
 * @returns Query result with matching messages
 *
 * @example
 * ```tsx
 * function MessageSearch() {
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *
 *   const { data: results, isLoading } = useSearchMessages(debouncedQuery);
 *
 *   return (
 *     <View>
 *       <SearchInput value={query} onChangeText={setQuery} />
 *       {isLoading ? <Spinner /> : (
 *         <SearchResults results={results} />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useSearchMessages(
  query: string,
  options?: Omit<
    UseQueryOptions<Message[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Message[], ApiError> {
  return useQuery({
    queryKey: queryKeys.messages.search(query),
    queryFn: () => messagesService.searchMessages(query),
    staleTime: STALE_TIMES.MESSAGES,
    gcTime: 5 * 60 * 1000, // 5 minutes for search results (shorter retention)
    enabled: query.length >= 2, // Only search with 2+ characters
    ...options,
  });
}
