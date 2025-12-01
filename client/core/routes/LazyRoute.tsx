/**
 * LazyRoute Component
 * Feature: 019-client-image-list-performance
 *
 * Provides utilities for code-split routes with:
 * - Suspense-based lazy loading
 * - Error boundaries with retry capability
 * - Loading fallback components
 *
 * @example
 * ```tsx
 * const AdminScreen = lazy(() => import('@/components/features/admin/AdminDashboard'));
 *
 * <ChunkErrorBoundary onError={logError} maxRetries={3}>
 *   <Suspense fallback={<LoadingFallback />}>
 *     <AdminScreen />
 *   </Suspense>
 * </ChunkErrorBoundary>
 * ```
 */

import React, { Component, Suspense, ReactNode } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { LAZY_LOAD_CONFIG } from '../constants/performance';
import type { ChunkErrorBoundaryProps, ChunkErrorFallbackProps } from './LazyRoute.types';

/**
 * State for ChunkErrorBoundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * ChunkErrorBoundary - Error boundary for lazy-loaded chunks
 *
 * Catches chunk loading errors and provides retry functionality.
 * Useful for handling network failures during code splitting.
 */
export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries ?? LAZY_LOAD_CONFIG.MAX_RETRIES;

    if (this.state.retryCount < maxRetries) {
      this.setState((state) => ({
        hasError: false,
        error: null,
        retryCount: state.retryCount + 1,
      }));
    }
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, maxRetries = LAZY_LOAD_CONFIG.MAX_RETRIES } = this.props;

    if (hasError && error) {
      const fallbackProps: ChunkErrorFallbackProps = {
        error,
        retry: this.handleRetry,
        retryCount,
        maxRetriesReached: retryCount >= maxRetries,
      };

      // Custom fallback component
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(fallbackProps);
        }
        return fallback;
      }

      // Default error UI
      return <DefaultChunkErrorFallback {...fallbackProps} />;
    }

    return children;
  }
}

/**
 * Default fallback shown when chunk fails to load
 */
function DefaultChunkErrorFallback({
  error,
  retry,
  retryCount,
  maxRetriesReached,
}: ChunkErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Failed to load</Text>
      <Text style={styles.message}>
        {error.message || 'Something went wrong loading this screen.'}
      </Text>

      {!maxRetriesReached ? (
        <Pressable onPress={retry} style={styles.retryButton}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      ) : (
        <Text style={styles.maxRetriesText}>
          Unable to load after {retryCount} attempts. Please check your connection.
        </Text>
      )}
    </View>
  );
}

/**
 * LoadingFallback - Standard loading component for Suspense
 */
export function LoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

/**
 * withLazyLoading HOC - Wraps a lazy component with error boundary and suspense
 */
export function withLazyLoading<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  options: {
    fallback?: ReactNode;
    maxRetries?: number;
    onError?: (error: Error) => void;
  } = {}
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <ChunkErrorBoundary maxRetries={options.maxRetries} onError={options.onError}>
        <Suspense fallback={options.fallback ?? <LoadingFallback />}>
          <LazyComponent {...props} />
        </Suspense>
      </ChunkErrorBoundary>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  maxRetriesText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});

// Re-export types
export type {
  LazyRouteConfig,
  ChunkLoadingState,
  ChunkErrorBoundaryProps,
  ChunkErrorFallbackProps,
} from './LazyRoute.types';
