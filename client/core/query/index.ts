/**
 * TanStack Query Infrastructure
 *
 * This module provides the core data fetching layer for the Quester app,
 * implementing stale-while-revalidate caching, request deduplication,
 * and offline persistence.
 *
 * @module core/query
 */

// Query client configuration
export { queryClient } from './client';
export { QueryProvider } from './provider';

// Query key factory
export { queryKeys } from './keys';

// Configuration constants
export {
  STALE_TIMES,
  DEFAULT_RETRY_CONFIG,
  GC_TIME,
  type StaleTimeKey,
  type RetryConfig,
} from './constants';

// Cache invalidation
export {
  INVALIDATION_MAP,
  invalidateByMutation,
  type MutationType,
} from './invalidation';

// Persister
export { asyncStoragePersister } from './persister';

// Cache utilities
export {
  getCacheSize,
  clearQueryCache,
  garbageCollect,
} from './utils';

// Cache monitoring
export {
  cacheMonitor,
  type CacheEvictionConfig,
} from './cacheMonitor';

// Offline mutation queue
export {
  offlineMutationQueue,
  type QueuedMutation,
  type OfflineQueueConfig,
} from './offlineQueue';

// Prefetch utilities
export { prefetchUser, prefetchCourse, prefetchDashboard } from './prefetch';

// Metrics
export { queryMetrics, type QueryMetrics } from './metrics';
