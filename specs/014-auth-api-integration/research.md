# Research: Auth API Integration

**Feature**: 014-auth-api-integration  
**Date**: 2025-11-28

## Research Tasks

### 1. expo-local-authentication (Biometrics)

**Decision**: Use `expo-local-authentication` for biometric authentication

**Rationale**:
- Official Expo package, maintained and tested with Expo SDK 54
- Supports Face ID (iOS), Touch ID (iOS), Fingerprint (Android)
- Simple API: `authenticateAsync()`, `hasHardwareAsync()`, `isEnrolledAsync()`
- Returns `{ success: boolean, error?: string }` - easy error handling

**Alternatives Considered**:
- `react-native-biometrics`: More features but requires native linking, not Expo-managed
- Manual native modules: Unnecessary complexity for our use case

**Installation**:
```bash
npx expo install expo-local-authentication
```

**Usage Pattern**:
```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const hasBiometrics = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

if (hasBiometrics && isEnrolled) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to Quester',
    cancelLabel: 'Use Password',
    disableDeviceFallback: true, // Don't allow PIN fallback
  });
  if (result.success) {
    // Retrieve credentials from SecureStore and login
  }
}
```

---

### 2. expo-secure-store (Credential Storage)

**Decision**: Use `expo-secure-store` for encrypted credential storage

**Rationale**:
- Uses iOS Keychain and Android EncryptedSharedPreferences
- AES-256 encryption by default
- Simple key-value API similar to AsyncStorage
- Required for storing password when biometrics enabled (FR-019)

**Alternatives Considered**:
- `react-native-keychain`: More features but requires native config
- Encrypted AsyncStorage: DIY encryption adds complexity and risk
- Plain AsyncStorage: NOT secure for credentials (rejected)

**Installation**:
```bash
npx expo install expo-secure-store
```

**Usage Pattern**:
```typescript
import * as SecureStore from 'expo-secure-store';

// Store credentials when biometrics enabled
await SecureStore.setItemAsync('quester_email', email);
await SecureStore.setItemAsync('quester_password', password);

// Retrieve for biometric login
const email = await SecureStore.getItemAsync('quester_email');
const password = await SecureStore.getItemAsync('quester_password');

// Clear on logout or biometrics disabled
await SecureStore.deleteItemAsync('quester_email');
await SecureStore.deleteItemAsync('quester_password');
```

**Security Note**: Credentials are only stored when user explicitly enables biometrics. Cleared on logout or when biometrics disabled.

---

### 3. Token Refresh Race Conditions

**Decision**: Extend existing `apiClient` pattern - it already handles this correctly

**Current Implementation Analysis** (`client/core/api/client.ts` lines 26-45):
```typescript
let isRefreshing = false;
let refreshQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: Error) => void;
}> = [];

function processRefreshQueue(error: Error | null, token: string | null) {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    refreshQueue = [];
}
```

**Findings**:
- ✅ Already implements mutex (`isRefreshing` flag)
- ✅ Already queues concurrent requests during refresh
- ✅ Processes queue after refresh completes
- ⚠️ Missing: Auto-retry failed requests after successful refresh

**Enhancement Needed**:
- Add request retry after successful token refresh
- Ensure 401 responses trigger refresh before failing
- Handle refresh token expiry (clear session, redirect to login)

---

### 4. Server Response Format Validation

**Decision**: Align client types with actual server response structure

**Server Login Response** (from `auth_controller.go` lines 188-207):
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "dGhpcyBp...",
  "user": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user",
    "xp": 1500,
    "level": 5,
    "tier": "silver",
    "login_streak": 3,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "requires_2fa": false,
  "trust_token": ""
}
```

**Current Client Type** (`AuthContext.tsx`):
```typescript
interface User {
  id: string;
  email: string;
  name: string;      // ← Server sends `username`
  role: UserRole;
  avatar?: string;   // ← Server doesn't send this in login response
}
```

**Type Alignment Required**:
| Server Field | Client Field | Action |
|--------------|--------------|--------|
| `username` | `name` | Map during response parsing |
| `tenant_id` | - | Store separately (multi-tenancy) |
| `xp`, `level`, `tier`, `login_streak` | - | Add to User type |
| `requires_2fa` | - | Add to AuthResponse |
| `trust_token` | - | Store for 2FA bypass |
| `avatar` | `avatar` | Fetch from user profile endpoint separately |

---

### 5. Password Reset Endpoint Analysis

**Server Endpoints** (from `API.md` lines 408-448):

**POST /api/v1/auth/forgot-password**
```json
// Request
{ "email": "user@example.com" }
// Response 200 OK
{ "message": "Password reset email sent" }
```

**POST /api/v1/auth/reset-password**
```json
// Request
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
// Response 200 OK
{ "message": "Password reset successfully" }
```

**Client Endpoints to Add** (`env.ts`):
```typescript
AUTH: {
  // ... existing
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  RESET_PASSWORD: '/api/v1/auth/reset-password',
}
```

---

### 6. X-Tenant-ID Header Implementation

**Decision**: Add to `apiClient` base configuration

**Current State**: No tenant header in client requests

**Required Change** (`client.ts`):
```typescript
// Add to request method
const headers: HeadersInit = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Tenant-ID': ENV.TENANT_ID,  // NEW
};
```

**Environment Variable** (`.env`):
```
EXPO_PUBLIC_TENANT_ID=<uuid>
```

**Note**: Tenant ID is app-level configuration, not user-provided. Single tenant per app deployment.

---

## Summary of Required Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-local-authentication` | ^15.0.0 | Biometric prompts |
| `expo-secure-store` | ^14.0.0 | Encrypted credential storage |

No other new dependencies required - existing stack sufficient.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Biometrics unavailable on device | Medium | Low | Graceful fallback to password |
| SecureStore fails on older devices | Low | Medium | Catch errors, disable biometrics option |
| Server response format changes | Low | High | Validate response shape before parsing |
| Refresh token race condition edge cases | Low | Medium | Existing pattern handles most cases |
