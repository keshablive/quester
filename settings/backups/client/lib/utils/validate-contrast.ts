/**
 * Color Contrast Validation Utility
 * 
 * Validates color contrast ratios for WCAG 2.1 Level AA compliance.
 * 
 * Implements FR-031
 * 
 * @module validate-contrast
 */

import { WCAG_AA_REQUIREMENTS } from '@/lib/types/accessibility';

/**
 * Validate color contrast ratio against WCAG 2.1 Level AA standards
 * 
 * @param foreground - Foreground color in hex format (#RRGGBB or #RGB)
 * @param background - Background color in hex format (#RRGGBB or #RGB)
 * @param isLargeText - Text is 18pt+ or 14pt+ bold (default: false)
 * @returns Validation result with pass/fail and computed ratio
 * 
 * @example
 * ```ts
 * const result = validateColorContrast('#000000', '#FFFFFF', false);
 * console.log(result.passes); // true
 * console.log(result.ratio); // 21
 * ```
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): {
  passes: boolean;
  ratio: number;
  required: number;
  wcagLevel: 'AA';
} {
  const ratio = calculateContrastRatio(foreground, background);
  const required = isLargeText
    ? WCAG_AA_REQUIREMENTS.contrast.largeText
    : WCAG_AA_REQUIREMENTS.contrast.normalText;

  return {
    passes: ratio >= required,
    ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    required,
    wcagLevel: 'AA',
  };
}

/**
 * Calculate contrast ratio between two colors
 * 
 * Formula: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter luminance and L2 is the darker luminance
 * 
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio (1:1 to 21:1)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance of a color
 * 
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * 
 * @param hexColor - Color in hex format (#RRGGBB or #RGB)
 * @returns Relative luminance (0 to 1)
 */
export function getRelativeLuminance(hexColor: string): number {
  // Remove # if present
  let hex = hexColor.replace('#', '');

  // Expand 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  // Parse RGB values (0-255)
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Validate if a color pair meets WCAG AA contrast for UI components
 * 
 * UI components require 3:1 contrast ratio minimum
 * 
 * @param foreground - Foreground color
 * @param background - Background color
 * @returns True if contrast is sufficient for UI components
 */
export function validateUIComponentContrast(
  foreground: string,
  background: string
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return ratio >= WCAG_AA_REQUIREMENTS.contrast.uiComponents;
}

/**
 * Get contrast ratio category for reporting
 * 
 * @param ratio - Contrast ratio
 * @returns Category label
 */
export function getContrastCategory(ratio: number): 'fail' | 'aa-large' | 'aa' | 'aaa' {
  if (ratio >= 7) return 'aaa'; // WCAG AAA for normal text
  if (ratio >= 4.5) return 'aa'; // WCAG AA for normal text
  if (ratio >= 3) return 'aa-large'; // WCAG AA for large text
  return 'fail';
}

/**
 * Validate theme colors against WCAG AA standards
 * 
 * @param theme - Theme color object with hex values
 * @returns Array of contrast validation failures
 * 
 * @example
 * ```ts
 * const theme = {
 *   background: '#FFFFFF',
 *   foreground: '#000000',
 *   primary: '#3B82F6',
 *   secondary: '#6B7280',
 * };
 * 
 * const failures = validateThemeContrast(theme);
 * if (failures.length > 0) {
 *   console.error('Theme has contrast issues:', failures);
 * }
 * ```
 */
export function validateThemeContrast(theme: {
  background: string;
  foreground: string;
  primary?: string;
  secondary?: string;
  muted?: string;
  destructive?: string;
}): Array<{
  pair: string;
  ratio: number;
  required: number;
  passes: boolean;
}> {
  const failures: Array<{
    pair: string;
    ratio: number;
    required: number;
    passes: boolean;
  }> = [];

  // Check foreground on background (most critical)
  const fgBgResult = validateColorContrast(theme.foreground, theme.background, false);
  if (!fgBgResult.passes) {
    failures.push({
      pair: 'foreground/background',
      ratio: fgBgResult.ratio,
      required: fgBgResult.required,
      passes: false,
    });
  }

  // Check primary on background
  if (theme.primary) {
    const primaryResult = validateColorContrast(theme.primary, theme.background, false);
    if (!primaryResult.passes) {
      failures.push({
        pair: 'primary/background',
        ratio: primaryResult.ratio,
        required: primaryResult.required,
        passes: false,
      });
    }
  }

  // Check secondary on background
  if (theme.secondary) {
    const secondaryResult = validateColorContrast(theme.secondary, theme.background, false);
    if (!secondaryResult.passes) {
      failures.push({
        pair: 'secondary/background',
        ratio: secondaryResult.ratio,
        required: secondaryResult.required,
        passes: false,
      });
    }
  }

  // Check muted on background
  if (theme.muted) {
    const mutedResult = validateColorContrast(theme.muted, theme.background, false);
    if (!mutedResult.passes) {
      failures.push({
        pair: 'muted/background',
        ratio: mutedResult.ratio,
        required: mutedResult.required,
        passes: false,
      });
    }
  }

  // Check destructive on background
  if (theme.destructive) {
    const destructiveResult = validateColorContrast(theme.destructive, theme.background, false);
    if (!destructiveResult.passes) {
      failures.push({
        pair: 'destructive/background',
        ratio: destructiveResult.ratio,
        required: destructiveResult.required,
        passes: false,
      });
    }
  }

  return failures;
}

/**
 * Suggest an accessible alternative color
 * 
 * Adjusts luminance of a color to meet contrast requirements
 * 
 * @param color - Original color in hex
 * @param background - Background color in hex
 * @param isLargeText - Whether text is large
 * @returns Adjusted color that meets contrast requirements
 */
export function suggestAccessibleColor(
  color: string,
  background: string,
  isLargeText: boolean = false
): string {
  const requiredRatio = isLargeText
    ? WCAG_AA_REQUIREMENTS.contrast.largeText
    : WCAG_AA_REQUIREMENTS.contrast.normalText;

  const backgroundLum = getRelativeLuminance(background);
  const currentRatio = calculateContrastRatio(color, background);

  if (currentRatio >= requiredRatio) {
    return color; // Already meets requirements
  }

  // Determine if we need to lighten or darken
  const shouldLighten = backgroundLum < 0.5;

  // Adjust luminance iteratively (simplified approach)
  // In production, this would use a more sophisticated algorithm
  let adjusted = color;
  let iterations = 0;
  const maxIterations = 20;

  while (
    calculateContrastRatio(adjusted, background) < requiredRatio &&
    iterations < maxIterations
  ) {
    const rgb = hexToRgb(adjusted);
    if (shouldLighten) {
      rgb.r = Math.min(255, rgb.r + 10);
      rgb.g = Math.min(255, rgb.g + 10);
      rgb.b = Math.min(255, rgb.b + 10);
    } else {
      rgb.r = Math.max(0, rgb.r - 10);
      rgb.g = Math.max(0, rgb.g - 10);
      rgb.b = Math.max(0, rgb.b - 10);
    }
    adjusted = rgbToHex(rgb);
    iterations++;
  }

  return adjusted;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;

  return {
    r: parseInt(expanded.substr(0, 2), 16),
    g: parseInt(expanded.substr(2, 2), 16),
    b: parseInt(expanded.substr(4, 2), 16),
  };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}
