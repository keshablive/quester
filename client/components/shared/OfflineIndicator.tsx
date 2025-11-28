/**
 * OfflineIndicator Component
 *
 * Displays offline status banner when device loses network connectivity.
 * Uses TanStack Query's onlineManager to detect network state.
 *
 * US1: Provides visual feedback for cached data usage.
 *
 * @module components/shared/OfflineIndicator
 */

import React from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useOnlineManager } from '../../core/hooks/useOnlineManager';

interface OfflineIndicatorProps {
  /** Optional custom message */
  message?: string;
  /** Show even when online (for testing) */
  forceShow?: boolean;
}

/**
 * Offline indicator banner
 *
 * Slides in from the top when device goes offline.
 * Automatically hides when connectivity is restored.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <OfflineIndicator />
 *       <MainContent />
 *     </>
 *   );
 * }
 * ```
 */
export function OfflineIndicator({
  message = 'You are offline. Showing cached data.',
  forceShow = false,
}: OfflineIndicatorProps) {
  const { isOnline } = useOnlineManager();
  const slideAnim = React.useRef(new Animated.Value(-50)).current;
  const [shouldRender, setShouldRender] = React.useState(!isOnline || forceShow);

  React.useEffect(() => {
    const shouldShow = !isOnline || forceShow;

    if (shouldShow) {
      setShouldRender(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [isOnline, forceShow, slideAnim]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📡</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FEF3C7', // amber-100
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B', // amber-500
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  icon: {
    fontSize: 16,
  },
  message: {
    color: '#92400E', // amber-800
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default OfflineIndicator;
