/**
 * Authentication API Client
 * 
 * DEPRECATED: This file is maintained for backward compatibility.
 * All exports are now located in the lib/api/auth/ folder.
 * 
 * New code should import from '@/lib/api/auth' directly.
 * 
 * @deprecated Use '@/lib/api/auth' instead
 * @module lib/api/auth
 */

// Re-export everything from the auth folder for backward compatibility
export * from './auth';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const API_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second
const DEFAULT_TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID || '';

// Response Types
export interface SignupResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      tenant_id: string;
      email: string;
      username: string;
      role: string;
      xp: number;
      level: number;
      tier: string;
      login_streak: number;
      last_login: string | null;
      created_at: string;
      updated_at: string;
    };
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      tenant_id: string;
      email: string;
      username: string;
      role: string;
      xp: number;
      level: number;
      tier: string;
      login_streak: number;
      last_login: string;
      created_at: string;
      updated_at: string;
    };
    access_token: string;
    refresh_token: string;
    expires_in: number;
    trust_token?: string; // Optional trust token for device trust
  };
  requires_2fa?: boolean; // Indicates 2FA is required
}

export interface RefreshResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

export interface SocialAuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      tenant_id: string;
      email: string;
      username: string;
      role: string;
      xp: number;
      level: number;
      tier: string;
      login_streak: number;
      last_login: string | null;
      created_at: string;
      updated_at: string;
    };
    access_token: string;
    refresh_token: string;
    expires_in: number;
    is_new_user: boolean; // True if account was just created
  };
}

export interface LinkSocialAccountResponse {
  success: boolean;
  message: string;
  provider: string;
}

export interface UnlinkSocialAccountResponse {
  success: boolean;
  message: string;
  provider: string;
}

export interface Enable2FAResponse {
  success: boolean;
  data: {
    secret: string;          // Base32 encoded secret
    qr_code_url: string;     // otpauth:// URL for QR code
    backup_codes: string[];  // 10 single-use backup codes
  };
}

export interface Verify2FAResponse {
  success: boolean;
  message: string;
}

export interface Disable2FAResponse {
  success: boolean;
  message: string;
}

export interface Validate2FACodeResponse {
  success: boolean;
  valid: boolean;
}

export interface GetTrustedDevicesResponse {
  success: boolean;
  data: {
    devices: Array<{
      id: string;
      name: string;
      device_type: string;   // 'mobile', 'desktop', 'tablet', 'web'
      last_used: string;
      created_at: string;
      is_current: boolean;
    }>;
  };
}

export interface RevokeTrustedDeviceResponse {
  success: boolean;
  message: string;
}

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Helper: Exponential backoff delay
const getRetryDelay = (attempt: number): number => {
  return RETRY_DELAY_BASE * Math.pow(2, attempt);
};

