/**
 * InfiniteScrollList Component
 *
 * Reusable infinite scroll list component using FlatList
 * with TanStack Query infinite queries support.
 *
 * US5: Paginated Data with Infinite Scroll
 *
 * @module components/shared/InfiniteScrollList
 */

import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  type FlatListProps,
  type ListRenderItem,
} from 'react-native';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import type { PaginatedResponse, ApiError } from '@/core/types/query.types';

/**
 * Base props for InfiniteScrollList
 */
interface InfiniteScrollListBaseProps<TItem> {
  /** Render function for each item */
  renderItem: ListRenderItem<TItem>;
  /** Key extractor for items */
  keyExtractor: (item: TItem, index: number) => string;
  /** Empty state component */
  ListEmptyComponent?: React.ReactElement;
  /** Header component */
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  /** Footer component (shown below loading indicator) */
  ListFooterComponent?: React.ComponentType | React.ReactElement;
  /** Custom loading component */
  LoadingComponent?: React.ComponentType;
  /** Custom loading more component */
  LoadingMoreComponent?: React.ComponentType;
  /** Custom error component */
  ErrorComponent?: React.ComponentType<{ error: ApiError; retry: () => void }>;
  /** Distance from end to trigger fetch */
  onEndReachedThreshold?: number;
  /** Content container style */
  contentContainerStyle?: FlatListProps<TItem>['contentContainerStyle'];
  /** Additional FlatList props */
  flatListProps?: Partial<Omit<FlatListProps<TItem>, 'data' | 'renderItem' | 'keyExtractor'>>;
}

/**
 * Props when using with TanStack Query result
 */
interface QueryModeProps<TItem> extends InfiniteScrollListBaseProps<TItem> {
  /** TanStack Query infinite query result */
  query: UseInfiniteQueryResult<
    { pages: PaginatedResponse<TItem>[]; pageParams: string[] },
    ApiError
  >;
  /** Whether to show refresh control */
  enableRefresh?: boolean;
  // Manual mode props are not allowed
  data?: never;
  isLoading?: never;
  isRefreshing?: never;
  onRefresh?: never;
  onEndReached?: never;
}

/**
 * Props when using manual data control
 */
interface ManualModeProps<TItem> extends InfiniteScrollListBaseProps<TItem> {
  /** Data array to render */
  data: TItem[];
  /** Whether initial data is loading */
  isLoading?: boolean;
  /** Whether data is refreshing */
  isRefreshing?: boolean;
  /** Callback to refresh data */
  onRefresh?: () => void;
  /** Callback when end is reached for pagination */
  onEndReached?: () => void;
  // Query mode props are not allowed
  query?: never;
  enableRefresh?: never;
}

/**
 * Combined props type
 */
type InfiniteScrollListProps<TItem> = QueryModeProps<TItem> | ManualModeProps<TItem>;

/**
 * InfiniteScrollList
 *
 * A reusable component for rendering infinite scroll lists
 * powered by TanStack Query's useInfiniteQuery.
 *
 * @example
 * ```tsx
 * function CourseList() {
 *   const query = useCourses({ category: 'programming' });
 *
 *   return (
 *     <InfiniteScrollList
 *       query={query}
 *       renderItem={({ item }) => <CourseCard course={item} />}
 *       keyExtractor={(item) => item.id}
 *       enableRefresh
 *     />
 *   );
 * }
 * ```
 */
