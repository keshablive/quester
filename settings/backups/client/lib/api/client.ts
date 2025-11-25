import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getAuthToken, 
  refreshToken as refreshAuthToken, 
  logoutGracefully, // T314: Graceful logout on refresh failure
} from './auth';
import { handleApiResponse, ApiError } from '../utils/error-handler';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const TOKEN_KEY = '@quester_auth_token';

/**
 * T307: Add 401 interceptor to API client
 * T308: Add retry logic with exponential backoff
 */
class ApiClient {
  public baseURL: string;
  private token: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private async loadToken() {
    try {
      // Try SecureStore first (from auth.ts implementation)
      this.token = await getAuthToken();
      
      // Fallback to AsyncStorage for backward compatibility
      if (!this.token) {
        this.token = await AsyncStorage.getItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  public async setToken(token: string) {
    this.token = token;
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save auth token:', error);
    }
  }

  public async clearToken() {
    this.token = null;
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  /**
   * Handle 401 response with automatic token refresh
   * T314: Use graceful logout if refresh fails
   */
  private async handle401(): Promise<void> {
    // If already refreshing, wait for it to complete
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    // Start refresh process
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await refreshAuthToken();
        
        if (response.data?.access_token) {
          this.token = response.data.access_token;
          // Token is stored by refreshAuthToken function
        }
      } catch (error) {
        // T314: Gracefully logout when refresh token expires
        // This clears all auth data and provides user-friendly feedback
        await logoutGracefully('Session expired. Please log in again.');
        
        // Re-throw with user-friendly error message
        throw new ApiError({
          title: 'Session Expired',
          status: 401,
          detail: 'Your session has expired. Please log in again.',
        });
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    await this.refreshPromise;
  }

  private async request<T = any>(
    endpoint: string,
    options: (RequestInit & { params?: Record<string, any> }) = {},
    retryCount: number = 0
  ): Promise<T> {
    // Build URL and append query params if provided
    const urlBase = `${this.baseURL}${endpoint}`;
    const url = options.params
      ? `${urlBase}?${new URLSearchParams(options.params as Record<string, string>).toString()}`
      : urlBase;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Reload token if needed
    if (!this.token) {
      await this.loadToken();
    }

    // Add authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const fetchOptions: RequestInit = { ...(options as RequestInit), headers };
      // Remove params prop if present (not part of RequestInit)
      if ((fetchOptions as any).params) delete (fetchOptions as any).params;

      const response = await fetch(url, fetchOptions);

      // Handle 401 with automatic token refresh (T307)
      if (response.status === 401 && retryCount === 0) {
        await this.handle401();
        // Retry the request with new token
        return this.request(endpoint, options, retryCount + 1);
      }

  // Parse response and handle errors. The helper returns the parsed JSON body
  // which we return directly as T so callers receive the expected shapes.
  const parsed = await handleApiResponse<any>(response);
  return parsed as T;
    } catch (error) {
      // Retry on network errors with exponential backoff (T308)
      if (error instanceof ApiError) {
        if (error.isRetryable() && retryCount < 3) {
          const delay = 1000 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request(endpoint, options, retryCount + 1);
        }
        throw error;
      }

      // Handle network errors
      if (error instanceof Error && retryCount < 3) {
        const delay = 1000 * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  public async get<T = any>(endpoint: string, options: { params?: Record<string, any>; headers?: Record<string, string> } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params: options.params,
      headers: options.headers,
    });
  }

  public async post<T = any>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: options?.headers,
    });
  }

  public async put<T = any>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: options?.headers,
    });
  }

  public async patch<T = any>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: options?.headers,
    });
  }

  public async delete<T = any>(endpoint: string, options?: { headers?: Record<string, string> }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: options?.headers,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
