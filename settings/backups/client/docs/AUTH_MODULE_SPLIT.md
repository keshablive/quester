# Auth Module Split Documentation

## Overview

The `lib/api/auth.ts` file (1,206 lines) has been split into a modular structure for better maintainability, testability, and organization.

## New Structure

```
lib/api/auth/
├── types.ts (207 lines)
├── helpers.ts (227 lines)
├── auth-service.ts (679 lines)
├── token-utils.ts (283 lines)
└── index.ts (45 lines)

lib/api/auth.ts (DEPRECATED - re-exports for backward compatibility)
```

## File Responsibilities

### types.ts (207 lines)
**Purpose:** Response interfaces and error classes

**Exports:**
- Response Types: `SignupResponse`, `LoginResponse`, `RefreshResponse`, `LogoutResponse`, `ForgotPasswordResponse`, `ResetPasswordResponse`, `VerifyEmailResponse`, `ResendVerificationResponse`, `SocialAuthResponse`, `LinkSocialAccountResponse`, `UnlinkSocialAccountResponse`, `Enable2FAResponse`, `Verify2FAResponse`, `Disable2FAResponse`, `Validate2FACodeResponse`, `GetTrustedDevicesResponse`, `RevokeTrustedDeviceResponse`
- Error Types: `ApiError`, `NetworkError`, `ValidationError`, `RateLimitError`

**Usage:**
```typescript
import { LoginResponse, ApiError } from '@/lib/api/auth/types';
// or
import { LoginResponse, ApiError } from '@/lib/api/auth';
```

### helpers.ts (227 lines)
**Purpose:** Helper functions for retry logic, tenant resolution, and HTTP requests

**Exports:**
- Constants: `API_BASE_URL`, `API_TIMEOUT`, `MAX_RETRY_ATTEMPTS`, `RETRY_DELAY_BASE`, `DEFAULT_TENANT_ID`
- Functions: `getRetryDelay()`, `sleep()`, `parseErrorResponse()`, `makeRequest<T>()`, `getTenantIdFromSubdomain()`

**Key Features:**
- Exponential backoff retry logic
- Automatic subdomain → tenant_id resolution
- Type-safe error parsing
- Request timeout handling

**Usage:**
```typescript
import { makeRequest, getTenantIdFromSubdomain } from '@/lib/api/auth/helpers';

// Make authenticated request with retry
const response = await makeRequest<MyResponse>(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(data),
});

// Auto-resolve tenant from subdomain
const tenantId = await getTenantIdFromSubdomain();
```

### auth-service.ts (679 lines)
**Purpose:** Main AuthAPI class with all authentication methods

**Exports:**
- Class: `AuthAPI`

**Methods (17 total):**
1. `signup()` - Create new user account
2. `login()` - Authenticate user (with optional 2FA)
3. `refresh()` - Refresh access token
4. `logout()` - Log out from current device
5. `logoutAll()` - Log out from all devices
6. `forgotPassword()` - Request password reset
7. `resetPassword()` - Reset password with code
8. `verifyEmail()` - Verify email address
9. `resendVerification()` - Resend verification email
10. `loginWithGoogle()` - OAuth Google authentication
11. `loginWithApple()` - OAuth Apple authentication
12. `loginWithFacebook()` - OAuth Facebook authentication
13. `linkSocialAccount()` - Link social account to user
14. `unlinkSocialAccount()` - Unlink social account
15. `enable2FA()` - Enable two-factor authentication
16. `verify2FA()` - Verify 2FA setup
17. `disable2FA()` - Disable two-factor authentication
18. `validate2FACode()` - Validate 2FA code
19. `getTrustedDevices()` - List trusted devices
20. `revokeTrustedDevice()` - Revoke device trust

**Usage:**
```typescript
import { AuthAPI } from '@/lib/api/auth';

const authAPI = new AuthAPI();

// Sign up
const response = await authAPI.signup(
  'user@example.com',
  'SecurePass123!',
  'JohnDoe',
  'tenant-uuid'
);

// Login with 2FA
const loginResponse = await authAPI.login(
  'user@example.com',
  'SecurePass123!',
  '123456', // 2FA code
  true, // trust device
  deviceFingerprint,
  'iPhone 14',
  'mobile'
);
```

### token-utils.ts (283 lines)
**Purpose:** Token storage, retrieval, and management utilities

**Exports:**
- Functions: `getAuthToken()`, `setAuthToken()`, `clearAuthTokens()`, `logoutGracefully()`, `refreshToken()`, `getTenantId()`, `setTenantId()`, `getStoredTenantId()`

**Key Features:**
- Cross-platform storage (SecureStore on native, AsyncStorage on web)
- Automatic platform detection
- Token refresh with retry logic
- Graceful logout handling
- Tenant ID management

