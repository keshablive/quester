/**
 * Auth Types - Extended types for real API integration
 * Feature: 014-auth-api-integration
 * 
 * @description TypeScript interfaces for authentication state, requests, and responses.
 * Maps server snake_case responses to client camelCase conventions.
 */

// ============================================================================
// User Types
// ============================================================================

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
 * Extended from legacy User to include gamification fields from server
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
  
  /** Avatar URL (optional) */
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

// ============================================================================
// Server Response Types (snake_case)
// ============================================================================

/**
 * Raw user response from server
 * Before client-side mapping (snake_case)
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
 * Token refresh response
 */
export interface RefreshTokenResponse {
  status: string;
  data: {
    /** New access token */
    accessToken: string;
    /** Updated user data */
    user: ServerUserResponse;
  };
}

// ============================================================================
// Request Types
// ============================================================================

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
  /** Device type */
  device_type?: 'mobile' | 'desktop' | 'tablet' | 'web';
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

// ============================================================================
// Auth State Types
// ============================================================================

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
 * Biometric configuration
 */
export interface BiometricConfig {
  /** Whether biometric login is enabled */
  enabled: boolean;
  
  /** Type of biometric available */
  biometricType: 'face' | 'fingerprint' | 'iris' | 'none';
}

/**
 * Complete auth context state
 */
export interface AuthState {
  /** Current authenticated user (null if not logged in) */
  user: User | null;
  
  /** Authentication loading state */
  isLoading: boolean;
  
  /** Initial session check in progress */
  isInitializing: boolean;
  
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
  
  /** Enable biometric login with credentials (for setup) */
  enableBiometricWithCredentials: (email: string, password: string) => Promise<void>;
  
  /** Disable biometric login */
  disableBiometric: () => Promise<void>;
  
  /** Attempt biometric login */
  signInWithBiometric: () => Promise<void>;
  
  /** Clear authentication error */
  clearError: () => void;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Server error response format
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
  | 'server_error'
  | 'unknown_error';

/**
 * Mapped error for UI display
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  retryable: boolean;
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Map server user response to client User type
 * Handles snake_case → camelCase conversion and username → name mapping
 * 
 * @param serverUser - Raw server response
 * @returns Client-side User object
 */
export function mapServerUserToClient(serverUser: ServerUserResponse): User {
  return {
    id: serverUser.id,
    tenantId: serverUser.tenant_id,
    email: serverUser.email,
    name: serverUser.username,  // username → name
    role: serverUser.role as UserRole,
    xp: serverUser.xp ?? 0,
    level: serverUser.level ?? 1,
    tier: (serverUser.tier as UserTier) ?? 'bronze',
    loginStreak: serverUser.login_streak ?? 0,
    createdAt: serverUser.created_at,
  };
}

/**
 * Validate AuthResponse structure at runtime
 * FR-016: System MUST validate server response structure matches expected format
 * 
 * @param data - Unknown response data
 * @returns True if valid AuthResponse structure
 * @throws Error if validation fails
 */
export function validateAuthResponse(data: unknown): data is AuthResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: expected object');
  }
  
  const response = data as Record<string, unknown>;
  
  // Check for 2FA required response (partial response is valid)
  if (response.requires_2fa === true) {
    return true;
  }
  
  // Full auth response validation
  if (typeof response.access_token !== 'string' || !response.access_token) {
    throw new Error('Invalid response: missing access_token');
  }
  
  if (typeof response.refresh_token !== 'string' || !response.refresh_token) {
    throw new Error('Invalid response: missing refresh_token');
  }
  
  if (!response.user || typeof response.user !== 'object') {
    throw new Error('Invalid response: missing user data');
  }
  
  const user = response.user as Record<string, unknown>;
  if (typeof user.id !== 'string' || !user.id) {
    throw new Error('Invalid response: missing user.id');
  }
  
  if (typeof user.email !== 'string' || !user.email) {
    throw new Error('Invalid response: missing user.email');
  }
  
  return true;
}

// ============================================================================
// Default State
// ============================================================================

/**
 * Initial auth state
 */
export const initialAuthState: AuthState = {
  user: null,
  isLoading: false,
  isInitializing: true,
  isAuthenticated: false,
  twoFactor: {
    isRequired: false,
    pendingCredentials: undefined,
  },
  biometric: {
    isAvailable: false,
    isEnrolled: false,
    isEnabled: false,
    failedAttempts: 0,
  },
  error: null,
};
