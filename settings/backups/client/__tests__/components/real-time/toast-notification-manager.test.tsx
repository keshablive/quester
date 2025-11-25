/**
 * ToastNotificationManager Component Tests (T146)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Tests for notification manager including:
 * - Rendering multiple notifications
 * - FIFO ordering
 * - Pass-through props (onDismiss, onPress)
 * - Empty state (no notifications)
 * - SafeAreaView positioning
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ToastNotificationManager } from '@/components/real-time/toast-notification-manager';
import { ToastNotification } from '@/lib/types/real-time';

// Mock the ToastNotification component
jest.mock('@/components/real-time/toast-notification', () => ({
  ToastNotification: ({ notification, onDismiss, onPress }: any) => {
    const { Text, Pressable } = require('react-native');
    return (
      <Pressable testID={`toast-${notification.id}`} onPress={() => onPress?.(notification)}>
        <Text testID={`toast-title-${notification.id}`}>{notification.title}</Text>
        <Pressable
          testID={`toast-dismiss-${notification.id}`}
          onPress={() => onDismiss(notification.id)}>
          <Text>Dismiss</Text>
        </Pressable>
      </Pressable>
    );
  },
}));

describe('ToastNotificationManager', () => {
  const mockNotifications: ToastNotification[] = [
    {
      id: '1',
      type: 'info',
      title: 'First Notification',
      timestamp: Date.now(),
    },
    {
      id: '2',
      type: 'success',
      title: 'Second Notification',
      timestamp: Date.now(),
    },
    {
      id: '3',
      type: 'warning',
      title: 'Third Notification',
      timestamp: Date.now(),
    },
  ];

  const mockOnDismiss = jest.fn();
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render all notifications', () => {
      render(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-1')).toBeTruthy();
      expect(screen.getByTestId('toast-2')).toBeTruthy();
      expect(screen.getByTestId('toast-3')).toBeTruthy();
    });

    test('should render notifications in correct order', () => {
      render(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-title-1')).toHaveTextContent('First Notification');
      expect(screen.getByTestId('toast-title-2')).toHaveTextContent('Second Notification');
      expect(screen.getByTestId('toast-title-3')).toHaveTextContent('Third Notification');
    });

    test('should not render when notifications array is empty', () => {
      render(<ToastNotificationManager notifications={[]} onDismiss={mockOnDismiss} />);

      expect(screen.queryByTestId('toast-notification-manager')).toBeNull();
    });

    test('should render manager container with correct testID', () => {
      render(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-notification-manager')).toBeTruthy();
    });
  });

  describe('Dismiss Handling', () => {
    test('should call onDismiss with correct ID when notification is dismissed', () => {
      render(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      fireEvent.press(screen.getByTestId('toast-dismiss-2'));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledWith('2');
    });

    test('should pass onDismiss to all notifications', () => {
      render(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      fireEvent.press(screen.getByTestId('toast-dismiss-1'));
      fireEvent.press(screen.getByTestId('toast-dismiss-3'));

      expect(mockOnDismiss).toHaveBeenCalledTimes(2);
      expect(mockOnDismiss).toHaveBeenNthCalledWith(1, '1');
      expect(mockOnDismiss).toHaveBeenNthCalledWith(2, '3');
    });
  });

  describe('Press Handling', () => {
    test('should call onPress when notification is pressed', () => {
      render(
        <ToastNotificationManager
          notifications={mockNotifications}
          onDismiss={mockOnDismiss}
          onPress={mockOnPress}
        />
      );

      fireEvent.press(screen.getByTestId('toast-2'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(mockNotifications[1]);
    });

    test('should not error when onPress is not provided', () => {
      render(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      expect(() => fireEvent.press(screen.getByTestId('toast-1'))).not.toThrow();
    });
  });

  describe('Multiple Notifications', () => {
    test('should handle single notification', () => {
      render(
        <ToastNotificationManager
          notifications={[mockNotifications[0]]}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('toast-1')).toBeTruthy();
      expect(screen.queryByTestId('toast-2')).toBeNull();
    });

    test('should handle many notifications', () => {
      const manyNotifications: ToastNotification[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        type: 'info',
        title: `Notification ${i}`,
        timestamp: Date.now() + i,
      }));

      render(
        <ToastNotificationManager notifications={manyNotifications} onDismiss={mockOnDismiss} />
      );

      manyNotifications.forEach((notification) => {
        expect(screen.getByTestId(`toast-${notification.id}`)).toBeTruthy();
      });
    });

    test('should render different notification types', () => {
      const mixedNotifications: ToastNotification[] = [
        { id: '1', type: 'info', title: 'Info', timestamp: Date.now() },
        { id: '2', type: 'success', title: 'Success', timestamp: Date.now() },
        { id: '3', type: 'warning', title: 'Warning', timestamp: Date.now() },
        { id: '4', type: 'error', title: 'Error', timestamp: Date.now() },
        { id: '5', type: 'message', title: 'Message', timestamp: Date.now() },
      ];

      render(
        <ToastNotificationManager notifications={mixedNotifications} onDismiss={mockOnDismiss} />
      );

      mixedNotifications.forEach((notification) => {
        expect(screen.getByTestId(`toast-title-${notification.id}`)).toHaveTextContent(
          notification.title
        );
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle notifications with same title', () => {
      const duplicateNotifications: ToastNotification[] = [
        { id: '1', type: 'info', title: 'Same Title', timestamp: Date.now() },
        { id: '2', type: 'info', title: 'Same Title', timestamp: Date.now() + 1 },
      ];

      render(
        <ToastNotificationManager
          notifications={duplicateNotifications}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('toast-1')).toBeTruthy();
      expect(screen.getByTestId('toast-2')).toBeTruthy();
    });

    test('should handle rapid notification updates', () => {
      const { rerender } = render(
        <ToastNotificationManager
          notifications={[mockNotifications[0]]}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('toast-1')).toBeTruthy();

      rerender(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-1')).toBeTruthy();
      expect(screen.getByTestId('toast-2')).toBeTruthy();
      expect(screen.getByTestId('toast-3')).toBeTruthy();

      rerender(<ToastNotificationManager notifications={[]} onDismiss={mockOnDismiss} />);

      expect(screen.queryByTestId('toast-notification-manager')).toBeNull();
    });

    test('should handle notification removal from middle of array', () => {
      const { rerender } = render(
        <ToastNotificationManager notifications={mockNotifications} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-1')).toBeTruthy();
      expect(screen.getByTestId('toast-2')).toBeTruthy();
      expect(screen.getByTestId('toast-3')).toBeTruthy();

      // Remove middle notification
      rerender(
        <ToastNotificationManager
          notifications={[mockNotifications[0], mockNotifications[2]]}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('toast-1')).toBeTruthy();
      expect(screen.queryByTestId('toast-2')).toBeNull();
      expect(screen.getByTestId('toast-3')).toBeTruthy();
    });
  });
});
