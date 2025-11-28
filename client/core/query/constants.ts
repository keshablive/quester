/**
 * TanStack Query Configuration Constants
 *
 * Stale times, retry configuration, and cache settings
 * per resource type as specified in FR-001 and FR-009.
 *
 * @module core/query/constants
 */

/**
 * Stale time configuration per resource type (in milliseconds)
 *
 * These values determine how long data is considered "fresh"
 * before a background refetch is triggered.
 *
 * FR-001: System MUST cache API responses with configurable TTL
 */
export const STALE_TIMES = {
  /** User profile - 10 minutes (relatively stable) */
  USER_PROFILE: 10 * 60 * 1000,
  /** Courses - 5 minutes (moderately dynamic) */
  COURSES: 5 * 60 * 1000,
  /** Quests - 2 minutes (progress changes frequently) */
  QUESTS: 2 * 60 * 1000,
  /** Leaderboards - 30 seconds (real-time competitive data) */
  LEADERBOARDS: 30 * 1000,
  /** Dashboard stats - 5 minutes */
  DASHBOARD: 5 * 60 * 1000,
  /** Notifications - 1 minute */
  NOTIFICATIONS: 60 * 1000,
  /** Analytics - 5 minutes (FR-009: cache with 5-minute stale time) */
  ANALYTICS: 5 * 60 * 1000,
  /** Message threads - 30 seconds (FR-010: frequent updates from new messages) */
  MESSAGES_THREADS: 30 * 1000,
  /** Message content - 60 seconds (FR-010: content rarely changes) */
  MESSAGES: 60 * 1000,
  /** Default fallback */
  DEFAULT: 5 * 60 * 1000,
} as const;

export type StaleTimeKey = keyof typeof STALE_TIMES;

/**
 * Garbage collection time (cache retention)
 *
 * SC-006: App remains functional with cached data when offline for up to 24 hours
 */
export const GC_TIME = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay before first retry (ms) */
  initialDelayMs: number;
  /** Multiplier for exponential backoff */
  multiplier: number;
  /** Maximum delay between retries (ms) */
  maxDelayMs: number;
}

/**
 * Default retry configuration
 *
 * FR-009: System MUST retry failed requests with exponential backoff
 * (3 retries, 1s initial delay, 2x multiplier, 10s max)
 *
 * Timeline: 0s -> 1s -> 2s -> 4s -> fail (~7s total worst case)
 * With jitter, roughly ~15s total before giving up
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Calculate retry delay with exponential backoff and jitter
 *
 * @param attemptIndex - Zero-based retry attempt number
 * @param config - Retry configuration
 * @returns Delay in milliseconds before next retry
 */
export function calculateRetryDelay(
  attemptIndex: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attemptIndex)
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.multiplier, attemptIndex);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Determine if a request should be retried based on error type
 *
 * @param failureCount - Number of failures so far
 * @param error - The error that occurred
 * @returns Whether to retry the request
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  // Don't retry if max retries exceeded
  if (failureCount >= DEFAULT_RETRY_CONFIG.maxRetries) {
    return false;
  }

  // Don't retry client errors (4xx) except for specific cases
  if ('status' in error) {
    const status = (error as { status: number }).status;

    // Don't retry 4xx errors (client errors)
    if (status >= 400 && status < 500) {
      // Except for 408 (Request Timeout) and 429 (Too Many Requests)
      if (status !== 408 && status !== 429) {
        return false;
      }
    }
  }

  // Retry all other errors (network errors, 5xx server errors)
  return true;
}

/**
 * Cache size limits
 *
 * SC-008: Cache memory usage stays under 50MB on mobile devices
 */
export const CACHE_LIMITS = {
  /** Maximum cache size in bytes (50MB) */
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  /** Maximum number of cache entries */
  MAX_ENTRIES: 1000,
  /** Warning threshold (80% of max) */
  WARNING_THRESHOLD: 0.8,
} as const;

/**
 * Offline queue limits
 */
export const OFFLINE_QUEUE_LIMITS = {
  /** Maximum queued mutations */
  MAX_QUEUE_SIZE: 50,
  /** Maximum retries per mutation */
  MAX_RETRIES: 3,
} as const;
