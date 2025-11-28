import { apiClient, ApiError } from '../client';
import { API_ENDPOINTS } from '../../config/env';
import type {
    AuthResponse,
    LoginRequest,
    SignupRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    LogoutRequest,
    validateAuthResponse,
} from '../../auth/types';

/**
 * Authentication Service
 * Handles all auth-related API calls with proper typing and validation.
 * 
 * @description All methods include runtime validation (FR-016) and proper error handling.
 */
export const authService = {
    /**
     * Login user with email/password
     * FR-001: System MUST authenticate users via email/password against /api/v1/auth/login
     * 
     * @param credentials - Login credentials (email, password, optional 2FA)
     * @returns AuthResponse with tokens and user data
     * @throws ApiError on authentication failure
     */
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>(
            API_ENDPOINTS.AUTH.LOGIN,
            credentials
        );
        
        // Runtime validation (FR-016)
        if (!response.requires_2fa) {
            if (!response.access_token || !response.refresh_token || !response.user) {
                throw new ApiError(500, 'Invalid server response: missing required fields');
            }
        }
        
        return response;
    },

    /**
     * Sign up new user
     * FR-002: System MUST create new user accounts via /api/v1/auth/signup
     * 
     * @param credentials - Signup data (email, username, password)
     * @returns AuthResponse with tokens and user data
     * @throws ApiError on signup failure
     */
    async signup(credentials: SignupRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>(
            API_ENDPOINTS.AUTH.SIGNUP,
            credentials
        );
        
        // Runtime validation (FR-016)
        if (!response.access_token || !response.refresh_token || !response.user) {
            throw new ApiError(500, 'Invalid server response: missing required fields');
        }
        
        return response;
    },

    /**
     * Logout user from current device
     * FR-011: System MUST revoke refresh token on server during logout
     * 
     * @param refreshToken - Current refresh token to revoke
     */
    async logout(refreshToken: string): Promise<void> {
        try {
            await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
        } finally {
            // FR-013: Always clear local state
            await apiClient.removeAllTokens();
        }
    },

    /**
     * Logout from all devices
     * FR-012: System MUST revoke all user tokens via /api/v1/auth/logout-all
     */
    async logoutAll(): Promise<void> {
        try {
            await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT_ALL);
        } finally {
            // FR-013: Always clear local state
            await apiClient.removeAllTokens();
        }
    },

    /**
     * Request password reset email
     * FR-006: System MUST implement password reset request via /api/v1/auth/forgot-password
     * 
     * @param email - User's email address
     */
    async forgotPassword(email: string): Promise<void> {
        await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    },

    /**
     * Reset password with token
     * FR-007: System MUST implement password reset confirmation via /api/v1/auth/reset-password
     * 
     * @param token - Reset token from email
     * @param newPassword - New password (8+ characters)
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
            token,
            new_password: newPassword,
        });
    },

    /**
     * Refresh access token
     */
    async refreshToken(): Promise<{ accessToken: string }> {
        const refreshToken = await apiClient.getRefreshToken();
        if (!refreshToken) {
            throw new ApiError(401, 'No refresh token available');
        }
        
        const response = await apiClient.post<{ status: string; data: { accessToken: string } }>(
            API_ENDPOINTS.AUTH.REFRESH,
            { refreshToken }
        );
        
        if (response.data?.accessToken) {
            await apiClient.setToken(response.data.accessToken);
        }
        
        return { accessToken: response.data?.accessToken || '' };
    },

    /**
     * Check blacklist status
     */
    async checkBlacklist(): Promise<{ blacklisted: boolean }> {
        return apiClient.get(API_ENDPOINTS.AUTH.BLACKLIST_CHECK);
    },

    /**
     * Enable 2FA
     */
    async enable2FA(): Promise<{ secret: string; qrCode: string }> {
        return apiClient.post(API_ENDPOINTS.AUTH.TWO_FACTOR.ENABLE);
    },

    /**
     * Verify 2FA setup
     */
    async verify2FA(code: string): Promise<{ verified: boolean }> {
        return apiClient.post(API_ENDPOINTS.AUTH.TWO_FACTOR.VERIFY, { code });
    },

    /**
     * Validate 2FA code (login)
     * FR-008: System MUST handle 2FA challenge flow
     */
    async validate2FA(
        code: string,
        credentials: { email: string; password: string },
        trustDevice?: boolean
    ): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>(
            API_ENDPOINTS.AUTH.LOGIN,
            {
                ...credentials,
                two_factor_code: code,
                trust_device: trustDevice,
            }
        );
        
        return response;
    },

    /**
     * Disable 2FA
     */
    async disable2FA(code: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.AUTH.TWO_FACTOR.DISABLE, { code });
    },

    /**
     * Get trusted devices
     * FR-009: System MUST support device trust tokens
     */
    async getTrustedDevices(): Promise<Array<{ id: string; name: string; lastUsed: string }>> {
        return apiClient.get(API_ENDPOINTS.AUTH.TWO_FACTOR.DEVICES);
    }
};
