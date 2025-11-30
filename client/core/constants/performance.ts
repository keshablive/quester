/**
 * Performance Configuration Constants
 * Feature: 019-client-image-list-performance
 * 
 * Centralized configuration for image caching, list rendering,
 * lazy loading, and biometric settings.
 */

/** Image cache configuration */
export const IMAGE_CACHE = {
  /** Maximum cache size in bytes (100MB) */
  MAX_SIZE_BYTES: 100 * 1024 * 1024,
  /** Cache eviction policy */
  EVICTION_POLICY: 'lru' as const,
  /** Default transition duration in ms */
  DEFAULT_TRANSITION_MS: 300,
  /** Default blurhash placeholder for images */
  DEFAULT_PLACEHOLDER_BLURHASH: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
} as const;

/** List performance configuration */
export const LIST_CONFIG = {
  /** Default estimated item size for FlashList */
  DEFAULT_ESTIMATED_ITEM_SIZE: 80,
  /** Pixels to render ahead of visible area */
  DEFAULT_DRAW_DISTANCE: 250,
  /** Distance from end to trigger onEndReached (0-1) */
  DEFAULT_END_REACHED_THRESHOLD: 0.5,
} as const;

/** Lazy loading configuration */
export const LAZY_LOAD_CONFIG = {
  /** Timeout before showing error (ms) */
  DEFAULT_TIMEOUT_MS: 10000,
  /** Maximum retry attempts for chunk loading */
  MAX_RETRIES: 3,
  /** Delay between retries (ms) */
  RETRY_DELAY_MS: 1000,
} as const;

/** Biometric configuration */
export const BIOMETRIC_CONFIG = {
  /** Maximum biometric attempts before lockout */
  MAX_ATTEMPTS: 3,
  /** Lockout duration after max attempts (ms) */
  LOCKOUT_DURATION_MS: 30000,
} as const;

/** Export all config as single object for convenience */
export const PERFORMANCE_CONFIG = {
  image: IMAGE_CACHE,
  list: LIST_CONFIG,
  lazyLoad: LAZY_LOAD_CONFIG,
  biometric: BIOMETRIC_CONFIG,
} as const;
