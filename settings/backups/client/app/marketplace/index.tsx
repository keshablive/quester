/**
 * Marketplace Screen - P1 Screen Migration (Phase 4, T093-T101)
 *
 * React Native Reusables compliance:
 * - FR-001: Button with Text wrapping pattern
 * - FR-003: Text component with appropriate variants (h2, p, small, muted)
 * - FR-006 to FR-010: Accessibility roles, labels, hints, state
 * - FR-016: FlatList optimization (removeClippedSubviews, getItemLayout, windowSize)
 * - FR-025: Performance monitoring via useScreenPerformanceMetrics
 * - FR-028 to FR-030: Error boundary via ScreenWrapper
 *
 * WCAG 2.1 Level AA compliance:
 * - 4.1.2 Name, Role, Value: All interactive elements have proper roles
 * - 3.3.2 Labels or Instructions: All form inputs have labels
 * - 2.4.6 Headings and Labels: Section headers properly labeled
 * - 2.4.8 Location: Page title and context clear
 */

import React, { useState, useCallback } from 'react';
import { View, FlatList, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { ListingCard } from '@/components/marketplace/listing-card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { useEnhancedPerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
import { useSearchListings } from '@/lib/hooks/useMarketplace';
import { SearchListingsRequest } from '@/lib/api/marketplace';
import SuggestedContent from '@/components/workflow/suggested-content';

export default function MarketplaceScreen() {
  // Performance monitoring (FR-025, T124-T130)
  useScreenPerformanceMetrics('MarketplaceScreen');
  const { metrics: _fpsMetrics } = useEnhancedPerformanceMonitor('MarketplaceScreen');

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchListingsRequest>({
    page: 1,
    limit: 20,
    sort_by: 'newest',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError, refetch } = useSearchListings({
    ...filters,
    search: searchQuery || undefined,
  });

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    refetch();
  }, [refetch]);

  const handleFilterChange = useCallback((key: keyof SearchListingsRequest, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleBuyPress = useCallback(
    (listingId: string) => {
      router.push(`/marketplace/listing/${listingId}`);
    },
    [router]
  );

  const handleLoadMore = useCallback(() => {
    if (data && data.page < data.total_pages) {
      setFilters((prev) => ({ ...prev, page: prev.page! + 1 }));
    }
  }, [data]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={{ width: '48%' }}>
        <ListingCard
          listing={item}
          onPress={() => router.push(`/marketplace/listing/${item.id}`)}
          onBuyPress={() => handleBuyPress(item.id)}
        />
      </View>
    ),
    [router, handleBuyPress]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // T122: getItemLayout optimization for fixed-height listings in 2-column grid
  // Estimated height: ~320px per row (includes card + gap)
  const LISTING_ROW_HEIGHT = 320;
  const getItemLayout = useCallback((_data: any, index: number) => {
    const rowIndex = Math.floor(index / 2); // 2 columns
    return {
      length: LISTING_ROW_HEIGHT,
      offset: LISTING_ROW_HEIGHT * rowIndex,
      index,
    };
  }, []);

  return (
    <ScreenWrapper screenName="MarketplaceScreen">
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="border-b border-border px-4 py-3">
          <Text variant="h2" className="mb-4">
            Marketplace
          </Text>

          {/* Search Bar */}
          <View className="mb-3 flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center rounded-lg bg-muted px-3 py-2">
              <Icon as={Search} size={20} className="text-muted-foreground" />
              <Input
                className="ml-2 flex-1"
                placeholder="Search listings..."
                placeholderClassName="text-muted-foreground"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                accessibilityLabel="Search listings"
                accessibilityHint="Enter listing title or keyword and press search"
              />
            </View>

            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Toggle filters"
              accessibilityHint={showFilters ? 'Hide filters' : 'Show filters'}
              accessibilityState={{ expanded: showFilters }}
              onPress={() => setShowFilters(!showFilters)}
              className="rounded-lg">
              <Icon as={SlidersHorizontal} size={20} className="text-muted-foreground" />
            </Button>
          </View>

          {/* Active Filters */}
          {(filters.listing_type || filters.min_price || filters.max_price) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2"
              accessibilityLabel="Active filters"
              accessible>
              {filters.listing_type && (
                <Badge variant="secondary" className="mr-2">
                  {filters.listing_type}
                </Badge>
              )}
              {filters.min_price && (
                <Badge variant="secondary" className="mr-2">
                  Min: ${filters.min_price}
                </Badge>
              )}
              {filters.max_price && (
                <Badge variant="secondary" className="mr-2">
                  Max: ${filters.max_price}
                </Badge>
              )}
            </ScrollView>
          )}
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View
            className="border-b border-border bg-muted/50 px-4 py-3"
            accessibilityLabel="Filters panel">
            <Text variant="large" className="mb-3 font-semibold">
              Filters
            </Text>

            {/* Listing Type */}
            <View className="mb-3">
              <Text variant="small" className="mb-2 text-muted-foreground">
                Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                  className="flex-row gap-2"
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Listing type filter">
                  {['course', 'quest', 'badge', 'digital_good', 'service'].map((type) => (
                    <Button
                      key={type}
                      variant={filters.listing_type === type ? 'default' : 'outline'}
                      onPress={() => handleFilterChange('listing_type', type)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: filters.listing_type === type }}
                      className="capitalize">
                      <Text>{type.replace('_', ' ')}</Text>
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Sort By */}
            <View className="mb-3">
              <Text variant="small" className="mb-2 text-muted-foreground">
                Sort By
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {[
                    { value: 'newest', label: 'Newest' },
                    { value: 'popular', label: 'Popular' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'rating', label: 'Top Rated' },
                  ].map((sort) => (
                    <Button
                      key={sort.value}
                      variant={filters.sort_by === sort.value ? 'default' : 'outline'}
                      onPress={() => handleFilterChange('sort_by', sort.value)}
                      accessibilityRole="button">
                      <Text>{sort.label}</Text>
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </View>

            <Button onPress={() => setShowFilters(false)} variant="outline" className="mt-2">
              <Text>Apply Filters</Text>
            </Button>
          </View>
        )}

        {/* Listings Grid */}
        <FlatList
          data={data?.listings || []}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          accessibilityRole="list"
          accessibilityLabel={`Marketplace listings`}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={21}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12" accessibilityRole="text">
              {isLoading ? (
                <Text variant="muted">Loading listings...</Text>
              ) : isError ? (
                <Text className="text-destructive">Failed to load listings</Text>
              ) : (
                <View className="items-center">
                  <Text variant="large" className="mb-2 text-muted-foreground">
                    No listings found
                  </Text>
                  <Text variant="small" className="text-muted-foreground">
                    Try adjusting your search or filters
                  </Text>
                </View>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              accessibilityLabel="Pull to refresh listings"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <>
              {data && data.page < data.total_pages ? (
                <View
                  className="items-center py-4"
                  accessibilityRole="text"
                  accessibilityLiveRegion="polite">
                  <Text variant="muted">Loading more listings...</Text>
                </View>
              ) : null}

              {/* T085.2: Suggested Content for Marketplace Browsing */}
              {!isLoading && data && data.listings.length > 0 && (
                <View style={suggestedStyles.section}>
                  <Text className="mb-3 text-lg font-semibold text-foreground">
                    Recommended for You
                  </Text>
                  <SuggestedContent
                    currentFeature="marketplace"
                    context="browsing"
                    contextData={{
                      currentSearch: searchQuery,
                      listingType: filters.listing_type,
                      sortBy: filters.sort_by,
                    }}
                    onSuggestionPress={(suggestion: any) => {
                      if (suggestion.route) router.push(suggestion.route);
                    }}
                    layout="list"
                    maxSuggestions={3}
                  />
                </View>
              )}
            </>
          }
        />
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const suggestedStyles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
});
