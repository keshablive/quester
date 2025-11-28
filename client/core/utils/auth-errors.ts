/**
 * Auth Error Mapping Utilities
 * Feature: 014-auth-api-integration
 * 
 * @description Maps server error responses to user-friendly messages.
 * Follows Constitution IV (Error Handling) - user-friendly messages, no internal details.
 */

import type { AuthError, AuthErrorType, AuthErrorResponse } from '../auth/types';
import { ApiError } from '../api/client';

/**
 * Error message mapping
 * Maps server error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, AuthError> = {
  // Authentication errors
  invalid_credentials: {
    type: 'invalid_credentials',
    message: 'Invalid email or password',
    retryable: true,
  },
  email_exists: {
    type: 'email_exists',
    message: 'An account with this email already exists',
    retryable: false,
  },
  
  // Validation errors
  validation_error: {
    type: 'validation_error',
    message: 'Please check your input and try again',
    retryable: true,
  },
  invalid_password: {
    type: 'validation_error',
    message: 'Password must be at least 8 characters',
    retryable: true,
  },
  invalid_email: {
    type: 'validation_error',
    message: 'Please enter a valid email address',
    retryable: true,
  },
  
  // Rate limiting (FR-014)
  rate_limit_exceeded: {
    type: 'rate_limit_exceeded',
    message: 'Too many attempts. Please try again later.',
    retryable: false,
  },
  
  // 2FA errors
  invalid_2fa_code: {
    type: 'invalid_2fa_code',
    message: 'Invalid authentication code. Please try again.',
    retryable: true,
  },
  
  // Tenant errors (Constitution I: Multi-Tenancy)
  missing_tenant_id: {
    type: 'missing_tenant_id',
    message: 'Configuration error. Please contact support.',
    retryable: false,
  },
  invalid_tenant_id: {
    type: 'invalid_tenant_id',
    message: 'Configuration error. Please contact support.',
    retryable: false,
  },
  
  // Token errors
  token_expired: {
    type: 'token_expired',
    message: 'Your session has expired. Please sign in again.',
    retryable: false,
  },
  token_revoked: {
    type: 'token_revoked',
    message: 'Your session has ended. Please sign in again.',
    retryable: false,
  },
  refresh_token_expired: {
    type: 'token_expired',
    message: 'Your session has expired. Please sign in again.',
    retryable: false,
  },
  
  // Account status errors
  account_suspended: {
    type: 'server_error',
    message: 'Account suspended. Please contact support.',
    retryable: false,
  },
  account_locked: {
    type: 'server_error',
    message: 'Account temporarily locked. Please try again later.',
    retryable: false,
  },
  
  // Password reset errors
  invalid_reset_token: {
    type: 'validation_error',
    message: 'Invalid or expired reset link. Please request a new one.',
    retryable: false,
  },
  reset_token_expired: {
    type: 'validation_error',
    message: 'This reset link has expired. Please request a new one.',
    retryable: false,
  },
};

/**
 * Default error for unknown error types
 */
const DEFAULT_ERROR: AuthError = {
  type: 'unknown_error',
  message: 'Something went wrong. Please try again.',
  retryable: true,
};

/**
 * Network error
 */
const NETWORK_ERROR: AuthError = {
  type: 'network_error',
  message: 'Unable to connect. Please check your internet connection.',
  retryable: true,
};

/**
 * Server error (5xx)
 */
const SERVER_ERROR: AuthError = {
  type: 'server_error',
  message: 'Server error. Please try again later.',
  retryable: true,
};

/**
 * Map API error to user-friendly auth error
 * 
 * @param error - Error from API call
 * @returns User-friendly AuthError
 */
export function mapAuthError(error: unknown): AuthError {
  // Handle ApiError
  if (error instanceof ApiError) {
    // Check for rate limiting (FR-014)
    if (error.status === 429) {
      return ERROR_MESSAGES.rate_limit_exceeded;
    }
    
    // Check for server errors
    if (error.status >= 500) {
      return SERVER_ERROR;
    }
    
    // Try to extract error code from response data
    const errorData = error.data as AuthErrorResponse | undefined;
    if (errorData?.error && ERROR_MESSAGES[errorData.error]) {
      return ERROR_MESSAGES[errorData.error];
    }
    
    // Check for common error messages in the response
    if (errorData?.message) {
      const message = errorData.message.toLowerCase();
      
      if (message.includes('password') && message.includes('8')) {
        return ERROR_MESSAGES.invalid_password;
      }
      if (message.includes('email') && message.includes('exists')) {
        return ERROR_MESSAGES.email_exists;
      }
      if (message.includes('invalid') && message.includes('credentials')) {
        return ERROR_MESSAGES.invalid_credentials;
      }
      if (message.includes('rate') || message.includes('too many')) {
        return ERROR_MESSAGES.rate_limit_exceeded;
      }
      if (message.includes('2fa') || message.includes('two-factor')) {
        return ERROR_MESSAGES.invalid_2fa_code;
      }
    }
    
    // Handle common HTTP status codes
    switch (error.status) {
      case 400:
        return ERROR_MESSAGES.validation_error;
      case 401:
        return ERROR_MESSAGES.invalid_credentials;
      case 403:
        return { ...ERROR_MESSAGES.token_revoked, message: 'Access denied. Please sign in again.' };
      case 404:
        return { ...DEFAULT_ERROR, message: 'Service unavailable. Please try again.' };
      case 409:
        return ERROR_MESSAGES.email_exists;
      default:
        return DEFAULT_ERROR;
    }
  }
  
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return NETWORK_ERROR;
  }
  
  // Handle generic Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      return NETWORK_ERROR;
    }
    if (message.includes('timeout')) {
      return { ...NETWORK_ERROR, message: 'Request timed out. Please try again.' };
    }
  }
  
  return DEFAULT_ERROR;
}

/**
 * Get rate limit message with specific details
 * 
 * @param endpoint - The endpoint that was rate limited
 * @returns Specific rate limit message
 */
export function getRateLimitMessage(endpoint: string): string {
  if (endpoint.includes('login')) {
    return 'Maximum 10 login attempts per hour. Please try again later.';
  }
  if (endpoint.includes('signup')) {
    return 'Maximum 5 signup attempts per hour. Please try again later.';
  }
  if (endpoint.includes('forgot-password')) {
    return 'Maximum 3 password reset requests per hour. Please try again later.';
  }
  return 'Too many attempts. Please try again later.';
}

/**
 * Check if error is retryable
 * 
 * @param error - Error to check
 * @returns True if the operation can be retried
 */
export function isRetryableError(error: unknown): boolean {
  const authError = mapAuthError(error);
  return authError.retryable;
}

/**
 * Check if error requires re-authentication
 * 
 * @param error - Error to check
 * @returns True if user needs to sign in again
 */
export function requiresReauth(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401 || error.status === 403;
  }
  const authError = mapAuthError(error);
  return authError.type === 'token_expired' || authError.type === 'token_revoked';
}
