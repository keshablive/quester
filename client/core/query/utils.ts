/**
 * Query Cache Utilities
 *
 * Helper functions for cache management, inspection,
 * and garbage collection.
 *
 * @module core/query/utils
 */

import { QueryClient } from '@tanstack/react-query';
import { queryClient } from './client';

/**
 * Estimate the size of a value in bytes
 */
function estimateSize(value: unknown): number {
  try {
    const str = JSON.stringify(value);
    // UTF-16 encoding: 2 bytes per character
    return str.length * 2;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get cache size statistics
 *
 * @param client - QueryClient instance (defaults to singleton)
 * @returns Cache size in bytes and entry count
 */
export function getCacheSize(client: QueryClient = queryClient): {
  sizeBytes: number;
  sizeFormatted: string;
  entryCount: number;
} {
  const cache = client.getQueryCache();
  const queries = cache.getAll();

  let totalSize = 0;
  for (const query of queries) {
    totalSize += estimateSize(query.state.data);
  }

  return {
    sizeBytes: totalSize,
    sizeFormatted: formatBytes(totalSize),
    entryCount: queries.length,
  };
}

/**
 * Clear all queries from the cache
 *
 * @param client - QueryClient instance (defaults to singleton)
 */
export function clearQueryCache(client: QueryClient = queryClient): void {
  client.clear();
}

/**
 * Remove all inactive (not being observed) queries
 *
 * @param client - QueryClient instance (defaults to singleton)
 * @returns Number of queries removed
 */
export function garbageCollect(client: QueryClient = queryClient): number {
  const cache = client.getQueryCache();
  const queries = cache.getAll();
  let removedCount = 0;

  for (const query of queries) {
    // Remove queries with no active observers
    if (query.getObserversCount() === 0) {
      cache.remove(query);
      removedCount++;
    }
  }

  return removedCount;
}

/**
 * Get all query keys in the cache
 *
 * @param client - QueryClient instance (defaults to singleton)
 * @returns Array of query keys
 */
export function getQueryKeys(
  client: QueryClient = queryClient
): (readonly unknown[])[] {
  const cache = client.getQueryCache();
  return cache.getAll().map((query) => query.queryKey);
}

/**
 * Check if a specific query is cached
 *
 * @param queryKey - The query key to check
 * @param client - QueryClient instance (defaults to singleton)
 * @returns Whether the query is in cache
 */
export function isQueryCached(
  queryKey: readonly unknown[],
  client: QueryClient = queryClient
): boolean {
  return client.getQueryData(queryKey) !== undefined;
}

/**
 * Get query data if cached, undefined otherwise
 *
 * @param queryKey - The query key
 * @param client - QueryClient instance (defaults to singleton)
 * @returns The cached data or undefined
 */
export function getCachedData<T>(
  queryKey: readonly unknown[],
  client: QueryClient = queryClient
): T | undefined {
  return client.getQueryData<T>(queryKey);
}

/**
 * Set query data directly (for optimistic updates)
 *
 * @param queryKey - The query key
 * @param data - The data to cache
 * @param client - QueryClient instance (defaults to singleton)
 */
export function setCachedData<T>(
  queryKey: readonly unknown[],
  data: T,
  client: QueryClient = queryClient
): void {
  client.setQueryData(queryKey, data);
}

/**
 * Remove a specific query from cache
 *
 * @param queryKey - The query key to remove
 * @param client - QueryClient instance (defaults to singleton)
 */
export function removeQuery(
  queryKey: readonly unknown[],
  client: QueryClient = queryClient
): void {
  client.removeQueries({ queryKey });
}

/**
 * Invalidate queries matching a key pattern
 *
 * @param queryKey - The query key pattern to invalidate
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function invalidateQueries(
  queryKey: readonly unknown[],
  client: QueryClient = queryClient
): Promise<void> {
  await client.invalidateQueries({ queryKey });
}

/**
 * Cancel any in-flight queries matching a key pattern
 *
 * @param queryKey - The query key pattern
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function cancelQueries(
  queryKey: readonly unknown[],
  client: QueryClient = queryClient
): Promise<void> {
  await client.cancelQueries({ queryKey });
}

/**
 * Reset queries to their initial state
 *
 * @param queryKey - The query key pattern (optional, resets all if omitted)
 * @param client - QueryClient instance (defaults to singleton)
 */
export async function resetQueries(
  queryKey?: readonly unknown[],
  client: QueryClient = queryClient
): Promise<void> {
  if (queryKey) {
    await client.resetQueries({ queryKey });
  } else {
    await client.resetQueries();
  }
}
