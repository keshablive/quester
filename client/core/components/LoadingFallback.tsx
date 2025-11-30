/**
 * LoadingFallback Component
 * Feature: 019-client-image-list-performance
 *
 * A loading indicator component used as Suspense fallback for lazy-loaded routes.
 * Provides consistent loading UI across the app with customizable appearance.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<LoadingFallback message="Loading dashboard..." />}>
 *   <Dashboard />
 * </Suspense>
 * ```
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { cn } from '@/core';
import { LAZY_LOAD_CONFIG } from '../constants/performance';

/**
 * Props for LoadingFallback component
 */
export interface LoadingFallbackProps {
  /** Loading message to display */
  message?: string;
  /** Size of the activity indicator */
  size?: 'small' | 'large';
  /** Whether to render in full screen mode */
  fullScreen?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether to show the message */
  showMessage?: boolean;
  /** Test ID for e2e testing */
  testID?: string;
}

/**
 * LoadingFallback - Suspense fallback for lazy-loaded routes
 *
 * Uses performance constants for consistent timing and appearance.
 * Designed to be lightweight and fast-rendering to minimize loading impact.
 */
export function LoadingFallback({
  message = 'Loading...',
  size = 'large',
  fullScreen = true,
  className,
  showMessage = true,
  testID,
}: LoadingFallbackProps) {
  return (
    <View
      className={cn(
        'items-center justify-center bg-background',
        fullScreen && 'flex-1',
        !fullScreen && 'py-8',
        className
      )}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={message}>
      <ActivityIndicator size={size} className="text-primary" />
      {showMessage && <Text className="mt-3 text-base text-muted-foreground">{message}</Text>}
    </View>
  );
}

/**
 * PageLoadingFallback - Full-page loading variant
 *
 * Intended for route-level lazy loading.
 */
export function PageLoadingFallback({ message }: { message?: string }) {
  return (
    <LoadingFallback
      message={message}
      fullScreen={true}
      size="large"
      testID="page-loading-fallback"
    />
  );
}

/**
 * ComponentLoadingFallback - Inline loading variant
 *
 * Intended for component-level lazy loading within a page.
 */
export function ComponentLoadingFallback({ message }: { message?: string }) {
  return (
    <LoadingFallback
      message={message}
      fullScreen={false}
      size="small"
      showMessage={false}
      testID="component-loading-fallback"
    />
  );
}
