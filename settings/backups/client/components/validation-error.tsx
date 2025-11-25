/**
 * ValidationError Component
 * Phase 8, T132: Inline form validation error display
 *
 * Displays validation errors below form fields with proper accessibility.
 * Associates with input fields via nativeID for screen readers.
 *
 * Usage:
 * ```tsx
 * <Label nativeID="email-label">Email</Label>
 * <Input
 *   nativeID="email-input"
 *   aria-labelledby="email-label"
 *   aria-describedby={emailError ? 'email-input-error' : undefined}
 *   aria-invalid={!!emailError}
 * />
 * <ValidationError error={emailError} fieldId="email-input" />
 * ```
 */

import React from 'react';
import { View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface ValidationErrorProps {
  /** Error message to display. If empty, null, or undefined, component won't render */
  error?: string | null;
  /** ID of the associated input field (for aria-describedby) */
  fieldId?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ValidationError Component
 *
 * Displays inline validation errors for form fields.
 *
 * Features:
 * - Only renders when error is present
 * - Associates with input via nativeID for accessibility
 * - Alert role for screen readers
 * - Red error icon + text
 * - Polite live region (doesn't interrupt user)
 */
export function ValidationError({
  error,
  fieldId,
  className,
}: ValidationErrorProps): React.JSX.Element | null {
  // Don't render if no error
  const trimmedError = error?.trim();
  if (!trimmedError) {
    return null;
  }

  // Generate nativeID for aria-describedby association
  const errorId = fieldId ? `${fieldId}-error` : undefined;

  return (
    <View
      testID="validation-error"
      nativeID={errorId}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Validation error: ${trimmedError}`}
      className={cn('mt-1 flex-row items-center gap-2', 'text-sm text-destructive', className)}>
      {/* Error Icon */}
      <View testID="error-icon">
        <AlertCircle size={14} color="#ef4444" />
      </View>

      {/* Error Text */}
      <Text variant="small" className="flex-1 text-destructive">
        {trimmedError}
      </Text>
    </View>
  );
}
