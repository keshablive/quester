/**
 * Query Metrics Tracking
 *
 * Tracks cache hits, misses, latency, and other metrics
 * for observability and performance monitoring.
 *
 * FR-012: System MUST track request metrics (cache hits, misses, latency) for observability
 *
 * @module core/query/metrics
 */

import { QueryClient, QueryCache, Query } from '@tanstack/react-query';

/**
 * Query metrics data structure
 */
export interface QueryMetrics {
  /** Total number of queries executed */
  totalQueries: number;
  /** Number of cache hits (data returned from cache) */
  cacheHits: number;
  /** Number of cache misses (network fetch required) */
  cacheMisses: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Average fetch latency in milliseconds */
  averageLatencyMs: number;
  /** Total number of errors */
  errorCount: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Number of background refetches */
  backgroundRefetches: number;
  /** Queries by state */
  queryStates: {
    loading: number;
    error: number;
    success: number;
    idle: number;
  };
}

/**
 * Individual query timing data
 */
interface QueryTiming {
  startTime: number;
  endTime?: number;
  latencyMs?: number;
  wasHit: boolean;
}

/**
 * Query Metrics Collector class
 */
class QueryMetricsCollector {
  private totalQueries = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private errorCount = 0;
  private backgroundRefetches = 0;
  private latencies: number[] = [];
  private maxLatencySamples = 1000;
  private queryClient: QueryClient | null = null;
  private queryTimings = new Map<string, QueryTiming>();

  /**
   * Initialize the metrics collector with a QueryClient
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;

    // Subscribe to query cache events
    const cache = queryClient.getQueryCache();
    
    cache.subscribe((event) => {
      if (!event.query) return;

      const queryHash = event.query.queryHash;

      switch (event.type) {
        case 'added':
          // New query added
          this.totalQueries++;
          break;

        case 'updated':
          this.handleQueryUpdate(event.query, queryHash);
          break;

        case 'removed':
          // Clean up timing data
          this.queryTimings.delete(queryHash);
          break;
      }
    });
  }

  /**
   * Handle query state updates
   */
  private handleQueryUpdate(query: Query, queryHash: string): void {
    const state = query.state;

    // Track fetch start
    if (state.fetchStatus === 'fetching') {
      const isBackgroundRefetch = state.data !== undefined;
      
      if (isBackgroundRefetch) {
        this.backgroundRefetches++;
      }

      this.queryTimings.set(queryHash, {
        startTime: Date.now(),
        wasHit: false,
      });
    }

    // Track fetch completion
    if (state.fetchStatus === 'idle' && this.queryTimings.has(queryHash)) {
      const timing = this.queryTimings.get(queryHash)!;
      
      if (!timing.endTime) {
        timing.endTime = Date.now();
        timing.latencyMs = timing.endTime - timing.startTime;
        
        // Record latency
        this.recordLatency(timing.latencyMs);
      }
    }

    // Track errors
    if (state.status === 'error') {
      this.errorCount++;
    }

    // Track cache hits (data available without fetch)
    if (
      state.status === 'success' &&
      state.fetchStatus === 'idle' &&
      !this.queryTimings.has(queryHash)
    ) {
      this.cacheHits++;
    } else if (state.fetchStatus === 'fetching') {
      this.cacheMisses++;
    }
  }

  /**
   * Record a latency measurement
   */
  private recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs);
    
    // Keep only recent samples
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return sum / this.latencies.length;
  }

  /**
   * Get current metrics
   */
  getMetrics(): QueryMetrics {
    const totalHitsAndMisses = this.cacheHits + this.cacheMisses;
    const hitRate = totalHitsAndMisses > 0 
      ? this.cacheHits / totalHitsAndMisses 
      : 0;
    
    const errorRate = this.totalQueries > 0 
      ? this.errorCount / this.totalQueries 
      : 0;

    // Get query states from QueryClient
    const queryStates = this.getQueryStates();

    return {
      totalQueries: this.totalQueries,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate,
      averageLatencyMs: this.calculateAverageLatency(),
      errorCount: this.errorCount,
      errorRate,
      backgroundRefetches: this.backgroundRefetches,
      queryStates,
    };
  }

  /**
   * Get counts of queries in each state
   */
  private getQueryStates(): QueryMetrics['queryStates'] {
    if (!this.queryClient) {
      return { loading: 0, error: 0, success: 0, idle: 0 };
    }

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();

    const states = { loading: 0, error: 0, success: 0, idle: 0 };

    for (const query of queries) {
      switch (query.state.status) {
        case 'pending':
          states.loading++;
          break;
        case 'error':
          states.error++;
          break;
        case 'success':
          states.success++;
          break;
        default:
          states.idle++;
      }
    }

    return states;
  }

  /**
   * Record a manual cache hit (for prefetched data)
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record a manual cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.totalQueries = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errorCount = 0;
    this.backgroundRefetches = 0;
    this.latencies = [];
    this.queryTimings.clear();
  }

  /**
   * Get a formatted metrics summary
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    
    return [
      `Total Queries: ${metrics.totalQueries}`,
      `Cache Hit Rate: ${(metrics.hitRate * 100).toFixed(1)}%`,
      `Avg Latency: ${metrics.averageLatencyMs.toFixed(0)}ms`,
      `Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
      `Background Refetches: ${metrics.backgroundRefetches}`,
    ].join(' | ');
  }
}

/**
 * Singleton metrics collector instance
 */
export const queryMetrics = new QueryMetricsCollector();

export default queryMetrics;
