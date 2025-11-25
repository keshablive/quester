/**
 * OfflineBanner Component Tests
 * Phase 8, T131: Tests for offline status banner
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OfflineBanner } from '@/components/offline-banner';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock AsyncStorage for offline queue
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should not render when online', () => {
      const { queryByTestId } = render(<OfflineBanner isOffline={false} />);
      expect(queryByTestId('offline-banner')).toBeNull();
    });

    it('should render when offline', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} />);
      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    it('should display offline message', () => {
      const { getByText } = render(<OfflineBanner isOffline={true} />);
      expect(getByText(/no internet connection/i)).toBeTruthy();
    });

    it('should show cloud-off icon when offline', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} />);
      expect(getByTestId('offline-icon')).toBeTruthy();
    });
  });

  describe('Pending Actions', () => {
    it('should display pending actions count when greater than 0', () => {
      const { getByText } = render(<OfflineBanner isOffline={true} pendingActionsCount={5} />);
      expect(getByText(/5 pending action/i)).toBeTruthy();
    });

    it('should pluralize "action" when count is 1', () => {
      const { getByText } = render(<OfflineBanner isOffline={true} pendingActionsCount={1} />);
      expect(getByText(/1 pending action/i)).toBeTruthy();
    });

    it('should pluralize "actions" when count is greater than 1', () => {
      const { getByText } = render(<OfflineBanner isOffline={true} pendingActionsCount={3} />);
      expect(getByText(/3 pending actions/i)).toBeTruthy();
    });

    it('should not show pending count when 0', () => {
      const { queryByText } = render(<OfflineBanner isOffline={true} pendingActionsCount={0} />);
      expect(queryByText(/pending action/i)).toBeNull();
    });

    it('should not show pending count when undefined', () => {
      const { queryByText } = render(<OfflineBanner isOffline={true} />);
      expect(queryByText(/pending action/i)).toBeNull();
    });
  });

  describe('Sync Button', () => {
    it('should display sync button when onSync is provided', () => {
      const onSync = jest.fn();
      const { getByText } = render(<OfflineBanner isOffline={true} onSync={onSync} />);
      expect(getByText(/sync now/i)).toBeTruthy();
    });

    it('should call onSync when sync button is pressed', () => {
      const onSync = jest.fn();
      const { getByText } = render(<OfflineBanner isOffline={true} onSync={onSync} />);

      fireEvent.press(getByText(/sync now/i));
      expect(onSync).toHaveBeenCalledTimes(1);
    });

    it('should not display sync button when onSync is not provided', () => {
      const { queryByText } = render(<OfflineBanner isOffline={true} />);
      expect(queryByText(/sync now/i)).toBeNull();
    });

    it('should disable sync button when syncing', () => {
      const onSync = jest.fn();
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} onSync={onSync} isSyncing={true} />
      );

      const syncButton = getByTestId('sync-button');
      expect(syncButton.props.accessibilityState).toEqual({ disabled: true });
    });

    it('should show syncing text when isSyncing is true', () => {
      const onSync = jest.fn();
      const { getByText } = render(
        <OfflineBanner isOffline={true} onSync={onSync} isSyncing={true} />
      );
      expect(getByText(/syncing/i)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have alert role for offline banner', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} />);
      const banner = getByTestId('offline-banner');
      expect(banner.props.accessibilityRole).toBe('alert');
    });

    it('should have polite accessibility live region', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} />);
      const banner = getByTestId('offline-banner');
      expect(banner.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should have descriptive accessibility label', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} pendingActionsCount={3} />);
      const banner = getByTestId('offline-banner');
      expect(banner.props.accessibilityLabel).toMatch(/no internet connection.*3 pending actions/i);
    });

    it('should have accessibility label without pending actions when count is 0', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} pendingActionsCount={0} />);
      const banner = getByTestId('offline-banner');
      expect(banner.props.accessibilityLabel).toBe(
        'No internet connection. You are currently offline.'
      );
    });

    it('should have accessible sync button with hint', () => {
      const onSync = jest.fn();
      const { getByTestId } = render(
        <OfflineBanner isOffline={true} onSync={onSync} pendingActionsCount={2} />
      );

      const syncButton = getByTestId('sync-button');
      expect(syncButton.props.accessibilityLabel).toBe('Sync now');
      expect(syncButton.props.accessibilityHint).toMatch(/attempts to sync.*2 pending actions/i);
    });
  });

  describe('Styling', () => {
    it('should be positioned at top of screen', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} />);
      const banner = getByTestId('offline-banner');
      // Check for absolute positioning at top
      expect(banner.props.style).toMatchObject(
        expect.objectContaining({
          position: 'absolute',
          top: 0,
        })
      );
    });

    it('should have full width', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} />);
      const banner = getByTestId('offline-banner');
      expect(banner.props.style).toMatchObject(
        expect.objectContaining({
          width: '100%',
        })
      );
    });

    it('should have warning background color', () => {
      const { getByTestId } = render(<OfflineBanner isOffline={true} />);
      const banner = getByTestId('offline-banner');
      // Check for orange/warning color (NativeWind applies this)
      expect(banner.props.className).toMatch(/bg-orange/);
    });
  });

  describe('Animation', () => {
    it('should slide in from top when appearing', async () => {
      const { rerender, getByTestId } = render(<OfflineBanner isOffline={false} />);

      // Trigger offline state
      rerender(<OfflineBanner isOffline={true} />);

      await waitFor(() => {
        const banner = getByTestId('offline-banner');
        expect(banner).toBeTruthy();
      });
    });

    it('should slide out to top when disappearing', async () => {
      const { rerender, queryByTestId } = render(<OfflineBanner isOffline={true} />);

      // Trigger online state
      rerender(<OfflineBanner isOffline={false} />);

      await waitFor(() => {
        expect(queryByTestId('offline-banner')).toBeNull();
      });
    });
  });

  describe('Integration', () => {
    it('should work with useNetwork hook', () => {
      // Mock useNetwork hook response
      const mockUseNetwork = jest.fn(() => ({
        isOffline: true,
        isConnected: false,
      }));

      // This test validates that the component can receive
      // network state from useNetwork hook
      const TestComponent = () => {
        const { isOffline } = mockUseNetwork();
        return <OfflineBanner isOffline={isOffline} />;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    it('should update when network state changes', () => {
      const { rerender, getByTestId, queryByTestId } = render(
        <OfflineBanner isOffline={true} pendingActionsCount={2} />
      );

      // Verify banner is visible
      expect(getByTestId('offline-banner')).toBeTruthy();

      // Network comes back online
      rerender(<OfflineBanner isOffline={false} pendingActionsCount={2} />);

      // Banner should disappear
      expect(queryByTestId('offline-banner')).toBeNull();
    });
  });
});
