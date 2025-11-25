import { AccessibilityInfo } from 'react-native';

/**
 * Announce a message for screen readers
 * @param message - The message to announce
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Announce a success message
 * @param message - The success message to announce
 */
export function announceSuccess(message: string): void {
  announceForAccessibility(`Success: ${message}`);
}

/**
 * Announce an error message
 * @param message - The error message to announce
 */
export function announceError(message: string): void {
  announceForAccessibility(`Error: ${message}`);
}

/**
 * Announce a loading state
 * @param isLoading - Whether content is loading
 * @param message - Optional custom loading message
 */
export function announceLoading(isLoading: boolean, message?: string): void {
  if (isLoading) {
    announceForAccessibility(message || 'Loading...');
  } else {
    announceForAccessibility(message || 'Content loaded');
  }
}
