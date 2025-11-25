/**
 * Authentication API Helpers
 * 
 * Helper functions for retry logic, tenant resolution, and HTTP requests.
 * 
 * @module lib/api/auth/helpers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  NetworkError,
  ValidationError,
  RateLimitError,
} from './types';

// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
export const API_TIMEOUT = 10000; // 10 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_BASE = 1000; // 1 second
export const DEFAULT_TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID || '';

/**
 * Calculate exponential backoff delay
 * 
 * @param attempt - Current retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export const getRetryDelay = (attempt: number): number => {
  return RETRY_DELAY_BASE * Math.pow(2, attempt);
};

/**
 * Sleep utility for async delays
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Parse error response into appropriate Error type
 * 
 * @param status - HTTP status code
 * @param body - Response body
 * @returns Typed Error instance
 */
export const parseErrorResponse = (status: number, body: any): Error => {
  const message = body?.message || body?.error || 'An error occurred';
  const code = body?.code;

  // Rate limit error
  if (status === 429) {
    const retryAfter = body?.retry_after;
    return new RateLimitError(message, retryAfter);
  }

  // Validation error
  if (status === 400 && body?.fields) {
    return new ValidationError(message, body.fields);
  }

  // Generic API error
  return new ApiError(message, status, code);
};

/**
 * Make HTTP request with retry logic and timeout
 * 
 * Implements exponential backoff for 5xx errors and timeouts.
 * 
 * @param url - Full URL to request
 * @param options - Fetch options
 * @param retryAttempt - Current retry attempt (internal)
 * @returns Parsed response body
 * @throws {NetworkError} On timeout or network failure
 * @throws {ApiError} On 4xx/5xx responses
 * @throws {ValidationError} On 400 with field errors
 * @throws {RateLimitError} On 429 responses
 */
export const makeRequest = async <T>(
  url: string,
  options: RequestInit,
  retryAttempt: number = 0
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response body
    const contentType = response.headers.get('content-type');
    let body: any;

    if (contentType?.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      const error = parseErrorResponse(response.status, body);

      // Retry on network errors (5xx) or timeout
      if (
        (response.status >= 500 || response.status === 408) &&
        retryAttempt < MAX_RETRY_ATTEMPTS
      ) {
        const delay = getRetryDelay(retryAttempt);
        console.log(`[AuthAPI] Retrying request (attempt ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS}) after ${delay}ms`);
        await sleep(delay);
        return makeRequest<T>(url, options, retryAttempt + 1);
      }

      throw error;
    }

    return body as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('Request timeout', error);
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Network request failed', error);
    }

    // Re-throw API errors
    throw error;
  }
};

/**
 * Get tenant ID from subdomain
 * 
 * Extracts the subdomain from the current hostname and resolves it to a tenant_id.
 * Falls back to environment variable for localhost/development environments.
 * 
 * @returns Tenant ID string, or null if unable to determine
 * 
 * @example
 * // On acme.quester.com → returns tenant_id for "acme"
 * // On localhost → returns EXPO_PUBLIC_TENANT_ID from env
 * // On quester.com (no subdomain) → returns DEFAULT_TENANT_ID
 */
export const getTenantIdFromSubdomain = async (): Promise<string | null> => {
  try {
    // Check if we're in a web environment
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;

      // Localhost or IP address - use environment variable
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
      ) {
        return DEFAULT_TENANT_ID || null;
      }

      // Extract subdomain from hostname
      // Example: acme.quester.com → ["acme", "quester", "com"]
      const parts = hostname.split('.');

      // Need at least 3 parts for subdomain (subdomain.domain.tld)
      if (parts.length >= 3) {
        const subdomain = parts[0];

        // TODO: In Phase 2, implement actual subdomain → tenant_id lookup
        // This could be:
        // 1. API call: GET /api/v1/tenants/resolve?subdomain=acme
        // 2. Local config file mapping
        // 3. AsyncStorage cached mapping

        // For now, return the subdomain as-is (assuming subdomain = tenant_id)
        // In production, this should be replaced with actual lookup logic
        return subdomain;
      }

      // No subdomain found (e.g., quester.com)
      return DEFAULT_TENANT_ID || null;
    }

    // Mobile environment (React Native) - check AsyncStorage
    if (typeof require !== 'undefined') {
      try {
        // Dynamically import AsyncStorage only in mobile context
        const storedTenantId = await AsyncStorage.getItem('tenant_id');

        if (storedTenantId) {
          return storedTenantId;
        }
      } catch (error) {
        // AsyncStorage not available or error reading
        console.warn('[AuthAPI] AsyncStorage not available:', error);
      }
    }

    // Fallback to environment variable
    return DEFAULT_TENANT_ID || null;
  } catch (error) {
    console.error('[AuthAPI] Error resolving tenant ID from subdomain:', error);
    return DEFAULT_TENANT_ID || null;
  }
};
