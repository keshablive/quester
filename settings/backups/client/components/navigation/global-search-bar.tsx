import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Search, X } from 'lucide-react-native';

export interface SearchResult {
  id: string;
  title: string;
  type: 'quest' | 'course' | 'marketplace' | 'social' | 'certificate';
  description: string;
}

interface GlobalSearchBarProps {
  onSearch: (query: string) => void;
  onResultSelect: (result: SearchResult) => void;
  onFocus?: () => void;
  results?: SearchResult[];
  isLoading?: boolean;
  showEmptyState?: boolean;
  maxPreviewResults?: number;
  debounceMs?: number;
}

export default function GlobalSearchBar({
  onSearch,
  onResultSelect,
  onFocus,
  results = [],
  isLoading = false,
  showEmptyState = false,
  maxPreviewResults = 5,
  debounceMs = 300,
}: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim()) {
      debounceTimer.current = setTimeout(() => {
        onSearch(query.trim());
      }, debounceMs);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, onSearch, debounceMs]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const handleResultPress = useCallback(
    (result: SearchResult) => {
      onResultSelect(result);
    },
    [onResultSelect]
  );

  const previewResults = results.slice(0, maxPreviewResults);

  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => (
      <Pressable
        className="border-b border-gray-600 p-4"
        onPress={() => handleResultPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.type}`}
        accessibilityHint="Tap to view details">
        <View className="gap-1">
          <Text variant="h4" className="text-white">
            {item.title}
          </Text>
          <Text variant="small" className="capitalize text-blue-400">
            {item.type}
          </Text>
          <Text variant="small" className="text-gray-400" numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </Pressable>
    ),
    [handleResultPress]
  );

  return (
    <View className="w-full">
      {/* Search Input */}
      <View className="flex-row items-center rounded-xl border border-gray-600 bg-gray-700 px-3 py-2.5">
        <Pressable
          testID="search-button"
          onPress={() => query && onSearch(query)}
          accessibilityRole="button"
          accessibilityLabel="Search"
          accessibilityHint="Tap to search"
          className="mr-2 min-h-[44px] min-w-[44px] items-center justify-center p-1">
          <Search size={20} color="#718096" />
        </Pressable>

        <TextInput
          testID="global-search-input"
          nativeID="global-search-input"
          className="flex-1 p-0 text-base text-white"
          value={query}
          onChangeText={setQuery}
          onFocus={onFocus}
          placeholder="Search quests, courses, items..."
          placeholderTextColor="#a0aec0"
          accessibilityRole="search"
          accessibilityLabel="Global search input"
          accessibilityHint="Search across all features"
        />

        {query.length > 0 && (
          <Pressable
            testID="clear-search-button"
            onPress={handleClear}
            className="ml-2 p-1"
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            accessibilityHint="Clear the search input">
            <X size={20} color="#718096" />
          </Pressable>
        )}

        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#4299e1"
            className="ml-2"
            testID="search-loading"
          />
        )}
      </View>

      {/* Search Results Preview */}
      {query.length > 0 && previewResults.length > 0 && (
        <View className="mt-2 max-h-[300px] overflow-hidden rounded-xl border border-gray-600 bg-gray-700">
          <FlatList
            data={previewResults}
            renderItem={renderResult}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Empty State */}
      {showEmptyState && query.length > 0 && results.length === 0 && !isLoading && (
        <View className="mt-4 items-center rounded-xl border border-gray-600 bg-gray-700 p-6">
          <Text variant="p" className="mb-2 text-center text-gray-200">
            No results found for "{query}"
          </Text>
          <Text variant="small" className="text-center text-gray-400">
            Try different keywords or check spelling
          </Text>
        </View>
      )}
    </View>
  );
}
