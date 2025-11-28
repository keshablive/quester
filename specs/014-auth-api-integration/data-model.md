# Data Model: Auth API Integration

**Feature**: 014-auth-api-integration  
**Date**: 2025-11-28

## TypeScript Interfaces

### User Entity (Extended)

```typescript
/**
 * User role enumeration
 * Maps to server's models.Role
 */
export type UserRole = 'admin' | 'user' | 'guest' | 'moderator' | 'instructor' | 'partner';

/**
 * User tier enumeration
 * Maps to server's models.Tier
 */
export type UserTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Authenticated user data
 * Extended from current User to include gamification fields from server
 */
export interface User {
  /** UUID from server */
  id: string;
  
  /** Tenant UUID - stored but not exposed in UI */
  tenantId: string;
  
  /** User's email address */
  email: string;
  
  /** Display name (mapped from server's `username`) */
  name: string;
  
  /** User's role for RBAC */
  role: UserRole;
  
  /** Avatar URL (optional, fetched separately) */
  avatar?: string;
  
  /** Experience points */
  xp: number;
  
  /** Current level */
  level: number;
  
  /** Membership tier */
  tier: UserTier;
  
  /** Consecutive login days */
  loginStreak: number;
  
  /** Account creation timestamp */
  createdAt: string;
}
```

### Authentication Response Types

```typescript
/**
 * Server response for successful login/signup
 * Maps to auth_controller.go LoginResponse/SignupResponse
 */
export interface AuthResponse {
  /** JWT access token (short-lived, ~15 min) */
  access_token: string;
  
  /** Refresh token (long-lived, ~7 days) */
  refresh_token: string;
  
  /** Authenticated user data */
  user: ServerUserResponse;
  
  /** Whether 2FA is required to complete login */
  requires_2fa?: boolean;
  
  /** Device trust token for 2FA bypass */
  trust_token?: string;
}

/**
 * Raw user response from server
 * Before client-side mapping
 */
export interface ServerUserResponse {
  id: string;
  tenant_id: string;
  email: string;
  username: string;  // Mapped to `name` on client
  role: string;
  xp: number;
  level: number;
  tier: string;
  login_streak: number;
  created_at: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  /** New access token */
  accessToken: string;
  
  /** Updated user data */
  user: ServerUserResponse;
}
```

### Request Types

```typescript
/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  /** 2FA code if required */
  two_factor_code?: string;
  /** Whether to trust this device for 30 days */
  trust_device?: boolean;
  /** Device fingerprint for trust identification */
  device_fingerprint?: string;
  /** Human-readable device name */
  device_name?: string;
  /** Device type: 'mobile' | 'desktop' | 'tablet' | 'web' */
  device_type?: string;
}

/**
 * Signup request payload
 */
export interface SignupRequest {
  email: string;
  username: string;  // Server expects `username`, not `name`
  password: string;
}

/**
 * Password reset request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

/**
 * Logout request
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Logout all devices request
 */
export interface LogoutAllRequest {
  userId: string;
}
```

### Auth Context State

```typescript
/**
 * Two-factor authentication state
 */
export interface TwoFactorState {
  /** Whether 2FA prompt is showing */
  isRequired: boolean;
  
  /** Temporary credentials while awaiting 2FA */
  pendingCredentials?: {
    email: string;
    password: string;
  };
}

/**
 * Biometric authentication state
 */
export interface BiometricState {
  /** Whether device supports biometrics */
  isAvailable: boolean;
  
  /** Whether biometrics are enrolled on device */
  isEnrolled: boolean;
  
  /** Whether user has enabled biometric login */
  isEnabled: boolean;
  
  /** Number of consecutive failed attempts */
  failedAttempts: number;
}

/**
 * Complete auth context state
 */
export interface AuthState {
  /** Current authenticated user (null if not logged in) */
  user: User | null;
  
  /** Authentication loading state */
  isLoading: boolean;
  
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  
  /** Two-factor authentication state */
  twoFactor: TwoFactorState;
  
  /** Biometric authentication state */
  biometric: BiometricState;
  
  /** Last authentication error */
  error: string | null;
}

/**
 * Auth context methods
 */
export interface AuthContextType extends AuthState {
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<void>;
  
  /** Sign up new user */
  signUp: (name: string, email: string, password: string) => Promise<void>;
  
  /** Sign out from current device */
  signOut: () => Promise<void>;
  
  /** Sign out from all devices */
  signOutAll: () => Promise<void>;
  
  /** Request password reset email */
  forgotPassword: (email: string) => Promise<void>;
  
  /** Reset password with token */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  /** Submit 2FA code */
  submitTwoFactorCode: (code: string, trustDevice?: boolean) => Promise<void>;
  
  /** Cancel 2FA flow */
  cancelTwoFactor: () => void;
  
  /** Enable biometric login */
  enableBiometric: () => Promise<void>;
  
  /** Disable biometric login */
  disableBiometric: () => Promise<void>;
  
  /** Attempt biometric login */
  signInWithBiometric: () => Promise<void>;
  
  /** Clear authentication error */
  clearError: () => void;
}
```

