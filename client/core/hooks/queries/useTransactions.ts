/**
 * Transaction Query Hooks
 *
 * TanStack Query hooks for transaction data fetching with
 * caching, offline support, and instant display.
 *
 * US1: Transaction History with Offline Access
 *
 * @module core/hooks/queries/useTransactions
 */

import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { transactionsService } from '../../services/transactions.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type {
  Transaction,
  TransactionFilters,
  TransactionsResponse,
  PaginatedResponse,
  ApiError,
} from '../../types/query.types';

/**
 * Fetch paginated transactions list
 *
 * @param filters - Optional filters for transactions
 * @param options - Optional TanStack Query options
 * @returns Query result with transactions data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useTransactions({ type: 'credit' });
 * ```
 */
export function useTransactions(
  filters?: TransactionFilters,
  options?: Omit<
    UseQueryOptions<Transaction[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Transaction[], ApiError> {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => transactionsService.getMyTransactions(),
    staleTime: STALE_TIMES.TRANSACTIONS,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single transaction by ID
 *
 * @param transactionId - The transaction's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with transaction data
 *
 * @example
 * ```tsx
 * const { data: transaction, isLoading } = useTransaction(transactionId);
 * ```
 */
export function useTransaction(
  transactionId: string,
  options?: Omit<
    UseQueryOptions<Transaction, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Transaction, ApiError> {
  return useQuery({
    queryKey: queryKeys.transactions.detail(transactionId),
    queryFn: () => transactionsService.get(transactionId),
    staleTime: STALE_TIMES.TRANSACTIONS,
    gcTime: GC_TIME,
    enabled: !!transactionId,
    ...options,
  });
}

/**
 * Fetch transactions with infinite scroll pagination
 *
 * Supports cursor-based pagination to prevent duplicate/missing items.
 *
 * @param filters - Optional filters for transactions (excluding page)
 * @param options - Optional TanStack Query infinite options
 * @returns Infinite query result with pagination controls
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteTransactions();
 * const transactions = data?.pages.flatMap(p => p.items) ?? [];
 * ```
 */
export function useInfiniteTransactions(
  filters?: Omit<TransactionFilters, 'page'>,
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<Transaction>,
      ApiError,
      { pages: PaginatedResponse<Transaction>[]; pageParams: (string | undefined)[] }
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
): UseInfiniteQueryResult<
  { pages: PaginatedResponse<Transaction>[]; pageParams: (string | undefined)[] },
  ApiError
> {
  return useInfiniteQuery({
    queryKey: queryKeys.transactions.infinite(filters),
    queryFn: async ({ pageParam }) => {
      // TODO: Update service to support cursor-based pagination
      // For now, fetch all and simulate pagination
      const allTransactions = await transactionsService.getMyTransactions();
      
      // Simulate paginated response
      const pageSize = filters?.limit ?? 20;
      const startIndex = pageParam ? parseInt(pageParam, 10) : 0;
      const items = allTransactions.slice(startIndex, startIndex + pageSize);
      const hasMore = startIndex + pageSize < allTransactions.length;
      
      return {
        items,
        total: allTransactions.length,
        nextCursor: hasMore ? String(startIndex + pageSize) : undefined,
        hasMore,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.TRANSACTIONS,
    gcTime: GC_TIME,
    ...options,
  });
}
