/**
 * Accessibility Audit Utility
 * 
 * Runtime accessibility checks for WCAG 2.1 Level AA compliance.
 * Validates accessibility props, color contrast, and touch target sizes.
 * 
 * @module accessibility-audit
 */

import { AccessibilityRole } from 'react-native';

export interface AccessibilityIssue {
  component: string;
  type: 'missing_role' | 'missing_label' | 'poor_contrast' | 'small_target' | 'missing_hint';
  severity: 'error' | 'warning';
  message: string;
  wcagCriterion?: string;
}

export interface AccessibilityAuditResult {
  passed: boolean;
  issues: AccessibilityIssue[];
  timestamp: number;
}

export interface ComponentAccessibilityProps {
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessible?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = [];
  private enabled: boolean = __DEV__;

  /**
   * Enable or disable accessibility auditing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Audit a component's accessibility props
   */
  auditComponent(
    componentName: string,
    props: ComponentAccessibilityProps,
    isInteractive: boolean = false
  ): void {
    if (!this.enabled) return;

    const issues: AccessibilityIssue[] = [];

    // Check for accessibility role on interactive elements (WCAG 4.1.2)
    if (isInteractive && !props.accessibilityRole) {
      issues.push({
        component: componentName,
        type: 'missing_role',
        severity: 'error',
        message: `Interactive component "${componentName}" missing accessibilityRole`,
        wcagCriterion: '4.1.2 - Name, Role, Value',
      });
    }

    // Check for accessibility label (WCAG 2.4.6, 3.3.2)
    if (
      isInteractive &&
      !props.accessibilityLabel &&
      !props['aria-label'] &&
      !props['aria-labelledby']
    ) {
      issues.push({
        component: componentName,
        type: 'missing_label',
        severity: 'error',
        message: `Interactive component "${componentName}" missing accessibilityLabel or aria-label`,
        wcagCriterion: '2.4.6 - Headings and Labels, 3.3.2 - Labels or Instructions',
      });
    }

    // Check for accessibility hint on complex interactions (WCAG 3.3.2)
    if (
      isInteractive &&
      props.accessibilityRole &&
      ['button', 'menu', 'menubar', 'tab', 'switch', 'combobox'].includes(
        props.accessibilityRole
      ) &&
      !props.accessibilityHint
    ) {
      issues.push({
        component: componentName,
        type: 'missing_hint',
        severity: 'warning',
        message: `Complex interactive component "${componentName}" missing accessibilityHint`,
        wcagCriterion: '3.3.2 - Labels or Instructions',
      });
    }

    // Store issues
    this.issues.push(...issues);

    // Log issues in development
    if (__DEV__ && issues.length > 0) {
      issues.forEach((issue) => {
        if (issue.severity === 'error') {
          console.error(`[AccessibilityAudit] ${issue.message}`, {
            wcag: issue.wcagCriterion,
          });
        } else {
          console.warn(`[AccessibilityAudit] ${issue.message}`, {
            wcag: issue.wcagCriterion,
          });
        }
      });
    }
  }

  /**
   * Check color contrast ratio (WCAG 1.4.3, 1.4.6)
   * 
   * @param foreground - Foreground color in hex format (#RRGGBB)
   * @param background - Background color in hex format (#RRGGBB)
   * @param isLargeText - Text is 18pt+ or 14pt+ bold
   * @returns Contrast ratio and whether it passes WCAG AA
   */
  checkColorContrast(
    foreground: string,
    background: string,
    isLargeText: boolean = false
  ): { ratio: number; passesAA: boolean; passesAAA: boolean } {
    const ratio = this.calculateContrastRatio(foreground, background);
    
    // WCAG 2.1 Level AA requirements
    const requiredRatio = isLargeText ? 3 : 4.5;
    const passesAA = ratio >= requiredRatio;
    
    // WCAG 2.1 Level AAA requirements (optional)
    const requiredRatioAAA = isLargeText ? 4.5 : 7;
    const passesAAA = ratio >= requiredRatioAAA;

    return { ratio, passesAA, passesAAA };
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calculate relative luminance of a color
   */
  private getLuminance(hexColor: string): number {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Apply gamma correction
    const rLin = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLin = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLin = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    // Calculate luminance
    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  /**
   * Check touch target size (WCAG 2.5.5)
   * 
   * @param width - Target width in dp
   * @param height - Target height in dp
   * @returns Whether target meets minimum size (44x44 dp)
   */
  checkTouchTargetSize(width: number, height: number): {
    passes: boolean;
    message?: string;
  } {
    const MIN_SIZE = 44; // WCAG 2.5.5 minimum 44x44 dp
    
    if (width < MIN_SIZE || height < MIN_SIZE) {
      return {
        passes: false,
        message: `Touch target too small: ${width}x${height} dp (minimum 44x44 dp)`,
      };
    }
    
    return { passes: true };
  }

  /**
   * Get all accessibility issues
   */
  getIssues(): AccessibilityIssue[] {
    return [...this.issues];
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: 'error' | 'warning'): AccessibilityIssue[] {
    return this.issues.filter((issue) => issue.severity === severity);
  }

  /**
   * Get audit summary
   */
  getAuditSummary(): {
    totalIssues: number;
    errors: number;
    warnings: number;
  } {
    return {
      totalIssues: this.issues.length,
      errors: this.issues.filter((i) => i.severity === 'error').length,
      warnings: this.issues.filter((i) => i.severity === 'warning').length,
    };
  }

  /**
   * Clear all issues
   */
  clearIssues(): void {
    this.issues = [];
  }

  /**
   * Run full audit and return result
   */
  runAudit(): AccessibilityAuditResult {
    const errors = this.getIssuesBySeverity('error');
    
    return {
      passed: errors.length === 0,
      issues: this.getIssues(),
      timestamp: Date.now(),
    };
  }

  /**
   * Export issues as JSON for reporting
   */
  exportIssues(): string {
    return JSON.stringify({
      summary: this.getAuditSummary(),
      issues: this.getIssues(),
    }, null, 2);
  }
}

// Singleton instance
export const accessibilityAuditor = new AccessibilityAuditor();

/**
 * Hook to audit a component on mount
 * 
 * @example
 * ```tsx
 * useAccessibilityAudit('MyButton', { accessibilityRole: 'button' }, true);
 * ```
 */
export function useAccessibilityAudit(
  componentName: string,
  props: ComponentAccessibilityProps,
  isInteractive: boolean = false
): void {
  React.useEffect(() => {
    accessibilityAuditor.auditComponent(componentName, props, isInteractive);
  }, [componentName, props, isInteractive]);
}

// React import for hooks
import React from 'react';
