/**
 * TanStack Query Client Configuration
 *
 * Central QueryClient instance with default configurations
 * for caching, retries, and garbage collection.
 *
 * @module core/query/client
 */

import { QueryClient } from '@tanstack/react-query';
import {
  STALE_TIMES,
  GC_TIME,
  DEFAULT_RETRY_CONFIG,
  calculateRetryDelay,
  shouldRetry,
} from './constants';

/**
 * Create and configure the QueryClient
 *
 * Default behaviors:
 * - 5 minute stale time (default)
 * - 24 hour garbage collection time (offline support per SC-006)
 * - 3 retries with exponential backoff (FR-009)
 * - Refetch on window focus disabled (better mobile UX)
 * - Refetch on reconnect enabled (handles network recovery)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - data considered fresh for 5 minutes
      staleTime: STALE_TIMES.DEFAULT,

      // Cache retention - keep data for 24 hours for offline support
      // SC-006: App remains functional with cached data when offline for up to 24 hours
      gcTime: GC_TIME,

      // Retry configuration with exponential backoff
      // FR-009: 3 retries, 1s initial delay, 2x multiplier, 10s max
      retry: (failureCount, error) =>
        shouldRetry(failureCount, error as Error),
      retryDelay: (attemptIndex) =>
        calculateRetryDelay(attemptIndex, DEFAULT_RETRY_CONFIG),

      // Disable refetch on window focus for better mobile UX
      // Background refresh still happens when data is stale
      refetchOnWindowFocus: false,

      // Enable refetch when network reconnects (important for mobile)
      refetchOnReconnect: true,

      // Keep previous data while refetching (prevents flash of loading state)
      // FR-002: Display cached data immediately while background refresh occurs
      placeholderData: (previousData: unknown) => previousData,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,

      // Network mode - online first, but support offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Mutations retry once by default (less aggressive than queries)
      retry: 1,
      retryDelay: (attemptIndex) =>
        calculateRetryDelay(attemptIndex, DEFAULT_RETRY_CONFIG),

      // Network mode for mutations
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Clear all queries from the cache
 * Useful for logout or cache reset scenarios
 */
export function clearAllQueries(): void {
  queryClient.clear();
}

/**
 * Invalidate all queries (trigger refetch)
 * Useful after major data changes
 */
export function invalidateAllQueries(): Promise<void> {
  return queryClient.invalidateQueries();
}

/**
 * Remove all inactive queries from cache
 * Useful for memory management
 */
export function removeInactiveQueries(): void {
  queryClient.removeQueries({
    type: 'inactive',
  });
}

/**
 * Get the query client instance
 * Useful for testing or advanced use cases
 */
export function getQueryClient(): QueryClient {
  return queryClient;
}
