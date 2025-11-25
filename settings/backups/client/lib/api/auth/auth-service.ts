/**
 * Authentication Service
 * 
 * Main AuthAPI class providing methods for authentication operations.
 * 
 * @module lib/api/auth/auth-service
 */

import {
  SignupResponse,
  LoginResponse,
  RefreshResponse,
  LogoutResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
  SocialAuthResponse,
  LinkSocialAccountResponse,
  UnlinkSocialAccountResponse,
  Enable2FAResponse,
  Verify2FAResponse,
  Disable2FAResponse,
  Validate2FACodeResponse,
  GetTrustedDevicesResponse,
  RevokeTrustedDeviceResponse,
  ValidationError,
} from './types';
import { API_BASE_URL, makeRequest, getTenantIdFromSubdomain } from './helpers';

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
