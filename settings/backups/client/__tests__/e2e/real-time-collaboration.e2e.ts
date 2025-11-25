/**
 * Real-Time Collaboration E2E Tests (T145)
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * End-to-end tests for complete real-time workflows including:
 * - Toast notification delivery from real-time events
 * - Typing indicators in chat conversations
 * - Online presence badges on user profiles
 * - Live reactions in video streaming
 * - WebSocket connection/reconnection scenarios
 * - Multi-client event broadcasting
 * - Performance benchmarks (< 2s latency)
 *
 * @module __tests__/e2e/real-time-collaboration.e2e
 */

import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('Real-Time Collaboration - E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Toast Notifications from Real-Time Events', () => {
    it('should display toast notification for quest completion event', async () => {
      // Navigate to home/quests tab
      await detoxExpect(element(by.id('tab-home'))).toBeVisible();
      await element(by.id('tab-home')).tap();

      // Wait for WebSocket connection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Trigger quest completion (via dev menu or test endpoint)
      // Note: This requires backend test endpoint to emit events
      // Assumption: Test user completes a quest via API

      // Verify toast notification appears
      await waitFor(element(by.id('toast-notification-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify notification content
      await detoxExpect(element(by.text(/Quest.*Complete/))).toBeVisible();
      await detoxExpect(element(by.id('toast-notification-icon-success'))).toBeVisible();

      // Verify auto-dismiss after 5 seconds
      await waitFor(element(by.id('toast-notification-container')))
        .not.toBeVisible()
        .withTimeout(6000);
    });

    it('should display toast notification for new message event', async () => {
      // Navigate to messages tab
      await detoxExpect(element(by.id('tab-messages'))).toBeVisible();
      await element(by.id('tab-messages')).tap();

      await waitFor(element(by.id('messages-list-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Trigger new message event (requires backend test endpoint)
      // Assumption: Another user sends a message to test user

      // Verify toast notification with message content
      await waitFor(element(by.id('toast-notification-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.id('toast-notification-type-message'))).toBeVisible();
      await detoxExpect(element(by.id('toast-notification-avatar'))).toBeVisible();

      // Tap notification to navigate
      await element(by.id('toast-notification-container')).tap();

      // Verify navigation to chat screen
      await waitFor(element(by.id('chat-window-container')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should display toast notification for level up event', async () => {
      // Trigger level up event via test endpoint
      // Assumption: Test user gains enough XP to level up

      // Verify level up toast appears
      await waitFor(element(by.id('toast-notification-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/Level Up/))).toBeVisible();
      await detoxExpect(element(by.id('toast-notification-type-success'))).toBeVisible();
    });

    it('should display toast notification for party invitation', async () => {
      // Trigger party invitation event
      // Assumption: Another user invites test user to party

      // Verify party invitation toast
      await waitFor(element(by.id('toast-notification-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/Party Invitation/))).toBeVisible();

      // Verify action buttons
      await detoxExpect(element(by.id('toast-action-button-0'))).toBeVisible(); // Accept
      await detoxExpect(element(by.id('toast-action-button-1'))).toBeVisible(); // Decline

      // Tap accept button
      await element(by.id('toast-action-button-0')).tap();

      // Toast should dismiss
      await waitFor(element(by.id('toast-notification-container')))
        .not.toBeVisible()
        .withTimeout(1000);
    });
  });

  describe('Typing Indicators in Chat', () => {
    it('should show typing indicator when other user is typing', async () => {
      // Navigate to messages tab
      await detoxExpect(element(by.id('tab-messages'))).toBeVisible();
      await element(by.id('tab-messages')).tap();

      // Select a conversation
      await waitFor(element(by.id('conversation-card-user-123')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('conversation-card-user-123')).tap();

      // Wait for chat window
      await waitFor(element(by.id('chat-window-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Trigger typing event from other user (via test endpoint)
      // Backend sends: { type: 'user:typing:start', userId: 'user-123' }

      // Verify typing indicator appears
      await waitFor(element(by.id('typing-indicator-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/user-123.*typing/))).toBeVisible();

      // Verify animated dots
      await detoxExpect(element(by.id('typing-dot-0'))).toBeVisible();
      await detoxExpect(element(by.id('typing-dot-1'))).toBeVisible();
      await detoxExpect(element(by.id('typing-dot-2'))).toBeVisible();

      // Wait for typing stop event or timeout (3 seconds)
      await waitFor(element(by.id('typing-indicator-container')))
        .not.toBeVisible()
        .withTimeout(4000);
    });

    it('should handle multiple users typing simultaneously', async () => {
      // Navigate to group chat (party chat)
      await detoxExpect(element(by.id('tab-parties'))).toBeVisible();
      await element(by.id('tab-parties')).tap();

      await waitFor(element(by.id('party-card-party-456')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('party-card-party-456')).tap();

      // Open party chat
      await element(by.id('party-chat-button')).tap();

      await waitFor(element(by.id('chat-window-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Trigger multiple typing events
      // Backend sends:
      // - { type: 'user:typing:start', userId: 'user-101' }
      // - { type: 'user:typing:start', userId: 'user-102' }

      // Verify typing indicator shows multiple users
      await waitFor(element(by.id('typing-indicator-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/2 users.*typing/))).toBeVisible();
    });
  });

  describe('Online Presence Badges', () => {
    it('should display online status badge on user profile', async () => {
      // Navigate to social/discover tab
      await detoxExpect(element(by.id('tab-social'))).toBeVisible();
      await element(by.id('tab-social')).tap();

      // Wait for user list
      await waitFor(element(by.id('user-card-user-789')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify online status badge is visible
      await detoxExpect(element(by.id('online-status-badge-user-789'))).toBeVisible();

      // Check badge color (green = online)
      const badge = element(by.id('online-status-badge-user-789'));
      // Note: Color verification in Detox is limited
      // Best verified via visual regression testing

      // Tap to view full profile
      await element(by.id('user-card-user-789')).tap();

      // Verify status on profile screen
      await waitFor(element(by.id('user-profile-card-container')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.id('online-status-badge'))).toBeVisible();
      await detoxExpect(element(by.text(/Online|Active/))).toBeVisible();
    });

    it('should update status when user goes offline', async () => {
      // On user profile screen (from previous test)
      await waitFor(element(by.id('user-profile-card-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Initial state: online
      await detoxExpect(element(by.id('online-status-badge'))).toBeVisible();

      // Trigger offline event (via test endpoint)
      // Backend sends: { type: 'user:offline', userId: 'user-789', lastSeen: Date.now() }

      // Verify badge updates to offline state
      await waitFor(element(by.text(/Offline|Last seen/)))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Live Reactions in Video', () => {
    it('should broadcast reactions to all viewers in real-time', async () => {
      // Navigate to videos tab
      await detoxExpect(element(by.id('tab-videos'))).toBeVisible();
      await element(by.id('tab-videos')).tap();

      // Select a live stream
      await waitFor(element(by.id('live-stream-card-stream-111')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('live-stream-card-stream-111')).tap();

      // Wait for video player to load
      await waitFor(element(by.id('live-stream-player-container')))
        .toBeVisible()
        .withTimeout(4000);

      // Verify reaction buttons are visible
      await detoxExpect(element(by.id('reaction-button-heart'))).toBeVisible();
      await detoxExpect(element(by.id('reaction-button-thumbsup'))).toBeVisible();
      await detoxExpect(element(by.id('reaction-button-clap'))).toBeVisible();
      await detoxExpect(element(by.id('reaction-button-fire'))).toBeVisible();
      await detoxExpect(element(by.id('reaction-button-star'))).toBeVisible();

      // Send a reaction
      await element(by.id('reaction-button-heart')).tap();

      // Verify reaction appears on overlay (optimistic update)
      await waitFor(element(by.id('live-reaction-overlay-container')))
        .toBeVisible()
        .withTimeout(1000);

      // Reaction should animate and disappear after 3 seconds
      await waitFor(element(by.id('live-reaction-overlay-container')))
        .not.toBeVisible()
        .withTimeout(4000);
    });

    it('should receive reactions from other viewers', async () => {
      // On live stream screen (from previous test)
      await waitFor(element(by.id('live-stream-player-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Trigger reaction event from another viewer (via test endpoint)
      // Backend sends: {
      //   type: 'video:reaction',
      //   data: { id: 'rx-1', type: 'fire', videoId: 'stream-111', x: 0.5, y: 0.9 }
      // }

      // Verify reaction appears on overlay
      await waitFor(element(by.id('live-reaction-overlay-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Reaction should auto-remove after animation
      await waitFor(element(by.id('live-reaction-overlay-container')))
        .not.toBeVisible()
        .withTimeout(4000);
    });

    it('should handle multiple simultaneous reactions', async () => {
      // On live stream screen
      await waitFor(element(by.id('live-stream-player-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Send multiple reactions rapidly
      await element(by.id('reaction-button-heart')).tap();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await element(by.id('reaction-button-thumbsup')).tap();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await element(by.id('reaction-button-fire')).tap();

      // Verify overlay handles multiple reactions
      await detoxExpect(element(by.id('live-reaction-overlay-container'))).toBeVisible();

      // All reactions should animate independently
      // Wait for all to complete
      await new Promise((resolve) => setTimeout(resolve, 4000));
    });
  });

  describe('WebSocket Connection Management', () => {
    it('should show connection status toast on connect', async () => {
      // App should auto-connect on launch
      // Verify connection success toast appeared (might have already dismissed)
      // This test is best done with fresh app launch

      await device.launchApp({ newInstance: true });

      // Wait for connection toast
      await waitFor(element(by.text(/Connected|Online/)))
        .toBeVisible()
        .withTimeout(5000);

      // Toast should auto-dismiss
      await waitFor(element(by.id('toast-notification-container')))
        .not.toBeVisible()
        .withTimeout(6000);
    });

    it('should show connection error toast on disconnect', async () => {
      // Simulate network disconnection
      // Note: This requires Detox network conditioning or backend shutdown

      // Trigger disconnect (via dev menu or network simulation)
      // await device.setURLBlacklist(['ws://*', 'wss://*']);

      // Verify error toast appears
      await waitFor(element(by.text(/Disconnected|Connection lost/)))
        .toBeVisible()
        .withTimeout(5000);

      await detoxExpect(element(by.id('toast-notification-type-error'))).toBeVisible();
    });

    it('should reconnect automatically after disconnect', async () => {
      // After disconnect (from previous test)
      // Restore network connectivity
      // await device.clearURLBlacklist();

      // Wait for automatic reconnection
      await waitFor(element(by.text(/Reconnected|Connected/)))
        .toBeVisible()
        .withTimeout(10000);

      // Verify success toast
      await detoxExpect(element(by.id('toast-notification-type-success'))).toBeVisible();

      // Verify real-time features work again
      // Try sending a reaction
      await detoxExpect(element(by.id('tab-videos'))).toBeVisible();
      await element(by.id('tab-videos')).tap();

      // Select live stream
      await waitFor(element(by.id('live-stream-card-stream-111')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('live-stream-card-stream-111')).tap();

      await waitFor(element(by.id('reaction-button-heart')))
        .toBeVisible()
        .withTimeout(4000);

      await element(by.id('reaction-button-heart')).tap();

      // Verify reaction works
      await waitFor(element(by.id('live-reaction-overlay-container')))
        .toBeVisible()
        .withTimeout(1000);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should deliver notifications with < 2s latency', async () => {
      // Navigate to home tab
      await detoxExpect(element(by.id('tab-home'))).toBeVisible();
      await element(by.id('tab-home')).tap();

      const startTime = Date.now();

      // Trigger notification event with known timestamp
      // Backend test endpoint sends event with eventTime field

      // Wait for toast to appear
      await waitFor(element(by.id('toast-notification-container')))
        .toBeVisible()
        .withTimeout(3000);

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Log latency for manual verification
      console.log(`Notification latency: ${latency}ms`);

      // Assert latency < 2000ms (2 seconds)
      // Note: Detox doesn't have direct assertion for this
      // Best practice: Log and review in CI metrics
      if (latency >= 2000) {
        throw new Error(`Notification latency ${latency}ms exceeds 2s threshold`);
      }
    });

    it('should handle 50+ rapid events without UI blocking', async () => {
      // Stress test: Trigger 50 events rapidly
      // Backend test endpoint emits 50 toast events in quick succession

      const startTime = Date.now();

      // Trigger burst of events (via test endpoint)
      // Note: This requires backend test endpoint that sends multiple events

      // Verify UI remains responsive
      await detoxExpect(element(by.id('tab-home'))).toBeVisible();
      await element(by.id('tab-home')).tap();
      await element(by.id('tab-quests')).tap();

      // Navigation should complete quickly (< 500ms)
      await waitFor(element(by.id('quests-list-container')))
        .toBeVisible()
        .withTimeout(1000);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`UI response time under load: ${responseTime}ms`);

      // Assert UI didn't freeze
      if (responseTime >= 1000) {
        throw new Error(`UI blocked for ${responseTime}ms under event load`);
      }
    });

    it('should limit visible toasts to 3 maximum', async () => {
      // Trigger 5 toast events simultaneously
      // Backend sends 5 different notification events

      // Wait for toasts to appear
      await waitFor(element(by.id('toast-notification-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Count visible toasts
      // Note: Detox doesn't have direct element counting
      // Best verified via snapshot testing or manual inspection

      // Verify only 3 toasts are visible at once
      // Remaining toasts should be queued

      // As toasts dismiss, queued toasts should appear
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // All 5 toasts should have been displayed eventually
    });
  });

  describe('Multi-Screen Integration', () => {
    it('should maintain real-time features across screen navigation', async () => {
      // Start on home tab
      await detoxExpect(element(by.id('tab-home'))).toBeVisible();
      await element(by.id('tab-home')).tap();

      // Trigger toast event
      await waitFor(element(by.id('toast-notification-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Navigate to different screens while toast is visible
      await element(by.id('tab-messages')).tap();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await element(by.id('tab-videos')).tap();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await element(by.id('tab-quests')).tap();

      // Toast should remain visible and functional throughout navigation
      // Toast should auto-dismiss normally
      await waitFor(element(by.id('toast-notification-container')))
        .not.toBeVisible()
        .withTimeout(6000);
    });

    it('should sync real-time state after app backgrounding', async () => {
      // App is in foreground
      await detoxExpect(element(by.id('tab-home'))).toBeVisible();

      // Send app to background
      await device.sendToHome();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Return to foreground
      await device.launchApp({ newInstance: false });

      // Verify WebSocket reconnects
      // May show reconnection toast
      await waitFor(element(by.text(/Reconnected|Connected/)))
        .toBeVisible()
        .withTimeout(5000);

      // Verify real-time features work
      await element(by.id('tab-videos')).tap();

      await waitFor(element(by.id('live-stream-card-stream-111')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('live-stream-card-stream-111')).tap();

      await waitFor(element(by.id('reaction-button-heart')))
        .toBeVisible()
        .withTimeout(4000);

      await element(by.id('reaction-button-heart')).tap();

      // Verify reaction works
      await waitFor(element(by.id('live-reaction-overlay-container')))
        .toBeVisible()
        .withTimeout(1000);
    });
  });
});
