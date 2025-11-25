import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';
import { NavigationProvider } from '@/lib/contexts/navigation-context';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));

const mockNavigation = {
  notificationCounts: {
    home: 0,
    quests: 3,
    learning: 5,
    marketplace: 0,
    properties: 0,
    social: 12,
    messaging: 8,
    video: 2,
    profile: 0,
    total: 30,
  },
  navigationState: {
    currentFeature: 'home' as const,
    previousFeature: null,
    featureHistory: [],
    lastVisited: {},
  },
  updateNotificationCount: jest.fn(),
  incrementNotificationCount: jest.fn(),
  decrementNotificationCount: jest.fn(),
  clearNotificationCount: jest.fn(),
  clearAllNotifications: jest.fn(),
  trackFeature: jest.fn(),
  getFeatureVisitCount: jest.fn(() => 0),
};

jest.mock('@/lib/contexts/navigation-context', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigation: () => mockNavigation,
}));

// Mock network hooks for T139 offline indicator tests
jest.mock('@/lib/hooks/useNetwork', () => ({
  useNetwork: jest.fn(() => ({
    isOffline: false,
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('@/lib/hooks/use-offline-queue', () => ({
  useOfflineQueue: jest.fn(() => ({
    pendingCount: 0,
    isSyncing: false,
  })),
}));

describe('BottomTabBar', () => {
  const tabs = [
    { name: 'home', label: 'Home', icon: 'home' },
    { name: 'quests', label: 'Quests', icon: 'trophy' },
    { name: 'learning', label: 'Learn', icon: 'book' },
    { name: 'marketplace', label: 'Market', icon: 'shopping-bag' },
    { name: 'social', label: 'Social', icon: 'users' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all tab items', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    expect(tree.getByText('Home')).toBeTruthy();
    expect(tree.getByText('Quests')).toBeTruthy();
    expect(tree.getByText('Learn')).toBeTruthy();
    expect(tree.getByText('Market')).toBeTruthy();
    expect(tree.getByText('Social')).toBeTruthy();
  });

  it('highlights active tab', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="quests" onTabPress={() => {}} />);

    const questsTab = tree.getByTestId('tab-quests');
    expect(questsTab.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('shows notification badges on tabs with notifications', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    // Quests has 3 notifications
    expect(tree.getByText('3')).toBeTruthy();

    // Learning has 5 notifications
    expect(tree.getByText('5')).toBeTruthy();

    // Social has 12 notifications
    expect(tree.getByText('12')).toBeTruthy();
  });

  it('hides badge when notification count is 0', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    // Home has 0 notifications - badge should not exist
    expect(tree.queryByTestId('badge-home')).toBeNull();
  });

  it('displays 99+ for notification counts over 99', () => {
    const customMockNavigation = {
      ...mockNavigation,
      notificationCounts: {
        ...mockNavigation.notificationCounts,
        quests: 150,
      },
    };

    jest
      .spyOn(require('@/lib/contexts/navigation-context'), 'useNavigation')
      .mockReturnValue(customMockNavigation);

    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    expect(tree.getByText('99+')).toBeTruthy();
  });

  it('calls onTabPress with tab name when tab is pressed', () => {
    const onTabPress = jest.fn();
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={onTabPress} />);

    const questsTab = tree.getByTestId('tab-quests');
    fireEvent.press(questsTab);

    expect(onTabPress).toHaveBeenCalledWith('quests');
  });

  it('calls trackFeature when tab is pressed', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    const learningTab = tree.getByTestId('tab-learning');
    fireEvent.press(learningTab);

    expect(mockNavigation.trackFeature).toHaveBeenCalledWith('learning');
  });

  it('clears notifications when tab is pressed', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    const socialTab = tree.getByTestId('tab-social');
    fireEvent.press(socialTab);

    expect(mockNavigation.clearNotificationCount).toHaveBeenCalledWith('social');
  });

  it('has proper accessibility props for tabs', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    const homeTab = tree.getByTestId('tab-home');
    expect(homeTab.props.accessibilityRole).toBe('tab');
    expect(homeTab.props.accessibilityLabel).toContain('Home');
    expect(homeTab.props.accessibilityState).toMatchObject({ selected: true });

    const questsTab = tree.getByTestId('tab-quests');
    expect(questsTab.props.accessibilityHint).toContain('notification');
  });

  it('maintains 44pt minimum touch target (iOS)', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    const homeTab = tree.getByTestId('tab-home');
    const style = homeTab.props.style;

    // Touch target should be at least 44 points
    expect(style.minHeight >= 44 || style.height >= 44).toBe(true);
  });

  it('renders with sticky position at bottom', () => {
    const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    const container = tree.getByTestId('bottom-tab-bar-container');

    // Check that container has absolute positioning class
    expect(container.props.className).toContain('absolute');
    expect(container.props.className).toContain('bottom-0');
  });
  it('does not re-render when unrelated props change', () => {
    const { rerender } = render(
      <BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />
    );

    const firstRender = mockNavigation.trackFeature.mock.calls.length;

    // Re-render with same props
    rerender(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

    // Should use React.memo to prevent unnecessary re-renders
    expect(mockNavigation.trackFeature.mock.calls.length).toBe(firstRender);
  });

  // T139: Offline Indicator Tests
  describe('Offline Indicator (T139)', () => {
    it('hides offline indicator when online', () => {
      const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

      expect(tree.queryByTestId('offline-indicator')).toBeNull();
    });

    it('shows offline indicator when offline', () => {
      const useNetwork = require('@/lib/hooks/useNetwork').useNetwork;
      useNetwork.mockReturnValue({
        isOffline: true,
        isConnected: false,
        isInternetReachable: false,
      });

      const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

      expect(tree.getByTestId('offline-indicator')).toBeTruthy();
      expect(tree.getByText('Offline')).toBeTruthy();
    });

    it('shows pending count when offline with queued actions', () => {
      const useNetwork = require('@/lib/hooks/useNetwork').useNetwork;
      const useOfflineQueue = require('@/lib/hooks/use-offline-queue').useOfflineQueue;

      useNetwork.mockReturnValue({
        isOffline: true,
        isConnected: false,
      });

      useOfflineQueue.mockReturnValue({
        pendingCount: 5,
        isSyncing: false,
      });

      const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

      expect(tree.getByText('Offline • 5 pending')).toBeTruthy();
    });

    it('shows syncing state when syncing', () => {
      const useNetwork = require('@/lib/hooks/useNetwork').useNetwork;
      const useOfflineQueue = require('@/lib/hooks/use-offline-queue').useOfflineQueue;

      useNetwork.mockReturnValue({
        isOffline: true,
        isConnected: false,
      });

      useOfflineQueue.mockReturnValue({
        pendingCount: 3,
        isSyncing: true,
      });

      const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

      expect(tree.getByText('Syncing...')).toBeTruthy();
    });

    it('has proper accessibility for offline indicator', () => {
      const useNetwork = require('@/lib/hooks/useNetwork').useNetwork;
      const useOfflineQueue = require('@/lib/hooks/use-offline-queue').useOfflineQueue;

      useNetwork.mockReturnValue({
        isOffline: true,
        isConnected: false,
      });

      useOfflineQueue.mockReturnValue({
        pendingCount: 2,
        isSyncing: false,
      });

      const tree = render(<BottomTabBar tabs={tabs} activeTab="home" onTabPress={() => {}} />);

      const indicator = tree.getByTestId('offline-indicator');
      expect(indicator.props.accessibilityRole).toBe('alert');
      expect(indicator.props.accessibilityLabel).toContain('You are offline');
      expect(indicator.props.accessibilityLabel).toContain('2 pending actions');
      expect(indicator.props.accessibilityLiveRegion).toBe('polite');
    });
  });
});
