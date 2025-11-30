/**
 * ErrorState Component
 *
 * Inline error display for data/content failures.
 * Provides user feedback when API calls fail with optional retry functionality.
 *
 * Feature: 018-client-performance
 * FR-003: Inline error display for data failures
 * FR-004: Retry mechanism with visual feedback
 *
 * @module components/shared/ErrorState
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ErrorStateProps {
  /** Error title (optional, defaults to "Something went wrong") */
  title?: string;
  /** Error message to display */
  message: string;
  /** Callback for retry action (typically TanStack Query's refetch) */
  onRetry?: () => void | Promise<unknown>;
  /** Custom icon component */
  icon?: React.ReactNode;
  /** Optional additional styles for container */
  style?: object;
  /** Test ID for testing */
  testID?: string;
}

/**
 * ErrorState
 *
 * Displays inline error state for data/content failures.
 * Used as a replacement for empty states when API calls fail.
 *
 * @example
 * ```tsx
 * function CourseList() {
 *   const { data, error, refetch, isLoading } = useCourses();
 *
 *   if (error) {
 *     return (
 *       <ErrorState
 *         message={error.message}
 *         onRetry={refetch}
 *       />
 *     );
 *   }
 *
 *   return <FlatList data={data} ... />;
 * }
 * ```
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  icon,
  style,
  testID = 'error-state',
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.iconContainer}>{icon ?? <Text style={styles.defaultIcon}>⚠️</Text>}</View>

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isRetrying}
          accessibilityRole="button"
          accessibilityLabel={isRetrying ? 'Retrying...' : 'Retry'}
          accessibilityState={{ disabled: isRetrying }}
          testID={`${testID}-retry-button`}>
          {isRetrying ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.retryButtonText}>Try Again</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 200,
  },
  iconContainer: {
    marginBottom: 16,
  },
  defaultIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
