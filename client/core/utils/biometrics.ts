/**
 * Biometric Authentication Utilities
 * Feature: 014-auth-api-integration / US7
 *
 * @description Utilities for checking biometric availability and authenticating users.
 * Uses expo-local-authentication for cross-platform biometric support.
 *
 * Supported biometrics:
 * - iOS: Face ID, Touch ID
 * - Android: Fingerprint, Face Unlock
 */

import * as LocalAuthentication from 'expo-local-authentication';

// ============================================================================
// Types
// ============================================================================

/**
 * Type of biometric hardware available
 */
export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

/**
 * Result of biometric availability check
 */
export interface BiometricAvailability {
  /** Whether biometric hardware is present */
  isAvailable: boolean;

  /** Whether user has enrolled biometrics (e.g., added a fingerprint) */
  isEnrolled: boolean;

  /** Primary biometric type available */
  biometricType: BiometricType;

  /** Human-readable description of available biometric */
  biometricLabel: string;
}

/**
 * Result of biometric authentication attempt
 */
export interface BiometricAuthResult {
  /** Whether authentication was successful */
  success: boolean;

  /** Error message if authentication failed */
  error?: string;

  /** Whether user cancelled the prompt */
  cancelled?: boolean;

  /** Whether user chose to use passcode fallback */
  usedFallback?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default prompt message shown during biometric auth
 */
const DEFAULT_PROMPT_MESSAGE = 'Authenticate to access your account';

/**
 * Fallback prompt message for passcode entry
 */
const FALLBACK_PROMPT_MESSAGE = 'Use your device passcode';

/**
 * Maximum failed attempts before requiring password login
 */
export const MAX_BIOMETRIC_ATTEMPTS = 3;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map expo biometric types to our simpler enum
 */
function mapBiometricType(types: LocalAuthentication.AuthenticationType[]): BiometricType {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'none';
}

/**
 * Get human-readable label for biometric type
 */
function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case 'face':
      return 'Face ID';
    case 'fingerprint':
      return 'Fingerprint';
    case 'iris':
      return 'Iris Scan';
    default:
      return 'Biometric';
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if biometric authentication is available on this device
 *
 * @returns BiometricAvailability with device capabilities
 *
 * @example
 * ```ts
 * const availability = await checkBiometricAvailability();
 * if (availability.isAvailable && availability.isEnrolled) {
 *   // Can enable biometric login
 * }
 * ```
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    // Check if hardware supports biometrics
    const isAvailable = await LocalAuthentication.hasHardwareAsync();

    if (!isAvailable) {
      return {
        isAvailable: false,
        isEnrolled: false,
        biometricType: 'none',
        biometricLabel: 'Not Available',
      };
    }

    // Check if user has enrolled biometrics
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    // Get supported biometric types
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometricType = mapBiometricType(supportedTypes);
    const biometricLabel = getBiometricLabel(biometricType);

    if (__DEV__) {
      console.log('[Biometrics] Availability check:', {
        isAvailable,
        isEnrolled,
        biometricType,
        supportedTypes,
      });
    }

    return {
      isAvailable,
      isEnrolled,
      biometricType,
      biometricLabel,
    };
  } catch (error) {
    console.error('[Biometrics] Availability check failed:', error);
    return {
      isAvailable: false,
      isEnrolled: false,
      biometricType: 'none',
      biometricLabel: 'Error',
    };
  }
}

/**
 * Prompt user for biometric authentication
 *
 * @param promptMessage - Custom message to show in the biometric prompt
 * @param allowFallback - Whether to allow passcode/PIN fallback (default: true)
 * @returns BiometricAuthResult with success status
 *
 * @example
 * ```ts
 * const result = await authenticateWithBiometric('Sign in to Quester');
 * if (result.success) {
 *   // Proceed with login
 * } else if (result.cancelled) {
 *   // User cancelled, show password form
 * }
 * ```
 */
export async function authenticateWithBiometric(
  promptMessage: string = DEFAULT_PROMPT_MESSAGE,
  allowFallback: boolean = true
): Promise<BiometricAuthResult> {
  try {
    // First check availability
    const availability = await checkBiometricAvailability();

    if (!availability.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    if (!availability.isEnrolled) {
      return {
        success: false,
        error: 'No biometrics enrolled. Please set up Face ID or fingerprint in device settings.',
      };
    }

    // Attempt authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: allowFallback ? FALLBACK_PROMPT_MESSAGE : '',
      disableDeviceFallback: !allowFallback,
      cancelLabel: 'Cancel',
    });

    if (__DEV__) {
      console.log('[Biometrics] Auth result:', result);
    }

    if (result.success) {
      return { success: true };
    }

    // Handle various failure reasons
    if (result.error === 'user_cancel') {
      return {
        success: false,
        cancelled: true,
        error: 'Authentication cancelled',
      };
    }

    if (result.error === 'user_fallback') {
      return {
        success: false,
        usedFallback: true,
        error: 'User chose passcode fallback',
      };
    }

    if (result.error === 'system_cancel') {
      return {
        success: false,
        error: 'Authentication was cancelled by the system',
      };
    }

    if (result.error === 'lockout') {
      return {
        success: false,
        error: 'Too many failed attempts. Please try again later.',
      };
    }

    if (result.error === 'not_enrolled') {
      return {
        success: false,
        error: 'No biometrics enrolled on this device',
      };
    }

    return {
      success: false,
      error: result.error || 'Biometric authentication failed',
    };
  } catch (error) {
    console.error('[Biometrics] Authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Biometric authentication failed',
    };
  }
}

/**
 * Get the security level of available biometrics
 * Used to determine if biometrics are strong enough for sensitive operations
 *
 * @returns Security level: 'strong' | 'weak' | 'none'
 */
export async function getBiometricSecurityLevel(): Promise<'strong' | 'weak' | 'none'> {
  try {
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

    switch (securityLevel) {
      case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
        return 'strong';
      case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
      case LocalAuthentication.SecurityLevel.SECRET:
        return 'weak';
      default:
        return 'none';
    }
  } catch (error) {
    console.error('[Biometrics] Security level check failed:', error);
    return 'none';
  }
}
