/**
 * Split Auth Context Contracts
 * Feature: 019-client-image-list-performance
 * 
 * Defines TypeScript interfaces for the decomposed AuthContext:
 * - CoreAuthContext: User, session, tokens
 * - TwoFactorContext: 2FA state and methods
 * - BiometricContext: Biometric auth state and methods
 */

// Re-export existing types that remain unchanged
export type { User, AuthResponse } from '../../../client/core/auth/types';

// ============================================================================
// CORE AUTH CONTEXT
// ============================================================================

/**
 * Core authentication state - user identity and session
 */
export interface CoreAuthState {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  
  /** Whether initial auth check (from stored session) is in progress */
  isInitializing: boolean;
  
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  
  /** Current error message from auth operations, null if no error */
  error: string | null;
}

/**
 * Core authentication methods
 */
export interface CoreAuthMethods {
  /**
   * Sign in with email and password
   * @throws AuthError if credentials are invalid
   */
  signIn: (email: string, password: string) => Promise<void>;
  
  /**
   * Register a new user account
   * @throws AuthError if registration fails (e.g., email taken)
   */
  signUp: (name: string, email: string, password: string) => Promise<void>;
  
  /**
   * Sign out the current session
   * Clears local tokens and notifies server
   */
  signOut: () => Promise<void>;
  
  /**
   * Sign out all sessions for the current user
   * Useful for security scenarios
   */
  signOutAll: () => Promise<void>;
  
  /**
   * Request a password reset email
   * @param email - Email address to send reset link to
   */
  forgotPassword: (email: string) => Promise<void>;
  
  /**
   * Reset password using token from email
   * @param token - Reset token from email link
   * @param newPassword - New password to set
   */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  /**
   * Clear the current error state
   */
  clearError: () => void;
}

/**
 * Complete CoreAuthContext type
 */
export interface CoreAuthContextType extends CoreAuthState, CoreAuthMethods {}

// ============================================================================
// TWO-FACTOR CONTEXT
// ============================================================================

/**
 * Two-factor authentication state
 */
export interface TwoFactorState {
  /** Whether 2FA verification is required for current login */
  isRequired: boolean;
  
  /** Credentials pending 2FA verification */
  pendingCredentials?: {
    email: string;
    password: string;
  };
  
  /** Whether 2FA code is being submitted */
  isSubmitting: boolean;
  
  /** 2FA-specific error (invalid code, etc.) */
  error: string | null;
}

/**
 * Two-factor authentication methods
 */
export interface TwoFactorMethods {
  /**
   * Submit 2FA verification code
   * @param code - 6-digit TOTP code
   * @param trustDevice - If true, don't require 2FA on this device for 30 days
   */
  submitTwoFactorCode: (code: string, trustDevice?: boolean) => Promise<void>;
  
  /**
   * Cancel 2FA flow and return to login screen
   * Clears pending credentials
   */
  cancelTwoFactor: () => void;
}

/**
 * Complete TwoFactorContext type
 */
export interface TwoFactorContextType {
  /** Current 2FA state */
  twoFactor: TwoFactorState;
  
  /** Submit verification code */
  submitTwoFactorCode: TwoFactorMethods['submitTwoFactorCode'];
  
  /** Cancel 2FA flow */
  cancelTwoFactor: TwoFactorMethods['cancelTwoFactor'];
}

// ============================================================================
// BIOMETRIC CONTEXT
// ============================================================================

/**
 * Supported biometric authentication types
 */
export type BiometricType = 'fingerprint' | 'facial' | 'iris';

/**
 * Biometric authentication state
 */
export interface BiometricState {
  /** Whether biometric hardware is available on device */
  isAvailable: boolean;
  
  /** Whether user has enrolled biometrics on device */
  isEnrolled: boolean;
  
  /** Whether biometric login is enabled for this app */
  isEnabled: boolean;
  
  /** Number of failed biometric attempts this session */
  failedAttempts: number;
  
