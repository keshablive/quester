/**
 * E2E Tests: Social Features Flow
 * Tests: Post comment, Like content, View leaderboard, Share content
 */

import {
  waitForElement,
  tapElement,
  typeText,
  replaceText,
  scrollToElement,
  expectElementToHaveText,
  takeScreenshot,
  TEST_USER,
  TEST_IDS,
  WAIT_MEDIUM,
} from './helpers';

describe('Social Features Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    
    // Login as test user
    await waitForElement(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT));
    await element(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT)).replaceText(TEST_USER.email);
    await element(by.id(TEST_IDS.SIGN_IN_PASSWORD_INPUT)).replaceText(TEST_USER.password);
    await tapElement(by.id(TEST_IDS.SIGN_IN_BUTTON));
    
    // Wait for home screen
    await waitForElement(by.id(TEST_IDS.HOME_TAB), WAIT_MEDIUM);
  });

  beforeEach(async () => {
    // Navigate to social tab
    await tapElement(by.id(TEST_IDS.SOCIAL_TAB));
    await waitForElement(by.text('Social'));
  });

  describe('Activity Feed', () => {
    it('should display activity feed', async () => {
      await waitForElement(by.id('activity-feed'));
      await expect(element(by.id('activity-feed'))).toBeVisible();
      await takeScreenshot('activity-feed');
    });

    it('should show various activity types', async () => {
      // Should show course completions, badges earned, comments, likes
      await waitForElement(by.id('activity-item'));
      await expect(element(by.id('activity-item'))).toBeVisible();
      await takeScreenshot('activity-types');
    });

    it('should refresh feed on pull down', async () => {
      await element(by.id('activity-feed')).swipe('down', 'fast', 0.9);
      
      // Should show refresh indicator
      await waitForElement(by.id('refresh-indicator'));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should reload feed
      await expect(element(by.id('activity-feed'))).toBeVisible();
      await takeScreenshot('feed-refreshed');
    });

    it('should load more activities on scroll', async () => {
      // Scroll to bottom
      await element(by.id('activity-feed')).scroll(500, 'down');
      await element(by.id('activity-feed')).scroll(500, 'down');
      
      // Should load more items
      await waitForElement(by.text('Loading more...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot('more-activities-loaded');
    });

    it('should filter activities by type', async () => {
      await tapElement(by.id('filter-button'));
      await waitForElement(by.text('Activity Type'));
      await tapElement(by.text('Badges'));
      await tapElement(by.text('Apply'));
      
      // Should show only badge activities
      await waitForElement(by.text(/badge/i), WAIT_MEDIUM);
      await takeScreenshot('filtered-activities');
    });
  });

  describe('Comments', () => {
    beforeEach(async () => {
      // Navigate to a course or video with comments
      await tapElement(by.id(TEST_IDS.COURSES_TAB));
      const course = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(course);
      await scrollToElement('course-details-scroll', 'comments-section');
      await waitForElement(by.id('comments-section'));
    });

    it('should display comments section', async () => {
      await expect(element(by.id('comments-section'))).toBeVisible();
      await expect(element(by.id(TEST_IDS.COMMENT_INPUT))).toBeVisible();
      await takeScreenshot('comments-section');
    });

    it('should show existing comments', async () => {
      const commentItem = by.id('comment-item');
      if (await element(commentItem).exists()) {
        await expect(element(commentItem)).toBeVisible();
        await expect(element(by.id('comment-author').withAncestor(commentItem))).toBeVisible();
        await expect(element(by.id('comment-text').withAncestor(commentItem))).toBeVisible();
        await expect(element(by.id('comment-timestamp').withAncestor(commentItem))).toBeVisible();
      }
    });

    it('should post a comment', async () => {
      await tapElement(by.id(TEST_IDS.COMMENT_INPUT));
      await typeText(by.id(TEST_IDS.COMMENT_INPUT), 'Great course! Very informative.');
      await tapElement(by.id(TEST_IDS.POST_COMMENT_BUTTON));
      
      // Should show success message
      await waitForElement(by.text(/comment posted/i), WAIT_MEDIUM);
      await takeScreenshot('comment-posted');
      
      // Should appear in comments list
      await waitForElement(by.text('Great course! Very informative.'));
      await expect(element(by.text('Great course! Very informative.'))).toBeVisible();
    });

    it('should validate comment length', async () => {
      await tapElement(by.id(TEST_IDS.COMMENT_INPUT));
      await typeText(by.id(TEST_IDS.COMMENT_INPUT), 'Hi');
      await tapElement(by.id(TEST_IDS.POST_COMMENT_BUTTON));
      
      // Should show error for short comment
      await waitForElement(by.text(/too short/i));
      await expect(element(by.text(/too short/i))).toBeVisible();
    });

    it('should edit own comment', async () => {
      // Find user's comment
      const myComment = by.text('Great course! Very informative.');
      await waitForElement(myComment);
      await element(myComment).longPress();
      
      // Should show options
      await waitForElement(by.text('Edit'));
      await tapElement(by.text('Edit'));
      
      // Edit comment
      await replaceText(by.id('edit-comment-input'), 'Great course! Very informative and well-structured.');
      await tapElement(by.id('save-edit-button'));
      
      // Should update comment
      await waitForElement(by.text('Great course! Very informative and well-structured.'), WAIT_MEDIUM);
      await takeScreenshot('comment-edited');
    });

    it('should delete own comment', async () => {
      const myComment = by.text('Great course! Very informative and well-structured.');
      await waitForElement(myComment);
      await element(myComment).longPress();
      
      await waitForElement(by.text('Delete'));
      await tapElement(by.text('Delete'));
      
      // Confirm deletion
      await waitForElement(by.text('Delete Comment?'));
      await tapElement(by.text('Delete'));
      
      // Should remove comment
      await new Promise(resolve => setTimeout(resolve, 2000));
      await expect(element(myComment)).not.toBeVisible();
      await takeScreenshot('comment-deleted');
    });

    it('should reply to comment', async () => {
      // Find a comment
      const commentItem = element(by.id('comment-item')).atIndex(0);
      await tapElement(by.id('reply-button').withAncestor(commentItem));
      
      // Should show reply input
      await waitForElement(by.id('reply-input'));
      await typeText(by.id('reply-input'), 'I agree!');
      await tapElement(by.id('post-reply-button'));
      
      // Should show reply
      await waitForElement(by.text('I agree!'), WAIT_MEDIUM);
      await takeScreenshot('comment-reply');
    });

    it('should report inappropriate comment', async () => {
      const commentItem = element(by.id('comment-item')).atIndex(0);
      await element(commentItem).longPress();
      
      await waitForElement(by.text('Report'));
      await tapElement(by.text('Report'));
      
      // Select reason
      await waitForElement(by.text('Report Comment'));
      await tapElement(by.text('Spam'));
      await tapElement(by.id('submit-report-button'));
      
      // Should show success
      await waitForElement(by.text(/report submitted/i), WAIT_MEDIUM);
      await takeScreenshot('comment-reported');
    });
  });

  describe('Likes and Reactions', () => {
    beforeEach(async () => {
      // Navigate to content with likes
      await tapElement(by.id(TEST_IDS.COURSES_TAB));
      const course = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(course);
    });

    it('should display like button', async () => {
      await waitForElement(by.id(TEST_IDS.LIKE_BUTTON));
      await expect(element(by.id(TEST_IDS.LIKE_BUTTON))).toBeVisible();
      await expect(element(by.id('like-count'))).toBeVisible();
      await takeScreenshot('like-button');
    });

    it('should like content', async () => {
      // Get current like count
      const likeButton = by.id(TEST_IDS.LIKE_BUTTON);
      await waitForElement(likeButton);
      
      // Tap like
      await tapElement(likeButton);
      
      // Should animate and update count
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('content-liked');
      
      // Button should be in liked state
      await expect(element(by.id('liked-icon'))).toBeVisible();
    });

    it('should unlike content', async () => {
      const likeButton = by.id(TEST_IDS.LIKE_BUTTON);
      
      // Tap unlike
      await tapElement(likeButton);
      
      // Should animate and update count
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('content-unliked');
      
      // Button should be in unliked state
      await expect(element(by.id('unlike-icon'))).toBeVisible();
    });

    it('should show who liked content', async () => {
      await tapElement(by.id('like-count'));
      
      // Should show list of users who liked
      await waitForElement(by.text('Liked By'), WAIT_MEDIUM);
      await expect(element(by.id('user-list'))).toBeVisible();
      await takeScreenshot('likes-list');
    });

    it('should like a comment', async () => {
      await scrollToElement('course-details-scroll', 'comments-section');
      const commentItem = element(by.id('comment-item')).atIndex(0);
      const commentLikeButton = by.id('comment-like-button').withAncestor(commentItem);
      
      await tapElement(commentLikeButton);
      
      // Should update like count
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('comment-liked');
    });
  });

  describe('Leaderboard', () => {
    beforeEach(async () => {
      // Navigate to leaderboard
      await tapElement(by.id(TEST_IDS.SOCIAL_TAB));
      await waitForElement(by.id(TEST_IDS.LEADERBOARD_BUTTON));
      await tapElement(by.id(TEST_IDS.LEADERBOARD_BUTTON));
    });

    it('should display leaderboard', async () => {
      await waitForElement(by.text('Leaderboard'), WAIT_MEDIUM);
      await expect(element(by.text('Leaderboard'))).toBeVisible();
      await expect(element(by.id('leaderboard-list'))).toBeVisible();
      await takeScreenshot('leaderboard');
    });

    it('should show top users', async () => {
      await waitForElement(by.id('leaderboard-item'));
      const topUser = element(by.id('leaderboard-item')).atIndex(0);
      
      // Should show rank, username, points, badges
      await expect(topUser).toBeVisible();
      await expect(element(by.id('user-rank').withAncestor(topUser))).toBeVisible();
      await expect(element(by.id('user-name').withAncestor(topUser))).toBeVisible();
      await expect(element(by.id('user-points').withAncestor(topUser))).toBeVisible();
      await takeScreenshot('top-users');
    });

    it('should highlight current user', async () => {
      // Scroll to find current user
      await element(by.id('leaderboard-list')).scroll(300, 'down');
      
      // Should highlight user's row
      await waitForElement(by.id('current-user-row'));
      await expect(element(by.id('current-user-row'))).toBeVisible();
      await takeScreenshot('current-user-highlighted');
    });

    it('should filter by time period', async () => {
      await tapElement(by.id('time-period-filter'));
      await waitForElement(by.text('This Week'));
      await tapElement(by.text('This Week'));
      
      // Should update leaderboard
      await waitForElement(by.id('leaderboard-list'), WAIT_MEDIUM);
      await takeScreenshot('weekly-leaderboard');
    });

    it('should filter by category', async () => {
      await tapElement(by.id('category-filter'));
      await waitForElement(by.text('Category'));
      await tapElement(by.text('Courses'));
      await tapElement(by.text('Apply'));
      
      // Should show course-specific leaderboard
      await waitForElement(by.text('Course Leaders'), WAIT_MEDIUM);
      await takeScreenshot('category-leaderboard');
    });

    it('should show user profile on tap', async () => {
      const userItem = element(by.id('leaderboard-item')).atIndex(0);
      await tapElement(userItem);
      
      // Should navigate to user profile
      await waitForElement(by.text('Profile'), WAIT_MEDIUM);
      await expect(element(by.id('profile-avatar'))).toBeVisible();
      await expect(element(by.id('profile-stats'))).toBeVisible();
      await takeScreenshot('user-profile-from-leaderboard');
    });
  });

  describe('User Profile', () => {
    beforeEach(async () => {
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await waitForElement(by.text('Profile'));
    });

    it('should display user profile', async () => {
      await expect(element(by.id('profile-avatar'))).toBeVisible();
      await expect(element(by.id('profile-name'))).toBeVisible();
      await expect(element(by.id('profile-stats'))).toBeVisible();
      await takeScreenshot('user-profile');
    });

    it('should show user statistics', async () => {
      await expect(element(by.text('Points'))).toBeVisible();
      await expect(element(by.text('Badges'))).toBeVisible();
      await expect(element(by.text('Courses'))).toBeVisible();
      await expect(element(by.text('Followers'))).toBeVisible();
      await takeScreenshot('profile-stats');
    });

    it('should show recent activity', async () => {
      await scrollToElement('profile-scroll', 'recent-activity');
      await waitForElement(by.id('recent-activity'));
      await expect(element(by.id('recent-activity'))).toBeVisible();
      await takeScreenshot('recent-activity');
    });

    it('should edit profile', async () => {
      await tapElement(by.id('edit-profile-button'));
      await waitForElement(by.text('Edit Profile'));
      
      // Update bio
      await replaceText(by.id('bio-input'), 'Passionate learner and tech enthusiast!');
      
      // Update avatar (if implemented)
      if (await element(by.id('change-avatar-button')).exists()) {
        await tapElement(by.id('change-avatar-button'));
      }
      
      await tapElement(by.id('save-profile-button'));
      
      // Should show success
      await waitForElement(by.text(/profile updated/i), WAIT_MEDIUM);
      await takeScreenshot('profile-updated');
    });

    it('should follow another user', async () => {
      // Navigate to another user's profile
      await tapElement(by.id(TEST_IDS.SOCIAL_TAB));
      await tapElement(by.id(TEST_IDS.LEADERBOARD_BUTTON));
      const userItem = element(by.id('leaderboard-item')).atIndex(0);
      await tapElement(userItem);
      
      // Follow user
      await waitForElement(by.id('follow-button'));
      await tapElement(by.id('follow-button'));
      
      // Should update button
      await waitForElement(by.text('Following'), WAIT_MEDIUM);
      await takeScreenshot('user-followed');
    });

    it('should unfollow user', async () => {
      // Assuming already following from previous test
      await tapElement(by.id('following-button'));
      
      // Confirm unfollow
      await waitForElement(by.text('Unfollow?'));
      await tapElement(by.text('Unfollow'));
      
      // Should update button
      await waitForElement(by.text('Follow'), WAIT_MEDIUM);
      await takeScreenshot('user-unfollowed');
    });
  });

  describe('Share Content', () => {
    beforeEach(async () => {
      // Navigate to a course
      await tapElement(by.id(TEST_IDS.COURSES_TAB));
      const course = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(course);
    });

    it('should display share button', async () => {
      await waitForElement(by.id('share-button'));
      await expect(element(by.id('share-button'))).toBeVisible();
    });

    it('should show share options', async () => {
      await tapElement(by.id('share-button'));
      
      // Should show share sheet
      await waitForElement(by.text('Share'), WAIT_MEDIUM);
      await takeScreenshot('share-options');
    });

    it('should copy link to clipboard', async () => {
      await tapElement(by.id('share-button'));
      await waitForElement(by.text('Copy Link'));
      await tapElement(by.text('Copy Link'));
      
      // Should show success
      await waitForElement(by.text(/link copied/i), WAIT_MEDIUM);
      await takeScreenshot('link-copied');
    });

    it('should share to social media', async () => {
      await tapElement(by.id('share-button'));
      
      // Should show social media options
      if (await element(by.text('Twitter')).exists()) {
        await tapElement(by.text('Twitter'));
        // Would open Twitter app or web view
      }
    });

    it('should share via message', async () => {
      await tapElement(by.id('share-button'));
      
      if (await element(by.text('Message')).exists()) {
        await tapElement(by.text('Message'));
        // Would open messaging interface
      }
    });
  });

  describe('Notifications', () => {
    beforeEach(async () => {
      // Navigate to notifications
      await tapElement(by.id('notifications-icon'));
      await waitForElement(by.text('Notifications'));
    });

    it('should display notifications', async () => {
      await expect(element(by.id('notification-list'))).toBeVisible();
      await takeScreenshot('notifications-list');
    });

    it('should show notification types', async () => {
      // Should show various notification types
      const notificationItem = by.id('notification-item');
      if (await element(notificationItem).exists()) {
        await expect(element(notificationItem)).toBeVisible();
      }
    });

    it('should mark notification as read', async () => {
      const notification = element(by.id('notification-item')).atIndex(0);
      await tapElement(notification);
      
      // Should navigate to related content
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot('notification-opened');
    });

    it('should clear all notifications', async () => {
      await tapElement(by.id('clear-all-button'));
      
      // Confirm clear
      await waitForElement(by.text('Clear All?'));
      await tapElement(by.text('Clear'));
      
      // Should show empty state
      await waitForElement(by.text(/no notifications/i), WAIT_MEDIUM);
      await takeScreenshot('notifications-cleared');
    });
  });
});
