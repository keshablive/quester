/**
 * Lazy Routes Contracts
 * Feature: 019-client-image-list-performance
 * 
 * Defines TypeScript interfaces for code-split route components.
 */

import { ComponentType, LazyExoticComponent, ReactNode } from 'react';

/**
 * Configuration for a lazy-loaded route
 */
export interface LazyRouteConfig {
  /** Route identifier/name */
  name: string;
  
  /** The lazy-loaded component */
  component: LazyExoticComponent<ComponentType<unknown>>;
  
  /** Custom loading fallback (optional) */
  fallback?: ReactNode;
  
  /** Timeout before showing timeout error (ms) */
  loadTimeout?: number;
  
  /** Number of retry attempts on chunk load failure */
  maxRetries?: number;
  
  /** When to preload the chunk */
  preloadTrigger?: PreloadTrigger;
}

/**
 * When to preload a lazy chunk
 */
export type PreloadTrigger = 
  | 'none'      // Never preload, load on navigation
  | 'idle'      // Preload when browser is idle
  | 'hover'     // Preload when navigation item is hovered
  | 'visible';  // Preload when navigation item is visible

/**
 * State for chunk loading
 */
export interface ChunkLoadingState {
  /** Whether chunk is currently loading */
  isLoading: boolean;
  
  /** Error if chunk failed to load */
  error: Error | null;
  
  /** Number of retry attempts made */
  retryCount: number;
  
  /** Whether we've exceeded max retries */
  hasExceededRetries: boolean;
}

/**
 * Props for lazy route wrapper components
 */
export interface LazyRouteWrapperProps {
  /** Children to render (the lazy component) */
  children: ReactNode;
  
  /** Fallback to show while loading */
  fallback?: ReactNode;
  
  /** Callback when chunk fails to load */
  onError?: (error: Error) => void;
  
  /** Callback to retry loading */
  onRetry?: () => void;
}

/**
 * Props for chunk error boundary
 */
export interface ChunkErrorBoundaryProps {
  children: ReactNode;
  
  /** Custom error UI component */
  errorComponent?: ComponentType<ChunkErrorProps>;
  
  /** Called when error occurs */
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  
  /** Called when retry is triggered */
  onRetry?: () => void;
  
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Props passed to chunk error component
 */
export interface ChunkErrorProps {
  /** The error that occurred */
  error: Error;
  
  /** Number of retry attempts made */
  retryCount: number;
  
  /** Whether more retries are allowed */
  canRetry: boolean;
  
  /** Function to trigger retry */
  onRetry: () => void;
}

/**
 * Screens that should be code-split
 */
export const CODE_SPLIT_SCREENS = [
  'admin',
  'analytics', 
  'reports',
] as const;

export type CodeSplitScreen = typeof CODE_SPLIT_SCREENS[number];

/**
 * Default configuration for lazy routes
 */
export const LAZY_ROUTE_DEFAULTS = {
  /** Default timeout before showing error (10 seconds) */
  LOAD_TIMEOUT_MS: 10000,
  
  /** Default max retry attempts */
  MAX_RETRIES: 3,
  
  /** Delay between retries (with exponential backoff) */
  RETRY_BASE_DELAY_MS: 1000,
  
  /** Default preload trigger */
  PRELOAD_TRIGGER: 'none' as PreloadTrigger,
} as const;

/**
 * Calculate retry delay with exponential backoff
 * @param retryCount - Current retry attempt (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(retryCount: number): number {
  return LAZY_ROUTE_DEFAULTS.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
}

/**
 * Check if an error is a chunk load error
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  return (
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('ChunkLoadError') ||
    error.name === 'ChunkLoadError'
  );
}
