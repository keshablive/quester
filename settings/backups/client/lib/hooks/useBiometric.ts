/**
 * useBiometric Hook
 * 
 * Provides biometric authentication (Face ID, Touch ID, Fingerprint)
 * for quick and secure login without entering password.
 */

import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'quester_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'quester_biometric_email';

export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export interface BiometricState {
  isEnabled: boolean;
  isLoading: boolean;
  capabilities: BiometricCapabilities | null;
  savedEmail: string | null;
}

export interface BiometricActions {
  checkCapabilities: () => Promise<BiometricCapabilities>;
  authenticate: (reason?: string) => Promise<boolean>;
  enableBiometric: (email: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  getSavedEmail: () => Promise<string | null>;
}

/**
 * Get human-readable biometric type name
 */
const getBiometricTypeName = (
  types: LocalAuthentication.AuthenticationType[]
): 'fingerprint' | 'facial' | 'iris' | 'none' => {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'facial';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'none';
};

/**
 * Get platform-specific authentication prompt
 */
const getAuthenticationPrompt = (biometricType: string): string => {
  if (Platform.OS === 'ios') {
    return biometricType === 'facial' 
      ? 'Authenticate with Face ID'
      : 'Authenticate with Touch ID';
  }
  return 'Authenticate to continue';
};

/**
 * useBiometric Hook
 * 
 * Usage:
 * ```tsx
 * const { 
 *   isEnabled, 
 *   capabilities, 
 *   authenticate, 
 *   enableBiometric 
 * } = useBiometric();
 * 
 * // Check if available
 * if (capabilities?.isAvailable) {
 *   await enableBiometric('user@example.com');
 * }
 * 
 * // Authenticate
 * const success = await authenticate();
 * if (success) {
 *   const email = await getSavedEmail();
 *   // Auto-login with saved email
 * }
 * ```
 */
export const useBiometric = (): BiometricState & BiometricActions => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  /**
   * Check device biometric capabilities
   */
  const checkCapabilities = useCallback(async (): Promise<BiometricCapabilities> => {
    try {
      // Check if hardware is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      
      if (!hasHardware) {
        return {
          isAvailable: false,
          isEnrolled: false,
          biometricType: 'none',
          supportedTypes: [],
        };
      }

      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      // Get supported authentication types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      const biometricType = getBiometricTypeName(supportedTypes);

      const caps: BiometricCapabilities = {
        isAvailable: hasHardware && isEnrolled,
        isEnrolled,
        biometricType,
        supportedTypes,
      };

      setCapabilities(caps);
      return caps;
    } catch (error) {
      console.error('[useBiometric] Failed to check capabilities:', error);
      
      const fallbackCaps: BiometricCapabilities = {
        isAvailable: false,
        isEnrolled: false,
        biometricType: 'none',
        supportedTypes: [],
      };
      
      setCapabilities(fallbackCaps);
      return fallbackCaps;
    }
  }, []);

  /**
   * Authenticate using biometrics
   */
  const authenticate = useCallback(
    async (reason?: string): Promise<boolean> => {
      try {
        const caps = capabilities || await checkCapabilities();

        if (!caps.isAvailable) {
          console.log('[useBiometric] Biometrics not available');
          return false;
        }

        const promptMessage = reason || getAuthenticationPrompt(caps.biometricType);

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage,
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use password',
          disableDeviceFallback: false, // Allow device passcode as fallback
        });

        if (result.success) {
          console.log('[useBiometric] Authentication successful');
          return true;
        } else {
          console.log('[useBiometric] Authentication failed:', result.error);
          return false;
        }
      } catch (error) {
        console.error('[useBiometric] Authentication error:', error);
        return false;
      }
    },
    [capabilities, checkCapabilities]
  );

  /**
   * Enable biometric authentication for user
   */
  const enableBiometric = useCallback(async (email: string): Promise<void> => {
    try {
      // Save preference
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      await AsyncStorage.setItem(BIOMETRIC_EMAIL_KEY, email);

      setIsEnabled(true);
      setSavedEmail(email);

      console.log('[useBiometric] Biometric enabled for:', email);
    } catch (error) {
      console.error('[useBiometric] Failed to enable biometric:', error);
      throw new Error('Failed to enable biometric authentication');
    }
  }, []);

  /**
   * Disable biometric authentication
   */
  const disableBiometric = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_EMAIL_KEY);

      setIsEnabled(false);
      setSavedEmail(null);

      console.log('[useBiometric] Biometric disabled');
    } catch (error) {
      console.error('[useBiometric] Failed to disable biometric:', error);
      throw new Error('Failed to disable biometric authentication');
    }
  }, []);

  /**
   * Get saved email for biometric login
   */
  const getSavedEmail = useCallback(async (): Promise<string | null> => {
    try {
      const email = await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
      return email;
    } catch (error) {
      console.error('[useBiometric] Failed to get saved email:', error);
      return null;
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);

        // Check capabilities
        await checkCapabilities();

        // Check if biometric is enabled
        const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        setIsEnabled(enabled === 'true');

        // Get saved email
        const email = await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
        setSavedEmail(email);

        console.log('[useBiometric] Initialized - enabled:', enabled === 'true');
      } catch (error) {
        console.error('[useBiometric] Initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [checkCapabilities]);

  return {
    // State
    isEnabled,
    isLoading,
    capabilities,
    savedEmail,
    // Actions
    checkCapabilities,
    authenticate,
    enableBiometric,
    disableBiometric,
    getSavedEmail,
  };
};
