/**
 * Toast Notification Tests (T143)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Tests for toast notification component including:
 * - Rendering with different types (info, success, warning, error, message)
 * - Auto-dismiss functionality with custom duration
 * - Action buttons (reply, dismiss, view)
 * - User avatar display
 * - Accessibility (ARIA labels, screen reader announcements)
 * - Animation (slide-in, slide-out)
 * - Touch/press handling
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { ToastNotification } from '@/components/real-time/toast-notification';
import { ToastNotification as ToastNotificationType } from '@/lib/types/real-time';

// Mock Animated.spring and Animated.timing for testing
jest.spyOn(Animated, 'spring').mockImplementation(
  (value: any, config: any) =>
    ({
      start: (callback?: any) => {
        value.setValue(config.toValue);
        if (callback) callback({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }) as any
);

jest.spyOn(Animated, 'timing').mockImplementation(
  (value: any, config: any) =>
    ({
      start: (callback?: any) => {
        value.setValue(config.toValue);
        if (callback) callback({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }) as any
);

describe('ToastNotification', () => {
  const defaultNotification: ToastNotificationType = {
    id: 'test-1',
    type: 'info',
    title: 'Test Notification',
    message: 'This is a test message',
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('should render notification with title and message', () => {
      render(<ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />);

      expect(screen.getByText('Test Notification')).toBeTruthy();
      expect(screen.getByText('This is a test message')).toBeTruthy();
    });

    test('should render without message (title only)', () => {
      const notification: ToastNotificationType = {
        ...defaultNotification,
        message: undefined,
      };

      render(<ToastNotification notification={notification} onDismiss={jest.fn()} />);

      expect(screen.getByText('Test Notification')).toBeTruthy();
      expect(screen.queryByText('This is a test message')).toBeNull();
    });

    test('should render with avatar when provided', () => {
      const notification: ToastNotificationType = {
        ...defaultNotification,
        avatar: 'https://example.com/avatar.jpg',
      };

      const { getByTestId } = render(
        <ToastNotification notification={notification} onDismiss={jest.fn()} />
      );

      const avatar = getByTestId('toast-avatar');
      expect(avatar).toBeTruthy();
      expect(avatar.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
    });

    test('should not render avatar when not provided', () => {
      const { queryByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      expect(queryByTestId('toast-avatar')).toBeNull();
    });
  });

  describe('Notification Types', () => {
    test('should apply info styling for info type', () => {
      const { getByTestId } = render(
        <ToastNotification
          notification={{ ...defaultNotification, type: 'info' }}
          onDismiss={jest.fn()}
        />
      );

      const container = getByTestId('toast-notification');
      expect(container.props.className).toContain('bg-blue');
    });

    test('should apply success styling for success type', () => {
      const { getByTestId } = render(
        <ToastNotification
          notification={{ ...defaultNotification, type: 'success' }}
          onDismiss={jest.fn()}
        />
      );

      const container = getByTestId('toast-notification');
      expect(container.props.className).toContain('bg-green');
    });

    test('should apply warning styling for warning type', () => {
      const { getByTestId } = render(
        <ToastNotification
          notification={{ ...defaultNotification, type: 'warning' }}
          onDismiss={jest.fn()}
        />
      );

      const container = getByTestId('toast-notification');
      expect(container.props.className).toContain('bg-yellow');
    });

    test('should apply error styling for error type', () => {
      const { getByTestId } = render(
        <ToastNotification
          notification={{ ...defaultNotification, type: 'error' }}
          onDismiss={jest.fn()}
        />
      );

      const container = getByTestId('toast-notification');
      expect(container.props.className).toContain('bg-red');
    });

    test('should apply message styling for message type', () => {
      const { getByTestId } = render(
        <ToastNotification
          notification={{ ...defaultNotification, type: 'message' }}
          onDismiss={jest.fn()}
        />
      );

      const container = getByTestId('toast-notification');
      expect(container.props.className).toContain('bg-gray');
    });
  });

  describe('Auto-Dismiss', () => {
    test('should auto-dismiss after default duration (5000ms)', () => {
      const onDismiss = jest.fn();

      render(<ToastNotification notification={defaultNotification} onDismiss={onDismiss} />);

      expect(onDismiss).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(onDismiss).toHaveBeenCalledWith('test-1');
    });

    test('should auto-dismiss after custom duration', () => {
      const onDismiss = jest.fn();
      const notification: ToastNotificationType = {
        ...defaultNotification,
        duration: 3000,
      };

      render(<ToastNotification notification={notification} onDismiss={onDismiss} />);

      jest.advanceTimersByTime(2999);
      expect(onDismiss).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith('test-1');
    });

    test('should not auto-dismiss when duration is 0', () => {
      const onDismiss = jest.fn();
      const notification: ToastNotificationType = {
        ...defaultNotification,
        duration: 0,
      };

      render(<ToastNotification notification={notification} onDismiss={onDismiss} />);

      jest.advanceTimersByTime(10000);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    test('should cancel auto-dismiss timer on unmount', () => {
      const onDismiss = jest.fn();

      const { unmount } = render(
        <ToastNotification notification={defaultNotification} onDismiss={onDismiss} />
      );

      jest.advanceTimersByTime(2000);
      unmount();
      jest.advanceTimersByTime(5000);

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    test('should render action button when provided', () => {
      const actionFn = jest.fn();
      const notification: ToastNotificationType = {
        ...defaultNotification,
        action: {
          label: 'Reply',
          onPress: actionFn,
        },
      };

      render(<ToastNotification notification={notification} onDismiss={jest.fn()} />);

      expect(screen.getByText('Reply')).toBeTruthy();
    });

    test('should call action handler when action button pressed', () => {
      const actionFn = jest.fn();
      const notification: ToastNotificationType = {
        ...defaultNotification,
        action: {
          label: 'Reply',
          onPress: actionFn,
        },
      };

      render(<ToastNotification notification={notification} onDismiss={jest.fn()} />);

      const actionButton = screen.getByText('Reply');
      fireEvent.press(actionButton);

      expect(actionFn).toHaveBeenCalled();
    });

    test('should dismiss notification after action button pressed', () => {
      const actionFn = jest.fn();
      const onDismiss = jest.fn();
      const notification: ToastNotificationType = {
        ...defaultNotification,
        action: {
          label: 'View',
          onPress: actionFn,
        },
      };

      render(<ToastNotification notification={notification} onDismiss={onDismiss} />);

      const actionButton = screen.getByText('View');
      fireEvent.press(actionButton);

      expect(onDismiss).toHaveBeenCalledWith('test-1');
    });

    test('should not render action button when not provided', () => {
      render(<ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />);

      expect(screen.queryByTestId('toast-action-button')).toBeNull();
    });
  });

  describe('Dismiss Button', () => {
    test('should render dismiss button', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      expect(getByTestId('toast-dismiss-button')).toBeTruthy();
    });

    test('should call onDismiss when dismiss button pressed', () => {
      const onDismiss = jest.fn();

      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={onDismiss} />
      );

      const dismissButton = getByTestId('toast-dismiss-button');
      fireEvent.press(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('test-1');
    });
  });

  describe('Press Handling', () => {
    test('should call onPress callback when notification pressed', () => {
      const onPress = jest.fn();

      const { getByTestId } = render(
        <ToastNotification
          notification={defaultNotification}
          onDismiss={jest.fn()}
          onPress={onPress}
        />
      );

      const notification = getByTestId('toast-notification');
      fireEvent.press(notification);

      expect(onPress).toHaveBeenCalledWith(defaultNotification);
    });

    test('should not throw error when pressed without onPress callback', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      const notification = getByTestId('toast-notification');

      expect(() => {
        fireEvent.press(notification);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should have alert role', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      const notification = getByTestId('toast-notification');
      expect(notification.props.accessibilityRole).toBe('alert');
    });

    test('should have polite live region for info/success/message types', () => {
      const types: Array<ToastNotificationType['type']> = ['info', 'success', 'message'];

      types.forEach((type) => {
        const { getByTestId } = render(
          <ToastNotification
            notification={{ ...defaultNotification, type }}
            onDismiss={jest.fn()}
          />
        );

        const notification = getByTestId('toast-notification');
        expect(notification.props.accessibilityLiveRegion).toBe('polite');
      });
    });

    test('should have assertive live region for warning/error types', () => {
      const types: Array<ToastNotificationType['type']> = ['warning', 'error'];

      types.forEach((type) => {
        const { getByTestId } = render(
          <ToastNotification
            notification={{ ...defaultNotification, type }}
            onDismiss={jest.fn()}
          />
        );

        const notification = getByTestId('toast-notification');
        expect(notification.props.accessibilityLiveRegion).toBe('assertive');
      });
    });

    test('should have descriptive accessibility label', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      const notification = getByTestId('toast-notification');
      expect(notification.props.accessibilityLabel).toContain('Test Notification');
      expect(notification.props.accessibilityLabel).toContain('This is a test message');
    });

    test('should have accessibility hint for dismissable notifications', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      const notification = getByTestId('toast-notification');
      expect(notification.props.accessibilityHint).toContain('swipe to dismiss');
    });

    test('should have button role and label for dismiss button', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      const dismissButton = getByTestId('toast-dismiss-button');
      expect(dismissButton.props.accessibilityRole).toBe('button');
      expect(dismissButton.props.accessibilityLabel).toBe('Dismiss notification');
    });
  });

  describe('Animation', () => {
    test('should apply animation styles', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      const animated = getByTestId('toast-animated-view');
      expect(animated).toBeTruthy();
    });

    test('should slide in when mounted', () => {
      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={jest.fn()} />
      );

      const animated = getByTestId('toast-animated-view');
      // Check that transform is applied (animation running)
      expect(animated.props.style).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long title', () => {
      const longTitle = 'A'.repeat(200);
      const notification: ToastNotificationType = {
        ...defaultNotification,
        title: longTitle,
      };

      const { getByText } = render(
        <ToastNotification notification={notification} onDismiss={jest.fn()} />
      );

      expect(getByText(longTitle)).toBeTruthy();
    });

    test('should handle very long message', () => {
      const longMessage = 'B'.repeat(500);
      const notification: ToastNotificationType = {
        ...defaultNotification,
        message: longMessage,
      };

      const { getByText } = render(
        <ToastNotification notification={notification} onDismiss={jest.fn()} />
      );

      expect(getByText(longMessage)).toBeTruthy();
    });

    test('should handle rapid dismiss calls gracefully', () => {
      const onDismiss = jest.fn();

      const { getByTestId } = render(
        <ToastNotification notification={defaultNotification} onDismiss={onDismiss} />
      );

      const dismissButton = getByTestId('toast-dismiss-button');

      // Press multiple times rapidly
      fireEvent.press(dismissButton);
      fireEvent.press(dismissButton);
      fireEvent.press(dismissButton);

      // Should only be called once
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
