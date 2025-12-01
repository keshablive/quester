/**
 * MessageSearch Component
 *
 * Search through messages with:
 * - Debounced search input (300ms - T048)
 * - Loading indicator during search (T046)
 * - Search results display (T045)
 * - Empty state for no results (T047)
 *
 * Feature 017: Messages API Integration
 * User Story 7: Search Messages
 *
 * @module components/features/communicate/Messages/MessageSearch
 */

import * as React from 'react';
import { View, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Text, Icon, Card, Skeleton } from '@/components/ui';
import { Search, MessageSquare, X, Clock } from 'lucide-react-native';
import { useSearchMessages } from '@/core/hooks/queries';
import type { Message } from './types';

// Debounce delay for search input (T048)
const SEARCH_DEBOUNCE_MS = 300;

interface MessageSearchProps {
  /**
   * Callback when a search result is selected
   */
  onResultSelect?: (message: Message) => void;
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
  /**
   * Whether to show as expanded search view
   */
  expanded?: boolean;
}

/**
 * Message search component with debounced input and results
 *
 * @example
 * ```tsx
 * // Compact mode (just input)
 * <MessageSearch />
 *
 * // Expanded mode (with results)
 * <MessageSearch
 *   expanded
 *   onResultSelect={(msg) => navigateToConversation(msg)}
 * />
 * ```
 */
export function MessageSearch({
  onResultSelect,
  placeholder = 'Search messages...',
  expanded = false,
}: MessageSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const inputRef = React.useRef<TextInput>(null);

  // Debounce search input (T048)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search query hook (T044)
  const {
    data: searchResults = [],
    isLoading,
    isError,
  } = useSearchMessages(debouncedQuery, {
    enabled: debouncedQuery.length >= 2, // Only search with 2+ characters
  });

  // Clear search
  const handleClear = React.useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  // Render search result item (T045)
  const renderResult = React.useCallback(
    ({ item: message }: { item: Message }) => {
      // Highlight matching text
      const highlightedContent = highlightMatch(message.content, debouncedQuery);
      const formattedDate = formatMessageDate(message.createdAt);

      return (
        <Pressable
          onPress={() => onResultSelect?.(message)}
          className="border-b border-border p-3 active:bg-muted/50">
          <View className="flex-row items-start gap-2">
            <View className="flex-1">
              <Text className="text-sm" numberOfLines={2}>
                {highlightedContent}
              </Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Icon as={Clock} size={10} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground">{formattedDate}</Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [debouncedQuery, onResultSelect]
  );

  // Key extractor
  const keyExtractor = React.useCallback((item: Message) => item.id, []);

  return (
    <View className="flex-1">
      {/* Search Input */}
      <View className="relative flex-row items-center rounded-lg bg-muted/30 px-3 py-2">
        <Icon as={Search} size={18} className="mr-2 text-muted-foreground" />
        <TextInput
          ref={inputRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={placeholder}
          placeholderTextColor="#999"
          className="flex-1 text-foreground"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {/* Loading indicator (T046) */}
        {isLoading && debouncedQuery.length >= 2 && (
          <ActivityIndicator size="small" className="mr-2" />
        )}
        {/* Clear button */}
        {searchQuery.length > 0 && (
          <Pressable onPress={handleClear} className="p-1">
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        )}
      </View>

      {/* Search Results (when expanded) */}
      {expanded && debouncedQuery.length >= 2 && (
        <View className="mt-2 flex-1">
          {/* Loading skeleton */}
          {isLoading && (
            <Card>
              {[1, 2, 3].map((i) => (
                <View key={i} className={`p-3 ${i < 3 ? 'border-b border-border' : ''}`}>
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="mb-1 h-3 w-3/4" />
                  <Skeleton className="h-2 w-16" />
                </View>
              ))}
            </Card>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <View className="items-center p-4">
              <Text className="text-destructive">Failed to search messages</Text>
            </View>
          )}

          {/* Results list */}
          {!isLoading && !isError && searchResults.length > 0 && (
            <Card>
              <FlatList
                data={searchResults}
                renderItem={renderResult}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
              />
            </Card>
          )}

          {/* Empty state (T047) */}
          {!isLoading && !isError && searchResults.length === 0 && (
            <View className="items-center gap-2 p-8">
              <Icon as={MessageSquare} size={40} className="text-muted-foreground/50" />
              <Text className="text-center text-muted-foreground">
                No messages found for "{debouncedQuery}"
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Hint text when not enough characters */}
      {expanded && debouncedQuery.length < 2 && searchQuery.length > 0 && (
        <View className="mt-2 items-center p-4">
          <Text className="text-sm text-muted-foreground">
            Enter at least 2 characters to search
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Highlight matching text in content
 */
function highlightMatch(content: string, query: string): string {
  // For now, just return the content. In a real implementation,
  // you'd use a Text component with styled segments for highlighting.
  return content;
}

/**
 * Format message date to relative or absolute format
 */
function formatMessageDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
