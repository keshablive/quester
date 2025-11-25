/**
 * Error Handler Module
 * 
 * Implements RFC 7807 Problem Details for HTTP APIs with comprehensive error handling.
 * https://datatracker.ietf.org/doc/html/rfc7807
 * 
 * @module lib/utils/error-handler
 * 
 * Key Features:
 * - RFC 7807 compliant error format
 * - Standardized API error parsing
 * - Retry logic with exponential backoff
 * - User-friendly error messages
 * - Field-level validation errors
 * - Automatic error type detection (auth, validation, retryable)
 * 
 * @example
 * ```typescript
 * import { handleApiResponse, retryWithBackoff, ApiError } from '@/lib/utils/error-handler';
 * 
 * // Handle API responses
 * try {
 *   const data = await handleApiResponse<User>(response);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     if (error.isAuthError()) {
 *       // Redirect to login
 *     } else if (error.isValidationError()) {
 *       // Show field errors
 *       console.log(error.getFieldErrors());
 *     }
 *   }
 * }
 * 
 * // Retry with backoff
 * const data = await retryWithBackoff(() => fetchData(), 3, 1000);
 * ```
 */

export interface RFC7807Error {
  type?: string; // URI reference identifying the problem type
  title?: string; // Short, human-readable summary
  status?: number; // HTTP status code
  detail?: string; // Human-readable explanation
  instance?: string; // URI reference identifying the specific occurrence
  errors?: Array<{ field: string; message: string }>; // Validation errors
  [key: string]: any; // Additional extension members
}

export class ApiError extends Error {
  public type?: string;
  public title: string;
  public status?: number;
  public detail?: string;
  public instance?: string;
  public errors?: Array<{ field: string; message: string }>;
  public retryAfter?: number;
  public traceId?: string;
  
  [key: string]: any; // Allow custom extension fields

  constructor(errorData: RFC7807Error) {
    const message = errorData.detail || errorData.title || 'Unknown error';
    super(message);
    
    this.name = 'ApiError';
    this.type = errorData.type;
    this.title = errorData.title || 'Unknown Error';
    this.status = errorData.status;
    this.detail = errorData.detail;
    this.instance = errorData.instance;
    this.errors = errorData.errors;

    // Preserve custom extension fields
    Object.keys(errorData).forEach(key => {
      if (!['type', 'title', 'status', 'detail', 'instance', 'errors'].includes(key)) {
        this[key] = errorData[key];
      }
    });

    // Maintain proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Get user-friendly error message for display
   */
  getUserMessage(): string {
    if (this.detail) {
      return `${this.title}: ${this.detail}`;
    }
    return this.title;
  }

  /**
   * Get formatted field error messages
   */
  getFieldErrors(): string[] {
    if (!this.errors || this.errors.length === 0) {
      return [];
    }
    return this.errors.map(err => `${err.field}: ${err.message}`);
  }

  /**
   * Check if error is retryable based on status code
   */
  isRetryable(): boolean {
    if (!this.status) return false;
    
    // Retryable status codes
    const retryableStatuses = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];
    
    return retryableStatuses.includes(this.status);
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /**
   * Get retry delay in seconds (if specified in retryAfter)
   */
  getRetryDelay(): number | null {
    return this.retryAfter ?? null;
  }
}

/**
 * Parse RFC 7807 error response
 */
export function parseRFC7807Error(response: any): ApiError {
  if (!response) {
    return new ApiError({ title: 'Unknown Error' });
  }

  // Handle RFC 7807 format
  if (response.title || response.type) {
    return new ApiError(response);
  }

  // Handle legacy error formats
  const legacyError: RFC7807Error = {
    title: response.error || response.title || 'Unknown Error',
    detail: response.message || response.detail,
    status: response.status || response.statusCode,
    errors: response.errors,
  };

  // Preserve all fields
  Object.keys(response).forEach(key => {
    if (!['error', 'message', 'statusCode'].includes(key)) {
      legacyError[key] = response[key];
    }
  });

  return new ApiError(legacyError);
}

/**
 * Handle HTTP response and parse errors
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  // Handle non-JSON responses
  if (!contentType || !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError({
        title: 'Invalid Response',
        status: response.status,
        detail: `Expected JSON response but got ${contentType || 'unknown content type'}`,
      });
    }
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw parseRFC7807Error(data);
  }

  return data;
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry on non-retryable errors
      if (error instanceof ApiError && !error.isRetryable()) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      
      // Use retryAfter if specified
      const retryDelay = error instanceof ApiError && error.retryAfter 
        ? error.retryAfter * 1000 
        : delay;

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError!;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): Record<string, any> {
  if (error instanceof ApiError) {
    return {
      name: error.name,
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
      instance: error.instance,
      errors: error.errors,
      traceId: error.traceId,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { error: String(error) };
}
