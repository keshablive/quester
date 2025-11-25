import React from 'react';
import { render } from '@testing-library/react-native';
import { NotificationBadge } from '@/components/navigation/notification-badge';

describe('NotificationBadge', () => {
  it('renders badge with count', () => {
    const tree = render(<NotificationBadge count={5} />);
    expect(tree.getByText('5')).toBeTruthy();
  });

  it('renders 9+ for counts over 9', () => {
    const tree = render(<NotificationBadge count={15} />);
    expect(tree.getByText('9+')).toBeTruthy();
  });

  it('does not render when count is 0', () => {
    const tree = render(<NotificationBadge count={0} />);
    expect(tree.queryByTestId('notification-badge')).toBeNull();
  });

  it('has proper accessibility label', () => {
    const tree = render(<NotificationBadge count={3} />);
    const badge = tree.getByTestId('notification-badge');
    expect(badge.props.accessibilityLabel).toBe('3 unread notifications');
  });
});
