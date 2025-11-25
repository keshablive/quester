# E2E Testing Guide for Quester

This directory contains end-to-end (E2E) tests for the Quester React Native application using [Detox](https://wix.github.io/Detox/).

## 📋 Overview

The E2E test suite covers four main user flows:

1. **Authentication** (`auth.test.js`) - Signup, Login, 2FA, Logout, Password Reset
2. **LMS** (`lms.test.js`) - Browse courses, Enroll, Watch videos, Complete lessons, Earn badges
3. **Marketplace** (`marketplace.test.js`) - Browse products, Add to cart, Checkout, Order confirmation
4. **Social** (`social.test.js`) - Post comments, Like content, View leaderboard, Share content

## 🔧 Prerequisites

### iOS Testing
```bash
# Install Xcode (from App Store)
# Install Xcode Command Line Tools
xcode-select --install

# Install applesimutils
brew tap wix/brew
brew install applesimutils
```

### Android Testing
```bash
# Install Android Studio
# Set up Android SDK and emulator

# Set environment variables in ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Node Dependencies
```bash
cd client
npm install
```

## 🚀 Running Tests

### Build the App

**iOS:**
```bash
npm run test:e2e:build
```

**Android:**
```bash
npm run test:e2e:build:android
```

### Run All Tests

**iOS:**
```bash
npm run test:e2e
```

**Android:**
```bash
npm run test:e2e:android
```

### Run Specific Test Suites

```bash
# Auth tests only
npm run test:e2e:auth

# LMS tests only
npm run test:e2e:lms

# Marketplace tests only
npm run test:e2e:marketplace

# Social tests only
npm run test:e2e:social
```

### Run Tests with Video Recording

```bash
detox test --configuration ios.sim.debug --record-videos all
```

### Run Tests with Screenshots

```bash
detox test --configuration ios.sim.debug --take-screenshots all
```

### Run Tests in Debug Mode

```bash
detox test --configuration ios.sim.debug --debug-synchronization
```

## 📁 Test Structure

```
e2e/
├── auth.test.js          # Authentication flow tests
├── lms.test.js           # LMS flow tests
├── marketplace.test.js   # Marketplace flow tests
├── social.test.js        # Social features tests
├── helpers.js            # Test utility functions
├── jest.config.js        # Jest configuration
└── starter.test.js       # Example starter test (can be deleted)
```

## 🧪 Test Coverage

### Authentication (auth.test.js)
- ✅ Sign Up
  - Display signup screen
  - Validate email format
  - Validate password strength
  - Create new account
  - Prevent duplicate emails
- ✅ Sign In
  - Display signin screen
  - Show error for invalid credentials
  - Login with valid credentials
  - Persist session after app restart
- ✅ Two-Factor Authentication
  - Display 2FA setup screen
  - Enable 2FA with valid code
  - Require 2FA code on login
  - Disable 2FA
- ✅ Logout
  - Successfully log out
  - Clear session data
- ✅ Password Reset
  - Display forgot password screen
  - Send reset email
  - Validate reset token
  - Reset password

### LMS (lms.test.js)
- ✅ Browse Courses
  - Display course list
  - Show course cards with details
  - Filter courses by category
  - Search courses
  - Show course details
- ✅ Course Enrollment
  - Display enroll button
  - Show course curriculum
  - Enroll successfully
  - Add course to "My Courses"
- ✅ Video Playback
  - Display video player
  - Have video controls
  - Play/pause video
  - Track video progress
  - Change playback speed
  - Toggle fullscreen mode
- ✅ Lesson Completion
  - Mark lesson as complete
  - Earn points
  - Unlock next lesson
  - Update course progress
- ✅ Badge Awards
  - Show badge earned notification
  - Display badge details
  - Add badge to profile
- ✅ Course Reviews
  - Show review prompt
  - Submit course review
  - Display review in course page

### Marketplace (marketplace.test.js)
- ✅ Browse Products
  - Display product grid
  - Show product cards with details
  - Filter products by category
  - Search products
  - Sort products by price
  - Show product details
- ✅ Product Details
  - Show product images carousel
  - Show product specifications
  - Show product reviews
  - Select product quantity
  - Select product variant
- ✅ Shopping Cart
  - Add product to cart
  - Navigate to cart
  - Display cart items
  - Update cart item quantity
  - Remove item from cart
  - Show cart total
- ✅ Checkout Process
  - Navigate to checkout
  - Display shipping address form
  - Validate shipping address
  - Fill shipping address
  - Display payment options
  - Fill credit card details
  - Show order summary
- ✅ Order Completion
  - Place order successfully
  - Display order confirmation
  - Send confirmation email
  - Add order to order history
  - Allow order tracking
  - Clear cart after order

### Social (social.test.js)
- ✅ Activity Feed
  - Display activity feed
  - Show various activity types
  - Refresh feed on pull down
  - Load more activities on scroll
  - Filter activities by type
- ✅ Comments
  - Display comments section
  - Show existing comments
  - Post a comment
  - Validate comment length
  - Edit own comment
  - Delete own comment
  - Reply to comment
  - Report inappropriate comment
- ✅ Likes and Reactions
  - Display like button
  - Like content
  - Unlike content
  - Show who liked content
  - Like a comment
- ✅ Leaderboard
  - Display leaderboard
  - Show top users
  - Highlight current user
  - Filter by time period
  - Filter by category
  - Show user profile on tap
- ✅ User Profile
  - Display user profile
  - Show user statistics
  - Show recent activity
  - Edit profile
  - Follow another user
  - Unfollow user
- ✅ Share Content
  - Display share button
  - Show share options
  - Copy link to clipboard
  - Share to social media
  - Share via message
- ✅ Notifications
  - Display notifications
  - Show notification types
  - Mark notification as read
  - Clear all notifications

## 🔍 Test Helpers

The `helpers.js` file provides utility functions for common testing operations:

- `waitForElement()` - Wait for element to be visible
- `tapElement()` - Wait for element and tap
- `typeText()` - Type text into input field
- `replaceText()` - Clear and type text
- `scrollToElement()` - Scroll to element in scrollview
- `takeScreenshot()` - Take screenshot with name
- `generateTestUser()` - Generate unique test user credentials

## 🎯 Test IDs

To ensure reliable E2E tests, add `testID` props to your React Native components:

```tsx
// Example: Sign In Button
<Button testID="sign-in-button" onPress={handleSignIn}>
  Sign In
</Button>

// Example: Email Input
<TextInput
  testID="sign-in-email-input"
  value={email}
  onChangeText={setEmail}
/>
```

See `helpers.js` for all defined test IDs in `TEST_IDS` constant.

## 🐛 Debugging

### View Test Logs
```bash
detox test --configuration ios.sim.debug --loglevel verbose
```

### Keep Simulator Open After Test
```bash
detox test --configuration ios.sim.debug --cleanup
```

### Debug Specific Test
```bash
detox test --configuration ios.sim.debug -t "should successfully log in"
```

### Use Detox Synchronization
If tests are flaky due to timing issues:
```bash
detox test --debug-synchronization
```

## 📊 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd client
          npm install
          
      - name: Install applesimutils
        run: |
          brew tap wix/brew
          brew install applesimutils
          
      - name: Build app for testing
        run: |
          cd client
          npm run test:e2e:build
          
      - name: Run E2E tests
        run: |
          cd client
          npm run test:e2e
          
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: detox-artifacts
          path: client/artifacts/**/*
```

## 🔒 Test Data Management

### Test User Credentials

The tests use predefined test users from `helpers.js`:

```javascript
export const TEST_USER = {
  email: 'e2etest@example.com',
  password: 'TestPassword123!',
  username: 'e2etestuser',
  firstName: 'E2E',
  lastName: 'Test',
};
```

### Database Reset

Before running tests in CI/CD, ensure test database is in a clean state:

```bash
# Reset test database
npm run db:reset:test

# Seed test data
npm run db:seed:test
```

## 📈 Performance Considerations

### Test Execution Time

- Full test suite: ~30-40 minutes
- Auth tests: ~5-8 minutes
- LMS tests: ~10-15 minutes
- Marketplace tests: ~10-15 minutes
- Social tests: ~8-12 minutes

### Optimization Tips

1. **Run tests in parallel** (requires Detox Pro or custom setup)
2. **Use device pool** for Android tests
3. **Cache built apps** in CI/CD
4. **Run critical paths more frequently** (auth, checkout)
5. **Run full suite nightly**

## 🚨 Common Issues & Solutions

### Issue: "Could not find testee"
**Solution:** Make sure app is built before running tests:
```bash
npm run test:e2e:build
```

### Issue: "Timeout while waiting for element"
**Solution:** 
- Increase timeout in test
- Check if element testID is correct
- Verify app is in correct state

### Issue: "App crashes during test"
**Solution:**
- Check app logs in simulator
- Run test with `--debug-synchronization`
- Verify API endpoints are accessible

### Issue: "Flaky tests"
**Solution:**
- Add `await waitFor()` before assertions
- Increase wait timeouts
- Use `device.reloadReactNative()` between tests
- Check for race conditions in app code

## 📚 Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Detox by Example](https://github.com/wix/Detox/tree/master/examples)
- [React Native Testing Best Practices](https://github.com/react-native-community/discussions-and-proposals/issues/433)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Detox Matchers](https://wix.github.io/Detox/docs/api/matchers)
- [Detox Actions](https://wix.github.io/Detox/docs/api/actions)

## 🤝 Contributing

When adding new features, please:

1. Add corresponding E2E tests
2. Add `testID` props to new components
3. Update `TEST_IDS` constant in `helpers.js`
4. Document new test cases in this README
5. Ensure tests pass locally before committing

## 📝 Notes

- Tests assume backend API is running at `http://localhost:8080`
- Update `API_BASE_URL` in `helpers.js` for different environments
- Screenshots and videos are saved to `client/artifacts/`
- Test reports are generated in `client/e2e/jest-reports/`

---

**Last Updated:** November 2, 2025
**Detox Version:** 20.x
**React Native Version:** 0.81.5
**Expo SDK:** 54.0.0
