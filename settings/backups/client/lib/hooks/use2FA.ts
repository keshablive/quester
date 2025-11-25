/**
 * Two-Factor Authentication (2FA) Hook
 * 
 * Provides methods for managing TOTP-based 2FA:
 * - Enable/disable 2FA
 * - Generate QR code for authenticator apps
 * - Verify TOTP codes
 * - Manage backup codes
 */

import { authAPI, type Enable2FAResponse } from '@/lib/api/auth';
import * as React from 'react';

interface Use2FAState {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  secret: string | null;
  qrCodeUrl: string | null;
  backupCodes: string[] | null;
}

interface Use2FAActions {
  enableTwoFactor: (accessToken: string) => Promise<Enable2FAResponse | null>;
  verifyAndActivate: (accessToken: string, code: string) => Promise<boolean>;
  disableTwoFactor: (accessToken: string, password: string) => Promise<boolean>;
  validateCode: (email: string, code: string) => Promise<boolean>;
  clearSetupData: () => void;
}

export type Use2FAReturn = Use2FAState & Use2FAActions;

/**
 * Hook for managing Two-Factor Authentication
 * 
 * @returns 2FA state and actions
 * 
 * @example
 * ```tsx
 * const { enableTwoFactor, isLoading, qrCodeUrl, backupCodes } = use2FA();
 * 
 * // Step 1: Enable 2FA
 * const response = await enableTwoFactor(accessToken);
 * // Display qrCodeUrl in QR code component
 * // Show backupCodes for user to save
 * 
 * // Step 2: User scans QR and enters code from authenticator
 * const success = await verifyAndActivate(accessToken, '123456');
 * ```
 */
export function use2FA(): Use2FAReturn {
  const [state, setState] = React.useState<Use2FAState>({
    isEnabled: false,
    isLoading: false,
    error: null,
    secret: null,
    qrCodeUrl: null,
    backupCodes: null,
  });

  /**
   * Step 1: Enable 2FA and get setup data
   * Returns secret, QR code URL, and backup codes
   * User must scan QR code with authenticator app
   */
  const enableTwoFactor = React.useCallback(
    async (accessToken: string): Promise<Enable2FAResponse | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await authAPI.enable2FA(accessToken);

        // Store setup data in state
        setState((prev) => ({
          ...prev,
          isLoading: false,
          secret: response.data.secret,
          qrCodeUrl: response.data.qr_code_url,
          backupCodes: response.data.backup_codes,
        }));

        return response;
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to enable 2FA';
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return null;
      }
    },
    []
  );

  /**
   * Step 2: Verify TOTP code and activate 2FA
   * Must be called after enableTwoFactor
   * User enters 6-digit code from authenticator app
   */
  const verifyAndActivate = React.useCallback(
    async (accessToken: string, code: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await authAPI.verify2FA(accessToken, code);

        // 2FA is now active
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isEnabled: true,
          // Clear setup data after activation
          secret: null,
          qrCodeUrl: null,
          backupCodes: null,
        }));

        return true;
      } catch (err: any) {
        const errorMessage =
          err.statusCode === 401
            ? 'Invalid code. Please try again.'
            : err.message || 'Failed to verify code';
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return false;
      }
    },
    []
  );

  /**
   * Disable 2FA
   * Requires current password or 2FA code for security
   */
  const disableTwoFactor = React.useCallback(
    async (accessToken: string, password: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await authAPI.disable2FA(accessToken, password);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isEnabled: false,
        }));

        return true;
      } catch (err: any) {
        const errorMessage =
          err.statusCode === 401
            ? 'Invalid password or code. Please try again.'
            : err.message || 'Failed to disable 2FA';
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return false;
      }
    },
    []
  );

  /**
   * Validate a 2FA code during login
   * Used when user has 2FA enabled
   */
  const validateCode = React.useCallback(async (email: string, code: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authAPI.validate2FACode(email, code);

      setState((prev) => ({ ...prev, isLoading: false }));
      return response.valid;
    } catch (err: any) {
      const errorMessage =
        err.statusCode === 401
          ? 'Invalid code. Please try again.'
          : err.message || 'Failed to validate code';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return false;
    }
  }, []);

  /**
   * Clear setup data (if user cancels setup)
   */
  const clearSetupData = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      secret: null,
      qrCodeUrl: null,
      backupCodes: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    enableTwoFactor,
    verifyAndActivate,
    disableTwoFactor,
    validateCode,
    clearSetupData,
  };
}
