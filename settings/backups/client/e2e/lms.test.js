/**
 * E2E Tests: LMS (Learning Management System) Flow
 * Tests: Browse courses, Enroll, Watch video, Complete lesson, Earn badge
 */

import {
  waitForElement,
  tapElement,
  typeText,
  scrollToElement,
  expectElementToHaveText,
  takeScreenshot,
  TEST_USER,
  TEST_IDS,
  WAIT_MEDIUM,
  WAIT_LONG,
} from './helpers';

describe('LMS Flow', () => {
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
    // Navigate to courses tab
    await tapElement(by.id(TEST_IDS.COURSES_TAB));
    await waitForElement(by.text('Courses'));
  });

  describe('Browse Courses', () => {
    it('should display course list', async () => {
      await waitForElement(by.id('course-list'));
      await expect(element(by.id('course-list'))).toBeVisible();
      await takeScreenshot('course-list');
    });

    it('should show course cards with details', async () => {
      const courseCard = by.id(TEST_IDS.COURSE_CARD).withAncestor(by.id('course-list'));
      await waitForElement(courseCard);
      
      // Should show course title, instructor, rating, price
      await expect(element(courseCard)).toBeVisible();
      await takeScreenshot('course-card-details');
    });

    it('should filter courses by category', async () => {
      await tapElement(by.id('filter-button'));
      await waitForElement(by.text('Category'));
      await tapElement(by.text('Programming'));
      await tapElement(by.text('Apply'));
      
      // Should show only programming courses
      await waitForElement(by.text('Programming'), WAIT_MEDIUM);
      await takeScreenshot('filtered-courses');
    });

    it('should search courses', async () => {
      await tapElement(by.id('search-input'));
      await typeText(by.id('search-input'), 'React Native');
      
      // Should show search results
      await waitForElement(by.text(/React Native/i), WAIT_MEDIUM);
      await expect(element(by.text(/React Native/i))).toBeVisible();
      await takeScreenshot('search-results');
    });

    it('should show course details on tap', async () => {
      const firstCourse = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(firstCourse);
      
      // Should navigate to course details
      await waitForElement(by.text('Course Overview'), WAIT_MEDIUM);
      await expect(element(by.text('Course Overview'))).toBeVisible();
      await expect(element(by.text('Curriculum'))).toBeVisible();
      await expect(element(by.text('Instructor'))).toBeVisible();
      await takeScreenshot('course-details');
    });
  });

  describe('Course Enrollment', () => {
    beforeEach(async () => {
      // Navigate to a course
      const firstCourse = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(firstCourse);
      await waitForElement(by.text('Course Overview'));
    });

    it('should display enroll button for unenrolled course', async () => {
      await waitForElement(by.id(TEST_IDS.ENROLL_BUTTON));
      await expect(element(by.id(TEST_IDS.ENROLL_BUTTON))).toBeVisible();
      await expectElementToHaveText(by.id(TEST_IDS.ENROLL_BUTTON), 'Enroll Now');
    });

    it('should show course curriculum', async () => {
      await scrollToElement('course-details-scroll', 'curriculum-section');
      await waitForElement(by.id('curriculum-section'));
      
      // Should show lessons organized by sections
      await expect(element(by.text('Section 1'))).toBeVisible();
      await expect(element(by.id(TEST_IDS.LESSON_ITEM))).toBeVisible();
      await takeScreenshot('course-curriculum');
    });

    it('should enroll in course successfully', async () => {
      await tapElement(by.id(TEST_IDS.ENROLL_BUTTON));
      
      // Should show confirmation dialog for paid courses
      const confirmButton = by.text('Confirm Enrollment');
      if (await element(confirmButton).exists()) {
        await tapElement(confirmButton);
      }
      
      // Should show success message
      await waitForElement(by.text(/enrolled successfully/i), WAIT_MEDIUM);
      await takeScreenshot('enrollment-success');
      
      // Button should change to "Start Learning"
      await waitForElement(by.text('Start Learning'), WAIT_MEDIUM);
      await expect(element(by.text('Start Learning'))).toBeVisible();
    });

    it('should add course to "My Courses"', async () => {
      // Navigate to profile > my courses
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await waitForElement(by.text('My Courses'));
      await tapElement(by.text('My Courses'));
      
      // Should show enrolled course
      await waitForElement(by.id(TEST_IDS.COURSE_CARD), WAIT_MEDIUM);
      await expect(element(by.id(TEST_IDS.COURSE_CARD))).toBeVisible();
      await takeScreenshot('my-courses');
    });
  });

  describe('Video Playback', () => {
    beforeEach(async () => {
      // Navigate to enrolled course
      await tapElement(by.id(TEST_IDS.COURSES_TAB));
      await tapElement(by.text('My Courses'));
      const enrolledCourse = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(enrolledCourse);
      await waitForElement(by.text('Continue Learning'));
      await tapElement(by.text('Continue Learning'));
    });

    it('should display video player', async () => {
      // Tap on first lesson
      const firstLesson = element(by.id(TEST_IDS.LESSON_ITEM)).atIndex(0);
      await tapElement(firstLesson);
      
      // Should show video player
      await waitForElement(by.id(TEST_IDS.VIDEO_PLAYER), WAIT_MEDIUM);
      await expect(element(by.id(TEST_IDS.VIDEO_PLAYER))).toBeVisible();
      await takeScreenshot('video-player');
    });

    it('should have video controls', async () => {
      await waitForElement(by.id('play-button'));
      await expect(element(by.id('play-button'))).toBeVisible();
      await expect(element(by.id('progress-bar'))).toBeVisible();
      await expect(element(by.id('fullscreen-button'))).toBeVisible();
      await expect(element(by.id('playback-speed-button'))).toBeVisible();
    });

    it('should play video on tap', async () => {
      await tapElement(by.id('play-button'));
      
      // Wait a bit for video to play
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Should show pause button
      await expect(element(by.id('pause-button'))).toBeVisible();
      await takeScreenshot('video-playing');
    });

    it('should track video progress', async () => {
      // Play video for a few seconds
      await tapElement(by.id('play-button'));
      await new Promise(resolve => setTimeout(resolve, 5000));
      await tapElement(by.id('pause-button'));
      
      // Navigate back
      await tapElement(by.id('back-button'));
      
      // Progress should be saved
      await waitForElement(by.text(/watched/i));
      const progressText = await element(by.id('lesson-progress')).getText();
      await expect(progressText).toMatch(/[0-9]+%/);
    });

    it('should change playback speed', async () => {
      await tapElement(by.id('playback-speed-button'));
      await waitForElement(by.text('Playback Speed'));
      await tapElement(by.text('1.5x'));
      
      // Should apply new speed
      await expectElementToHaveText(by.id('playback-speed-button'), '1.5x');
      await takeScreenshot('playback-speed-changed');
    });

    it('should toggle fullscreen mode', async () => {
      await tapElement(by.id('fullscreen-button'));
      
      // Should enter fullscreen
      await expect(element(by.id('exit-fullscreen-button'))).toBeVisible();
      await takeScreenshot('fullscreen-mode');
      
      // Exit fullscreen
      await tapElement(by.id('exit-fullscreen-button'));
      await expect(element(by.id('fullscreen-button'))).toBeVisible();
    });
  });

  describe('Lesson Completion', () => {
    beforeEach(async () => {
      // Navigate to a lesson
      await tapElement(by.id(TEST_IDS.COURSES_TAB));
      await tapElement(by.text('My Courses'));
      const course = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(course);
      const lesson = element(by.id(TEST_IDS.LESSON_ITEM)).atIndex(0);
      await tapElement(lesson);
      await waitForElement(by.id(TEST_IDS.VIDEO_PLAYER));
    });

    it('should mark lesson as complete', async () => {
      // Scroll to complete button
      await scrollToElement('lesson-scroll', TEST_IDS.COMPLETE_LESSON_BUTTON);
      await waitForElement(by.id(TEST_IDS.COMPLETE_LESSON_BUTTON));
      await tapElement(by.id(TEST_IDS.COMPLETE_LESSON_BUTTON));
      
      // Should show success message
      await waitForElement(by.text(/lesson completed/i), WAIT_MEDIUM);
      await takeScreenshot('lesson-completed');
    });

    it('should earn points for completion', async () => {
      // Should show points earned
      await waitForElement(by.text(/\+[0-9]+ points/i));
      await expect(element(by.text(/\+[0-9]+ points/i))).toBeVisible();
      await takeScreenshot('points-earned');
    });

    it('should unlock next lesson', async () => {
      // Navigate back to course
      await tapElement(by.id('back-button'));
      
      // Next lesson should be unlocked
      const nextLesson = element(by.id(TEST_IDS.LESSON_ITEM)).atIndex(1);
      await expect(nextLesson).toBeVisible();
      await expect(element(by.id('lock-icon').withAncestor(nextLesson))).not.toBeVisible();
    });

    it('should update course progress', async () => {
      // Navigate back to course details
      await tapElement(by.id('back-button'));
      
      // Should show updated progress
      await waitForElement(by.text(/[0-9]+% complete/i));
      await expect(element(by.text(/[0-9]+% complete/i))).toBeVisible();
      await takeScreenshot('course-progress-updated');
    });
  });

  describe('Badge Awards', () => {
    it('should show badge earned notification', async () => {
      // Complete enough lessons to earn a badge
      // (In real test, this would be automated)
      
      // Should show badge notification
      await waitForElement(by.text(/badge earned/i), WAIT_LONG);
      await expect(element(by.text(/badge earned/i))).toBeVisible();
      await takeScreenshot('badge-notification');
    });

    it('should display badge details', async () => {
      await tapElement(by.text(/badge earned/i));
      
      // Should show badge details
      await waitForElement(by.text('Badge Details'));
      await expect(element(by.id('badge-icon'))).toBeVisible();
      await expect(element(by.id('badge-name'))).toBeVisible();
      await expect(element(by.id('badge-description'))).toBeVisible();
      await takeScreenshot('badge-details');
    });

    it('should add badge to profile', async () => {
      // Close badge dialog
      await tapElement(by.text('Close'));
      
      // Navigate to profile badges
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await tapElement(by.text('Badges'));
      
      // Should show earned badge
      await waitForElement(by.id('badge-icon'), WAIT_MEDIUM);
      await expect(element(by.id('badge-icon'))).toBeVisible();
      await takeScreenshot('profile-badges');
    });
  });

  describe('Course Reviews', () => {
    beforeEach(async () => {
      // Navigate to completed course
      await tapElement(by.id(TEST_IDS.COURSES_TAB));
      await tapElement(by.text('My Courses'));
      const course = element(by.id(TEST_IDS.COURSE_CARD)).atIndex(0);
      await tapElement(course);
    });

    it('should show review prompt after course completion', async () => {
      // Should show review prompt
      await waitForElement(by.text('Rate this course'));
      await expect(element(by.text('Rate this course'))).toBeVisible();
    });

    it('should submit course review', async () => {
      await tapElement(by.text('Rate this course'));
      
      // Select rating
      await tapElement(by.id('star-5'));
      
      // Write review
      await typeText(by.id('review-text-input'), 'Excellent course! Learned a lot.');
      
      // Submit review
      await tapElement(by.id('submit-review-button'));
      
      // Should show success
      await waitForElement(by.text(/review submitted/i), WAIT_MEDIUM);
      await takeScreenshot('review-submitted');
    });

    it('should display review in course page', async () => {
      // Scroll to reviews section
      await scrollToElement('course-details-scroll', 'reviews-section');
      await waitForElement(by.id('reviews-section'));
      
      // Should show user's review
      await expect(element(by.text('Excellent course! Learned a lot.'))).toBeVisible();
      await takeScreenshot('course-reviews');
    });
  });
});
