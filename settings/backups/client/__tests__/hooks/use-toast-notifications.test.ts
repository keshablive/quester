/**
 * useToastNotifications Hook Tests (T152A)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 * 
 * Tests for toast notification hook including:
 * - Show notification
 * - Dismiss notification
 * - Dismiss all notifications
 * - Queue management
 * - Multiple notifications
 * - Auto-dismiss integration
 */

import { renderHook, act } from '@testing-library/react-native';
import { useToastNotifications } from '@/lib/hooks/use-toast-notifications';
import { ToastNotification } from '@/lib/types/real-time';

describe('useToastNotifications', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Show Notifications', () => {
    test('should show a notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test Notification');
      expect(result.current.notifications[0].type).toBe('info');
    });

    test('should generate unique IDs for notifications', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({ type: 'info', title: 'First' });
        result.current.show({ type: 'info', title: 'Second' });
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0].id).not.toBe(result.current.notifications[1].id);
    });

    test('should include timestamp for notifications', () => {
      const { result } = renderHook(() => useToastNotifications());
      const beforeTime = Date.now();

      act(() => {
        result.current.show({ type: 'info', title: 'Test' });
      });

      const afterTime = Date.now();
      const notification = result.current.notifications[0];

      expect(notification.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(notification.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should accept all notification properties', () => {
      const { result } = renderHook(() => useToastNotifications());
      const actionFn = jest.fn();

      act(() => {
        result.current.show({
          type: 'success',
          title: 'Quest Complete',
          message: '+50 XP earned',
          duration: 3000,
          avatar: 'https://example.com/avatar.jpg',
          action: {
            label: 'View',
            onPress: actionFn,
          },
        });
      });

      const notification = result.current.notifications[0];
      expect(notification.type).toBe('success');
      expect(notification.title).toBe('Quest Complete');
      expect(notification.message).toBe('+50 XP earned');
      expect(notification.duration).toBe(3000);
      expect(notification.avatar).toBe('https://example.com/avatar.jpg');
      expect(notification.action).toBeDefined();
      expect(notification.action?.label).toBe('View');
    });
  });

  describe('Dismiss Notifications', () => {
    test('should dismiss a notification by ID', () => {
      const { result } = renderHook(() => useToastNotifications());

      let notificationId: string;

      act(() => {
        result.current.show({ type: 'info', title: 'Test' });
      });

      notificationId = result.current.notifications[0].id;
      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.dismiss(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    test('should only dismiss the specified notification', () => {
      const { result } = renderHook(() => useToastNotifications());

      let firstId: string;
      let secondId: string;

      act(() => {
        result.current.show({ type: 'info', title: 'First' });
        result.current.show({ type: 'info', title: 'Second' });
      });

      firstId = result.current.notifications[0].id;
      secondId = result.current.notifications[1].id;
      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.dismiss(firstId);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe(secondId);
    });

    test('should handle dismissing non-existent notification gracefully', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({ type: 'info', title: 'Test' });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.dismiss('non-existent-id');
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  describe('Dismiss All', () => {
    test('should dismiss all notifications', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({ type: 'info', title: 'First' });
        result.current.show({ type: 'info', title: 'Second' });
        result.current.show({ type: 'info', title: 'Third' });
      });

      expect(result.current.notifications).toHaveLength(3);

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    test('should handle dismissAll when no notifications exist', () => {
      const { result } = renderHook(() => useToastNotifications());

      expect(result.current.notifications).toHaveLength(0);

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('Queue Management', () => {
    test('should maintain notifications in FIFO order', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({ type: 'info', title: 'First' });
        result.current.show({ type: 'info', title: 'Second' });
        result.current.show({ type: 'info', title: 'Third' });
      });

      expect(result.current.notifications[0].title).toBe('First');
      expect(result.current.notifications[1].title).toBe('Second');
      expect(result.current.notifications[2].title).toBe('Third');
    });

    test('should limit maximum visible notifications', () => {
      const { result } = renderHook(() => useToastNotifications({ maxVisible: 3 }));

      act(() => {
        result.current.show({ type: 'info', title: 'First' });
        result.current.show({ type: 'info', title: 'Second' });
        result.current.show({ type: 'info', title: 'Third' });
        result.current.show({ type: 'info', title: 'Fourth' });
      });

      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications[0].title).toBe('Second');
      expect(result.current.notifications[2].title).toBe('Fourth');
    });

    test('should remove oldest notification when queue is full', () => {
      const { result } = renderHook(() => useToastNotifications({ maxVisible: 2 }));

      act(() => {
        result.current.show({ type: 'info', title: 'First' });
        result.current.show({ type: 'info', title: 'Second' });
      });

      const firstId = result.current.notifications[0].id;

      act(() => {
        result.current.show({ type: 'info', title: 'Third' });
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0].id).not.toBe(firstId);
      expect(result.current.notifications[1].title).toBe('Third');
    });
  });

  describe('Multiple Notifications', () => {
    test('should handle multiple notification types simultaneously', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({ type: 'info', title: 'Info' });
        result.current.show({ type: 'success', title: 'Success' });
        result.current.show({ type: 'warning', title: 'Warning' });
        result.current.show({ type: 'error', title: 'Error' });
      });

      expect(result.current.notifications).toHaveLength(4);
      expect(result.current.notifications.map(n => n.type)).toEqual([
        'info',
        'success',
        'warning',
        'error',
      ]);
    });

    test('should handle rapid show calls', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.show({ type: 'info', title: `Notification ${i}` });
        }
      });

      expect(result.current.notifications.length).toBeGreaterThan(0);
      expect(result.current.notifications.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Convenience Methods', () => {
    test('should provide success method', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.success('Success Message');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].title).toBe('Success Message');
    });

    test('should provide error method', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.error('Error Message');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
      expect(result.current.notifications[0].title).toBe('Error Message');
    });

    test('should provide warning method', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.warning('Warning Message');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('warning');
      expect(result.current.notifications[0].title).toBe('Warning Message');
    });

    test('should provide info method', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.info('Info Message');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('info');
      expect(result.current.notifications[0].title).toBe('Info Message');
    });

    test('should accept message parameter in convenience methods', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.success('Title', 'Detailed message');
      });

      expect(result.current.notifications[0].title).toBe('Title');
      expect(result.current.notifications[0].message).toBe('Detailed message');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty title', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({ type: 'info', title: '' });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('');
    });

    test('should handle very long titles', () => {
      const { result } = renderHook(() => useToastNotifications());
      const longTitle = 'A'.repeat(500);

      act(() => {
        result.current.show({ type: 'info', title: longTitle });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe(longTitle);
    });

    test('should handle notifications with same title', () => {
      const { result } = renderHook(() => useToastNotifications());

      act(() => {
        result.current.show({ type: 'info', title: 'Same Title' });
        result.current.show({ type: 'info', title: 'Same Title' });
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0].id).not.toBe(result.current.notifications[1].id);
    });
  });
});
