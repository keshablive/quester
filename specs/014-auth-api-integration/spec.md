# Feature Specification: Auth API Integration

**Feature Branch**: `014-auth-api-integration`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Wire client AuthContext to real server auth endpoints, replace mock login/signup, implement reset password"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Login with Real Credentials (Priority: P1)

A registered user can sign in to the Quester app using their email and password. The system validates credentials against the server, returns JWT tokens (access + refresh), and establishes an authenticated session that persists across app restarts.

**Why this priority**: Login is the gateway to all authenticated features. Without real authentication, the app cannot function in production.

**Independent Test**: Can be fully tested by entering valid credentials on login screen and verifying access to protected routes (dashboard, quests, profile).

**Acceptance Scenarios**:

1. **Given** a registered user with email "user@example.com" and password "SecurePass123!", **When** they enter credentials and tap "Sign In", **Then** they receive access/refresh tokens, see their profile data, and are redirected to dashboard.
2. **Given** an unregistered email "unknown@example.com", **When** the user attempts login, **Then** they see "Invalid email or password" error within 3 seconds.
3. **Given** a registered user with wrong password, **When** they attempt login, **Then** they see "Invalid email or password" error (no hint about which field is wrong).
4. **Given** a user who has made 10 failed login attempts, **When** they attempt an 11th login, **Then** they see "Maximum 10 login attempts per hour. Please try again later."

---

### User Story 2 - User Registration (Priority: P1)

A new user can create an account by providing their name, email, and password. The system creates the account on the server, returns tokens, and automatically signs them in.

**Why this priority**: Registration is essential for user acquisition. Tied with login as core authentication flow.

**Independent Test**: Can be fully tested by completing signup form with new email and verifying account creation, automatic login, and access to protected features.

**Acceptance Scenarios**:

1. **Given** a new user with valid details (name, unique email, password 8+ chars), **When** they complete signup, **Then** account is created, tokens are returned, and they're redirected to dashboard.
2. **Given** an email "existing@example.com" already registered, **When** user attempts signup with same email, **Then** they see "User with this email already exists" error.
3. **Given** a password with less than 8 characters, **When** user attempts signup, **Then** they see a validation error about password requirements.
4. **Given** 5 signup attempts from the same IP in one hour, **When** a 6th attempt is made, **Then** they see "Maximum 5 signup attempts per hour. Please try again later."

---

### User Story 3 - Session Persistence & Token Refresh (Priority: P2)

A logged-in user's session persists across app restarts. When the access token expires, the system automatically refreshes it using the refresh token without interrupting the user experience.

**Why this priority**: Essential for UX - users should not need to re-login frequently. Depends on US1/US2 being complete.

**Independent Test**: Can be tested by logging in, closing app, reopening after token expiry, and verifying automatic session restoration.

**Acceptance Scenarios**:

1. **Given** a logged-in user closes the app, **When** they reopen within 7 days, **Then** they are automatically signed in without re-entering credentials.
2. **Given** an access token expired but refresh token valid, **When** user makes an API request, **Then** the access token is silently refreshed and the request succeeds.
3. **Given** a refresh token has expired (after 7 days), **When** user attempts any action, **Then** they are redirected to login with session expired message.
4. **Given** multiple concurrent requests with expired access token, **When** refresh is needed, **Then** only one refresh request is made (prevents race conditions).

---

### User Story 4 - Password Reset Flow (Priority: P2)

A user who forgot their password can request a reset email, receive it, and set a new password using the reset token.

**Why this priority**: Critical for user recovery but not blocking initial launch. Depends on email service being configured.

**Independent Test**: Can be tested by requesting reset for valid email, using reset token to set new password, and logging in with new credentials.

**Acceptance Scenarios**:

