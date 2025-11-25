/**
 * E2E Test Helper Functions
 * Utilities for common testing operations
 */

// Wait for element to be visible with timeout
export async function waitForElement(elementMatcher, timeout = 10000) {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .withTimeout(timeout);
}

// Wait for element and tap
export async function tapElement(elementMatcher, timeout = 10000) {
  await waitForElement(elementMatcher, timeout);
  await element(elementMatcher).tap();
}

// Type text into input field
export async function typeText(elementMatcher, text, timeout = 10000) {
  await waitForElement(elementMatcher, timeout);
  await element(elementMatcher).typeText(text);
}

// Clear and type text
export async function replaceText(elementMatcher, text, timeout = 10000) {
  await waitForElement(elementMatcher, timeout);
  await element(elementMatcher).clearText();
  await element(elementMatcher).typeText(text);
}

// Scroll to element
export async function scrollToElement(scrollViewMatcher, elementMatcher, direction = 'down') {
  await waitFor(element(elementMatcher))
    .toBeVisible()
    .whileElement(by.id(scrollViewMatcher))
    .scroll(200, direction);
}

// Wait for element to disappear
export async function waitForElementToDisappear(elementMatcher, timeout = 10000) {
  await waitFor(element(elementMatcher))
    .not.toBeVisible()
    .withTimeout(timeout);
}

// Check if element has text
export async function expectElementToHaveText(elementMatcher, text) {
  await expect(element(elementMatcher)).toHaveText(text);
}

// Check if element contains text
export async function expectElementToContainText(elementMatcher, text) {
  await expect(element(elementMatcher)).toHaveText(text);
}

// Swipe element
export async function swipeElement(elementMatcher, direction, speed = 'fast') {
  await element(elementMatcher).swipe(direction, speed);
}

// Long press element
export async function longPressElement(elementMatcher, duration = 1000) {
  await element(elementMatcher).longPress(duration);
}

// Take screenshot with name
export async function takeScreenshot(name) {
  await device.takeScreenshot(name);
}

// Reload React Native
export async function reloadApp() {
  await device.reloadReactNative();
}

// Launch app with permissions
export async function launchAppWithPermissions(permissions = {}) {
  await device.launchApp({
    permissions,
    newInstance: true,
  });
}

// Test credentials
export const TEST_USER = {
  email: 'e2etest@example.com',
  password: 'TestPassword123!',
  username: 'e2etestuser',
  firstName: 'E2E',
  lastName: 'Test',
};

export const TEST_ADMIN = {
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  username: 'adminuser',
};

// API endpoints (update with your actual backend URL)
export const API_BASE_URL = process.env.API_URL || 'http://localhost:8080/api/v1';

// Wait times
export const WAIT_SHORT = 2000;
export const WAIT_MEDIUM = 5000;
export const WAIT_LONG = 10000;

// Common test IDs
export const TEST_IDS = {
  // Auth
  SIGN_IN_EMAIL_INPUT: 'sign-in-email-input',
  SIGN_IN_PASSWORD_INPUT: 'sign-in-password-input',
  SIGN_IN_BUTTON: 'sign-in-button',
  SIGN_UP_BUTTON: 'sign-up-button',
  LOGOUT_BUTTON: 'logout-button',
  
  // Navigation
  HOME_TAB: 'home-tab',
  COURSES_TAB: 'courses-tab',
  MARKETPLACE_TAB: 'marketplace-tab',
  SOCIAL_TAB: 'social-tab',
  PROFILE_TAB: 'profile-tab',
  
  // LMS
  COURSE_CARD: 'course-card',
  ENROLL_BUTTON: 'enroll-button',
  VIDEO_PLAYER: 'video-player',
  LESSON_ITEM: 'lesson-item',
  COMPLETE_LESSON_BUTTON: 'complete-lesson-button',
  
  // Marketplace
  PRODUCT_CARD: 'product-card',
  ADD_TO_CART_BUTTON: 'add-to-cart-button',
  CART_ICON: 'cart-icon',
  CHECKOUT_BUTTON: 'checkout-button',
  
  // Social
  COMMENT_INPUT: 'comment-input',
  POST_COMMENT_BUTTON: 'post-comment-button',
  LIKE_BUTTON: 'like-button',
  LEADERBOARD_BUTTON: 'leaderboard-button',
  
  // Common
  LOADING_INDICATOR: 'loading-indicator',
  ERROR_MESSAGE: 'error-message',
  SUCCESS_MESSAGE: 'success-message',
};

// Helper to generate unique test user
export function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123!',
    username: `testuser${timestamp}`,
    firstName: 'Test',
    lastName: 'User',
  };
}

// Helper to wait for API call to complete
export async function waitForApiResponse(timeout = 5000) {
  await device.waitForElement(by.id(TEST_IDS.LOADING_INDICATOR), timeout);
  await waitForElementToDisappear(by.id(TEST_IDS.LOADING_INDICATOR), timeout);
}
