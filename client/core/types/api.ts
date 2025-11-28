/**
 * API Type Definitions
 * 
 * Types for API requests, responses, and error handling.
 * 
 * @example
 * ```tsx
 * import { ApiResponse, ApiError, PaginatedResponse } from '@/core/types';
 * 
 * async function fetchUsers(): Promise<ApiResponse<User[]>> {
 *   const response = await fetch('/api/users');
 *   return response.json();
 * }
 * ```
 */

/**
 * Standard API response wrapper
 * 
 * @template T - The type of data returned
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Optional success message */
  message?: string;
  /** Optional metadata */
  meta?: Record<string, any>;
}

/**
 * API error response
 */
export interface ApiError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  statusCode?: number;
  /** Validation errors by field */
  details?: Record<string, string[]>;
  /** Error stack trace (development only) */
  stack?: string;
}

/**
 * Paginated API response
 * 
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T = any> {
  /** Array of items for current page */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number (1-indexed) */
    page: number;
    /** Items per page */
    pageSize: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there are more pages */
    hasMore: boolean;
    /** Next page number (null if last page) */
    nextPage: number | null;
    /** Previous page number (null if first page) */
    prevPage: number | null;
  };
}

/**
 * Query parameters for paginated requests
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  order?: 'asc' | 'desc';
  /** Search query */
  search?: string;
}

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  /** Request method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Query parameters */
  params?: Record<string, any>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials */
  credentials?: 'include' | 'omit' | 'same-origin';
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * API client interface
 */
export interface ApiClient {
  get<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
}