// Helper: Sleep utility
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper: Parse error response
const parseErrorResponse = (status: number, body: any): Error => {
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

// Helper: Make HTTP request with retry logic
const makeRequest = async <T>(
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
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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

/**
 * AuthAPI Class
 * 
 * Provides methods for authentication operations.
 */
export class AuthAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Sign up a new user
   * 
   * @param email - User's email address
   * @param password - User's password (min 8 chars, uppercase, lowercase, number, special)
   * @param username - User's display name
   * @param tenantId - Tenant ID (organization identifier). If not provided, auto-resolves from subdomain
   * @returns SignupResponse with user data and tokens
   * @throws ValidationError - Invalid input data (400)
   * @throws ApiError - Duplicate email (409) or other errors
   * @throws RateLimitError - Rate limit exceeded (429)
   * @throws NetworkError - Network or timeout errors
   */
  async signup(
    email: string,
    password: string,
    username: string,
    tenantId?: string
  ): Promise<SignupResponse> {
    // Auto-resolve tenant_id from subdomain if not provided
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      resolvedTenantId = await getTenantIdFromSubdomain() || undefined;

      if (!resolvedTenantId) {
        throw new ValidationError(
          'Tenant ID is required. Please provide a tenant_id or ensure subdomain is correctly configured.',
          { tenant_id: ['Tenant ID is required'] }
        );
      }
    }

    const url = `${this.baseUrl}/api/v1/auth/signup`;

    return makeRequest<SignupResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        username,
        tenant_id: resolvedTenantId,
      }),
    });
  }

  /**
   * Log in an existing user
   * 
   * @param email - User's email address
   * @param password - User's password
   * @param twoFactorCode - Optional 2FA code (6-digit TOTP or 8-char backup code)
   * @param trustDevice - Whether to trust this device (skip 2FA for 30 days)
   * @param deviceFingerprint - Device identifier for trust
   * @param deviceName - User-friendly device name
   * @param deviceType - Device type: 'mobile', 'desktop', 'tablet', 'web'
   * @param trustToken - Trust token from previous login (passed as header)
   * @param tenantId - Optional tenant ID (auto-resolves from subdomain if not provided)
   * @returns LoginResponse with user data and tokens, or requires_2fa flag
   * @throws ApiError - Invalid credentials (401) or invalid 2FA code (401)
   * @throws RateLimitError - Rate limit exceeded (429)
   * @throws NetworkError - Network or timeout errors
   */
  async login(
    email: string,
    password: string,
    twoFactorCode?: string,
    trustDevice?: boolean,
    deviceFingerprint?: string,
    deviceName?: string,
    deviceType?: 'mobile' | 'desktop' | 'tablet' | 'web',
    trustToken?: string,
    tenantId?: string
  ): Promise<LoginResponse> {
    // Auto-resolve tenant_id from subdomain if not provided
    // Note: For login, tenant_id might not be strictly required by backend
    // as it can lookup user by email. However, including it improves security
    // and performance by allowing tenant-scoped queries.
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      resolvedTenantId = await getTenantIdFromSubdomain() || undefined;
    }

    const url = `${this.baseUrl}/api/v1/auth/login`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Include trust token in headers if provided
    if (trustToken) {
      headers['X-Trust-Token'] = trustToken;
    }
    if (deviceFingerprint) {
      headers['X-Device-Fingerprint'] = deviceFingerprint;
    }
    // Include tenant_id in header if resolved (optional optimization)
    if (resolvedTenantId) {
      headers['X-Tenant-ID'] = resolvedTenantId;
    }

    const body: any = {
      email,
      password,
    };

    // Include optional 2FA fields
    if (twoFactorCode) {
      body.two_factor_code = twoFactorCode;
    }
    if (trustDevice !== undefined) {
      body.trust_device = trustDevice;
    }
    if (deviceFingerprint) {
      body.device_fingerprint = deviceFingerprint;
    }
    if (deviceName) {
      body.device_name = deviceName;
    }
    if (deviceType) {
      body.device_type = deviceType;
    }

    return makeRequest<LoginResponse>(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Refresh access token using refresh token
   * 
   * @param refreshToken - Current refresh token
   * @returns RefreshResponse with new tokens
   * @throws ApiError - Invalid/expired/revoked token (401)
   * @throws RateLimitError - Rate limit exceeded (429)
   * @throws NetworkError - Network or timeout errors
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const url = `${this.baseUrl}/api/v1/auth/refresh`;

    return makeRequest<RefreshResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });
  }

  /**
   * Log out from current device (revoke single refresh token)
   * 
   * @param accessToken - Current access token
   * @param refreshToken - Current refresh token to revoke
   * @returns LogoutResponse
   * @throws ApiError - Invalid token (401)
   * @throws NetworkError - Network or timeout errors
   */
  async logout(
    accessToken: string,
    refreshToken: string
  ): Promise<LogoutResponse> {
    const url = `${this.baseUrl}/api/v1/auth/logout`;

    return makeRequest<LogoutResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });
  }

  /**
   * Log out from all devices (revoke all user's refresh tokens)
   * 
   * @param accessToken - Current access token
   * @returns LogoutResponse with count of revoked tokens
   * @throws ApiError - Invalid token (401)
   * @throws NetworkError - Network or timeout errors
   */
  async logoutAll(accessToken: string): Promise<LogoutResponse> {
    const url = `${this.baseUrl}/api/v1/auth/logout-all`;

    return makeRequest<LogoutResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Request password reset email
   * 
   * @param email - User's email address
   * @returns ForgotPasswordResponse
   * @throws ValidationError - Invalid email format (400)
   * @throws ApiError - Email not found (404)
   * @throws RateLimitError - Rate limit exceeded (429)
   * @throws NetworkError - Network or timeout errors
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const url = `${this.baseUrl}/api/v1/auth/forgot-password`;

    return makeRequest<ForgotPasswordResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
      }),
    });
  }

  /**
   * Reset password with verification code
   * 
   * @param email - User's email address
   * @param code - Verification code from email
   * @param newPassword - New password (min 8 chars, uppercase, lowercase, number, special)
   * @returns ResetPasswordResponse
   * @throws ValidationError - Invalid password format (400)
   * @throws ApiError - Invalid/expired code (401)
   * @throws RateLimitError - Rate limit exceeded (429)
   * @throws NetworkError - Network or timeout errors
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<ResetPasswordResponse> {
    const url = `${this.baseUrl}/api/v1/auth/reset-password`;

    return makeRequest<ResetPasswordResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        new_password: newPassword,
      }),
    });
  }

  /**
   * Verify email address with code
   * 
   * @param email - User's email address
   * @param code - Verification code from email
   * @returns VerifyEmailResponse
   * @throws ApiError - Invalid/expired code (401)
   * @throws RateLimitError - Rate limit exceeded (429)
   * @throws NetworkError - Network or timeout errors
   */
  async verifyEmail(email: string, code: string): Promise<VerifyEmailResponse> {
    const url = `${this.baseUrl}/api/v1/auth/verify-email`;

    return makeRequest<VerifyEmailResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });
  }

  /**
   * Resend email verification code
   * 
   * @param email - User's email address
   * @returns ResendVerificationResponse
   * @throws ValidationError - Invalid email format (400)
   * @throws ApiError - Email not found or already verified (404)
   * @throws RateLimitError - Rate limit exceeded (429)
   * @throws NetworkError - Network or timeout errors
   */
  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    const url = `${this.baseUrl}/api/v1/auth/resend-verification`;

    return makeRequest<ResendVerificationResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
      }),
    });
  }

  /**
   * Authenticate with Google OAuth token
   * 
   * @param idToken - Google ID token from Google Sign-In
   * @param tenantId - Tenant ID (organization identifier)
   * @returns SocialAuthResponse with user data and tokens
   * @throws ApiError - Invalid token or authentication failed
   * @throws NetworkError - Network or timeout errors
   */
  async loginWithGoogle(idToken: string, tenantId: string): Promise<SocialAuthResponse> {
    const url = `${this.baseUrl}/api/v1/auth/google`;

    return makeRequest<SocialAuthResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_token: idToken,
        tenant_id: tenantId,
      }),
    });
  }

  /**
   * Authenticate with Apple ID token
   * 
   * @param identityToken - Apple identity token from Sign in with Apple
   * @param tenantId - Tenant ID (organization identifier)
   * @returns SocialAuthResponse with user data and tokens
   * @throws ApiError - Invalid token or authentication failed
   * @throws NetworkError - Network or timeout errors
   */
  async loginWithApple(
    identityToken: string,
    tenantId: string
  ): Promise<SocialAuthResponse> {
    const url = `${this.baseUrl}/api/v1/auth/apple`;

    return makeRequest<SocialAuthResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity_token: identityToken,
        tenant_id: tenantId,
      }),
    });
  }

  /**
   * Authenticate with Facebook OAuth token
   * 
   * @param accessToken - Facebook access token
   * @param tenantId - Tenant ID (organization identifier)
   * @returns SocialAuthResponse with user data and tokens
   * @throws ApiError - Invalid token or authentication failed
   * @throws NetworkError - Network or timeout errors
   */
  async loginWithFacebook(accessToken: string, tenantId: string): Promise<SocialAuthResponse> {
    const url = `${this.baseUrl}/api/v1/auth/facebook`;

    return makeRequest<SocialAuthResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        tenant_id: tenantId,
      }),
    });
  }

  /**
   * Link a social account to existing user account
   * 
   * @param accessToken - Current user's access token
   * @param provider - Social provider ('google', 'apple', 'facebook')
   * @param providerToken - Token from social provider
   * @returns LinkSocialAccountResponse
   * @throws ApiError - Invalid token or account already linked (409)
   * @throws NetworkError - Network or timeout errors
   */
  async linkSocialAccount(
    accessToken: string,
    provider: 'google' | 'apple' | 'facebook',
    providerToken: string
  ): Promise<LinkSocialAccountResponse> {
    const url = `${this.baseUrl}/api/v1/auth/link-social`;

    return makeRequest<LinkSocialAccountResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        provider,
        provider_token: providerToken,
      }),
    });
  }

  /**
   * Unlink a social account from user account
   * 
   * @param accessToken - Current user's access token
   * @param provider - Social provider to unlink ('google', 'apple', 'facebook')
   * @returns UnlinkSocialAccountResponse
   * @throws ApiError - Provider not linked (404) or cannot unlink last auth method (400)
   * @throws NetworkError - Network or timeout errors
   */
  async unlinkSocialAccount(
    accessToken: string,
    provider: 'google' | 'apple' | 'facebook'
  ): Promise<UnlinkSocialAccountResponse> {
    const url = `${this.baseUrl}/api/v1/auth/unlink-social`;

    return makeRequest<UnlinkSocialAccountResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        provider,
      }),
    });
  }

  /**
   * Enable Two-Factor Authentication (2FA)
   * Generates a TOTP secret and returns QR code URL + backup codes
   * 
   * @param accessToken - Current user's access token
   * @returns Enable2FAResponse with secret, QR code URL, and backup codes
   * @throws ApiError - 2FA already enabled (409) or invalid token (401)
   * @throws NetworkError - Network or timeout errors
   */
  async enable2FA(accessToken: string): Promise<Enable2FAResponse> {
    const url = `${this.baseUrl}/api/v1/auth/2fa/enable`;

    return makeRequest<Enable2FAResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Verify and activate 2FA with TOTP code
   * Must be called after enable2FA to confirm setup
   * 
   * @param accessToken - Current user's access token
   * @param code - 6-digit TOTP code from authenticator app
   * @returns Verify2FAResponse
   * @throws ApiError - Invalid code (401) or 2FA not in setup mode (400)
   * @throws NetworkError - Network or timeout errors
   */
  async verify2FA(accessToken: string, code: string): Promise<Verify2FAResponse> {
    const url = `${this.baseUrl}/api/v1/auth/2fa/verify`;

    return makeRequest<Verify2FAResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        code,
      }),
    });
  }

  /**
   * Disable Two-Factor Authentication
   * Requires current password or TOTP code for security
   * 
   * @param accessToken - Current user's access token
   * @param password - Current password OR 2FA code
   * @returns Disable2FAResponse
   * @throws ApiError - Invalid password/code (401) or 2FA not enabled (400)
   * @throws NetworkError - Network or timeout errors
   */
  async disable2FA(accessToken: string, password: string): Promise<Disable2FAResponse> {
    const url = `${this.baseUrl}/api/v1/auth/2fa/disable`;

    return makeRequest<Disable2FAResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        password,
      }),
    });
  }

  /**
   * Validate a 2FA code (TOTP or backup code)
   * Used during login when 2FA is enabled
   * 
   * @param email - User's email address
   * @param code - 6-digit TOTP code or backup code
   * @returns Validate2FACodeResponse
   * @throws ApiError - Invalid code (401) or user not found (404)
   * @throws NetworkError - Network or timeout errors
   */
  async validate2FACode(email: string, code: string): Promise<Validate2FACodeResponse> {
    const url = `${this.baseUrl}/api/v1/auth/2fa/validate`;

    return makeRequest<Validate2FACodeResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });
  }

  /**
   * Get list of trusted devices
   * Shows all devices where user is logged in
   * 
   * @param accessToken - Current user's access token
   * @returns GetTrustedDevicesResponse with list of devices
   * @throws ApiError - Invalid token (401)
   * @throws NetworkError - Network or timeout errors
   */
  async getTrustedDevices(accessToken: string): Promise<GetTrustedDevicesResponse> {
    const url = `${this.baseUrl}/api/v1/auth/devices`;

    return makeRequest<GetTrustedDevicesResponse>(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Revoke a trusted device
   * Logs out the device and removes it from trusted list
   * 
   * @param accessToken - Current user's access token
   * @param deviceId - Device ID to revoke
   * @returns RevokeTrustedDeviceResponse
   * @throws ApiError - Device not found (404) or invalid token (401)
   * @throws NetworkError - Network or timeout errors
   */
  async revokeTrustedDevice(accessToken: string, deviceId: string): Promise<RevokeTrustedDeviceResponse> {
    const url = `${this.baseUrl}/api/v1/auth/devices/${deviceId}`;

    return makeRequest<RevokeTrustedDeviceResponse>(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}

// Export singleton instance
export const authAPI = new AuthAPI();

/**
 * T304: Get auth token from SecureStore
 * 
 * Retrieves the authentication token from secure storage.
 * Supports both access token and refresh token retrieval.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TENANT_ID_KEY = 'tenant_id';

// Helper function to reliably detect web platform
const isWeb = (): boolean => {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return true;
    }
    // Fallback to Platform.OS check
    return Platform.OS === 'web';
  } catch {
    // If Platform is not available, assume we're on web if window exists
    return typeof window !== 'undefined';
  }
};

export async function getAuthToken(tokenType: 'auth_token' | 'refresh_token' = 'auth_token'): Promise<string | null> {
  try {
    const key = tokenType === 'refresh_token' ? REFRESH_TOKEN_KEY : AUTH_TOKEN_KEY;
    if (isWeb()) {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Failed to get ${tokenType}:`, error);
    return null;
  }
}

export async function setAuthToken(accessToken: string, refreshToken: string): Promise<void> {
  try {
    if (isWeb()) {
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } else {
      await Promise.all([
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);
    }
  } catch (error) {
    console.error('Failed to store tokens:', error);
    throw error;
  }
}

export async function clearAuthTokens(): Promise<void> {
  try {
    if (isWeb()) {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, TENANT_ID_KEY]);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(TENANT_ID_KEY),
      ]);
    }
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

/**
 * T314: Graceful logout when refresh token expires
 * Clears all auth data and provides user-friendly feedback
 * 
 * @param reason - Optional reason for logout (default: 'Session expired')
 * @returns Promise that resolves when logout is complete
 */
export async function logoutGracefully(reason: string = 'Session expired'): Promise<void> {
  try {
    // Step 1: Clear tokens from SecureStore
    await clearAuthTokens();

    // Step 2: Clear user data from AsyncStorage
    await AsyncStorage.multiRemove([
      '@quester_user',
      '@quester_auth_token', // Fallback token storage
      '@quester_tenant_id',
    ]);

    // Step 3: Log the logout event for debugging
    console.log(`Graceful logout triggered: ${reason}`);

    // Note: Navigation to login screen is handled by the caller
    // (typically the 401 interceptor in client.ts or a React component)
    // This keeps the auth module decoupled from navigation/routing
  } catch (error) {
    console.error('Error during graceful logout:', error);
    // Even if cleanup fails, we should still proceed with logout
    // to avoid leaving the user in a broken state
  }
}

/**
 * T305: Refresh token with auto-retry
 * 
 * Refreshes the access token using the refresh token.
 * Implements exponential backoff on network errors.
 */
export async function refreshToken(retryCount = 0): Promise<RefreshResponse> {
  const refreshTokenValue = await getAuthToken('refresh_token');

  if (!refreshTokenValue) {
    throw new Error('No refresh token available');
  }

  const maxRetries = MAX_RETRY_ATTEMPTS;
  const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid response from refresh endpoint: ${response.statusText}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Token refresh failed');
    }

    // Store new tokens
    if (data.data?.access_token && data.data?.refresh_token) {
      await setAuthToken(data.data.access_token, data.data.refresh_token);
    }

    return data as RefreshResponse;
  } catch (error) {
    // Retry on network errors
    if (retryCount < maxRetries && error instanceof Error &&
      (error.message.includes('Network') || error.message.includes('fetch'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return refreshToken(retryCount + 1);
    }
    throw error;
  }
}

/**
 * T306: Get tenant ID from subdomain
 * 
 * Extracts tenant identifier from URL subdomain or query parameter.
 * Supports:
 * - Subdomain: https://acme.quester.app → "acme"
 * - Query param: http://localhost:8080?tenant=acme → "acme"
 * - Default: https://quester.app → "default"
 */
export function getTenantId(url?: string): string {
  try {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    if (!targetUrl) {
      return 'default';
    }

    // Parse URL
    let parsedUrl: URL;
    try {
      // Try with protocol
      parsedUrl = new URL(targetUrl.includes('://') ? targetUrl : `https://${targetUrl}`);
    } catch {
      return 'default';
    }

    // Check query parameter first (for localhost development)
    const tenantParam = parsedUrl.searchParams.get('tenant');
    if (tenantParam) {
      return tenantParam.toLowerCase();
    }

    // Extract subdomain
    const hostname = parsedUrl.hostname;
    const parts = hostname.split('.');

    // Root domain or www (quester.app or www.quester.app)
    if (parts.length <= 2 || parts[0] === 'www') {
      return 'default';
    }

    // Extract first subdomain (acme.quester.app or acme.staging.quester.app)
    return parts[0].toLowerCase();
  } catch (error) {
    console.error('Failed to extract tenant ID:', error);
    return 'default';
  }
}

export async function setTenantId(tenantId: string): Promise<void> {
  try {
    if (isWeb()) {
      await AsyncStorage.setItem(TENANT_ID_KEY, tenantId);
    } else {
      await SecureStore.setItemAsync(TENANT_ID_KEY, tenantId);
    }
  } catch (error) {
    console.error('Failed to store tenant ID:', error);
  }
}

export async function getStoredTenantId(): Promise<string | null> {
  try {
    if (isWeb()) {
      return await AsyncStorage.getItem(TENANT_ID_KEY);
    }
    return await SecureStore.getItemAsync(TENANT_ID_KEY);
  } catch (error) {
    console.error('Failed to get tenant ID:', error);
    return null;
  }
}
