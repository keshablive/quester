# Quickstart Guide: Auth API Integration

**Feature**: 014-auth-api-integration  
**Date**: 2025-11-28

## Prerequisites

1. **Server Running**: Quester server at `localhost:3000` or configured `EXPO_PUBLIC_API_URL`
2. **Tenant Configured**: Valid `EXPO_PUBLIC_TENANT_ID` in `.env`
3. **Database Seeded**: At least one test user exists in database
4. **Dependencies Installed**: Run `npm install` after adding new packages

## Environment Setup

Create/update `client/.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_TENANT_ID=<your-tenant-uuid>
EXPO_PUBLIC_ENV=development
```

For iOS simulator connecting to localhost:
```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
```

For Android emulator:
```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

## Install New Dependencies

```bash
cd client
npx expo install expo-local-authentication expo-secure-store
```

## Testing Procedures

### Test 1: User Login (US1)

**Happy Path**:
1. Start the app: `npm run dev`
2. Navigate to login screen
3. Enter valid credentials (test user from database)
4. Tap "Sign In"
5. **Expected**: Redirect to dashboard, user profile visible

**Verify**:
- [ ] Access token stored in AsyncStorage (`@auth_token`)
- [ ] Refresh token stored (`@refresh_token`)
- [ ] User session stored (`@user_session`)
- [ ] No mock tokens (real JWT format)

**Error Cases**:
1. Invalid email → "Invalid email or password" message
2. Wrong password → "Invalid email or password" message
3. Rate limit (11 attempts) → "Maximum 10 login attempts..." message

### Test 2: User Signup (US2)

**Happy Path**:
1. Navigate to signup screen
2. Enter name, unique email, password (8+ chars)
3. Tap "Create Account"
4. **Expected**: Auto-login, redirect to dashboard

**Verify**:
- [ ] New user created in database
- [ ] Tokens stored
- [ ] User data matches input

**Error Cases**:
1. Existing email → "User with this email already exists"
2. Short password → Validation error
3. Rate limit (6 attempts) → "Maximum 5 signup attempts..."

### Test 3: Session Persistence (US3)

**Test Procedure**:
1. Login successfully
2. Close app completely (not just background)
3. Reopen app
4. **Expected**: Still logged in, no login required

**Token Refresh Test**:
1. Login successfully
2. Wait for access token to expire (or manually expire in dev)
3. Trigger an API call (e.g., navigate to profile)
4. **Expected**: Request succeeds, new token transparently fetched

### Test 4: Password Reset (US4)

**Test Procedure**:
1. Navigate to "Forgot Password"
2. Enter registered email
3. Tap "Send Reset Email"
4. **Expected**: "Password reset email sent" confirmation

**Complete Reset** (requires email service):
1. Check email inbox for reset link
2. Click link (deep link to app or web form)
3. Enter new password
4. Tap "Reset Password"
5. Login with new password

### Test 5: Logout (US5)

**Single Device**:
1. While logged in, tap "Sign Out"
2. **Expected**: Redirect to login, tokens cleared

**Verify**:
- [ ] AsyncStorage cleared
- [ ] API call to `/auth/logout` made
- [ ] Cannot access protected routes

**All Devices**:
1. While logged in, tap "Sign Out from All Devices"
2. **Expected**: All sessions revoked
3. Other devices should show login screen on next API call

### Test 6: Two-Factor Auth (US6)

**Prerequisites**: Enable 2FA for test user via server/admin

**Test Procedure**:
1. Login with 2FA-enabled account
2. **Expected**: 2FA code prompt appears
3. Enter code from authenticator app
4. **Expected**: Login completes

**Trust Device**:
1. During 2FA, check "Trust this device"
2. Login
3. Logout
4. Login again
5. **Expected**: No 2FA prompt (trusted for 30 days)

### Test 7: Biometric Auth (US7)

**Prerequisites**: Device with Face ID/Touch ID/Fingerprint

**Enable Biometrics**:
1. Login with password
2. Go to Settings
3. Enable "Sign in with Face ID/Fingerprint"
4. **Expected**: Credentials stored securely

**Biometric Login**:
1. Logout
2. Open app
3. **Expected**: Biometric prompt appears
4. Authenticate with biometrics
5. **Expected**: Login completes automatically

**Fallback**:
1. Fail biometric 3 times
2. **Expected**: Password prompt shown

## Console Verification

Open React Native debugger or Expo console:

```typescript
// Check stored tokens
await AsyncStorage.getItem('@auth_token')
await AsyncStorage.getItem('@refresh_token')
await AsyncStorage.getItem('@user_session')

// Check for mock tokens (should NOT exist in production)
// Mock tokens contain "mock-jwt-token" string
```

## API Request Verification

Use network inspector or proxy (Charles, Proxyman) to verify:

1. **Headers**:
   - `Content-Type: application/json`
   - `X-Tenant-ID: <uuid>` present
   - `Authorization: Bearer <token>` for authenticated requests

2. **Request Bodies**: Match contract specifications

3. **Response Handling**: Errors mapped to user-friendly messages

## Success Criteria Checklist

- [ ] SC-001: Login completes in <3s on 3G
- [ ] SC-002: Signup completes in <5s on 3G
- [ ] SC-003: Session persists across app restarts
- [ ] SC-004: Token refresh works transparently
- [ ] SC-005: No mock auth code in production build
- [ ] SC-006: All errors show user-friendly messages
- [ ] SC-007: Password reset email arrives (if email configured)
- [ ] SC-008: Rate limiting enforced

## Troubleshooting

**"Network error" on all requests**:
- Check API URL in `.env`
- Verify server is running
- Check CORS configuration on server

**"Configuration error"**:
- Verify `EXPO_PUBLIC_TENANT_ID` is set and valid UUID

**Biometrics not available**:
- Simulator: Use `expo-local-authentication` mock
- Device: Ensure biometrics enrolled in device settings

**Token refresh loops**:
- Check refresh token validity
- Verify server isn't returning 401 for refresh endpoint
