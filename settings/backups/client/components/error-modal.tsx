/**
 * ErrorModal Component
 * Phase 8, T133: Full-screen error dialog with custom actions
 *
 * Displays critical errors in a modal overlay with action buttons.
 * Supports custom primary/secondary actions for error recovery.
 *
 * Usage:
 * ```tsx
 * const { error, clearError, retryOperation } = useErrorHandling();
 *
 * <ErrorModal
 *   visible={!!error}
 *   title="Network Error"
 *   message={error?.message}
 *   details={error?.code}
 *   onClose={clearError}
 *   primaryAction={{
 *     label: 'Retry',
 *     onPress: () => retryOperation(fetchData)
 *   }}
 *   secondaryAction={{
 *     label: 'Cancel',
 *     onPress: clearError
 *   }}
 * />
 * ```
 */

import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

export interface ErrorModalAction {
  label: string;
  onPress: () => void;
}

export interface ErrorModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Error title */
  title: string;
  /** Error message */
  message: string;
  /** Optional error details (e.g., error code) */
  details?: string;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Whether modal can be dismissed by backdrop tap (default: true) */
  dismissible?: boolean;
  /** Primary action button (e.g., Retry) */
  primaryAction?: ErrorModalAction;
  /** Secondary action button (e.g., Cancel) */
  secondaryAction?: ErrorModalAction;
}

/**
 * ErrorModal Component
 *
 * Full-screen modal for displaying critical errors.
 *
 * Features:
 * - Alert dialog role for accessibility
 * - Dismissible backdrop (optional)
 * - Custom primary/secondary actions
 * - Error icon with title and message
 * - Optional details section
 * - Accessible with ARIA roles and labels
 */
export function ErrorModal({
  visible,
  title,
  message,
  details,
  onClose,
  dismissible = true,
  primaryAction,
  secondaryAction,
}: ErrorModalProps): React.JSX.Element {
  // Build accessibility label
  const accessibilityLabel = `${title}. ${message}${details ? `. ${details}` : ''}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissible ? onClose : undefined}>
      {/* Backdrop */}
      <Pressable
        testID="error-modal-backdrop"
        onPress={dismissible ? onClose : undefined}
        className="flex-1 items-center justify-center bg-black/50 p-6"
        accessibilityLabel="Modal backdrop">
        {/* Modal Content */}
        <Pressable
          testID="error-modal"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={accessibilityLabel}
          onPress={(e) => e.stopPropagation()} // Prevent backdrop dismiss when clicking modal
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          {/* Error Icon */}
          <View testID="error-modal-icon" className="mb-4 items-center">
            <AlertCircle size={48} color="#ef4444" />
          </View>

          {/* Title */}
          <Text
            variant="h2"
            testID="error-modal-title"
            className="mb-3 text-center text-destructive">
            {title}
          </Text>

          {/* Message */}
          <Text variant="p" className="mb-4 text-center">
            {message}
          </Text>

          {/* Details (optional) */}
          {details && (
            <Text
              variant="small"
              testID="error-modal-details"
              className="mb-6 text-center text-muted-foreground">
              {details}
            </Text>
          )}

          {/* Action Buttons */}
          <View className="gap-3">
            {/* Primary Action (Retry, etc.) */}
            {primaryAction && (
              <Button
                testID="primary-action-button"
                onPress={primaryAction.onPress}
                variant="default"
                className="w-full"
                accessibilityLabel={primaryAction.label}>
                <Text className="font-semibold text-white">{primaryAction.label}</Text>
              </Button>
            )}

            {/* Secondary Action (Cancel, etc.) */}
            {secondaryAction && (
              <Button
                testID="secondary-action-button"
                onPress={secondaryAction.onPress}
                variant="outline"
                className="w-full"
                accessibilityLabel={secondaryAction.label}>
                <Text>{secondaryAction.label}</Text>
              </Button>
            )}

            {/* Default Close Button (if no custom actions) */}
            {!primaryAction && !secondaryAction && (
              <Button
                testID="close-button"
                onPress={onClose}
                variant="default"
                className="w-full"
                accessibilityLabel="Close error dialog"
                accessibilityHint="Dismisses the error message">
                <Text className="font-semibold text-white">Close</Text>
              </Button>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
