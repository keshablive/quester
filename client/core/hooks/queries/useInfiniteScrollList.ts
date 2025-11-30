/**
 * Generic Infinite Scroll List Hook
 *
 * Provides a reusable infinite query wrapper for paginated lists
 * with cursor-based pagination support.
 *
 * @module core/hooks/queries/useInfiniteScrollList
 */

import {
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { PaginatedResponse, ApiError } from '../../types/query.types';
import { STALE_TIMES, GC_TIME } from '../../query/constants';

/**
 * Options for the infinite scroll list hook
 */
export interface UseInfiniteScrollListOptions<TItem> {
  /** Query key for caching */
  queryKey: QueryKey;
  /** Function to fetch a page of data */
  queryFn: (params: { pageParam: string | undefined }) => Promise<PaginatedResponse<TItem>>;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Whether the query is enabled */
  enabled?: boolean;
  /** Initial cursor (optional) */
  initialCursor?: string;
}

/**
 * Return type for the infinite scroll list hook
 */
export interface UseInfiniteScrollListResult<TItem> {
  /** Flattened array of all loaded items */
  data: TItem[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Whether the next page is being fetched */
  isFetchingNextPage: boolean;
  /** Function to fetch the next page */
  fetchNextPage: () => void;
  /** Function to refetch all data */
  refetch: () => void;
  /** Error if the query failed */
  error: ApiError | null;
  /** Whether the data is from cache (stale) */
  isStale: boolean;
  /** Timestamp of when data was last updated */
  dataUpdatedAt: number;
}

/**
 * Generic hook for infinite scroll lists with TanStack Query
 *
 * Features:
 * - Cursor-based pagination to prevent duplicate/missing items
 * - Automatic page management
 * - Stale data detection for offline indicators
 * - Pull-to-refresh support via refetch
 *
 * @param options - Configuration options
 * @returns Infinite scroll list result
 *
 * @example
 * ```tsx
 * const {
 *   data: items,
 *   isLoading,
 *   hasNextPage,
 *   fetchNextPage,
 *   refetch,
 * } = useInfiniteScrollList({
 *   queryKey: queryKeys.transactions.infinite(),
 *   queryFn: ({ pageParam }) => transactionsService.list({ cursor: pageParam }),
 *   staleTime: STALE_TIMES.TRANSACTIONS,
 * });
 * ```
 */
export function useInfiniteScrollList<TItem>(
  options: UseInfiniteScrollListOptions<TItem>
): UseInfiniteScrollListResult<TItem> {
  const {
    queryKey,
    queryFn,
    staleTime = STALE_TIMES.DEFAULT,
    enabled = true,
    initialCursor,
  } = options;

  const query = useInfiniteQuery<
    PaginatedResponse<TItem>,
    ApiError,
    { pages: PaginatedResponse<TItem>[]; pageParams: (string | undefined)[] },
    QueryKey,
    string | undefined
  >({
    queryKey,
    queryFn: ({ pageParam }) => queryFn({ pageParam }),
    initialPageParam: initialCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime,
    gcTime: GC_TIME,
    enabled,
  });

  // Flatten all pages into a single array of items
  const data = query.data?.pages.flatMap((page) => page.items) ?? [];

  // Calculate if data is stale (for offline indicator)
  const isStale = query.isStale;
  const dataUpdatedAt = query.dataUpdatedAt;

  return {
    data,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    refetch: () => {
      query.refetch();
    },
    error: query.error,
    isStale,
    dataUpdatedAt,
  };
}
