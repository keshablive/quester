/**
 * TypingIndicator Component Tests (T144)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Tests for typing indicator including:
 * - Rendering with user info
 * - Animated dots
 * - Multiple users typing
 * - Auto-hide timeout
 * - Accessibility
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { TypingIndicator } from '@/components/real-time/typing-indicator';
import { TypingIndicator as TypingIndicatorType } from '@/lib/types/real-time';

describe('TypingIndicator', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockSingleUser: TypingIndicatorType = {
    userId: 'user-1',
    username: 'Alice',
    avatar: 'https://example.com/alice.jpg',
    timestamp: Date.now(),
  };

  const mockMultipleUsers: TypingIndicatorType[] = [
    {
      userId: 'user-1',
      username: 'Alice',
      avatar: 'https://example.com/alice.jpg',
      timestamp: Date.now(),
    },
    {
      userId: 'user-2',
      username: 'Bob',
      avatar: 'https://example.com/bob.jpg',
      timestamp: Date.now() + 100,
    },
  ];

  describe('Rendering', () => {
    test('should render typing indicator with single user', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      expect(screen.getByTestId('typing-indicator')).toBeTruthy();
      expect(screen.getByText(/Alice is typing/)).toBeTruthy();
    });

    test('should render user avatar when provided', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const avatar = screen.getByTestId('typing-avatar-user-1');
      expect(avatar).toBeTruthy();
      expect(avatar.props.source).toEqual({ uri: 'https://example.com/alice.jpg' });
    });

    test('should not render avatar when not provided', () => {
      const userWithoutAvatar: TypingIndicatorType = {
        userId: 'user-1',
        username: 'Alice',
        timestamp: Date.now(),
      };

      render(<TypingIndicator users={[userWithoutAvatar]} />);

      expect(screen.queryByTestId('typing-avatar-user-1')).toBeNull();
    });

    test('should render animated dots', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      expect(screen.getByTestId('typing-dots')).toBeTruthy();
    });
  });

  describe('Multiple Users', () => {
    test('should render with two users typing', () => {
      render(<TypingIndicator users={mockMultipleUsers} />);

      expect(screen.getByText(/Alice and Bob are typing/)).toBeTruthy();
    });

    test('should render with three users typing', () => {
      const threeUsers: TypingIndicatorType[] = [
        ...mockMultipleUsers,
        {
          userId: 'user-3',
          username: 'Charlie',
          timestamp: Date.now() + 200,
        },
      ];

      render(<TypingIndicator users={threeUsers} />);

      expect(screen.getByText(/Alice, Bob and Charlie are typing/)).toBeTruthy();
    });

    test('should render with many users typing', () => {
      const manyUsers: TypingIndicatorType[] = [
        ...mockMultipleUsers,
        { userId: 'user-3', username: 'Charlie', timestamp: Date.now() + 200 },
        { userId: 'user-4', username: 'David', timestamp: Date.now() + 300 },
      ];

      render(<TypingIndicator users={manyUsers} />);

      expect(screen.getByText(/Alice, Bob and 2 others are typing/)).toBeTruthy();
    });

    test('should render avatars for multiple users', () => {
      render(<TypingIndicator users={mockMultipleUsers} />);

      expect(screen.getByTestId('typing-avatar-user-1')).toBeTruthy();
      expect(screen.getByTestId('typing-avatar-user-2')).toBeTruthy();
    });

    test('should limit avatar display to first 3 users', () => {
      const manyUsers: TypingIndicatorType[] = [
        ...mockMultipleUsers,
        {
          userId: 'user-3',
          username: 'Charlie',
          avatar: 'https://example.com/charlie.jpg',
          timestamp: Date.now() + 200,
        },
        {
          userId: 'user-4',
          username: 'David',
          avatar: 'https://example.com/david.jpg',
          timestamp: Date.now() + 300,
        },
      ];

      render(<TypingIndicator users={manyUsers} />);

      expect(screen.getByTestId('typing-avatar-user-1')).toBeTruthy();
      expect(screen.getByTestId('typing-avatar-user-2')).toBeTruthy();
      expect(screen.getByTestId('typing-avatar-user-3')).toBeTruthy();
      expect(screen.queryByTestId('typing-avatar-user-4')).toBeNull();
    });
  });

  describe('Empty State', () => {
    test('should not render when users array is empty', () => {
      render(<TypingIndicator users={[]} />);

      expect(screen.queryByTestId('typing-indicator')).toBeNull();
    });

    test('should not render when no users provided', () => {
      render(<TypingIndicator users={[]} />);

      expect(screen.queryByText(/is typing/)).toBeNull();
    });
  });

  describe('Text Formatting', () => {
    test('should use correct grammar for single user', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      expect(screen.getByText(/Alice is typing/)).toBeTruthy();
    });

    test('should use correct grammar for multiple users', () => {
      render(<TypingIndicator users={mockMultipleUsers} />);

      expect(screen.getByText(/Alice and Bob are typing/)).toBeTruthy();
    });

    test('should handle long usernames', () => {
      const longUsername: TypingIndicatorType = {
        userId: 'user-1',
        username: 'A'.repeat(50),
        timestamp: Date.now(),
      };

      render(<TypingIndicator users={[longUsername]} />);

      expect(screen.getByText(new RegExp(`${'A'.repeat(50)} is typing`))).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should have correct accessibility role', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.accessibilityRole).toBe('status');
    });

    test('should have live region for screen readers', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.accessibilityLiveRegion).toBe('polite');
    });

    test('should have descriptive accessibility label for single user', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.accessibilityLabel).toBe('Alice is typing');
    });

    test('should have descriptive accessibility label for multiple users', () => {
      render(<TypingIndicator users={mockMultipleUsers} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.accessibilityLabel).toContain('Alice and Bob are typing');
    });

    test('should have accessibility hint', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.accessibilityHint).toContain('typing a message');
    });
  });

  describe('Styling', () => {
    test('should apply container styles', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.className).toBeDefined();
    });

    test('should render with compact size variant', () => {
      render(<TypingIndicator users={[mockSingleUser]} size="compact" />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.className).toContain('py-1');
    });

    test('should render with normal size variant (default)', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator.props.className).toContain('py-2');
    });
  });

  describe('Edge Cases', () => {
    test('should handle user with no username', () => {
      const noUsername: TypingIndicatorType = {
        userId: 'user-1',
        username: '',
        timestamp: Date.now(),
      };

      render(<TypingIndicator users={[noUsername]} />);

      expect(screen.getByText(/Someone is typing/)).toBeTruthy();
    });

    test('should handle duplicate user IDs', () => {
      const duplicateUsers: TypingIndicatorType[] = [mockSingleUser, mockSingleUser];

      render(<TypingIndicator users={duplicateUsers} />);

      // Should deduplicate and show only once
      expect(screen.getByText(/Alice is typing/)).toBeTruthy();
      expect(screen.queryByText(/and Alice/)).toBeNull();
    });

    test('should handle rapid updates', () => {
      const { rerender } = render(<TypingIndicator users={[mockSingleUser]} />);

      expect(screen.getByText(/Alice is typing/)).toBeTruthy();

      rerender(<TypingIndicator users={mockMultipleUsers} />);

      expect(screen.getByText(/Alice and Bob are typing/)).toBeTruthy();

      rerender(<TypingIndicator users={[]} />);

      expect(screen.queryByTestId('typing-indicator')).toBeNull();
    });

    test('should handle special characters in username', () => {
      const specialChars: TypingIndicatorType = {
        userId: 'user-1',
        username: "Alice O'Brien & Co.",
        timestamp: Date.now(),
      };

      render(<TypingIndicator users={[specialChars]} />);

      expect(screen.getByText(/Alice O'Brien & Co. is typing/)).toBeTruthy();
    });
  });

  describe('Animation', () => {
    test('should render animated dots container', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      const dots = screen.getByTestId('typing-dots');
      expect(dots).toBeTruthy();
    });

    test('should render three dots for animation', () => {
      render(<TypingIndicator users={[mockSingleUser]} />);

      expect(screen.getByTestId('typing-dot-1')).toBeTruthy();
      expect(screen.getByTestId('typing-dot-2')).toBeTruthy();
      expect(screen.getByTestId('typing-dot-3')).toBeTruthy();
    });
  });
});