1. **Given** a registered user's email, **When** they request password reset, **Then** they see "Password reset email sent" confirmation.
2. **Given** an unregistered email, **When** reset is requested, **Then** the same "Password reset email sent" message appears (security - no email enumeration).
3. **Given** a valid reset token from email, **When** user sets new password (8+ chars), **Then** password is updated and they can login with new credentials.
4. **Given** an expired or invalid reset token, **When** user attempts to reset password, **Then** they see "Invalid or expired reset token" error.

---

### User Story 5 - Logout (Single Device & All Devices) (Priority: P3)

A logged-in user can sign out from the current device (revoking current session) or sign out from all devices (revoking all active sessions).

**Why this priority**: Important for security but not blocking core functionality. Lower priority than session management.

**Independent Test**: Can be tested by logging out and verifying tokens are invalidated, preventing access to protected routes.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they tap "Sign Out", **Then** tokens are cleared locally and revoked on server, and they're redirected to login.
2. **Given** a user logged in on multiple devices, **When** they tap "Sign Out from All Devices", **Then** all sessions are revoked and all devices show login screen.
3. **Given** a failed logout API call (network error), **When** user attempts logout, **Then** local tokens are still cleared (fail-safe - never trap user in authenticated state).

---

### User Story 6 - Two-Factor Authentication Support (Priority: P3)

Users with 2FA enabled receive a challenge during login. They must provide the 2FA code to complete authentication. Trusted devices can skip 2FA for 30 days.

**Why this priority**: Security enhancement. Depends on core login (US1) being complete. Server already supports this.

**Independent Test**: Can be tested by enabling 2FA, logging out, logging in again, and verifying 2FA prompt appears.

**Acceptance Scenarios**:

1. **Given** a user with 2FA enabled and untrusted device, **When** they enter correct email/password, **Then** they see 2FA code input prompt.
2. **Given** the 2FA prompt, **When** user enters valid TOTP code, **Then** login completes and tokens are returned.
3. **Given** the 2FA prompt with "Trust this device" checked, **When** login succeeds, **Then** trust token is stored and 2FA is skipped for 30 days on that device.
4. **Given** an invalid 2FA code, **When** user submits it, **Then** they see "Invalid two-factor authentication code" error.

---

### User Story 7 - Biometric Authentication (Priority: P3)

Users can enable Face ID or fingerprint authentication as a convenient alternative to typing their password. Credentials are stored securely in the device's keychain/keystore and used for automatic login.

**Why this priority**: UX enhancement for returning users. Depends on core login (US1) being complete. Can be implemented after MVP.

**Independent Test**: Can be tested by enabling biometrics in settings, logging out, and verifying biometric prompt appears on next login attempt.

**Acceptance Scenarios**:

1. **Given** a logged-in user with biometric-capable device, **When** they enable "Sign in with Face ID/Fingerprint" in settings, **Then** their credentials are securely stored in device keychain.
2. **Given** a user with biometrics enabled, **When** they open the app or visit login screen, **Then** they see biometric authentication prompt.
3. **Given** the biometric prompt, **When** user successfully authenticates with Face ID/fingerprint, **Then** stored credentials are used to login automatically.
4. **Given** biometric authentication fails 3 times, **When** user tries again, **Then** they are prompted to enter password manually.
5. **Given** a user disables biometrics in settings, **When** they log out, **Then** stored credentials are removed from keychain.

---

### Edge Cases

