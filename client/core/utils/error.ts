/**
 * Error Handling Utilities
 * 
 * Provides centralized error handling with custom error classes
 * and user-friendly error messages.
 * 
 * @example
 * ```tsx
 * import { AppError, handleApiError, ErrorCodes } from '@/core';
 * 
 * throw new AppError('Not found', ErrorCodes.NOT_FOUND, 404);
 * 
 * try {
 *   await api.fetch();
 * } catch (error) {
 *   const message = handleApiError(error);
 *   Alert.alert('Error', message);
 * }
 * ```
 */

/**
 * Custom application error class
 * 
 * @example
 * ```tsx
 * throw new AppError(
 *   'User not found',
 *   ErrorCodes.NOT_FOUND,
 *   404,
 *   true
 * );
 * ```
 */
export class AppError extends Error {
  /**
   * @param message - Human-readable error message
   * @param code - Error code for categorization
   * @param statusCode - HTTP status code (default: 500)
   * @param isOperational - Whether error is expected/handled (default: true)
   */
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Standard error codes for the application
 */
export const ErrorCodes = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Authentication errors
  AUTH_ERROR: 'AUTH_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  NO_CONNECTION: 'NO_CONNECTION',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Permission errors
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Unknown
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Convert any error to a user-friendly message
 * 
 * @param error - Error to handle
 * @returns User-friendly error message
 * 
 * @example
 * ```tsx
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const message = handleApiError(error);
 *   showToast(message);
 * }
 * ```
 */
export function handleApiError(error: unknown): string {
  // Handle AppError instances
  if (error instanceof AppError) {
    return error.message;
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Network request failed')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    return error.message;
  }

  // Handle error objects with message property
  // FR-011: Use type guard instead of `any` cast
  if (isErrorWithMessage(error)) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Type guard to check if an object has a message property
 * FR-011: Replace `any` type casts with proper type guards
 */
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Get user-friendly message for HTTP status codes
 * 
 * @param statusCode - HTTP status code
 * @returns User-friendly message
 * 
 * @example
 * ```tsx
 * getErrorMessageForStatus(404); // "The requested resource was not found"
 * getErrorMessageForStatus(500); // "Server error. Please try again later"
 * ```
 */
export function getErrorMessageForStatus(statusCode: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'You need to log in to access this resource.',
    403: 'You do not have permission to access this resource.',
    404: 'The requested resource was not found.',
    408: 'Request timed out. Please try again.',
    409: 'This resource already exists or conflicts with existing data.',
    422: 'The provided data is invalid. Please check and try again.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
    502: 'Server is temporarily unavailable. Please try again later.',
    503: 'Service is currently unavailable. Please try again later.',
    504: 'Server request timed out. Please try again.',
  };

  return messages[statusCode] || 'An unexpected error occurred. Please try again.';
}

/**
 * Log error with context (for debugging)
 * 
 * @param error - Error to log
 * @param context - Additional context
 * FR-011: Changed context type from `Record<string, any>` to `Record<string, unknown>`
 * 
 * @example
 * ```tsx
 * logError(error, { userId: '123', action: 'fetchProfile' });
 * ```
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) {
    console.error('Error:', error);
    if (context) {
      console.error('Context:', context);
    }
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
  
  // In production, send to error tracking service
  // e.g., Sentry, Bugsnag, etc.
}

/**
 * Check if error is a network error
 * 
 * @param error - Error to check
 * @returns True if network error
 * 
 * @example
 * ```tsx
 * if (isNetworkError(error)) {
 *   showRetryButton();
 * }
 * ```
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === ErrorCodes.NETWORK_ERROR || 
           error.code === ErrorCodes.NO_CONNECTION;
  }
  
  if (error instanceof Error) {
    return error.message.includes('Network') ||
           error.message.includes('fetch failed') ||
           error.message.includes('No connection');
  }
  
  return false;
}

/**
 * Check if error is an authentication error
 * 
 * @param error - Error to check
 * @returns True if auth error
 * 
 * @example
 * ```tsx
 * if (isAuthError(error)) {
 *   redirectToLogin();
 * }
 * ```
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === ErrorCodes.AUTH_ERROR ||
           error.code === ErrorCodes.UNAUTHORIZED ||
           error.code === ErrorCodes.TOKEN_EXPIRED ||
           error.statusCode === 401;
  }
  
  return false;
}

/**
 * Retry function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of function
 * 
 * @example
 * ```tsx
 * const data = await retryWithBackoff(
 *   () => api.fetch(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on auth errors or client errors
      if (isAuthError(error) || 
          (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500)) {
        throw error;
      }

      // If we've exhausted retries, throw
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Safe async function wrapper that catches errors
 * 
 * @param fn - Function to wrap
 * @returns Tuple of [error, result]
 * 
 * @example
 * ```tsx
 * const [error, data] = await safeAsync(() => api.fetch());
 * if (error) {
 *   handleError(error);
 * } else {
 *   processData(data);
 * }
 * ```
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<[Error | null, T | null]> {
  try {
    const result = await fn();
    return [null, result];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}
