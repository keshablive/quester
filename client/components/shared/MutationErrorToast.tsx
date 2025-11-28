/**
 * MutationErrorToast Component
 *
 * Toast notification for mutation failures with rollback notification.
 * Provides user feedback when optimistic updates are rolled back.
 *
 * US2: Optimistic Updates for User Actions
 *
 * @module components/shared/MutationErrorToast
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface MutationErrorToastProps {
  /** Error message to display */
  message: string;
  /** Whether to show the toast */
  visible: boolean;
  /** Callback when toast is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss duration in ms (default: 4000) */
  duration?: number;
  /** Optional retry action */
  onRetry?: () => void;
  /** Type of error (affects styling) */
  type?: 'error' | 'warning' | 'info';
}

/**
 * MutationErrorToast
 *
 * Displays error notifications when mutations fail and
 * optimistic updates are rolled back.
 *
 * @example
 * ```tsx
 * function ProfileEditor() {
 *   const [error, setError] = useState<string | null>(null);
 *   const { mutate: updateProfile } = useUpdateProfile();
 *
 *   const handleSave = () => {
 *     updateProfile(data, {
 *       onError: (err) => setError(err.message),
 *     });
 *   };
 *
 *   return (
 *     <>
 *       <ProfileForm onSubmit={handleSave} />
 *       <MutationErrorToast
 *         message={error ?? ''}
 *         visible={!!error}
 *         onDismiss={() => setError(null)}
 *         onRetry={handleSave}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function MutationErrorToast({
  message,
  visible,
  onDismiss,
  duration = 4000,
  onRetry,
  type = 'error',
}: MutationErrorToastProps) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [slideAnim, opacityAnim, onDismiss]);

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      timeoutRef.current = setTimeout(hide, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration, slideAnim, opacityAnim, hide]);

  if (!visible && !message) {
    return null;
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          container: styles.warningContainer,
          text: styles.warningText,
          icon: '⚠️',
        };
      case 'info':
        return {
          container: styles.infoContainer,
          text: styles.infoText,
          icon: 'ℹ️',
        };
      case 'error':
      default:
        return {
          container: styles.errorContainer,
          text: styles.errorText,
          icon: '❌',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        typeStyles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <View style={styles.content}>
        <Text style={styles.icon}>{typeStyles.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.message, typeStyles.text]} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <View style={styles.actions}>
          {onRetry && (
            <TouchableOpacity
              onPress={() => {
                hide();
                setTimeout(onRetry, 200);
              }}
              style={styles.retryButton}
              accessibilityLabel="Retry action"
              accessibilityRole="button">
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={hide}
            style={styles.dismissButton}
            accessibilityLabel="Dismiss notification"
            accessibilityRole="button">
            <Text style={styles.dismissText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  infoContainer: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#991B1B',
  },
  warningText: {
    color: '#92400E',
  },
  infoText: {
    color: '#1E40AF',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 6,
    marginRight: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  dismissButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default MutationErrorToast;
