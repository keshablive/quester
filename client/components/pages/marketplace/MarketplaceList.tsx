import React, { useState, useCallback, useMemo } from 'react';
import { View, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { MarketplaceCard } from './MarketplaceCard';
import {
  classifiedsService,
  OptimizedList,
  type ListRenderItemInfo,
  useInfiniteMarketplaceProperties,
  useInfiniteMarketplaceClassifieds,
  STALE_TIMES,
} from '@/core';
import { Search, Home, Package, TrendingUp, Clock, WifiOff } from 'lucide-react-native';
import { cn } from '@/core';
import { useQuery } from '@tanstack/react-query';

import { MarketplaceListProps, MarketplaceItem } from './types';

type TabType = 'properties' | 'classifieds';
type ViewMode = 'all' | 'recent' | 'popular' | 'my-items';

// Threshold for showing offline indicator (1 hour)
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Offline Indicator Component (FR-012)
 * Shows when cached data may be outdated
 */
function OfflineIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const isStale = Date.now() - dataUpdatedAt > OFFLINE_THRESHOLD_MS;

  if (!isStale) return null;

  return (
    <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 dark:bg-amber-900/30">
      <WifiOff size={16} className="text-amber-600 dark:text-amber-400" />
      <Text className="flex-1 text-sm text-amber-700 dark:text-amber-300">
        Showing cached data. Pull down to refresh.
      </Text>
    </View>
  );
}

/**
 * MarketplaceList Component
 *
 * Displays marketplace listings (properties and classifieds) with TanStack Query
 * caching, infinite scroll, pull-to-refresh, and offline support.
 *
 * US2: Marketplace Listings with Caching (Feature 020)
 */