### Error Response Types

```typescript
/**
 * Server error response format
 * Maps to auth_controller.go ErrorResponse
 */
export interface AuthErrorResponse {
  error: string;
  message: string;
  code: number;
}

/**
 * Client-side error types for handling
 */
export type AuthErrorType =
  | 'invalid_credentials'
  | 'email_exists'
  | 'validation_error'
  | 'rate_limit_exceeded'
  | 'invalid_2fa_code'
  | 'missing_tenant_id'
  | 'invalid_tenant_id'
  | 'token_expired'
  | 'token_revoked'
  | 'network_error'
  | 'internal_error';

/**
 * Mapped error for UI display
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  retryable: boolean;
}
```

## Mapping Functions

```typescript
/**
 * Map server user response to client User type
 */
export function mapServerUserToClient(serverUser: ServerUserResponse): User {
  return {
    id: serverUser.id,
    tenantId: serverUser.tenant_id,
    email: serverUser.email,
    name: serverUser.username,  // username → name
    role: serverUser.role as UserRole,
    xp: serverUser.xp,
    level: serverUser.level,
    tier: serverUser.tier as UserTier,
    loginStreak: serverUser.login_streak,
    createdAt: serverUser.created_at,
  };
}

/**
 * Map server error to client-friendly error
 */
export function mapAuthError(error: AuthErrorResponse): AuthError {
  const errorMap: Record<string, AuthError> = {
    invalid_credentials: {
      type: 'invalid_credentials',
      message: 'Invalid email or password',
      retryable: true,
    },
    email_exists: {
      type: 'email_exists',
      message: 'User with this email already exists',
      retryable: false,
    },
    rate_limit_exceeded: {
      type: 'rate_limit_exceeded',
      message: error.message,  // Server provides specific message
      retryable: false,
    },
    invalid_2fa_code: {
      type: 'invalid_2fa_code',
      message: 'Invalid two-factor authentication code',
      retryable: true,
    },
    // ... additional mappings
  };
  
  return errorMap[error.error] || {
    type: 'internal_error',
    message: 'Something went wrong. Please try again.',
    retryable: true,
  };
}
```

## Storage Keys

```typescript
/**
 * AsyncStorage keys for auth data
 */
export const AUTH_STORAGE_KEYS = {
  /** JWT access token */
  ACCESS_TOKEN: '@auth_token',
  
  /** Refresh token */
  REFRESH_TOKEN: '@refresh_token',
  
  /** Serialized user session */
  USER_SESSION: '@user_session',
  
  /** Device trust token for 2FA bypass */
  TRUST_TOKEN: '@trust_token',
  
  /** Biometric enabled flag */
  BIOMETRIC_ENABLED: '@biometric_enabled',
} as const;

/**
 * SecureStore keys for sensitive credentials
 */
export const SECURE_STORAGE_KEYS = {
  /** Stored email for biometric login */
  BIOMETRIC_EMAIL: 'quester_biometric_email',
  
  /** Stored password for biometric login */
  BIOMETRIC_PASSWORD: 'quester_biometric_password',
} as const;
```

## Validation Rules

```typescript
/**
 * Validation rules matching server requirements
 */
export const AUTH_VALIDATION = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    minLength: 8,
    message: 'Password must be at least 8 characters',
  },
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username must be 3-30 characters (letters, numbers, underscore)',
  },
  twoFactorCode: {
    length: 6,
    pattern: /^\d{6}$/,
    message: 'Enter 6-digit code from authenticator app',
  },
} as const;
```
