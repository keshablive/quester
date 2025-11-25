/**
 * Real-Time Notifications Provider Tests
 *
 * Tests for T154: Real-time notifications subscription
 *
 * Coverage:
 * - WebSocket connection integration
 * - Toast notification triggering
 * - Event subscription lifecycle
 * - Navigation actions
 * - Error handling
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { RealTimeNotificationsProvider } from '@/lib/providers/real-time-notifications-provider';
import { useRealTimeConnection } from '@/lib/hooks/use-real-time-connection';
import { useToastNotifications } from '@/lib/hooks/use-toast-notifications';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

// Mock dependencies
jest.mock('@/lib/hooks/use-real-time-connection');
jest.mock('@/lib/hooks/use-toast-notifications');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

const mockUseRealTimeConnection = useRealTimeConnection as jest.MockedFunction<
  typeof useRealTimeConnection
>;
const mockUseToastNotifications = useToastNotifications as jest.MockedFunction<
  typeof useToastNotifications
>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('RealTimeNotificationsProvider', () => {
  let mockOn: jest.Mock;
  let mockOff: jest.Mock;
  let mockShow: jest.Mock;
  let mockRouter: { push: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOn = jest.fn();
    mockOff = jest.fn();
    mockShow = jest.fn();
    mockRouter = { push: jest.fn() };

    mockUseRealTimeConnection.mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      on: mockOn,
      off: mockOff,
      emit: jest.fn(),
    });

    mockUseToastNotifications.mockReturnValue({
      show: mockShow,
      hide: jest.fn(),
      hideAll: jest.fn(),
    });

    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe('Connection Status', () => {
    test('should show success toast when connected', async () => {
      mockUseRealTimeConnection.mockReturnValue({
        isConnected: true,
        connectionState: 'connected',
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        on: mockOn,
        off: mockOff,
        emit: jest.fn(),
      });

      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: 'Connected',
            message: 'Real-time updates enabled',
          })
        );
      });
    });

    test('should show error toast on connection error', async () => {
      const error = new Error('Connection failed');

      mockUseRealTimeConnection.mockReturnValue({
        isConnected: false,
        connectionState: 'disconnected',
        error,
        connect: jest.fn(),
        disconnect: jest.fn(),
        on: mockOn,
        off: mockOff,
        emit: jest.fn(),
      });

      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Connection Error',
          })
        );
      });
    });
  });

  describe('Quest Events', () => {
    test('should show toast for quest completed event', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      // Get the callback registered for quest:completed
      const questCompletedCallback = mockOn.mock.calls.find(
        (call) => call[0] === 'quest:completed'
      )?.[1];

      expect(questCompletedCallback).toBeDefined();

      // Simulate event
      act(() => {
        questCompletedCallback({
          id: 'quest-1',
          title: 'Dragon Slayer',
          xp: 500,
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: '✅ Quest Completed!',
            message: 'Dragon Slayer (+500 XP)',
          })
        );
      });
    });

    test('should show toast for quest unlocked event', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const questUnlockedCallback = mockOn.mock.calls.find(
        (call) => call[0] === 'quest:unlocked'
      )?.[1];

      act(() => {
        questUnlockedCallback({
          id: 'quest-2',
          title: 'Ancient Ruins Explorer',
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: '🔓 New Quest Available!',
            message: 'Ancient Ruins Explorer',
          })
        );
      });
    });

    test('should navigate to quest details on action press', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const questCompletedCallback = mockOn.mock.calls.find(
        (call) => call[0] === 'quest:completed'
      )?.[1];

      act(() => {
        questCompletedCallback({
          id: 'quest-1',
          title: 'Dragon Slayer',
          xp: 500,
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalled();
      });

      // Get the action callback
      const toastCall = mockShow.mock.calls.find((call) => call[0].title === '✅ Quest Completed!');
      const action = toastCall?.[0].action;

      expect(action).toBeDefined();
      expect(action?.label).toBe('View');

      // Trigger action
      act(() => {
        action?.onPress();
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/quests/quest-1');
    });
  });

  describe('Achievement Events', () => {
    test('should show toast for achievement unlocked', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const achievementCallback = mockOn.mock.calls.find(
        (call) => call[0] === 'achievement:unlocked'
      )?.[1];

      act(() => {
        achievementCallback({
          id: 'achievement-1',
          title: 'Master Explorer',
          description: 'Explore 100 locations',
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: '🏆 Achievement Unlocked!',
            message: 'Master Explorer - Explore 100 locations',
          })
        );
      });
    });
  });

  describe('Message Events', () => {
    test('should show toast for new message', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const messageCallback = mockOn.mock.calls.find((call) => call[0] === 'message:received')?.[1];

      act(() => {
        messageCallback({
          id: 'msg-1',
          senderId: 'user-2',
          senderName: 'Alice',
          content: 'Hey! Want to join my quest?',
          chatId: 'chat-1',
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: '💬 Alice',
            message: 'Hey! Want to join my quest?',
          })
        );
      });
    });

    test('should truncate long messages', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const messageCallback = mockOn.mock.calls.find((call) => call[0] === 'message:received')?.[1];

      const longMessage = 'a'.repeat(100);

      act(() => {
        messageCallback({
          id: 'msg-1',
          senderId: 'user-2',
          senderName: 'Bob',
          content: longMessage,
          chatId: 'chat-1',
        });
      });

      await waitFor(() => {
        const call = mockShow.mock.calls.find((call) => call[0].title === '💬 Bob');
        expect(call?.[0].message).toContain('...');
        expect(call?.[0].message.length).toBeLessThan(longMessage.length);
      });
    });
  });

  describe('Party Events', () => {
    test('should show toast for party invitation', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const partyInvitedCallback = mockOn.mock.calls.find(
        (call) => call[0] === 'party:invited'
      )?.[1];

      act(() => {
        partyInvitedCallback({
          id: 'party-1',
          name: 'Dragon Hunters',
          inviterId: 'user-2',
          inviterName: 'Charlie',
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: '🎉 Party Invitation',
            message: 'Charlie invited you to Dragon Hunters',
          })
        );
      });
    });

    test('should show toast for party member joined', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const partyJoinedCallback = mockOn.mock.calls.find((call) => call[0] === 'party:joined')?.[1];

      act(() => {
        partyJoinedCallback({
          id: 'party-1',
          name: 'Dragon Hunters',
          userId: 'user-3',
          username: 'Dave',
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: '👥 Party Update',
            message: 'Dave joined the party',
          })
        );
      });
    });

    test('should show toast for party member left', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const partyLeftCallback = mockOn.mock.calls.find((call) => call[0] === 'party:left')?.[1];

      act(() => {
        partyLeftCallback({
          id: 'party-1',
          name: 'Dragon Hunters',
          userId: 'user-3',
          username: 'Eve',
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            title: '👥 Party Update',
            message: 'Eve left the party',
          })
        );
      });
    });
  });

  describe('Progression Events', () => {
    test('should show toast for level up', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const levelUpCallback = mockOn.mock.calls.find((call) => call[0] === 'level:up')?.[1];

      act(() => {
        levelUpCallback({
          newLevel: 10,
          rewards: {
            xp: 1000,
            coins: 500,
          },
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: '⬆️ Level Up!',
            message: 'You reached level 10 (+1000 XP, +500 coins)',
          })
        );
      });
    });

    test('should show toast for XP earned', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const xpEarnedCallback = mockOn.mock.calls.find((call) => call[0] === 'xp:earned')?.[1];

      act(() => {
        xpEarnedCallback({
          amount: 250,
          source: 'Daily Quest',
          total: 5000,
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: '⭐ XP Earned',
            message: '+250 XP from Daily Quest (Total: 5000)',
          })
        );
      });
    });

    test('should show toast for challenge completed', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const challengeCallback = mockOn.mock.calls.find(
        (call) => call[0] === 'challenge:completed'
      )?.[1];

      act(() => {
        challengeCallback({
          id: 'challenge-1',
          title: 'Speed Runner',
          reward: {
            xp: 300,
            coins: 150,
          },
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: '🎯 Challenge Complete!',
            message: 'Speed Runner (+300 XP, +150 coins)',
          })
        );
      });
    });

    test('should show toast for reward claimed', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const rewardCallback = mockOn.mock.calls.find((call) => call[0] === 'reward:claimed')?.[1];

      act(() => {
        rewardCallback({
          id: 'reward-1',
          type: 'item',
          name: 'Legendary Sword',
          amount: 1,
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: '🎁 Reward Claimed!',
            message: 'Legendary Sword x1',
          })
        );
      });
    });
  });

  describe('Event Cleanup', () => {
    test('should unsubscribe from all events on unmount', () => {
      const { unmount } = render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      // Should have subscribed to all events
      expect(mockOn).toHaveBeenCalledTimes(11); // 11 different event types

      unmount();

      // Should have unsubscribed from all events
      expect(mockOff).toHaveBeenCalledTimes(11);
    });

    test('should not subscribe to events when not connected', () => {
      mockUseRealTimeConnection.mockReturnValue({
        isConnected: false,
        connectionState: 'disconnected',
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        on: mockOn,
        off: mockOff,
        emit: jest.fn(),
      });

      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      // Should not subscribe when disconnected
      expect(mockOn).not.toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    test('should render children correctly', () => {
      const { getByText } = render(
        <RealTimeNotificationsProvider>
          <Text>Test Child</Text>
        </RealTimeNotificationsProvider>
      );

      expect(getByText('Test Child')).toBeTruthy();
    });

    test('should handle multiple simultaneous events', async () => {
      render(
        <RealTimeNotificationsProvider>
          <Text>Test</Text>
        </RealTimeNotificationsProvider>
      );

      const questCallback = mockOn.mock.calls.find((call) => call[0] === 'quest:completed')?.[1];
      const xpCallback = mockOn.mock.calls.find((call) => call[0] === 'xp:earned')?.[1];
      const messageCallback = mockOn.mock.calls.find((call) => call[0] === 'message:received')?.[1];

      // Trigger multiple events
      act(() => {
        questCallback({ id: 'quest-1', title: 'Quest 1', xp: 100 });
        xpCallback({ amount: 50, source: 'Bonus' });
        messageCallback({
          id: 'msg-1',
          senderId: 'user-2',
          senderName: 'Alice',
          content: 'Hi!',
          chatId: 'chat-1',
        });
      });

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledTimes(4); // 3 events + 1 connection status
      });
    });
  });
});
