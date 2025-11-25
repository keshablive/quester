/**
 * Authentication API Types
 * 
 * Type definitions for authentication responses, errors, and data structures.
 * 
 * @module lib/api/auth/types
 */

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