export function MarketplaceList({ onItemPress, initialTab = 'properties' }: MarketplaceListProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Properties infinite query (US2)
  const propertiesQuery = useInfiniteMarketplaceProperties(
    { query: appliedQuery || undefined },
    { enabled: activeTab === 'properties' }
  );

  // Classifieds infinite query for "all" view mode (US2)
  const classifiedsQuery = useInfiniteMarketplaceClassifieds(
    { query: appliedQuery || undefined },
    { enabled: activeTab === 'classifieds' && viewMode === 'all' }
  );

  // Special queries for classifieds view modes (recent, popular, my-items)
  const recentClassifiedsQuery = useQuery({
    queryKey: ['classifieds', 'recent'],
    queryFn: () => classifiedsService.getRecent(),
    staleTime: STALE_TIMES.MARKETPLACE,
    enabled: activeTab === 'classifieds' && viewMode === 'recent',
  });

  const popularClassifiedsQuery = useQuery({
    queryKey: ['classifieds', 'popular'],
    queryFn: () => classifiedsService.getPopular(),
    staleTime: STALE_TIMES.MARKETPLACE,
    enabled: activeTab === 'classifieds' && viewMode === 'popular',
  });

  const myClassifiedsQuery = useQuery({
    queryKey: ['classifieds', 'my-items'],
    queryFn: () => classifiedsService.getMyAds(),
    staleTime: STALE_TIMES.MARKETPLACE,
    enabled: activeTab === 'classifieds' && viewMode === 'my-items',
  });

  // Get active query based on current tab and view mode
  const getActiveQuery = useCallback(() => {
    if (activeTab === 'properties') {
      return propertiesQuery;
    }

    switch (viewMode) {
      case 'recent':
        return recentClassifiedsQuery;
      case 'popular':
        return popularClassifiedsQuery;
      case 'my-items':
        return myClassifiedsQuery;
      default:
        return classifiedsQuery;
    }
  }, [
    activeTab,
    viewMode,
    propertiesQuery,
    classifiedsQuery,
    recentClassifiedsQuery,
    popularClassifiedsQuery,
    myClassifiedsQuery,
  ]);

  // Flatten items from infinite query pages or use simple array
  const items = useMemo(() => {
    const query = getActiveQuery();

    if (activeTab === 'properties') {
      return propertiesQuery.data?.pages.flatMap((p) => p.items) ?? [];
    }

    if (viewMode === 'all') {
      return classifiedsQuery.data?.pages.flatMap((p) => p.items) ?? [];
    }

    // For special view modes (recent, popular, my-items), return simple array
    switch (viewMode) {
      case 'recent':
        return recentClassifiedsQuery.data ?? [];
      case 'popular':
        return popularClassifiedsQuery.data ?? [];
      case 'my-items':
        return myClassifiedsQuery.data ?? [];
      default:
        return [];
    }
  }, [
    activeTab,
    viewMode,
    propertiesQuery.data,
    classifiedsQuery.data,
    recentClassifiedsQuery.data,
    popularClassifiedsQuery.data,
    myClassifiedsQuery.data,
  ]);

  // Query state aggregation
  const isLoading = useMemo(() => {
    const query = getActiveQuery();
    return query.isLoading;
  }, [getActiveQuery]);

  const isRefreshing = useMemo(() => {
    const query = getActiveQuery();
    return query.isRefetching && !query.isFetchingNextPage;
  }, [getActiveQuery]);

  const error = useMemo(() => {
    const query = getActiveQuery();
    return query.error?.message ?? null;
  }, [getActiveQuery]);

  const dataUpdatedAt = useMemo(() => {
    const query = getActiveQuery();
    return query.dataUpdatedAt ?? Date.now();
  }, [getActiveQuery]);

  // Handlers
  const handleSearch = useCallback(() => {
    setViewMode('all');
    setAppliedQuery(searchQuery);
  }, [searchQuery]);

  const handleRefresh = useCallback(() => {
    const query = getActiveQuery();
    query.refetch();
  }, [getActiveQuery]);

  const handleLoadMore = useCallback(() => {
    if (
      activeTab === 'properties' &&
      propertiesQuery.hasNextPage &&
      !propertiesQuery.isFetchingNextPage
    ) {
      propertiesQuery.fetchNextPage();
    } else if (
      activeTab === 'classifieds' &&
      viewMode === 'all' &&
      classifiedsQuery.hasNextPage &&
      !classifiedsQuery.isFetchingNextPage
    ) {
      classifiedsQuery.fetchNextPage();
    }
    // Special view modes don't support infinite scroll
  }, [activeTab, viewMode, propertiesQuery, classifiedsQuery]);

  const renderHeader = () => (
    <View className="mb-4">
      <Text className="mb-4 text-3xl font-bold text-foreground">Marketplace</Text>

      {/* Tab Navigation */}
      <View className="mb-4 flex-row gap-2">
        <Pressable
          className={cn(
            'flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3',
            activeTab === 'properties' ? 'border-primary/20 bg-primary/10' : 'border-border bg-card'
          )}
          onPress={() => setActiveTab('properties')}>
          <Home
            size={20}
            className={activeTab === 'properties' ? 'text-primary' : 'text-muted-foreground'}
          />
          <Text
            className={cn(
              'text-base font-semibold',
              activeTab === 'properties' ? 'text-primary' : 'text-muted-foreground'
            )}>
            Properties
          </Text>
        </Pressable>

        <Pressable
          className={cn(
            'flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3',
            activeTab === 'classifieds'
              ? 'border-primary/20 bg-primary/10'
              : 'border-border bg-card'
          )}
          onPress={() => setActiveTab('classifieds')}>
          <Package
            size={20}
            className={activeTab === 'classifieds' ? 'text-primary' : 'text-muted-foreground'}
          />
          <Text
            className={cn(
              'text-base font-semibold',
              activeTab === 'classifieds' ? 'text-primary' : 'text-muted-foreground'
            )}>
            Classifieds
          </Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="mb-4 h-12 flex-row items-center rounded-xl border border-border bg-card px-4 shadow-sm">
        <Search size={20} className="mr-2 text-muted-foreground" />
        <TextInput
          className="h-full flex-1 text-base text-foreground"
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* View Mode Filters - Only for Classifieds */}
      {activeTab === 'classifieds' && (
        <View className="flex-row gap-2">
          <Pressable
            className={cn(
              'flex-row items-center gap-1.5 rounded-full border px-4 py-2',
              viewMode === 'all' ? 'border-primary/20 bg-primary/10' : 'border-border bg-card'
            )}
            onPress={() => setViewMode('all')}>
            <Text
              className={cn(
                'text-sm font-semibold',
                viewMode === 'all' ? 'text-primary' : 'text-muted-foreground'
              )}>
              All
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              'flex-row items-center gap-1.5 rounded-full border px-4 py-2',
              viewMode === 'recent' ? 'border-primary/20 bg-primary/10' : 'border-border bg-card'
            )}
            onPress={() => setViewMode('recent')}>
            <Clock
              size={16}
              className={viewMode === 'recent' ? 'text-primary' : 'text-muted-foreground'}
            />
            <Text
              className={cn(
                'text-sm font-semibold',
                viewMode === 'recent' ? 'text-primary' : 'text-muted-foreground'
              )}>
              Recent
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              'flex-row items-center gap-1.5 rounded-full border px-4 py-2',
              viewMode === 'popular' ? 'border-primary/20 bg-primary/10' : 'border-border bg-card'
            )}
            onPress={() => setViewMode('popular')}>
            <TrendingUp
              size={16}
              className={viewMode === 'popular' ? 'text-primary' : 'text-muted-foreground'}
            />
            <Text
              className={cn(
                'text-sm font-semibold',
                viewMode === 'popular' ? 'text-primary' : 'text-muted-foreground'
              )}>
              Popular
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              'flex-row items-center gap-1.5 rounded-full border px-4 py-2',
              viewMode === 'my-items' ? 'border-primary/20 bg-primary/10' : 'border-border bg-card'
            )}
            onPress={() => setViewMode('my-items')}>
            <Text
              className={cn(
                'text-sm font-semibold',
                viewMode === 'my-items' ? 'text-primary' : 'text-muted-foreground'
              )}>
              My Ads
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View className="items-center py-12">
      <Text className="mb-2 text-lg font-semibold text-foreground">No {activeTab} found</Text>
      <Text className="text-sm text-muted-foreground">
        Try adjusting your search or {activeTab === 'classifieds' ? 'view' : 'filters'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Text className="mb-4 text-center text-base text-destructive">{error}</Text>
      <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={handleRefresh}>
        <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
      </Pressable>
    </View>
  );

  // Show loading indicator for initial load only
  if (isLoading && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading {activeTab}...</Text>
      </View>
    );
  }

  // Show error screen only if no cached data available
  if (error && items.length === 0) {
    return renderError();
  }

  // Render item callback for OptimizedList
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MarketplaceItem>) => (
      <MarketplaceCard
        item={item}
        type={activeTab === 'properties' ? 'property' : 'classified'}
        onPress={(item) =>
          onItemPress(item, activeTab === 'properties' ? 'property' : 'classified')
        }
      />
    ),
    [activeTab, onItemPress]
  );

  const keyExtractor = useCallback((item: MarketplaceItem) => item.id, []);

  // Determine if infinite scroll is available for current view
  const hasNextPage =
    activeTab === 'properties'
      ? propertiesQuery.hasNextPage
      : viewMode === 'all'
        ? classifiedsQuery.hasNextPage
        : false;

  return (
    <View className="flex-1 bg-background">
      {/* Offline Indicator - FR-012 */}
      <OfflineIndicator dataUpdatedAt={dataUpdatedAt} />

      <OptimizedList<MarketplaceItem>
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={200}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: 16 }}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={hasNextPage ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        testID="marketplace-list"
      />
    </View>
  );
}
