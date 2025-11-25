/**
 * Multi-Feature Workflow E2E Tests
 *
 * End-to-end tests for complete multi-feature workflows including:
 * - Quest → Course → Certificate workflow
 * - Marketplace → Social sharing workflow
 * - Quick actions navigation between features
 * - Suggested content recommendations
 * - Workflow progress tracking
 *
 * @module __tests__/e2e/multi-feature-workflow.e2e
 */

import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('Multi-Feature Workflow - E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Quest → Course → Certificate Workflow', () => {
    it('should complete full workflow from quest to certificate', async () => {
      // Step 1: Navigate to Quests tab
      await detoxExpect(element(by.id('tab-quests'))).toBeVisible();
      await element(by.id('tab-quests')).tap();

      // Step 2: Verify quick actions menu is visible
      await waitFor(element(by.id('quick-actions-menu')))
        .toBeVisible()
        .withTimeout(2000);

      // Step 3: Complete a quest
      await waitFor(element(by.id('quest-card-tutorial-1')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('quest-card-tutorial-1')).tap();

      // Start quest
      await detoxExpect(element(by.text('Start Quest'))).toBeVisible();
      await element(by.text('Start Quest')).tap();

      // Complete quest tasks
      await waitFor(element(by.id('quest-task-1-checkbox')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('quest-task-1-checkbox')).tap();
      await element(by.id('quest-task-2-checkbox')).tap();

      // Step 4: Verify XP gain (100 XP for quest)
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/\+100 XP/))).toBeVisible();

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Step 5: Check suggested content for next step
      await waitFor(element(by.id('suggested-content-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Should suggest related course
      await detoxExpect(element(by.text(/recommended course/i))).toBeVisible();

      // Step 6: Tap on suggested course
      await element(by.id('suggested-item-course-1')).tap();

      // Step 7: Enroll in course
      await waitFor(element(by.text('Enroll Now')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.text('Enroll Now')).tap();

      // Step 8: Complete first lesson
      await waitFor(element(by.id('lesson-1-card')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('lesson-1-card')).tap();

      // Watch lesson (simulated)
      await waitFor(element(by.id('video-player-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Mark as complete
      await element(by.id('mark-complete-button')).tap();

      // Step 9: Verify XP gain (150 XP for lesson)
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/\+150 XP/))).toBeVisible();

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Step 10: Complete remaining lessons
      await element(by.id('back-button')).tap();

      for (let i = 2; i <= 3; i++) {
        await element(by.id(`lesson-${i}-card`)).tap();
        await waitFor(element(by.id('mark-complete-button')))
          .toBeVisible()
          .withTimeout(2000);
        await element(by.id('mark-complete-button')).tap();
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await element(by.id('back-button')).tap();
      }

      // Step 11: Navigate to certificates
      await detoxExpect(element(by.id('tab-certificates'))).toBeVisible();
      await element(by.id('tab-certificates')).tap();

      // Step 12: Verify certificate is available
      await waitFor(element(by.id('certificate-card-course-1')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap to view certificate
      await element(by.id('certificate-card-course-1')).tap();

      // Step 13: Verify certificate details
      await waitFor(element(by.id('certificate-detail-container')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text(/congratulations/i))).toBeVisible();

      // Step 14: Verify workflow progress is 100%
      await waitFor(element(by.id('workflow-progress-container')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('100%'))).toBeVisible();
    });

    it('should show workflow progress at each step', async () => {
      // Navigate to quest completion screen
      await element(by.id('tab-quests')).tap();

      await waitFor(element(by.id('quest-card-tutorial-1')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('quest-card-tutorial-1')).tap();

      // Check initial workflow progress (0%)
      await waitFor(element(by.id('workflow-progress-container')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('0%'))).toBeVisible();

      // Complete quest
      await element(by.text('Start Quest')).tap();
      await waitFor(element(by.id('quest-task-1-checkbox')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('quest-task-1-checkbox')).tap();
      await element(by.id('quest-task-2-checkbox')).tap();

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check updated progress (33%)
      await detoxExpect(element(by.text('33%'))).toBeVisible();
    });
  });

  describe('Quick Actions Navigation', () => {
    it('should navigate between features using quick actions', async () => {
      // Start at quests
      await element(by.id('tab-quests')).tap();

      // Verify quest-specific quick actions
      await waitFor(element(by.id('quick-actions-menu')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('Create Quest'))).toBeVisible();
      await detoxExpect(element(by.text('Browse Quests'))).toBeVisible();

      // Navigate to learning via quick action
      await element(by.id('tab-courses')).tap();

      // Verify learning-specific quick actions
      await waitFor(element(by.text('Browse Courses')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('Continue Learning'))).toBeVisible();

      // Tap "Browse Courses" quick action
      await element(by.text('Browse Courses')).tap();

      // Should show course list
      await waitFor(element(by.id('course-list-container')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show contextual quick actions on different screens', async () => {
      // Marketplace quick actions
      await element(by.id('tab-marketplace')).tap();

      await waitFor(element(by.id('quick-actions-menu')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('Browse Items'))).toBeVisible();
      await detoxExpect(element(by.text('Sell Item'))).toBeVisible();

      // Social quick actions
      await element(by.id('tab-feed')).tap();

      await waitFor(element(by.text('Create Post')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('Messages'))).toBeVisible();
    });

    it('should limit quick actions when maxActions is set', async () => {
      await element(by.id('tab-quests')).tap();

      // Count visible quick actions
      const actions = await element(by.id('quick-actions-menu'));
      await detoxExpect(actions).toBeVisible();

      // Should show maximum 3 actions
      await detoxExpect(element(by.text('Create Quest'))).toBeVisible();
      await detoxExpect(element(by.text('Browse Quests'))).toBeVisible();
      await detoxExpect(element(by.text('My Progress'))).toBeVisible();
    });
  });

  describe('Suggested Content Recommendations', () => {
    it('should show relevant suggested content after quest completion', async () => {
      // Complete a quest
      await element(by.id('tab-quests')).tap();

      await waitFor(element(by.id('quest-card-tutorial-1')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('quest-card-tutorial-1')).tap();
      await element(by.text('Start Quest')).tap();

      await waitFor(element(by.id('quest-task-1-checkbox')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('quest-task-1-checkbox')).tap();
      await element(by.id('quest-task-2-checkbox')).tap();

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check suggested content
      await waitFor(element(by.id('suggested-content-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Should suggest courses, certificates, or marketplace items
      const suggestedItems = await element(by.id('suggested-item-0'));
      await detoxExpect(suggestedItems).toBeVisible();
    });

    it('should show different suggestions based on feature context', async () => {
      // Marketplace context
      await element(by.id('tab-marketplace')).tap();

      await waitFor(element(by.id('suggested-content-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Should suggest related marketplace items
      await detoxExpect(element(by.id('suggested-content-title'))).toBeVisible();

      // Course context
      await element(by.id('tab-courses')).tap();

      await waitFor(element(by.id('suggested-content-container')))
        .toBeVisible()
        .withTimeout(3000);

      // Should suggest related courses
      await detoxExpect(element(by.id('suggested-content-title'))).toBeVisible();
    });

    it('should navigate to suggested content on tap', async () => {
      await element(by.id('tab-quests')).tap();

      // Complete quest to trigger suggestions
      await waitFor(element(by.id('quest-card-tutorial-1')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('quest-card-tutorial-1')).tap();
      await element(by.text('Start Quest')).tap();

      await waitFor(element(by.id('quest-task-1-checkbox')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('quest-task-1-checkbox')).tap();
      await element(by.id('quest-task-2-checkbox')).tap();

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Tap first suggested item
      await waitFor(element(by.id('suggested-item-0')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('suggested-item-0')).tap();

      // Should navigate to detail screen
      await waitFor(element(by.id('detail-screen-container')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Marketplace → Social Workflow', () => {
    it('should complete purchase and share to social', async () => {
      // Step 1: Navigate to marketplace
      await element(by.id('tab-marketplace')).tap();

      // Step 2: Browse items
      await waitFor(element(by.id('marketplace-item-1')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('marketplace-item-1')).tap();

      // Step 3: Purchase item
      await waitFor(element(by.text('Buy Now')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.text('Buy Now')).tap();

      // Confirm purchase
      await waitFor(element(by.text('Confirm Purchase')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.text('Confirm Purchase')).tap();

      // Step 4: Verify XP gain (75 XP for purchase)
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/\+75 XP/))).toBeVisible();

      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Step 5: Check quick actions for social sharing
      await waitFor(element(by.id('quick-actions-menu')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('Share Purchase'))).toBeVisible();

      // Step 6: Tap share quick action
      await element(by.text('Share Purchase')).tap();

      // Step 7: Verify social post screen
      await waitFor(element(by.id('create-post-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Should pre-fill with purchase info
      await detoxExpect(element(by.id('post-content-input'))).toBeVisible();

      // Step 8: Post to social
      await element(by.id('post-content-input')).typeText('Just bought this amazing item!');
      await element(by.id('post-submit-button')).tap();

      // Step 9: Verify XP gain (15 XP for share)
      await waitFor(element(by.id('xp-animation-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text(/\+15 XP/))).toBeVisible();

      // Step 10: Verify post appears in feed
      await element(by.id('tab-feed')).tap();

      await waitFor(element(by.text('Just bought this amazing item!')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Feature Link Cards', () => {
    it('should navigate using feature link cards', async () => {
      // Start at home
      await element(by.id('tab-home')).tap();

      // Find feature link cards
      await waitFor(element(by.id('feature-link-quests')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.id('feature-link-learning'))).toBeVisible();
      await detoxExpect(element(by.id('feature-link-marketplace'))).toBeVisible();

      // Tap learning link
      await element(by.id('feature-link-learning')).tap();

      // Should navigate to courses tab
      await waitFor(element(by.id('course-list-container')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show stats on feature link cards', async () => {
      await element(by.id('tab-home')).tap();

      await waitFor(element(by.id('feature-link-quests')))
        .toBeVisible()
        .withTimeout(3000);

      // Should show quest completion count
      await detoxExpect(element(by.text(/\d+ completed/i))).toBeVisible();

      // Should show XP earned from feature
      await detoxExpect(element(by.text(/\d+ XP/i))).toBeVisible();
    });
  });

  describe('Workflow Progress Persistence', () => {
    it('should persist workflow progress across app restarts', async () => {
      // Complete first step
      await element(by.id('tab-quests')).tap();

      await waitFor(element(by.id('quest-card-tutorial-1')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('quest-card-tutorial-1')).tap();
      await element(by.text('Start Quest')).tap();

      await waitFor(element(by.id('quest-task-1-checkbox')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.id('quest-task-1-checkbox')).tap();
      await element(by.id('quest-task-2-checkbox')).tap();

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check progress (33%)
      await waitFor(element(by.id('workflow-progress-container')))
        .toBeVisible()
        .withTimeout(2000);

      await detoxExpect(element(by.text('33%'))).toBeVisible();

      // Restart app
      await device.reloadReactNative();

      // Navigate back to workflow screen
      await element(by.id('tab-quests')).tap();

      // Progress should still be 33%
      await waitFor(element(by.id('workflow-progress-container')))
        .toBeVisible()
        .withTimeout(3000);

      await detoxExpect(element(by.text('33%'))).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible quick actions menu', async () => {
      await element(by.id('tab-quests')).tap();

      await waitFor(element(by.id('quick-actions-menu')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify quick action buttons are accessible
      await detoxExpect(element(by.text('Create Quest'))).toBeVisible();
      await detoxExpect(element(by.text('Browse Quests'))).toBeVisible();
    });

    it('should have accessible workflow progress', async () => {
      await element(by.id('tab-quests')).tap();

      await waitFor(element(by.id('workflow-progress-container')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify progress bar is visible and accessible
      await detoxExpect(element(by.id('workflow-progress-bar'))).toBeVisible();
    });
  });

  describe('Performance', () => {
    it('should render workflow components within performance budget', async () => {
      const startTime = Date.now();

      await element(by.id('tab-quests')).tap();

      await waitFor(element(by.id('quick-actions-menu')))
        .toBeVisible()
        .withTimeout(2000);

      const renderTime = Date.now() - startTime;

      // Should render within 1 second
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid navigation between features', async () => {
      const features = ['tab-quests', 'tab-courses', 'tab-marketplace', 'tab-feed', 'tab-home'];

      for (const feature of features) {
        await element(by.id(feature)).tap();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Should not crash and UI should be responsive
      await detoxExpect(element(by.id('tab-home'))).toBeVisible();
    });
  });
});
