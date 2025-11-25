/**
 * Device Utilities
 * 
 * Provides device identification and fingerprinting for device trust features.
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

/**
 * Generate a unique device fingerprint
 * Combines device identifiers to create a consistent fingerprint
 * 
 * @returns Promise<string> - Unique device identifier
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    const identifiers: string[] = [];

    // Device model and name
    if (Device.modelName) {
      identifiers.push(Device.modelName);
    }
    if (Device.osName) {
      identifiers.push(Device.osName);
    }
    if (Device.osVersion) {
      identifiers.push(Device.osVersion);
    }

    // Platform-specific identifiers
    if (Platform.OS === 'ios') {
      // iOS - use identifierForVendor (persists across app installs)
      const installId = await Application.getIosIdForVendorAsync();
      if (installId) {
        identifiers.push(installId);
      }
    } else if (Platform.OS === 'android') {
      // Android - use androidId (persists across app installs)
      const androidId = Application.getAndroidId();
      if (androidId) {
        identifiers.push(androidId);
      }
    } else {
      // Web - use a stored identifier or generate one
      const storedId = localStorage.getItem('device_id');
      if (storedId) {
        identifiers.push(storedId);
      } else {
        const newId = generateRandomId();
        localStorage.setItem('device_id', newId);
        identifiers.push(newId);
      }
    }

    // Create fingerprint from identifiers
    const fingerprint = identifiers.join('-').replace(/[^a-zA-Z0-9-]/g, '');
    return fingerprint || generateRandomId();
  } catch (error) {
    console.error('[Device] Failed to generate fingerprint:', error);
    // Fallback to random ID
    return generateRandomId();
  }
}

/**
 * Get user-friendly device name
 * 
 * @returns Promise<string> - Device name (e.g., "iPhone 13 Pro", "Pixel 6")
 */
export async function getDeviceName(): Promise<string> {
  try {
    const parts: string[] = [];

    if (Device.brand) {
      parts.push(Device.brand);
    }
    if (Device.modelName) {
      parts.push(Device.modelName);
    }

    if (parts.length > 0) {
      return parts.join(' ');
    }

    // Fallback to platform
    if (Platform.OS === 'ios') {
      return 'iOS Device';
    } else if (Platform.OS === 'android') {
      return 'Android Device';
    } else if (Platform.OS === 'web') {
      return 'Web Browser';
    }

    return 'Unknown Device';
  } catch (error) {
    console.error('[Device] Failed to get device name:', error);
    return 'Unknown Device';
  }
}

/**
 * Get device type
 * 
 * @returns 'mobile' | 'desktop' | 'tablet' | 'web'
 */
export function getDeviceType(): 'mobile' | 'desktop' | 'tablet' | 'web' {
  if (Platform.OS === 'web') {
    // Check screen size for desktop vs mobile web
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 'desktop' : 'web';
    }
    return 'web';
  }

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // Check if it's a tablet
    if (Device.deviceType === Device.DeviceType.TABLET) {
      return 'tablet';
    }
    return 'mobile';
  }

  return 'web';
}

/**
 * Generate a random device ID
 * 
 * @returns string - Random identifier
 */
function generateRandomId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
