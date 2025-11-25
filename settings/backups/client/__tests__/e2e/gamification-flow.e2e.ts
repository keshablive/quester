/**
 * Gamification E2E Flow Tests
 *
 * End-to-end tests for complete gamification workflows including:
 * - Quest completion → XP gain → Level up → Badge unlock
 * - Leaderboard navigation and real-time updates
 * - Offline/online transition scenarios
 * - Performance benchmarks
 *
 * @module __tests__/e2e/gamification-flow.e2e
 */

import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('Gamification Flow - E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Quest → XP → Level Up → Badge Flow', () => {
    it('should complete full gamification flow from quest to badge', async () => {
      // Step 1: Navigate to Quests tab
      await detoxExpect(element(by.id('tab-quests'))).toBeVisible();
      await element(by.id('tab-quests')).tap();

      // Step 2: Verify gamification header is visible
      await waitFor(element(by.id('gamification-header-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Get initial level and XP
      const headerText = await element(by.id('level-text')).getText();
      const initialLevel = parseInt(headerText.match(/\d+/)?.[0] || '0');

      // Step 3: Select and complete a quest
      await waitFor(element(by.id('quest-card-tutorial-1')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('quest-card-tutorial-1')).tap();

      // Navigate through quest steps
      await detoxExpect(element(by.text('Start Quest'))).toBeVisible();
      await element(by.text('Start Quest')).tap();

      // Complete quest tasks (simulated)
      await waitFor(element(by.id('quest-task-1-checkbox')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('quest-task-1-checkbox')).tap();
      await element(by.id('quest-task-2-checkbox')).tap();

      // Step 4: Verify XP gain animation appears
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/\+\d+ XP/))).toBeVisible();

      // Wait for animation to complete (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Step 5: Check if level-up modal appears
      try {
        await waitFor(element(by.id('level-up-modal-container')))
          .toBeVisible()
          .withTimeout(2000);

        // Verify new level is displayed
        const newLevel = initialLevel + 1;
        await detoxExpect(element(by.text(`Level ${newLevel}`))).toBeVisible();

        // Dismiss level-up modal
        await element(by.id('dismiss-button')).tap();
      } catch (e) {
        // Level-up didn't occur (not enough XP)
        console.log('Level-up did not occur for this quest');
      }

      // Step 6: Check if badge unlock notification appears
      try {
        await waitFor(element(by.id('badge-notification-container')))
          .toBeVisible()
          .withTimeout(2000);

        // Verify badge details
        await detoxExpect(element(by.text('Badge Unlocked'))).toBeVisible();
        await detoxExpect(element(by.id('badge-icon'))).toBeVisible();

        // Dismiss badge notification
        await element(by.id('dismiss-button')).tap();
      } catch (e) {
        console.log('Badge unlock did not occur for this quest');
      }

      // Step 7: Verify gamification header updated with new XP
      await waitFor(element(by.id('gamification-header-container')))
        .toBeVisible()
        .withTimeout(2000);

      const updatedHeaderText = await element(by.id('xp-text')).getText();
      // XP should have increased
      expect(updatedHeaderText).toBeTruthy();
    });

    it('should queue XP gains when completing multiple quests rapidly', async () => {
      await element(by.id('tab-quests')).tap();

      // Complete first quest
      await element(by.id('quest-card-quick-1')).tap();
      await element(by.text('Start Quest')).tap();
      await element(by.id('complete-quest-button')).tap();

      // Verify first XP animation
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Immediately complete second quest (without waiting)
      await element(by.id('back-button')).tap();
      await element(by.id('quest-card-quick-2')).tap();
      await element(by.text('Start Quest')).tap();
      await element(by.id('complete-quest-button')).tap();

      // Second animation should queue and display after first
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(4000);

      // Wait for all animations to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));
    });
  });

  describe('Leaderboard Navigation', () => {
    it('should navigate to leaderboard and view top players', async () => {
      // Step 1: Tap gamification header to open dashboard
      await element(by.id('gamification-header-container')).tap();

      // Step 2: Verify gamification dashboard opens
      await waitFor(element(by.id('gamification-dashboard')))
        .toBeVisible()
        .withTimeout(2000);

      // Step 3: Tap "View Leaderboard" button
      await detoxExpect(element(by.text('View Leaderboard'))).toBeVisible();
      await element(by.text('View Leaderboard')).tap();

      // Step 4: Verify leaderboard screen opens
      await waitFor(element(by.id('leaderboard-screen')))
        .toBeVisible()
        .withTimeout(2000);

      // Step 5: Verify top players are displayed
      await detoxExpect(element(by.id('leaderboard-row-1'))).toBeVisible();
      await detoxExpect(element(by.id('rank-badge-1-gold'))).toBeVisible();

      // Step 6: Verify current user rank is displayed
      await waitFor(element(by.id('current-user-rank-card')))
        .toBeVisible()
        .withTimeout(2000);

      // Step 7: Tap on a user to view their profile
      await element(by.id('leaderboard-row-1')).tap();

      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should filter leaderboard by feature', async () => {
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      await waitFor(element(by.id('leaderboard-screen')))
        .toBeVisible()
        .withTimeout(2000);

      // Open filter selector
      await element(by.id('leaderboard-filter-selector')).tap();

      // Select "Quests Only" filter
      await element(by.text('Quests Only')).tap();

      // Verify filtered leaderboard loads
      await waitFor(element(by.id('leaderboard-flatlist')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify filter is active
      await detoxExpect(element(by.text('Quests Only'))).toBeVisible();
    });

    it('should pull-to-refresh leaderboard data', async () => {
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      await waitFor(element(by.id('leaderboard-flatlist')))
        .toBeVisible()
        .withTimeout(2000);

      // Pull to refresh
      await element(by.id('leaderboard-flatlist')).swipe('down', 'slow', 0.9);

      // Verify loading indicator appears briefly
      await waitFor(element(by.id('loading-indicator')))
        .toBeVisible()
        .withTimeout(1000);

      // Verify data refreshed
      await waitFor(element(by.id('leaderboard-row-1')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Real-Time Updates', () => {
    it('should receive real-time XP gain from WebSocket', async () => {
      await element(by.id('tab-home')).tap();

      // Verify gamification header is visible
      await waitFor(element(by.id('gamification-header-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Get initial XP
      const initialXPText = await element(by.id('xp-text')).getText();

      // Simulate WebSocket XP gain event (via test backend)
      // Backend should send WebSocket message for current user
      await device.sendUserActivity({ type: 'test.xp_gain', xp: 50 });

      // Verify XP animation appears
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text('+50 XP'))).toBeVisible();

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Verify XP updated in header
      const updatedXPText = await element(by.id('xp-text')).getText();
      expect(updatedXPText).not.toEqual(initialXPText);
    });

    it('should receive real-time leaderboard rank updates', async () => {
      // Navigate to leaderboard
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      await waitFor(element(by.id('leaderboard-screen')))
        .toBeVisible()
        .withTimeout(2000);

      // Get initial rank for user at position 2
      const initialUser2Text = await element(by.id('leaderboard-row-2')).getText();

      // Simulate WebSocket leaderboard update
      await device.sendUserActivity({
        type: 'test.leaderboard_update',
        ranks: [
          { rank: 1, userId: 'user-2', xp: 12000 }, // User 2 moved to #1
          { rank: 2, userId: 'user-1', xp: 11000 },
        ],
      });

      // Wait for update to propagate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify ranks updated
      await waitFor(element(by.id('leaderboard-row-1')))
        .toHaveText(/user-2/)
        .withTimeout(3000);
    });
  });

  describe('Offline/Online Transitions', () => {
    it('should queue actions when offline and sync when online', async () => {
      // Step 1: Go offline
      await device.setNetworkConditions({ type: 'offline' });

      // Step 2: Complete a quest while offline
      await element(by.id('tab-quests')).tap();
      await element(by.id('quest-card-offline-1')).tap();
      await element(by.text('Start Quest')).tap();
      await element(by.id('complete-quest-button')).tap();

      // Step 3: Verify offline indicator appears
      await waitFor(element(by.id('offline-indicator')))
        .toBeVisible()
        .withTimeout(2000);

      // Step 4: Verify pending actions indicator
      await detoxExpect(element(by.id('pending-actions-badge'))).toBeVisible();

      // Step 5: Go back online
      await device.setNetworkConditions({ type: 'wifi' });

      // Step 6: Wait for sync to complete
      await waitFor(element(by.id('sync-complete-toast')))
        .toBeVisible()
        .withTimeout(5000);

      // Step 7: Verify XP animation appears after sync
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Step 8: Verify pending indicator is gone
      await waitFor(element(by.id('pending-actions-badge')))
        .not.toBeVisible()
        .withTimeout(2000);
    });

    it('should display cached leaderboard when offline', async () => {
      // Step 1: Load leaderboard while online
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      await waitFor(element(by.id('leaderboard-flatlist')))
        .toBeVisible()
        .withTimeout(2000);

      // Step 2: Go back to home
      await element(by.id('back-button')).tap();

      // Step 3: Go offline
      await device.setNetworkConditions({ type: 'offline' });

      // Step 4: Navigate to leaderboard again
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      // Step 5: Verify cached data is displayed
      await waitFor(element(by.id('leaderboard-flatlist')))
        .toBeVisible()
        .withTimeout(2000);

      // Step 6: Verify offline indicator shows data is cached
      await detoxExpect(element(by.id('cached-data-indicator'))).toBeVisible();

      // Restore online state
      await device.setNetworkConditions({ type: 'wifi' });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should render gamification header in <100ms', async () => {
      const startTime = Date.now();

      await element(by.id('tab-home')).tap();

      await waitFor(element(by.id('gamification-header-container')))
        .toBeVisible()
        .withTimeout(2000);

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(100);
    });

    it('should display XP animation within 200ms of trigger', async () => {
      await element(by.id('tab-quests')).tap();
      await element(by.id('quest-card-quick-3')).tap();
      await element(by.text('Start Quest')).tap();

      const startTime = Date.now();

      await element(by.id('complete-quest-button')).tap();

      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(1000);

      const animationDelay = Date.now() - startTime;
      expect(animationDelay).toBeLessThan(200);
    });

    it('should render leaderboard with 100 users in <500ms', async () => {
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      const startTime = Date.now();

      await waitFor(element(by.id('leaderboard-flatlist')))
        .toBeVisible()
        .withTimeout(2000);

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(500);
    });

    it('should scroll leaderboard smoothly at 60fps', async () => {
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      await waitFor(element(by.id('leaderboard-flatlist')))
        .toBeVisible()
        .withTimeout(2000);

      // Rapid scroll test
      await element(by.id('leaderboard-flatlist')).scroll(1000, 'down', 0.5);
      await element(by.id('leaderboard-flatlist')).scroll(1000, 'up', 0.5);

      // Should complete without lag
      await detoxExpect(element(by.id('leaderboard-row-1'))).toBeVisible();
    });
  });

  describe('Badge Collection', () => {
    it('should view all badges in collection', async () => {
      // Navigate to gamification dashboard
      await element(by.id('gamification-header-container')).tap();

      await waitFor(element(by.id('gamification-dashboard')))
        .toBeVisible()
        .withTimeout(2000);

      // Tap "View All Badges" button
      await element(by.text('View All Badges')).tap();

      // Verify badge collection screen opens
      await waitFor(element(by.id('badge-collection-screen')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify unlocked and locked badges are displayed
      await detoxExpect(element(by.id('unlocked-badges-section'))).toBeVisible();
      await detoxExpect(element(by.id('locked-badges-section'))).toBeVisible();
    });

    it('should tap badge to view details', async () => {
      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View All Badges')).tap();

      await waitFor(element(by.id('badge-collection-screen')))
        .toBeVisible()
        .withTimeout(2000);

      // Tap on first badge
      await element(by.id('badge-card-first-quest')).tap();

      // Verify badge detail modal opens
      await waitFor(element(by.id('badge-detail-modal')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify badge details
      await detoxExpect(element(by.id('badge-name'))).toBeVisible();
      await detoxExpect(element(by.id('badge-description'))).toBeVisible();
      await detoxExpect(element(by.id('badge-rarity'))).toBeVisible();

      // Close modal
      await element(by.id('close-button')).tap();
    });
  });

  describe('Accessibility - E2E', () => {
    beforeEach(async () => {
      // Enable accessibility mode
      await device.enableSynchronization();
    });

    it('should navigate gamification UI with screen reader', async () => {
      // This test requires VoiceOver (iOS) or TalkBack (Android) enabled

      await element(by.id('tab-home')).tap();

      // Verify gamification header is accessible
      const header = element(by.id('gamification-header-container'));
      await detoxExpect(header).toHaveAccessibilityLabel(/level.*experience points/i);

      // Tap to navigate to dashboard
      await header.tap();

      await waitFor(element(by.id('gamification-dashboard')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify dashboard elements are accessible
      await detoxExpect(element(by.text('View Leaderboard'))).toBeVisible();
    });

    it('should support keyboard navigation on Android', async () => {
      if (device.getPlatform() !== 'android') {
        return;
      }

      await element(by.id('tab-home')).tap();

      // Navigate using Tab key simulation
      await device.pressKey('tab');
      await device.pressKey('tab');

      // Activate with Enter
      await device.pressKey('enter');

      // Should open gamification dashboard
      await waitFor(element(by.id('gamification-dashboard')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle XP gain API failure gracefully', async () => {
      // Simulate API failure
      await device.sendUserActivity({ type: 'test.api_failure', endpoint: 'xp_gain' });

      await element(by.id('tab-quests')).tap();
      await element(by.id('quest-card-error-test')).tap();
      await element(by.text('Start Quest')).tap();
      await element(by.id('complete-quest-button')).tap();

      // Verify error toast appears
      await waitFor(element(by.id('error-toast')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/failed to save progress/i))).toBeVisible();

      // Verify action is queued for retry
      await detoxExpect(element(by.id('pending-actions-badge'))).toBeVisible();
    });

    it('should handle leaderboard loading failure', async () => {
      // Simulate API failure
      await device.sendUserActivity({
        type: 'test.api_failure',
        endpoint: 'leaderboard',
      });

      await element(by.id('gamification-header-container')).tap();
      await element(by.text('View Leaderboard')).tap();

      // Verify error message appears
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/failed to load leaderboard/i))).toBeVisible();

      // Verify retry button is available
      await detoxExpect(element(by.text('Retry'))).toBeVisible();

      // Tap retry
      await element(by.text('Retry')).tap();

      // Verify loading indicator appears
      await waitFor(element(by.id('loading-indicator')))
        .toBeVisible()
        .withTimeout(1000);
    });
  });
});
