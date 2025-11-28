/**
 * AsyncStorage Persister for TanStack Query
 *
 * Persists query cache to device storage for offline support.
 * SC-006: App remains functional with cached data when offline for up to 24 hours.
 *
 * @module core/query/persister
 */

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GC_TIME } from './constants';

/**
 * Storage key prefix for cache entries
 */
const CACHE_PREFIX = 'quester-query-cache';

/**
 * Cache buster version
 * Increment this to invalidate all cached data after breaking changes
 */
const CACHE_VERSION = '1';

/**
 * AsyncStorage persister for TanStack Query
 *
 * Features:
 * - Persists cache to AsyncStorage
 * - 24-hour maximum cache age
 * - Version buster for cache invalidation on app updates
 * - Throttled writes (1 second) to prevent excessive storage writes
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_PREFIX,
  throttleTime: 1000, // Throttle writes to once per second
});

/**
 * Persister configuration options
 */
export const persisterOptions = {
  /** Maximum age of persisted cache (24 hours) */
  maxAge: GC_TIME,
  /** Version buster - change to invalidate old cache */
  buster: CACHE_VERSION,
};

/**
 * Clear persisted cache from storage
 */
export async function clearPersistedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX);
  } catch (error) {
    console.warn('Failed to clear persisted cache:', error);
  }
}

/**
 * Get the size of persisted cache in bytes
 */
export async function getPersistedCacheSize(): Promise<number> {
  try {
    const cache = await AsyncStorage.getItem(CACHE_PREFIX);
    return cache ? new Blob([cache]).size : 0;
  } catch (error) {
    console.warn('Failed to get persisted cache size:', error);
    return 0;
  }
}

/**
 * Check if persisted cache exists
 */
export async function hasPersistedCache(): Promise<boolean> {
  try {
    const cache = await AsyncStorage.getItem(CACHE_PREFIX);
    return cache !== null;
  } catch (error) {
    console.warn('Failed to check persisted cache:', error);
    return false;
  }
}
