/**
 * OnlineStatusBadge Component Tests (T149)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Tests for online status badge including:
 * - Status indicators (online, offline, away)
 * - Size variants (small, medium, large)
 * - Positioning options
 * - Last seen timestamp
 * - Accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OnlineStatusBadge } from '@/components/real-time/online-status-badge';

describe('OnlineStatusBadge', () => {
  describe('Status Indicators', () => {
    test('should render online status with green indicator', () => {
      render(<OnlineStatusBadge status="online" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge).toBeTruthy();
      expect(badge.props.className).toContain('bg-green');
    });

    test('should render offline status with gray indicator', () => {
      render(<OnlineStatusBadge status="offline" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('bg-gray');
    });

    test('should render away status with yellow indicator', () => {
      render(<OnlineStatusBadge status="away" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('bg-yellow');
    });

    test('should render busy status with red indicator', () => {
      render(<OnlineStatusBadge status="busy" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('bg-red');
    });
  });

  describe('Size Variants', () => {
    test('should render small size badge', () => {
      render(<OnlineStatusBadge status="online" size="small" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('w-2');
      expect(badge.props.className).toContain('h-2');
    });

    test('should render medium size badge (default)', () => {
      render(<OnlineStatusBadge status="online" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('w-3');
      expect(badge.props.className).toContain('h-3');
    });

    test('should render large size badge', () => {
      render(<OnlineStatusBadge status="online" size="large" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('w-4');
      expect(badge.props.className).toContain('h-4');
    });
  });

  describe('Positioning', () => {
    test('should render with absolute positioning when showAbsolute is true', () => {
      render(<OnlineStatusBadge status="online" showAbsolute />);

      const container = screen.getByTestId('online-status-container');
      expect(container.props.className).toContain('absolute');
    });

    test('should render without absolute positioning by default', () => {
      render(<OnlineStatusBadge status="online" />);

      const container = screen.getByTestId('online-status-container');
      expect(container.props.className).not.toContain('absolute');
    });

    test('should position at bottom-right when showAbsolute is true', () => {
      render(<OnlineStatusBadge status="online" showAbsolute />);

      const container = screen.getByTestId('online-status-container');
      expect(container.props.className).toContain('bottom-0');
      expect(container.props.className).toContain('right-0');
    });
  });

  describe('Border', () => {
    test('should render with white border by default', () => {
      render(<OnlineStatusBadge status="online" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('border-2');
      expect(badge.props.className).toContain('border-white');
    });

    test('should render without border when showBorder is false', () => {
      render(<OnlineStatusBadge status="online" showBorder={false} />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).not.toContain('border-2');
    });
  });

  describe('Last Seen', () => {
    test('should not render last seen text by default', () => {
      render(<OnlineStatusBadge status="offline" />);

      expect(screen.queryByText(/Last seen/)).toBeNull();
    });

    test('should render last seen text when showLastSeen is true', () => {
      const lastSeen = Date.now() - 5 * 60 * 1000; // 5 minutes ago
      render(<OnlineStatusBadge status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/Last seen/)).toBeTruthy();
    });

    test('should not render last seen for online status', () => {
      const lastSeen = Date.now() - 5 * 60 * 1000;
      render(<OnlineStatusBadge status="online" lastSeen={lastSeen} showLastSeen />);

      expect(screen.queryByText(/Last seen/)).toBeNull();
    });

    test('should format last seen time correctly', () => {
      const lastSeen = Date.now() - 5 * 60 * 1000; // 5 minutes ago
      render(<OnlineStatusBadge status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/5 minutes ago/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('should have correct accessibility role', () => {
      render(<OnlineStatusBadge status="online" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.accessibilityRole).toBe('text');
    });

    test('should have descriptive label for online status', () => {
      render(<OnlineStatusBadge status="online" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.accessibilityLabel).toBe('Online');
    });

    test('should have descriptive label for offline status', () => {
      render(<OnlineStatusBadge status="offline" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.accessibilityLabel).toBe('Offline');
    });

    test('should have descriptive label for away status', () => {
      render(<OnlineStatusBadge status="away" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.accessibilityLabel).toBe('Away');
    });

    test('should have descriptive label for busy status', () => {
      render(<OnlineStatusBadge status="busy" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.accessibilityLabel).toBe('Busy');
    });

    test('should include last seen in accessibility label', () => {
      const lastSeen = Date.now() - 5 * 60 * 1000;
      render(<OnlineStatusBadge status="offline" lastSeen={lastSeen} showLastSeen />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.accessibilityLabel).toContain('Last seen');
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined lastSeen gracefully', () => {
      render(<OnlineStatusBadge status="offline" showLastSeen />);

      expect(screen.queryByText(/Last seen/)).toBeNull();
    });

    test('should handle very recent lastSeen', () => {
      const lastSeen = Date.now() - 30 * 1000; // 30 seconds ago
      render(<OnlineStatusBadge status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/Just now/)).toBeTruthy();
    });

    test('should handle lastSeen hours ago', () => {
      const lastSeen = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      render(<OnlineStatusBadge status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/2 hours ago/)).toBeTruthy();
    });

    test('should handle lastSeen days ago', () => {
      const lastSeen = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      render(<OnlineStatusBadge status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/3 days ago/)).toBeTruthy();
    });

    test('should handle rapid status changes', () => {
      const { rerender } = render(<OnlineStatusBadge status="online" />);

      expect(screen.getByTestId('online-status-badge').props.className).toContain('bg-green');

      rerender(<OnlineStatusBadge status="offline" />);
      expect(screen.getByTestId('online-status-badge').props.className).toContain('bg-gray');

      rerender(<OnlineStatusBadge status="away" />);
      expect(screen.getByTestId('online-status-badge').props.className).toContain('bg-yellow');
    });
  });

  describe('Styling', () => {
    test('should apply rounded-full class', () => {
      render(<OnlineStatusBadge status="online" />);

      const badge = screen.getByTestId('online-status-badge');
      expect(badge.props.className).toContain('rounded-full');
    });

    test('should have custom className when provided', () => {
      render(<OnlineStatusBadge status="online" className="custom-class" />);

      const container = screen.getByTestId('online-status-container');
      expect(container.props.className).toContain('custom-class');
    });
  });
});
