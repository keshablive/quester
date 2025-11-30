/**
 * Cache Size Monitor with LRU Eviction
 *
 * Monitors query cache size and implements LRU eviction
 * when cache exceeds configured limits.
 *
 * SC-008: Cache memory usage stays under 50MB on mobile devices
 *
 * @module core/query/cacheMonitor
 */

import { QueryClient, Query } from '@tanstack/react-query';
import { CACHE_LIMITS } from './constants';

/**
 * Cache eviction configuration
 */
export interface CacheEvictionConfig {
  /** Maximum cache size in bytes (default: 50MB) */
  maxCacheSize: number;
  /** Maximum number of cache entries (default: 1000) */
  maxEntries: number;
  /** Eviction strategy */
  evictionPolicy: 'lru' | 'ttl';
  /** Percentage at which to warn (default: 0.8) */
  warningThreshold: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Estimated total cache size in bytes */
  sizeBytes: number;
  /** Number of cache entries */
  entryCount: number;
  /** Size as percentage of max */
  utilizationPercent: number;
  /** Whether cache is over warning threshold */
  isWarning: boolean;
  /** Whether cache needs eviction */
  needsEviction: boolean;
}

/**
 * Default cache eviction configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheEvictionConfig = {
  maxCacheSize: CACHE_LIMITS.MAX_SIZE_BYTES,
  maxEntries: CACHE_LIMITS.MAX_ENTRIES,
  evictionPolicy: 'lru',
  warningThreshold: CACHE_LIMITS.WARNING_THRESHOLD,
};

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
 * Get query access time (for LRU ordering)
 */
function getQueryAccessTime(query: Query): number {
  return query.state.dataUpdatedAt || query.state.fetchStatus === 'fetching' 
    ? Date.now() 
    : 0;
}

/**
 * Cache Monitor class
 *
 * Monitors and manages query cache size with automatic LRU eviction.
 */
class CacheMonitor {
  private config: CacheEvictionConfig;
  private queryClient: QueryClient | null = null;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<CacheEvictionConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Initialize the cache monitor with a QueryClient
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  /**
   * Start periodic cache monitoring
   * @param intervalMs - Check interval in milliseconds (default: 60 seconds)
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitorInterval) {
      this.stopMonitoring();
    }

    this.monitorInterval = setInterval(() => {
      this.checkAndEvict();
    }, intervalMs);

    // Run initial check
    this.checkAndEvict();
  }

  /**
   * Stop periodic cache monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    if (!this.queryClient) {
      return {
        sizeBytes: 0,
        entryCount: 0,
        utilizationPercent: 0,
        isWarning: false,
        needsEviction: false,
      };
    }

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    let totalSize = 0;
    for (const query of queries) {
      totalSize += estimateSize(query.state.data);
    }

    const utilizationPercent = totalSize / this.config.maxCacheSize;
    const isWarning = utilizationPercent >= this.config.warningThreshold;
    const needsEviction = 
      totalSize > this.config.maxCacheSize || 
      queries.length > this.config.maxEntries;

    return {
      sizeBytes: totalSize,
      entryCount: queries.length,
      utilizationPercent,
      isWarning,
      needsEviction,
    };
  }

  /**
   * Check cache size and evict if necessary
   */
  checkAndEvict(): CacheStats {
    const stats = this.getStats();

    if (stats.isWarning) {
      console.warn(
        `[CacheMonitor] Cache at ${(stats.utilizationPercent * 100).toFixed(1)}% ` +
        `(${(stats.sizeBytes / 1024 / 1024).toFixed(2)}MB / ${(this.config.maxCacheSize / 1024 / 1024).toFixed(0)}MB)`
      );
    }

    if (stats.needsEviction) {
      this.evictLRU();
    }

    return stats;
  }

  /**
   * Evict least recently used queries until under limits
   */
  evictLRU(): number {
    if (!this.queryClient) return 0;

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();

    // Sort by access time (oldest first)
    const sortedQueries = [...queries].sort((a, b) => {
      return getQueryAccessTime(a) - getQueryAccessTime(b);
    });

    let evictedCount = 0;
    let currentSize = this.getStats().sizeBytes;
    const targetSize = this.config.maxCacheSize * 0.7; // Evict to 70% capacity

    for (const query of sortedQueries) {
      // Don't evict active queries
      if (query.getObserversCount() > 0) {
        continue;
      }

      // Check if we've evicted enough
      if (
        currentSize <= targetSize &&
        queries.length - evictedCount <= this.config.maxEntries * 0.7
      ) {
        break;
      }

      // Evict this query
      const querySize = estimateSize(query.state.data);
      cache.remove(query);
      currentSize -= querySize;
      evictedCount++;
    }

    if (evictedCount > 0) {
      console.log(`[CacheMonitor] Evicted ${evictedCount} queries`);
    }

    return evictedCount;
  }

  /**
   * Force clear all inactive queries
   */
  clearInactive(): number {
    if (!this.queryClient) return 0;

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    let clearedCount = 0;

    for (const query of queries) {
      if (query.getObserversCount() === 0) {
        cache.remove(query);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheEvictionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton cache monitor instance
 */
export const cacheMonitor = new CacheMonitor();

/**
 * Development-only cache event logger (FR-014)
 *
 * Logs cache hits, misses, and stale data events to console
 * for debugging purposes. Only active in __DEV__ mode.
 */
class DevCacheLogger {
  private enabled: boolean = false;

  /**
   * Enable dev cache logging
   */
  enable(): void {
    if (__DEV__) {
      this.enabled = true;
      console.log('[DevCacheLogger] Cache logging enabled');
    }
  }

  /**
   * Disable dev cache logging
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled && __DEV__;
  }

  /**
   * Log a cache hit event
   */
  logCacheHit(queryKey: unknown, dataAge?: number): void {
    if (!this.isEnabled()) return;
    const keyStr = JSON.stringify(queryKey);
    const ageStr = dataAge ? ` (age: ${Math.round(dataAge / 1000)}s)` : '';
    console.log(`[Cache HIT] ${keyStr}${ageStr}`);
  }

  /**
   * Log a cache miss event
   */
  logCacheMiss(queryKey: unknown): void {
    if (!this.isEnabled()) return;
    const keyStr = JSON.stringify(queryKey);
    console.log(`[Cache MISS] ${keyStr}`);
  }

  /**
   * Log a stale data event (data served from cache while refetching)
   */
  logStaleData(queryKey: unknown, staleTime: number): void {
    if (!this.isEnabled()) return;
    const keyStr = JSON.stringify(queryKey);
    console.log(`[Cache STALE] ${keyStr} (stale for ${Math.round(staleTime / 1000)}s)`);
  }

  /**
   * Log a cache invalidation event
   */
  logInvalidation(queryKey: unknown, reason?: string): void {
    if (!this.isEnabled()) return;
    const keyStr = JSON.stringify(queryKey);
    const reasonStr = reason ? ` - ${reason}` : '';
    console.log(`[Cache INVALIDATE] ${keyStr}${reasonStr}`);
  }

  /**
   * Log cache statistics summary
   */
  logStats(): void {
    if (!this.isEnabled()) return;
    const stats = cacheMonitor.getStats();
    console.log('[Cache Stats]', {
      size: `${(stats.sizeBytes / 1024 / 1024).toFixed(2)}MB`,
      entries: stats.entryCount,
      utilization: `${(stats.utilizationPercent * 100).toFixed(1)}%`,
      warning: stats.isWarning,
    });
  }
}

/**
 * Singleton dev cache logger instance (FR-014)
 */
export const devCacheLogger = new DevCacheLogger();

export default cacheMonitor;