  /** Maximum allowed attempts before lockout */
  maxAttempts: number;
  
  /** Types of biometrics available on this device */
  supportedTypes: BiometricType[];
  
  /** Whether a biometric operation is in progress */
  isLoading: boolean;
  
  /** Biometric-specific error message */
  error: string | null;
}

/**
 * Biometric authentication methods
 */
export interface BiometricMethods {
  /**
   * Enable biometric authentication
   * Will prompt user to authenticate with current credentials
   */
  enableBiometric: () => Promise<void>;
  
  /**
   * Enable biometric with explicit credentials
   * Used when credentials are already available (e.g., during login)
   */
  enableBiometricWithCredentials: (email: string, password: string) => Promise<void>;
  
  /**
   * Disable biometric authentication
   * Removes stored credentials from secure storage
   */
  disableBiometric: () => Promise<void>;
  
  /**
   * Sign in using biometric authentication
   * Retrieves stored credentials and performs login
   */
  signInWithBiometric: () => Promise<void>;
}

/**
 * Complete BiometricContext type
 */
export interface BiometricContextType {
  /** Current biometric state */
  biometric: BiometricState;
  
  /** Enable biometric auth */
  enableBiometric: BiometricMethods['enableBiometric'];
  
  /** Enable with credentials */
  enableBiometricWithCredentials: BiometricMethods['enableBiometricWithCredentials'];
  
  /** Disable biometric auth */
  disableBiometric: BiometricMethods['disableBiometric'];
  
  /** Sign in with biometric */
  signInWithBiometric: BiometricMethods['signInWithBiometric'];
}

// ============================================================================
// COMPOSITE AUTH CONTEXT (Backward Compatibility)
// ============================================================================

/**
 * Complete AuthContextType for backward compatibility
 * 
 * Components can either:
 * 1. Use useAuth() to get all auth state (existing pattern)
 * 2. Use specific hooks for better performance:
 *    - useCoreAuth() for auth state only
 *    - useTwoFactor() for 2FA only
 *    - useBiometricAuth() for biometric only
 */
export interface AuthContextType 
  extends CoreAuthState, 
          CoreAuthMethods,
          TwoFactorMethods,
          BiometricMethods {
  /** Two-factor authentication state */
  twoFactor: TwoFactorState;
  
  /** Biometric authentication state */
  biometric: BiometricState;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Initial state for TwoFactor context
 */
export const initialTwoFactorState: TwoFactorState = {
  isRequired: false,
  pendingCredentials: undefined,
  isSubmitting: false,
  error: null,
};

/**
 * Initial state for Biometric context
 */
export const initialBiometricState: BiometricState = {
  isAvailable: false,
  isEnrolled: false,
  isEnabled: false,
  failedAttempts: 0,
  maxAttempts: 3,
  supportedTypes: [],
  isLoading: false,
  error: null,
};

/**
 * Biometric configuration
 */
export const BIOMETRIC_CONFIG = {
  /** Maximum failed attempts before lockout */
  MAX_ATTEMPTS: 3,
  
  /** Lockout duration in milliseconds (30 seconds) */
  LOCKOUT_DURATION_MS: 30000,
  
  /** Prompt message shown to user */
  PROMPT_MESSAGE: 'Authenticate to sign in',
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if user is authenticated
 */
export function isAuthenticated(state: CoreAuthState): state is CoreAuthState & { user: User } {
  return state.isAuthenticated && state.user !== null;
}

/**
 * Check if 2FA is required
 */
export function requiresTwoFactor(state: TwoFactorState): boolean {
  return state.isRequired && state.pendingCredentials !== undefined;
}

/**
 * Check if biometric auth is available and enabled
 */
export function canUseBiometric(state: BiometricState): boolean {
  return state.isAvailable && state.isEnrolled && state.isEnabled;
}

// Import User type for reference
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  tenantId: string;
}