- What happens when the server is unreachable during login? → User sees "Unable to connect. Check your internet connection." error.
- How does the app handle simultaneous login attempts from multiple tabs? → Token storage is atomic; last successful login wins.
- What if the tenant ID is missing or invalid? → User sees "Configuration error. Please contact support." (tenant ID comes from app config, not user input).
- What if user's account is suspended/banned? → Server returns appropriate error, client shows "Account suspended. Contact support."
- What happens if tokens are manually cleared from storage while app is open? → Next API call detects missing token, redirects to login.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users via email/password against the server's `/api/v1/auth/login` endpoint.
- **FR-002**: System MUST create new user accounts via the server's `/api/v1/auth/signup` endpoint.
- **FR-003**: System MUST store access token, refresh token, and user session data in secure async storage.
- **FR-004**: System MUST automatically refresh expired access tokens using the refresh token before API requests fail.
- **FR-005**: System MUST include `X-Tenant-ID` header in all authentication requests (from app configuration).
- **FR-006**: System MUST implement password reset request via `/api/v1/auth/forgot-password` endpoint.
- **FR-007**: System MUST implement password reset confirmation via `/api/v1/auth/reset-password` endpoint.
- **FR-008**: System MUST handle 2FA challenge flow when server returns `requires_2fa: true`.
- **FR-009**: System MUST support device trust tokens to skip 2FA on trusted devices.
- **FR-010**: System MUST handle token refresh transparently (no user-visible UI interruption or loading state) during background fetches without blocking UI.
- **FR-011**: System MUST revoke refresh token on server during logout via `/api/v1/auth/logout` endpoint.
- **FR-012**: System MUST revoke all user tokens via `/api/v1/auth/logout-all` for "sign out everywhere".
- **FR-013**: System MUST clear all local authentication state on logout, even if server call fails.
- **FR-014**: System MUST display rate limit errors (429) with user-friendly messages and retry guidance.
- **FR-015**: System MUST persist authentication state across app restarts using AsyncStorage.
- **FR-016**: System MUST validate server response structure matches expected format before processing.
- **FR-017**: System MUST map server user response fields to client User type correctly (id, email, username→name, role).
- **FR-018**: System MUST support biometric authentication (Face ID / fingerprint) as a full login alternative on capable devices.
- **FR-019**: System MUST store user credentials securely in device keychain/keystore when biometrics are enabled.
- **FR-020**: System MUST fall back to password entry after 3 failed biometric attempts.
- **FR-021**: System MUST show button spinner with disabled state during login/signup/reset operations to prevent double-submission.
- **FR-022**: System MUST display skeleton screens while loading user data after successful authentication.

### Key Entities

- **User**: Authenticated user with id (UUID), email, name (from username), role (admin/user/guest), avatar URL, and gamification fields (xp, level, tier, loginStreak).
- **AuthTokens**: Access token (short-lived JWT for API calls), refresh token (long-lived for session renewal).
- **TrustToken**: Device-specific token for 2FA bypass on trusted devices.
- **ResetToken**: Time-limited token sent via email for password reset flow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete login flow in under 3 seconds on 3G network connection.
- **SC-002**: Users can complete signup flow in under 5 seconds on 3G network connection.
- **SC-003**: Session persists correctly across 100% of app restarts (no unexpected logouts).
- **SC-004**: Token refresh succeeds transparently 99%+ of the time without user-visible interruption.
- **SC-005**: Zero mock authentication code remains in production builds.
- **SC-006**: All error scenarios display user-friendly messages (no raw error codes or technical jargon).
- **SC-007**: Password reset email arrives within 60 seconds of request (depends on email service).
- **SC-008**: Rate limiting correctly prevents brute force attempts (5 signup, 10 login per hour per IP).

## Clarifications

### Session 2025-11-28

- Q: Should the app support biometric authentication (Face ID / fingerprint) as an alternative to re-entering password after initial login? → A: Yes, enable biometrics as full login alternative (store credentials securely)
- Q: What loading state feedback should users see during authentication operations? → A: Button spinner + disabled state combined with skeleton screens

## Assumptions

- Server authentication endpoints (`/api/v1/auth/*`) are fully implemented and tested.
- Email service is configured on server for password reset functionality.
- Tenant ID is available in client app configuration (EXPO_PUBLIC_TENANT_ID).
- Server uses standard JWT with expiration claims that client can decode.
- Refresh token validity is 7 days (standard for mobile apps).
- Access token validity is 15 minutes (standard short-lived token).
