/**
 * Screen Wrapper Component
 *
 * Base wrapper for all screens with error boundary, performance tracking,
 * and accessibility features.
 *
 * Implements FR-028, FR-029, FR-030
 *
 * @module screen-wrapper
 */

import React from 'react';
import { View, ScrollView, type ViewProps } from 'react-native';
import { ErrorBoundary } from './error-boundary';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { cn } from '@/lib/utils';

export interface ScreenWrapperProps extends ViewProps {
  /** Screen name for tracking and error logging */
  screenName: string;

  /** Children to render */
  children: React.ReactNode;

  /** Enable scrolling (default: false) */
  scrollable?: boolean;

  /** Custom error fallback */
  errorFallback?: (error: Error, resetError: () => void) => React.ReactNode;

  /** Additional className for styling */
  className?: string;

  /** Track performance metrics (default: true) */
  trackPerformance?: boolean;

  /** Accessibility label for screen */
  accessibilityLabel?: string;
}

/**
 * Screen Wrapper Component
 *
 * Wraps screen content with error boundary and performance tracking.
 *
 * @example Basic usage
 * ```tsx
 * export default function HomeScreen() {
 *   return (
 *     <ScreenWrapper screenName="HomeScreen" scrollable>
 *       <Text variant="h1">Home</Text>
 *       {/ * Screen content * /}
 *     </ScreenWrapper>
 *   );
 * }
 * ```
 *
 * @example With custom error fallback
 * ```tsx
 * export default function ProfileScreen() {
 *   return (
 *     <ScreenWrapper
 *       screenName="ProfileScreen"
 *       errorFallback={(error, reset) => (
 *         <CustomProfileError error={error} onRetry={reset} />
 *       )}
 *     >
 *       <ProfileContent />
 *     </ScreenWrapper>
 *   );
 * }
 * ```
 */
export function ScreenWrapper({
  screenName,
  children,
  scrollable = false,
  errorFallback,
  className,
  trackPerformance = true,
  accessibilityLabel,
  ...props
}: ScreenWrapperProps): React.ReactElement {
  // Track screen performance
  if (trackPerformance) {
    useScreenPerformanceMetrics(screenName);
  }

  const content = (
    <View
      className={cn('flex-1 bg-background', className)}
      accessibilityLabel={accessibilityLabel || screenName}
      {...props}>
      {children}
    </View>
  );

  const scrollableContent = (
    <ScrollView
      className={cn('flex-1 bg-background', className)}
      contentContainerClassName="pb-safe"
      accessibilityLabel={accessibilityLabel || screenName}
      {...props}>
      {children}
    </ScrollView>
  );

  return (
    <ErrorBoundary componentName={screenName} screenName={screenName} fallback={errorFallback}>
      {scrollable ? scrollableContent : content}
    </ErrorBoundary>
  );
}

/**
 * Safe Area Screen Wrapper
 *
 * Screen wrapper with safe area insets applied.
 *
 * @example
 * ```tsx
 * export default function SettingsScreen() {
 *   return (
 *     <SafeAreaScreenWrapper screenName="SettingsScreen">
 *       <SettingsContent />
 *     </SafeAreaScreenWrapper>
 *   );
 * }
 * ```
 */
export function SafeAreaScreenWrapper(props: ScreenWrapperProps): React.ReactElement {
  return <ScreenWrapper {...props} className={cn('pt-safe px-safe pb-safe', props.className)} />;
}
