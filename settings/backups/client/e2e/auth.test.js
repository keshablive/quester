/**
 * E2E Tests: Authentication Flow
 * Tests: Signup, Login, 2FA, Logout
 */

import {
  waitForElement,
  tapElement,
  typeText,
  replaceText,
  expectElementToHaveText,
  generateTestUser,
  takeScreenshot,
  TEST_IDS,
  WAIT_MEDIUM,
} from './helpers';

describe('Authentication Flow', () => {
  let testUser;

  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
    testUser = generateTestUser();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Sign Up', () => {
    it('should display sign up screen', async () => {
      await waitForElement(by.text('Sign Up'));
      await expect(element(by.text('Sign Up'))).toBeVisible();
      await takeScreenshot('signup-screen');
    });

    it('should validate email format', async () => {
      await tapElement(by.id('signup-email-input'));
      await typeText(by.id('signup-email-input'), 'invalid-email');
      await tapElement(by.id('signup-password-input'));
      
      // Should show validation error
      await waitForElement(by.text('Invalid email format'));
      await expect(element(by.text('Invalid email format'))).toBeVisible();
    });

    it('should validate password strength', async () => {
      await tapElement(by.id('signup-password-input'));
      await typeText(by.id('signup-password-input'), 'weak');
      await tapElement(by.id('signup-email-input'));
      
      // Should show password requirements
      await waitForElement(by.text(/password must/i));
    });

    it('should successfully create new account', async () => {
      // Fill signup form
      await replaceText(by.id('signup-email-input'), testUser.email);
      await replaceText(by.id('signup-password-input'), testUser.password);
      await replaceText(by.id('signup-username-input'), testUser.username);
      await replaceText(by.id('signup-first-name-input'), testUser.firstName);
      await replaceText(by.id('signup-last-name-input'), testUser.lastName);
      
      // Submit form
      await tapElement(by.id('signup-submit-button'));
      
      // Should show success message and redirect
      await waitForElement(by.text(/account created/i), WAIT_MEDIUM);
      await takeScreenshot('signup-success');
      
      // Should be on email verification screen
      await waitForElement(by.text(/verify your email/i), WAIT_MEDIUM);
    });

    it('should not allow duplicate email', async () => {
      await replaceText(by.id('signup-email-input'), testUser.email);
      await replaceText(by.id('signup-password-input'), testUser.password);
      await replaceText(by.id('signup-username-input'), 'anotheruser');
      
      await tapElement(by.id('signup-submit-button'));
      
      // Should show error
      await waitForElement(by.text(/email already exists/i), WAIT_MEDIUM);
    });
  });

  describe('Sign In', () => {
    it('should display sign in screen', async () => {
      await tapElement(by.text('Sign In'));
      await waitForElement(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT));
      await expect(element(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT))).toBeVisible();
      await takeScreenshot('signin-screen');
    });

    it('should show error for invalid credentials', async () => {
      await replaceText(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT), 'wrong@example.com');
      await replaceText(by.id(TEST_IDS.SIGN_IN_PASSWORD_INPUT), 'wrongpassword');
      await tapElement(by.id(TEST_IDS.SIGN_IN_BUTTON));
      
      // Should show error
      await waitForElement(by.text(/invalid credentials/i), WAIT_MEDIUM);
      await takeScreenshot('signin-error');
    });

    it('should successfully log in with valid credentials', async () => {
      await replaceText(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT), testUser.email);
      await replaceText(by.id(TEST_IDS.SIGN_IN_PASSWORD_INPUT), testUser.password);
      await tapElement(by.id(TEST_IDS.SIGN_IN_BUTTON));
      
      // Should redirect to home screen
      await waitForElement(by.id(TEST_IDS.HOME_TAB), WAIT_MEDIUM);
      await expect(element(by.id(TEST_IDS.HOME_TAB))).toBeVisible();
      await takeScreenshot('signin-success');
    });

    it('should persist session after app restart', async () => {
      // Reload app
      await device.launchApp({ newInstance: false });
      
      // Should still be logged in
      await waitForElement(by.id(TEST_IDS.HOME_TAB), WAIT_MEDIUM);
      await expect(element(by.id(TEST_IDS.HOME_TAB))).toBeVisible();
    });
  });

  describe('Two-Factor Authentication', () => {
    beforeAll(async () => {
      // Login and navigate to settings
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await waitForElement(by.text('Settings'));
      await tapElement(by.text('Settings'));
      await waitForElement(by.text('Security'));
      await tapElement(by.text('Security'));
    });

    it('should display 2FA setup screen', async () => {
      await waitForElement(by.text('Two-Factor Authentication'));
      await tapElement(by.text('Enable 2FA'));
      
      // Should show QR code
      await waitForElement(by.id('2fa-qr-code'), WAIT_MEDIUM);
      await expect(element(by.id('2fa-qr-code'))).toBeVisible();
      await takeScreenshot('2fa-setup');
    });

    it('should enable 2FA with valid code', async () => {
      // In real test, you'd need to scan QR and get TOTP code
      // For E2E, we'll use a test code or mock the verification
      await replaceText(by.id('2fa-code-input'), '123456');
      await tapElement(by.id('verify-2fa-button'));
      
      // Should show success
      await waitForElement(by.text(/2FA enabled/i), WAIT_MEDIUM);
      await takeScreenshot('2fa-enabled');
    });

    it('should require 2FA code on next login', async () => {
      // Logout
      await tapElement(by.id(TEST_IDS.LOGOUT_BUTTON));
      await waitForElement(by.id(TEST_IDS.SIGN_IN_BUTTON));
      
      // Login again
      await replaceText(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT), testUser.email);
      await replaceText(by.id(TEST_IDS.SIGN_IN_PASSWORD_INPUT), testUser.password);
      await tapElement(by.id(TEST_IDS.SIGN_IN_BUTTON));
      
      // Should show 2FA prompt
      await waitForElement(by.text(/enter 2FA code/i), WAIT_MEDIUM);
      await expect(element(by.id('2fa-verification-input'))).toBeVisible();
      await takeScreenshot('2fa-login-prompt');
    });

    it('should allow disabling 2FA', async () => {
      // Navigate back to security settings
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await tapElement(by.text('Settings'));
      await tapElement(by.text('Security'));
      
      // Disable 2FA
      await tapElement(by.text('Disable 2FA'));
      await waitForElement(by.text(/confirm disable/i));
      await tapElement(by.text('Confirm'));
      
      // Should show success
      await waitForElement(by.text(/2FA disabled/i), WAIT_MEDIUM);
    });
  });

  describe('Logout', () => {
    it('should successfully log out', async () => {
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await waitForElement(by.id(TEST_IDS.LOGOUT_BUTTON));
      await tapElement(by.id(TEST_IDS.LOGOUT_BUTTON));
      
      // Should show confirmation dialog
      await waitForElement(by.text(/are you sure/i));
      await tapElement(by.text('Logout'));
      
      // Should redirect to sign in screen
      await waitForElement(by.id(TEST_IDS.SIGN_IN_BUTTON), WAIT_MEDIUM);
      await expect(element(by.id(TEST_IDS.SIGN_IN_BUTTON))).toBeVisible();
      await takeScreenshot('logout-success');
    });

    it('should clear session data after logout', async () => {
      // Try to access protected route
      await device.launchApp({ newInstance: false });
      
      // Should be on sign in screen, not home
      await waitForElement(by.id(TEST_IDS.SIGN_IN_BUTTON), WAIT_MEDIUM);
      await expect(element(by.id(TEST_IDS.SIGN_IN_BUTTON))).toBeVisible();
    });
  });

  describe('Password Reset', () => {
    it('should display forgot password screen', async () => {
      await tapElement(by.text('Forgot Password?'));
      await waitForElement(by.text('Reset Password'));
      await expect(element(by.id('reset-email-input'))).toBeVisible();
      await takeScreenshot('forgot-password');
    });

    it('should send reset email', async () => {
      await replaceText(by.id('reset-email-input'), testUser.email);
      await tapElement(by.id('send-reset-button'));
      
      // Should show success message
      await waitForElement(by.text(/reset email sent/i), WAIT_MEDIUM);
      await takeScreenshot('reset-email-sent');
    });

    it('should validate reset token', async () => {
      // In real test, you'd get the token from email
      // For E2E, we'll use a test token
      await device.openURL({ url: 'client://reset-password?token=test-token' });
      
      await waitForElement(by.text('New Password'));
      await expect(element(by.id('new-password-input'))).toBeVisible();
    });

    it('should reset password with valid token', async () => {
      await replaceText(by.id('new-password-input'), 'NewPassword123!');
      await replaceText(by.id('confirm-password-input'), 'NewPassword123!');
      await tapElement(by.id('reset-password-button'));
      
      // Should show success and redirect to login
      await waitForElement(by.text(/password reset successful/i), WAIT_MEDIUM);
      await waitForElement(by.id(TEST_IDS.SIGN_IN_BUTTON), WAIT_MEDIUM);
      await takeScreenshot('password-reset-success');
    });
  });
});