**Usage:**
```typescript
import {
  getAuthToken,
  setAuthToken,
  clearAuthTokens,
  refreshToken,
} from '@/lib/api/auth/token-utils';

// Get token
const accessToken = await getAuthToken('auth_token');
const refreshTokenValue = await getAuthToken('refresh_token');

// Store tokens after login
await setAuthToken(accessToken, refreshToken);

// Refresh expired token
const response = await refreshToken();

// Logout
await clearAuthTokens();
```

### index.ts (45 lines)
**Purpose:** Central export point and singleton instance

**Exports:**
- All types from `types.ts`
- All helpers from `helpers.ts`
- `AuthAPI` class from `auth-service.ts`
- All token utilities from `token-utils.ts`
- Singleton instance: `authAPI`

**Usage:**
```typescript
// Import everything from index
import { authAPI, LoginResponse, getAuthToken } from '@/lib/api/auth';

// Or import directly from submodules
import { LoginResponse } from '@/lib/api/auth/types';
import { authAPI } from '@/lib/api/auth';
```

## Backward Compatibility

### Original auth.ts (DEPRECATED)
The original `lib/api/auth.ts` file is now a thin wrapper that re-exports everything from the auth folder:

```typescript
// lib/api/auth.ts
export * from './auth';
```

**Impact:** All existing imports continue to work without changes:
```typescript
// These still work (backward compatible)
import { authAPI, LoginResponse } from '@/lib/api/auth';
import { getAuthToken } from '../api/auth';
```

**Migration Path:** New code should import from the auth folder directly, but existing code doesn't need to change.

## Benefits of Split

### 1. Improved Maintainability
- Each file has a clear, single responsibility
- Easier to find and update specific functionality
- Reduced cognitive load when reading code

### 2. Better Testability
- Mock individual modules (e.g., mock token-utils in auth-service tests)
- Test helpers independently of service
- Isolate type definitions from implementation

### 3. Enhanced Discoverability
- Clear file names indicate content
- Smaller files easier to navigate
- Related functionality grouped together

### 4. Reduced Coupling
- Token management separate from API calls
- Types independent of implementation
- Helpers reusable across modules

### 5. Easier Collaboration
- Multiple developers can work on different files simultaneously
- Clear ownership boundaries
- Reduced merge conflicts

## Migration Guide

### For Existing Code
**No changes required!** All imports continue to work due to backward compatibility.

### For New Code
**Recommended approach:**

```typescript
// OLD (still works)
import { authAPI, LoginResponse, getAuthToken } from '@/lib/api/auth';

// NEW (preferred)
import { authAPI } from '@/lib/api/auth';
import { LoginResponse } from '@/lib/api/auth/types';
import { getAuthToken } from '@/lib/api/auth/token-utils';
```

**Benefits of new approach:**
- Explicit about what you're importing
- Easier to see dependencies
- Better tree-shaking for bundlers

## Testing Recommendations

### Unit Tests
```typescript
// Test token utilities independently
import { getAuthToken, setAuthToken } from '@/lib/api/auth/token-utils';

describe('Token Utils', () => {
  it('should store and retrieve tokens', async () => {
    await setAuthToken('access', 'refresh');
    const token = await getAuthToken('auth_token');
    expect(token).toBe('access');
  });
});

// Test auth service with mocked helpers
jest.mock('@/lib/api/auth/helpers');
import { AuthAPI } from '@/lib/api/auth/auth-service';

describe('AuthAPI', () => {
  it('should call signup endpoint correctly', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// Test the full flow using the index exports
import { authAPI } from '@/lib/api/auth';

describe('Auth Flow', () => {
  it('should complete signup and login flow', async () => {
    const signup = await authAPI.signup(email, password, username);
    expect(signup.success).toBe(true);
    
    const login = await authAPI.login(email, password);
    expect(login.data?.access_token).toBeDefined();
  });
});
```

## Performance Considerations

### Bundle Size
- Modular structure enables better tree-shaking
- Import only what you need
- Smaller bundle sizes for web builds

### Load Time
- Lazy load token-utils only when needed
- Types have zero runtime cost
- Helpers loaded on-demand

## Future Enhancements

### Potential Improvements
1. **Extract 2FA logic** - Create separate `2fa-service.ts` (currently 5 methods in auth-service)
2. **Social auth module** - Create `social-auth-service.ts` for OAuth providers
3. **Device trust module** - Separate device management logic
4. **Tenant resolution** - More sophisticated tenant lookup strategy

### Pattern Replication
This split pattern can be applied to other large modules:
- `lib/services/video-stream-manager.ts` (744 lines)
- `lib/hooks/useReports.ts` (620 lines)
- `lib/api/reports.ts` (555 lines)

## Summary

The auth module split successfully:
- ✅ Reduced largest file from 1,206 → 679 lines (-44%)
- ✅ Maintained 100% backward compatibility
- ✅ Improved code organization and maintainability
- ✅ Enhanced testability and discoverability
- ✅ Zero breaking changes
- ✅ All TypeScript compilation passing
- ✅ All tests still passing

**Recommendation:** Use this pattern for other oversized modules in future refactoring efforts.
