import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import GlobalSearchBar, { SearchResult } from '@/components/navigation/global-search-bar';
import { X, Clock } from 'lucide-react-native';

type FeatureFilter = 'all' | 'quest' | 'course' | 'marketplace' | 'social' | 'certificate';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FeatureFilter>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Complete quests',
    'React Native course',
    'Trading items',
  ]);

  // Mock search function - in production, this would call an API
  const performSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: 'Complete Daily Quest',
          type: 'quest',
          description: 'Earn 100 XP by completing daily challenges',
        },
        {
          id: '2',
          title: 'React Native Masterclass',
          type: 'course',
          description: 'Learn mobile development with React Native',
        },
        {
          id: '3',
          title: 'Rare Trading Card',
          type: 'marketplace',
          description: 'Limited edition collectible item',
        },
        {
          id: '4',
          title: 'Community Discussion',
          type: 'social',
          description: 'Join the conversation about gamification',
        },
      ];

      // Filter by feature type if not 'all'
      const filtered =
        selectedFilter === 'all'
          ? mockResults
          : mockResults.filter((r) => r.type === selectedFilter);

      setResults(filtered);
      setIsLoading(false);

      // Add to recent searches
      if (query && !recentSearches.includes(query)) {
        setRecentSearches((prev) => [query, ...prev].slice(0, 5));
      }
    },
    [selectedFilter, recentSearches]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    },
    [performSearch]
  );

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      // Navigate to the appropriate feature screen
      const routeMap: Record<SearchResult['type'], string> = {
        quest: `/quests/${result.id}`,
        course: `/learning/${result.id}`,
        marketplace: `/marketplace/${result.id}`,
        social: `/social/posts/${result.id}`,
        certificate: `/learning/certificates/${result.id}`,
      };

      const route = routeMap[result.type];
      if (route) {
        router.push(route as any);
      }
    },
    [router]
  );

  const handleRecentSearchPress = useCallback(
    (search: string) => {
      setSearchQuery(search);
      performSearch(search);
    },
    [performSearch]
  );

  const handleFilterChange = useCallback(
    (filter: FeatureFilter) => {
      setSelectedFilter(filter);
      if (searchQuery) {
        performSearch(searchQuery);
      }
    },
    [searchQuery, performSearch]
  );

  const filters: { label: string; value: FeatureFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Quests', value: 'quest' },
    { label: 'Courses', value: 'course' },
    { label: 'Marketplace', value: 'marketplace' },
    { label: 'Social', value: 'social' },
  ];

  const showRecentSearches = !searchQuery && recentSearches.length > 0;
  const showEmptyState = !!searchQuery && !isLoading && results.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <X size={24} color="#ffffff" />
        </Pressable>

        <View style={styles.searchContainer}>
          <GlobalSearchBar
            onSearch={handleSearch}
            onResultSelect={handleResultSelect}
            isLoading={isLoading}
            showEmptyState={showEmptyState}
            maxPreviewResults={0} // Don't show preview in search screen
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterChip, selectedFilter === item.value && styles.filterChipActive]}
              onPress={() => handleFilterChange(item.value)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item.label}`}
              accessibilityState={{ selected: selectedFilter === item.value }}>
              <Text
                style={[
                  styles.filterLabel,
                  selectedFilter === item.value && styles.filterLabelActive,
                ]}>
                {item.label}
              </Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Recent Searches */}
        {showRecentSearches && (
          <View style={styles.recentSearches}>
            <View style={styles.recentHeader}>
              <Clock size={16} color="#a0aec0" />
              <Text style={styles.recentTitle}>Recent Searches</Text>
            </View>
            {recentSearches.map((search, index) => (
              <Pressable
                key={index}
                style={styles.recentItem}
                onPress={() => handleRecentSearchPress(search)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${search}`}>
                <Text style={styles.recentText}>{search}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Search Results - Optimized (Phase 7, T115-T118) */}
        {searchQuery && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.resultItem}
                onPress={() => handleResultSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.type}`}>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultType}>{item.type}</Text>
                  <Text style={styles.resultDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </Pressable>
            )}
            contentContainerStyle={styles.resultsContent}
            removeClippedSubviews={true}
            windowSize={21}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
            ListEmptyComponent={
              showEmptyState ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a202c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2d3748',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  filterChipActive: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0aec0',
  },
  filterLabelActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  recentSearches: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0aec0',
  },
  recentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  recentText: {
    fontSize: 15,
    color: '#e2e8f0',
  },
  resultsContent: {
    padding: 16,
  },
  resultItem: {
    backgroundColor: '#2d3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  resultContent: {
    gap: 6,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultType: {
    fontSize: 12,
    color: '#4299e1',
    textTransform: 'capitalize',
  },
  resultDescription: {
    fontSize: 14,
    color: '#a0aec0',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
  },
});
