/**
 * Secure Credentials Storage
 * Feature: 014-auth-api-integration / US7
 *
 * @description Securely stores and retrieves user credentials for biometric login.
 * Uses expo-secure-store which leverages:
 * - iOS: Keychain Services
 * - Android: EncryptedSharedPreferences (API 23+) or Keystore
 *
 * Security considerations:
 * - Credentials are encrypted at rest
 * - Accessible only after device unlock
 * - Cleared on biometric disable or logout
 */

import * as SecureStore from 'expo-secure-store';

// ============================================================================
// Types
// ============================================================================

/**
 * Stored credentials structure
 */
export interface StoredCredentials {
  email: string;
  password: string;
  storedAt: string; // ISO timestamp
}

/**
 * Result of credential operations
 */
export interface CredentialResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for biometric credentials
 */
const CREDENTIALS_KEY = 'quester_biometric_credentials';

/**
 * Storage key for biometric enabled flag
 */
const BIOMETRIC_ENABLED_KEY = 'quester_biometric_enabled';

/**
 * Secure store options for maximum security
 */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  // Require device authentication (biometric/passcode) to access
  requireAuthentication: false, // We handle auth separately
  // Use strongest encryption available
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// ============================================================================
// Credential Storage Functions
// ============================================================================

/**
 * Store credentials securely for biometric login
 *
 * @param email - User's email address
 * @param password - User's password (will be encrypted)
 * @returns CredentialResult indicating success or failure
 *
 * @example
 * ```ts
 * const result = await storeCredentials('user@example.com', 'password123');
 * if (result.success) {
 *   // Credentials stored, biometric login ready
 * }
 * ```
 */
export async function storeCredentials(
  email: string,
  password: string
): Promise<CredentialResult> {
  try {
    const credentials: StoredCredentials = {
      email,
      password,
      storedAt: new Date().toISOString(),
    };

    await SecureStore.setItemAsync(
      CREDENTIALS_KEY,
      JSON.stringify(credentials),
      SECURE_OPTIONS
    );

    // Also mark biometric as enabled
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true', SECURE_OPTIONS);

    if (__DEV__) {
      console.log('[SecureCredentials] Credentials stored for:', email);
    }

    return { success: true };
  } catch (error) {
    console.error('[SecureCredentials] Store failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store credentials',
    };
  }
}

/**
 * Retrieve stored credentials for biometric login
 *
 * @returns StoredCredentials or null if not found/invalid
 *
 * @example
 * ```ts
 * const credentials = await retrieveCredentials();
 * if (credentials) {
 *   await signIn(credentials.email, credentials.password);
 * }
 * ```
 */
export async function retrieveCredentials(): Promise<StoredCredentials | null> {
  try {
    const credentialsJson = await SecureStore.getItemAsync(CREDENTIALS_KEY, SECURE_OPTIONS);

    if (!credentialsJson) {
      if (__DEV__) {
        console.log('[SecureCredentials] No stored credentials found');
      }
      return null;
    }

    const credentials = JSON.parse(credentialsJson) as StoredCredentials;

    // Validate structure
    if (!credentials.email || !credentials.password) {
      console.warn('[SecureCredentials] Invalid credential structure');
      await clearCredentials();
      return null;
    }

    if (__DEV__) {
      console.log('[SecureCredentials] Retrieved credentials for:', credentials.email);
    }

    return credentials;
  } catch (error) {
    console.error('[SecureCredentials] Retrieve failed:', error);
    return null;
  }
}

/**
 * Clear stored credentials
 * Called on:
 * - Biometric disable
 * - Logout (all devices)
 * - Password change
 *
 * @returns CredentialResult indicating success or failure
 */
export async function clearCredentials(): Promise<CredentialResult> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);

    if (__DEV__) {
      console.log('[SecureCredentials] Credentials cleared');
    }

    return { success: true };
  } catch (error) {
    console.error('[SecureCredentials] Clear failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear credentials',
    };
  }
}

/**
 * Check if biometric login is enabled (credentials stored)
 *
 * @returns boolean indicating if biometric login is configured
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY, SECURE_OPTIONS);
    return enabled === 'true';
  } catch (error) {
    console.error('[SecureCredentials] Check enabled failed:', error);
    return false;
  }
}

/**
 * Update stored password (after password change)
 * Keeps the same email, updates password and timestamp
 *
 * @param newPassword - The new password to store
 * @returns CredentialResult indicating success or failure
 */
export async function updateStoredPassword(newPassword: string): Promise<CredentialResult> {
  try {
    const existingCredentials = await retrieveCredentials();

    if (!existingCredentials) {
      return {
        success: false,
        error: 'No stored credentials to update',
      };
    }

    return await storeCredentials(existingCredentials.email, newPassword);
  } catch (error) {
    console.error('[SecureCredentials] Update password failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password',
    };
  }
}

/**
 * Get the email address associated with stored biometric credentials
 * Useful for showing which account has biometric enabled
 *
 * @returns Email address or null if no credentials stored
 */
export async function getStoredEmail(): Promise<string | null> {
  try {
    const credentials = await retrieveCredentials();
    return credentials?.email ?? null;
  } catch (error) {
    console.error('[SecureCredentials] Get email failed:', error);
    return null;
  }
}

/**
 * Check when credentials were last stored
 * Useful for security policies (e.g., re-authenticate after 30 days)
 *
 * @returns Date or null if no credentials stored
 */
export async function getCredentialAge(): Promise<Date | null> {
  try {
    const credentials = await retrieveCredentials();
    if (!credentials?.storedAt) {
      return null;
    }
    return new Date(credentials.storedAt);
  } catch (error) {
    console.error('[SecureCredentials] Get credential age failed:', error);
    return null;
  }
}