export function InfiniteScrollList<TItem>(props: InfiniteScrollListProps<TItem>) {
  // Determine which mode we're in
  const isQueryMode = 'query' in props && props.query !== undefined;

  // Extract common props
  const {
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    ListHeaderComponent,
    ListFooterComponent,
    LoadingComponent = DefaultLoading,
    LoadingMoreComponent = DefaultLoadingMore,
    ErrorComponent = DefaultError,
    onEndReachedThreshold = 0.5,
    contentContainerStyle,
    flatListProps,
  } = props;

  // Query mode state extraction
  const queryResult = isQueryMode ? (props as QueryModeProps<TItem>).query : undefined;
  const enableRefresh = isQueryMode
    ? ((props as QueryModeProps<TItem>).enableRefresh ?? true)
    : false;

  // Manual mode state extraction
  const manualData = !isQueryMode ? (props as ManualModeProps<TItem>).data : undefined;
  const manualIsLoading = !isQueryMode ? (props as ManualModeProps<TItem>).isLoading : undefined;
  const manualIsRefreshing = !isQueryMode
    ? (props as ManualModeProps<TItem>).isRefreshing
    : undefined;
  const manualOnRefresh = !isQueryMode ? (props as ManualModeProps<TItem>).onRefresh : undefined;
  const manualOnEndReached = !isQueryMode
    ? (props as ManualModeProps<TItem>).onEndReached
    : undefined;

  // Get effective values based on mode
  const data = queryResult?.data;
  const error = queryResult?.error;
  const isLoading = isQueryMode ? queryResult?.isLoading : manualIsLoading;
  const isError = queryResult?.isError;
  const isFetchingNextPage = queryResult?.isFetchingNextPage;
  const hasNextPage = queryResult?.hasNextPage;
  const fetchNextPage = queryResult?.fetchNextPage;
  const refetch = queryResult?.refetch;
  const isRefetching = isQueryMode ? queryResult?.isRefetching : manualIsRefreshing;
  // Check if fetching next page failed (has error but already has some data)
  const isFetchNextPageError = isQueryMode && isError && items.length > 0;

  // Flatten pages into single array (query mode) or use manual data
  const items = React.useMemo(() => {
    if (isQueryMode) {
      if (!data?.pages) return [];
      return data.pages.flatMap((page: PaginatedResponse<TItem>) => page.items);
    }
    return manualData ?? [];
  }, [isQueryMode, data?.pages, manualData]);

  // Load more when reaching end
  const handleEndReached = useCallback(() => {
    if (isQueryMode) {
      if (hasNextPage && !isFetchingNextPage && fetchNextPage) {
        fetchNextPage();
      }
    } else if (manualOnEndReached) {
      manualOnEndReached();
    }
  }, [isQueryMode, hasNextPage, isFetchingNextPage, fetchNextPage, manualOnEndReached]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (isQueryMode && refetch) {
      refetch();
    } else if (manualOnRefresh) {
      manualOnRefresh();
    }
  }, [isQueryMode, refetch, manualOnRefresh]);

  // Show loading state
  if (isLoading && items.length === 0) {
    return <LoadingComponent />;
  }

  // Show error state (query mode only)
  if (isQueryMode && isError && items.length === 0 && error && refetch) {
    return <ErrorComponent error={error} retry={refetch} />;
  }

  // Footer with loading indicator or retry button for failed page loads
  const renderFooter = () => {
    return (
      <View>
        {isFetchingNextPage && <LoadingMoreComponent />}
        {isFetchNextPageError && error && fetchNextPage && (
          <PageRetryButton error={error} retry={fetchNextPage} />
        )}
        {ListFooterComponent &&
          (typeof ListFooterComponent === 'function' ? (
            <ListFooterComponent />
          ) : (
            ListFooterComponent
          ))}
      </View>
    );
  };

  // Determine if refresh is enabled
  const showRefreshControl = isQueryMode ? enableRefresh : manualOnRefresh !== undefined;

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      contentContainerStyle={[items.length === 0 && styles.emptyContainer, contentContainerStyle]}
      refreshControl={
        showRefreshControl ? (
          <RefreshControl
            refreshing={!!(isRefetching && !isFetchingNextPage)}
            onRefresh={handleRefresh}
          />
        ) : undefined
      }
      {...flatListProps}
    />
  );
}

/**
 * Default loading component
 */
function DefaultLoading() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

/**
 * Default loading more component (for pagination)
 */
function DefaultLoadingMore() {
  return (
    <View style={styles.loadingMoreContainer}>
      <ActivityIndicator size="small" color="#6366F1" />
    </View>
  );
}

/**
 * Per-page retry button for failed page loads (T055)
 */
function PageRetryButton({ error, retry }: { error: ApiError; retry: () => void }) {
  return (
    <View style={styles.pageRetryContainer}>
      <Text style={styles.pageRetryText}>{error.message || 'Failed to load more'}</Text>
      <Text style={styles.pageRetryButton} onPress={retry}>
        Tap to retry
      </Text>
    </View>
  );
}

/**
 * Default error component
 */
function DefaultError({ error, retry }: { error: ApiError; retry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorEmoji}>⚠️</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message || 'Failed to load data'}</Text>
      <Text style={styles.retryButton} onPress={retry}>
        Tap to retry
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  pageRetryContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  pageRetryText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 8,
    textAlign: 'center',
  },
  pageRetryButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
});

export default InfiniteScrollList;
