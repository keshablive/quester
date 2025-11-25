/**
 * Accessibility Props Type Definitions
 * 
 * Standard accessibility attributes for React Native components
 * conforming to WCAG 2.1 Level AA standards.
 * 
 * Implements FR-006 to FR-010
 * 
 * @module accessibility
 */

import { AccessibilityRole, AccessibilityState } from 'react-native';

/**
 * Base accessibility props for all interactive components
 */
export interface AccessibilityProps {
  /** 
   * Role of the component for screen readers
   * FR-006: Required for all interactive elements
   */
  accessibilityRole?: AccessibilityRole;

  /**
   * Label describing the component
   * FR-006: Required for interactive elements without visible text
   */
  accessibilityLabel?: string;

  /**
   * Hint about what happens when user interacts
   * FR-009: Required for complex interactions
   */
  accessibilityHint?: string;

  /**
   * Current state of the component
   */
  accessibilityState?: AccessibilityState;

  /**
   * Whether element is hidden from accessibility tree
   */
  accessibilityElementsHidden?: boolean;

  /**
   * Order of accessibility focus
   */
  accessibilityViewIsModal?: boolean;

  /**
   * Live region for dynamic content updates
   */
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
}

/**
 * Form input accessibility props
 * Implements FR-008
 */
export interface FormAccessibilityProps extends AccessibilityProps {
  /**
   * ID(s) of element(s) that label this input
   * Links Label to Input via nativeID
   */
  'aria-labelledby'?: string;

  /**
   * Indicates if input has validation error
   * Required for error states
   */
  'aria-invalid'?: boolean;

  /**
   * ID of element describing error or help text
   * Links error messages to inputs
   */
  'aria-describedby'?: string;

  /**
   * Indicates if field is required
   */
  'aria-required'?: boolean;

  /**
   * Native ID for linking with Label
   * Used by aria-labelledby
   */
  nativeID?: string;
}

/**
 * Image/Icon accessibility props
 * Implements FR-007 (WCAG 1.1.1)
 */
export interface MediaAccessibilityProps {
  /**
   * Alternative text for images/icons
   * Required for non-decorative media
   */
  alt?: string;

  /**
   * Label for screen readers (alternative to alt)
   */
  accessibilityLabel?: string;

  /**
   * Role for media elements
   */
  accessibilityRole?: 'image' | 'imagebutton';

  /**
   * Hide decorative images from screen readers
   */
  accessibilityElementsHidden?: boolean;
}

/**
 * Navigation accessibility props
 * Implements FR-010 (WCAG 2.4.8)
 */
export interface NavigationAccessibilityProps extends AccessibilityProps {
  /**
   * Indicates current navigation item
   */
  accessibilityState?: {
    selected?: boolean;
    disabled?: boolean;
  };

  /**
   * Announce page/tab changes
   */
  accessibilityLiveRegion?: 'polite' | 'assertive';

  /**
   * Role for navigation elements
   */
  accessibilityRole?: 'tab' | 'link' | 'button';
}

/**
 * WCAG 2.1 Level AA Color Contrast Requirements
 * Implements FR-031
 */
export interface ColorContrastRequirements {
  /** Normal text (<18pt or <14pt bold): 4.5:1 minimum */
  normalText: 4.5;
  
  /** Large text (≥18pt or ≥14pt bold): 3:1 minimum */
  largeText: 3.0;
  
  /** UI components and graphical objects: 3:1 minimum */
  uiComponents: 3.0;
}

/**
 * WCAG 2.1 Level AA Touch Target Size
 * Implements WCAG 2.5.5
 */
export interface TouchTargetRequirements {
  /** Minimum width in density-independent pixels */
  minWidth: 44;
  
  /** Minimum height in density-independent pixels */
  minHeight: 44;
}

/**
 * Standard WCAG 2.1 Level AA requirements
 */
export const WCAG_AA_REQUIREMENTS = {
  contrast: {
    normalText: 4.5,
    largeText: 3.0,
    uiComponents: 3.0,
  } as ColorContrastRequirements,
  
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
  } as TouchTargetRequirements,
} as const;

/**
 * Helper to create compliant accessibility props
 * 
 * @example
 * ```tsx
 * const accessibilityProps = createAccessibilityProps({
 *   role: 'button',
 *   label: 'Submit form',
 *   hint: 'Submits the registration form',
 * });
 * ```
 */
export function createAccessibilityProps(options: {
  role: AccessibilityRole;
  label?: string;
  hint?: string;
  state?: AccessibilityState;
}): AccessibilityProps {
  return {
    accessibilityRole: options.role,
    accessibilityLabel: options.label,
    accessibilityHint: options.hint,
    accessibilityState: options.state,
  };
}

/**
 * Helper to create form accessibility props
 * 
 * @example
 * ```tsx
 * const formProps = createFormAccessibilityProps({
 *   labelId: 'email-label',
 *   nativeId: 'email-input',
 *   invalid: !!errors.email,
 *   errorId: errors.email ? 'email-error' : undefined,
 * });
 * ```
 */
export function createFormAccessibilityProps(options: {
  labelId: string;
  nativeId: string;
  invalid?: boolean;
  errorId?: string;
  required?: boolean;
}): FormAccessibilityProps {
  return {
    accessibilityRole: 'none', // Form inputs handle their own roles
    'aria-labelledby': options.labelId,
    'aria-invalid': options.invalid,
    'aria-describedby': options.errorId,
    'aria-required': options.required,
    nativeID: options.nativeId,
  };
}
