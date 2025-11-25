/**
 * Accessibility Helper Utilities
 * Feature 003, T023: Utilities for accessibility features
 * 
 * Provides helper functions for screen reader announcements, contrast checking,
 * and touch target validation.
 * 
 * Usage:
 * ```typescript
 * import { announceToScreenReader, checkContrast, validateTouchTarget } from '@/lib/utils/accessibility-helpers';
 * 
 * // Announce to screen reader
 * announceToScreenReader('Quest completed!');
 * 
 * // Check color contrast
 * const meetsWCAG = checkContrast('#000000', '#ffffff'); // true
 * 
 * // Validate touch target size
 * const isValid = validateTouchTarget(48, 48); // true
 * ```
 */

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Announce a message to screen readers
 * 
 * @param message - The message to announce
 */
export function announceToScreenReader(message: string): void {
  if (!message) return;

  try {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  } catch (error) {
    console.error('[AccessibilityHelpers] Failed to announce:', error);
  }
}

/**
 * Check if a screen reader is currently enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.error('[AccessibilityHelpers] Failed to check screen reader:', error);
    return false;
  }
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  if (hex.length === 3) {
    // Short format: #RGB
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  } else if (hex.length === 6) {
    // Long format: #RRGGBB
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1 range
  const [rs, gs, bs] = [r / 255, g / 255, b / 255];

  // Apply gamma correction
  const getRGBValue = (val: number) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };

  const rLum = getRGBValue(rs);
  const gLum = getRGBValue(gs);
  const bLum = getRGBValue(bs);

  // Calculate luminance
  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG formula: https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
function getContrastRatio(luminance1: number, luminance2: number): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG standards
 * 
 * @param foreground - Foreground color (hex format: #RRGGBB or #RGB)
 * @param background - Background color (hex format: #RRGGBB or #RGB)
 * @param options - Options for contrast checking
 * @returns Object with contrast ratio and WCAG compliance levels
 * 
 * WCAG Standards:
 * - AA Normal Text: 4.5:1
 * - AA Large Text: 3:1
 * - AAA Normal Text: 7:1
 * - AAA Large Text: 4.5:1
 */
export function checkContrast(
  foreground: string,
  background: string,
  options?: {
    level?: 'AA' | 'AAA'; // WCAG level (default: 'AA')
    size?: 'normal' | 'large'; // Text size (default: 'normal')
  }
): {
  ratio: number;
  passes: boolean;
  level: 'AA' | 'AAA';
  requiredRatio: number;
} {
  const level = options?.level || 'AA';
  const size = options?.size || 'normal';

  // Convert colors to RGB
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    console.error('[AccessibilityHelpers] Invalid color format');
    return { ratio: 0, passes: false, level, requiredRatio: 0 };
  }

  // Calculate luminance for both colors
  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // Calculate contrast ratio
  const ratio = getContrastRatio(fgLuminance, bgLuminance);

  // Determine required ratio based on level and size
  let requiredRatio: number;
  if (level === 'AAA') {
    requiredRatio = size === 'large' ? 4.5 : 7;
  } else {
    // AA
    requiredRatio = size === 'large' ? 3 : 4.5;
  }

  return {
    ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    passes: ratio >= requiredRatio,
    level,
    requiredRatio,
  };
}

/**
 * Validate touch target size meets accessibility guidelines
 * 
 * @param width - Width in points/dp
 * @param height - Height in points/dp
 * @param options - Validation options
 * @returns Whether the touch target meets guidelines
 * 
 * Guidelines:
 * - iOS: 44x44 points minimum
 * - Android: 48x48 dp minimum
 * - WCAG: 44x44 CSS pixels minimum
 */
export function validateTouchTarget(
  width: number,
  height: number,
  options?: {
    platform?: 'ios' | 'android' | 'web';
  }
): {
  valid: boolean;
  minSize: number;
  issues: string[];
} {
  const platform = options?.platform || Platform.OS;

  // Determine minimum size based on platform
  const minSize = platform === 'android' ? 48 : 44;

  const issues: string[] = [];

  // Check width
  if (width < minSize) {
    issues.push(`Width ${width} is less than minimum ${minSize}`);
  }

  // Check height
  if (height < minSize) {
    issues.push(`Height ${height} is less than minimum ${minSize}`);
  }

  return {
    valid: issues.length === 0,
    minSize,
    issues,
  };
}

/**
 * Get accessible label for a component
 * Combines label, hint, and value into a single string
 */
export function getAccessibleLabel(
  label: string,
  options?: {
    hint?: string;
    value?: string;
    role?: string;
  }
): string {
  const parts: string[] = [label];

  if (options?.value) {
    parts.push(options.value);
  }

  if (options?.role) {
    parts.push(options.role);
  }

  if (options?.hint) {
    parts.push(options.hint);
  }

  return parts.join(', ');
}

/**
 * Format accessibility hint for interactive elements
 */
export function formatAccessibilityHint(action: string): string {
  return `Double tap to ${action}`;
}

/**
 * Check if reduced motion is preferred
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch (error) {
    console.error('[AccessibilityHelpers] Failed to check reduce motion:', error);
    return false;
  }
}

/**
 * Check if bold text is preferred
 */
export async function isBoldTextEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await AccessibilityInfo.isBoldTextEnabled();
    }
    return false;
  } catch (error) {
    console.error('[AccessibilityHelpers] Failed to check bold text:', error);
    return false;
  }
}

/**
 * Check if grayscale is enabled
 */
export async function isGrayscaleEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await AccessibilityInfo.isGrayscaleEnabled();
    }
    return false;
  } catch (error) {
    console.error('[AccessibilityHelpers] Failed to check grayscale:', error);
    return false;
  }
}

/**
 * Get all accessibility settings
 */
export async function getAccessibilitySettings(): Promise<{
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  boldTextEnabled: boolean;
  grayscaleEnabled: boolean;
}> {
  const [screenReader, reduceMotion, boldText, grayscale] = await Promise.all([
    isScreenReaderEnabled(),
    isReduceMotionEnabled(),
    isBoldTextEnabled(),
    isGrayscaleEnabled(),
  ]);

  return {
    screenReaderEnabled: screenReader,
    reduceMotionEnabled: reduceMotion,
    boldTextEnabled: boldText,
    grayscaleEnabled: grayscale,
  };
}
