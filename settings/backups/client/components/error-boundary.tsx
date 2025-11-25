/**
 * Error Boundary Component
 *
 * Catches React component errors and displays fallback UI.
 * Logs errors to monitoring system with sanitized props.
 *
 * Implements FR-028, FR-029, FR-030
 *
 * @module error-boundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { errorLogger } from '@/lib/services/error-logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Component name for error tracking */
  componentName?: string;
  /** Screen name for error tracking */
  screenName?: string;
  /** Custom fallback UI */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /** Called when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number; // FR-035: Track error recursion
  lastErrorTime: number; // FR-035: Track error timing
}

/**
 * Error Boundary Component
 *
 * Wraps component trees to catch rendering errors and prevent full app crashes.
 * Implements FR-035 recursion protection to prevent infinite error loops.
 *
 * @example
 * ```tsx
 * <ErrorBoundary componentName="FeedScreen" screenName="/feed">
 *   <FeedContent />
 * </ErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary
 *   componentName="ProfileCard"
 *   fallback={(error, reset) => (
 *     <CustomErrorUI error={error} onRetry={reset} />
 *   )}
 * >
 *   <ProfileCard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private static readonly MAX_ERRORS = 3; // FR-035: Max errors before fail-safe
  private static readonly ERROR_WINDOW_MS = 5000; // FR-035: 5 second window

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName = 'Unknown', screenName, onError } = this.props;
    const now = Date.now();

    // FR-035: Recursion protection - check if we're in an error loop
    const { errorCount, lastErrorTime } = this.state;
    const isWithinWindow = now - lastErrorTime < ErrorBoundary.ERROR_WINDOW_MS;
    const newErrorCount = isWithinWindow ? errorCount + 1 : 1;

    // Update state with error tracking
    this.setState({
      errorCount: newErrorCount,
      lastErrorTime: now,
    });

    // FR-035: Fail-safe - if too many errors in window, show minimal UI and stop retrying
    if (newErrorCount >= ErrorBoundary.MAX_ERRORS) {
      console.error(
        `[ErrorBoundary] ${componentName}: Too many errors (${newErrorCount}). Entering fail-safe mode.`
      );
      // Don't log or process further - just show fail-safe UI
      return;
    }

    // Log to error logger service (FR-030)
    errorLogger.logError(
      error,
      errorInfo,
      componentName,
      this.props as any, // Will be sanitized by errorLogger
      screenName
    );

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to console in development
    if (__DEV__) {
      console.error(`[ErrorBoundary] ${componentName}:`, error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
      lastErrorTime: 0,
    });
  };

  reportError = (): void => {
    // Phase 8, T130: Report error to error tracking service
    const { error } = this.state;
    const { componentName, screenName } = this.props;

    if (error) {
      // In a real implementation, this would send to analytics/error tracking
      console.log('[ErrorBoundary] Reporting error:', {
        component: componentName,
        screen: screenName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      // TODO: Integrate with error reporting service (Sentry, Bugsnag, etc.)
      // errorReportingService.report(error, { component: componentName, screen: screenName });
    }
  };

  goHome = (): void => {
    // Phase 8, T130: Navigate to home screen
    // Reset error state first
    this.resetError();

    // In a real implementation, this would use navigation service
    // For now, just reset the error boundary
    console.log('[ErrorBoundary] Navigating to home');

    // TODO: Integrate with navigation service
    // navigationService.navigate('/(tabs)/feed');
  };

  render(): ReactNode {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback, componentName = 'Component' } = this.props;

    if (hasError && error) {
      // FR-035: Fail-safe mode - show minimal non-retryable UI
      if (errorCount >= ErrorBoundary.MAX_ERRORS) {
        return (
          <View
            className="flex-1 items-center justify-center bg-background p-6"
            accessibilityRole="alert"
            accessibilityLabel="Critical error occurred">
            <View className="max-w-sm items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
                <Text className="text-4xl">🚨</Text>
              </View>
              <Text variant="h3" className="text-center">
                Critical Error
              </Text>
              <Text variant="muted" className="text-center">
                {componentName} has encountered multiple errors. Please restart the app.
              </Text>
              {__DEV__ && (
                <View className="w-full rounded-lg bg-muted p-4">
                  <Text variant="code">
                    Error loop detected ({errorCount} errors). {error.message}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      }

      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.resetError);
      }

      // Default fallback UI (FR-029, Phase 8 T130 enhanced)
      return (
        <View
          className="flex-1 items-center justify-center bg-background p-6"
          accessibilityRole="alert"
          accessibilityLabel={`Error occurred in ${componentName}`}>
          <View className="max-w-sm items-center gap-4">
            {/* Error Icon */}
            <View
              className="h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
              testID="error-icon">
              <Text className="text-4xl">⚠️</Text>
            </View>

            {/* Error Title */}
            <Text variant="h3" className="text-center">
              Something went wrong
            </Text>

            {/* Error Message */}
            <Text variant="muted" className="text-center">
              {componentName} encountered an error. Please try again or contact support if the
              problem persists.
            </Text>

            {/* Development-only error details */}
            {__DEV__ && (
              <View className="w-full rounded-lg bg-muted p-4">
                <Text variant="code">{error.message}</Text>
              </View>
            )}

            {/* Action Buttons - Phase 8, T130 */}
            <View className="w-full flex-row gap-3">
              <Button
                variant="default"
                onPress={this.resetError}
                className="flex-1"
                testID="error-retry-button"
                accessibilityRole="button"
                accessibilityLabel="Try again"
                accessibilityHint="Attempts to reload the component">
                <Text>Try Again</Text>
              </Button>

              <Button
                variant="outline"
                onPress={this.reportError}
                className="flex-1"
                testID="error-report-button"
                accessibilityRole="button"
                accessibilityLabel="Report error"
                accessibilityHint="Sends error report to support team">
                <Text>Report</Text>
              </Button>
            </View>

            {/* Navigation Button */}
            <Button
              variant="ghost"
              onPress={this.goHome}
              testID="error-home-button"
              accessibilityRole="button"
              accessibilityLabel="Go to home screen"
              accessibilityHint="Navigate back to home">
              <Text>Go Home</Text>
            </Button>
          </View>
        </View>
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary wrapper
 *
 * Note: React doesn't support error boundaries in hooks yet,
 * so this is a convenience wrapper around the class component.
 *
 * @example
 * ```tsx
 * export default function MyScreen() {
 *   return (
 *     <ErrorBoundaryWrapper componentName="MyScreen" screenName="/my-screen">
 *       <ScreenContent />
 *     </ErrorBoundaryWrapper>
 *   );
 * }
 * ```
 */
export function ErrorBoundaryWrapper(props: ErrorBoundaryProps): React.ReactElement {
  return <ErrorBoundary {...props} />;
}
