import { findNodeHandle, AccessibilityInfo } from 'react-native';

/**
 * Set accessibility focus to a specific component
 * @param ref - React ref to the component
 */
export function setAccessibilityFocus(ref: any): void {
  const reactTag = findNodeHandle(ref);
  if (reactTag) {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
}

/**
 * Check if a screen reader is currently enabled
 * @returns Promise that resolves to boolean indicating if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  return AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Check if reduce motion is enabled
 * @returns Promise that resolves to boolean indicating if reduce motion is enabled
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  return AccessibilityInfo.isReduceMotionEnabled();
}
