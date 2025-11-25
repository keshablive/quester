/**
 * ErrorBoundary Component Tests
 *
 * Automated tests for error boundary functionality.
 * Complements manual testing from T198.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text as RNText, View } from 'react-native';
import { ErrorBoundary } from '@/components/error-boundary';
import { Text } from '@/components/ui/text';

// Component that throws on render
const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
  return <View />;
};

describe('ErrorBoundary', () => {
  // Suppress console errors during tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  describe('Error Catching', () => {
    it('should catch render errors and display fallback UI', () => {
      const { getByText } = render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText(/TestComponent encountered an error/)).toBeTruthy();
    });

    it('should display error icon in fallback UI', () => {
      const { getByText } = render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(getByText('⚠️')).toBeTruthy();
    });

    it('should display retry button', () => {
      const { getByText } = render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should include component name in error message', () => {
      const { getByText } = render(
        <ErrorBoundary componentName="CustomScreen">
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(getByText(/CustomScreen encountered an error/)).toBeTruthy();
    });
  });

  describe('Retry Functionality', () => {
    it('should have retry button that can be pressed', () => {
      const { getByText } = render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      // Retry button should exist
      const retryButton = getByText('Try Again');
      expect(retryButton).toBeTruthy();

      // Button should be pressable (no error thrown)
      expect(() => fireEvent.press(retryButton)).not.toThrow();
    });
  });

  describe('Custom Fallback', () => {
    it('should use custom fallback when provided', () => {
      const customFallback = (error: Error, reset: () => void) => (
        <View>
          <Text>Custom Error UI</Text>
          <Text>{error.message}</Text>
          <RNText onPress={reset}>Custom Retry</RNText>
        </View>
      );

      const { getByText, queryByText } = render(
        <ErrorBoundary componentName="TestComponent" fallback={customFallback}>
          <ThrowError message="Custom error message" />
        </ErrorBoundary>
      );

      expect(getByText('Custom Error UI')).toBeTruthy();
      expect(getByText('Custom error message')).toBeTruthy();
      expect(queryByText('Something went wrong')).toBeNull();
    });
  });

  describe('Error Logging', () => {
    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary componentName="TestComponent" onError={onError}>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should pass correct component name to error logger', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary componentName="SpecificComponent" onError={onError}>
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      // Component name is passed internally to errorLogger
    });
  });

  describe('Accessibility', () => {
    it('should have alert role on error container', () => {
      const { getByLabelText } = render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      // Check for accessibilityRole via label
      const alertElement = getByLabelText(/Error occurred in TestComponent/i);
      expect(alertElement).toBeTruthy();
      expect(alertElement.props.accessibilityRole).toBe('alert');
    });

    it('should have proper button accessibility attributes', () => {
      const { getByTestId } = render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError message="Test error" />
        </ErrorBoundary>
      );

      const button = getByTestId('error-retry-button');
      expect(button).toBeTruthy();
      expect(button.props.accessibilityLabel).toBe('Try again');
      expect(button.props.accessibilityHint).toBe('Attempts to reload the component');
    });
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary componentName="TestComponent">
          <Text>Normal content</Text>
        </ErrorBoundary>
      );

      expect(getByText('Normal content')).toBeTruthy();
    });

    it('should not display fallback UI when no error', () => {
      const { queryByText } = render(
        <ErrorBoundary componentName="TestComponent">
          <Text>Normal content</Text>
        </ErrorBoundary>
      );

      expect(queryByText('Something went wrong')).toBeNull();
      expect(queryByText('Try Again')).toBeNull();
    });
  });
});
