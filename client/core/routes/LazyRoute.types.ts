/**
 * LazyRoute Types
 * Feature: 019-client-image-list-performance
 * 
 * TypeScript interfaces for code-split route handling
 * with loading states and error boundaries.
 */

import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';

/**
 * Configuration for a lazy-loaded route
 */
export interface LazyRouteConfig {
  /** Route name/path identifier */
  name: string;
  
  /** Lazy-loaded component */
  component: LazyExoticComponent<ComponentType<unknown>>;
  
  /** Custom loading fallback component */
  fallback?: ReactNode;
  
  /** Timeout before showing error (ms) */
  loadTimeout?: number;
  
  /** Number of retry attempts on load failure */
  maxRetries?: number;
  
  /** When to preload the chunk */
  preloadTrigger?: 'none' | 'hover' | 'visible';
}

/**
 * State for chunk loading operations
 */
export interface ChunkLoadingState {
  /** Whether chunk is currently loading */
  isLoading: boolean;
  
  /** Error if chunk failed to load */
  error: Error | null;
  
  /** Number of retry attempts so far */
  retryCount: number;
}

/**
 * Props for ChunkErrorBoundary component
 */
export interface ChunkErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  
  /** Callback when an error is caught */
  onError?: (error: Error) => void;
  
  /** Custom fallback to show on error */
  fallback?: ReactNode | ((props: ChunkErrorFallbackProps) => ReactNode);
  
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Props passed to error fallback component
 */
export interface ChunkErrorFallbackProps {
  /** The error that occurred */
  error: Error;
  
  /** Function to retry loading */
  retry: () => void;
  
  /** Number of retries attempted */
  retryCount: number;
  
  /** Whether max retries reached */
  maxRetriesReached: boolean;
}

/**
 * Default configuration values
 */
export const LAZY_ROUTE_DEFAULTS = {
  /** Default timeout before showing error (10 seconds) */
  LOAD_TIMEOUT_MS: 10000,
  
  /** Default max retry attempts */
  MAX_RETRIES: 3,
  
  /** Default retry delay (1 second) */
  RETRY_DELAY_MS: 1000,
  
  /** Default preload trigger */
  PRELOAD_TRIGGER: 'none' as const,
} as const;
