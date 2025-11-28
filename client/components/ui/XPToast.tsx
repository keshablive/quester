import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, Platform } from 'react-native';
import { cn } from '@/core';
import { Text } from '@/components/ui/text';
import { useXPNotification, getXPTypeMessage } from '@/core/hooks/useXPNotification';

interface XPToastProps {
  /** Additional class names */
  className?: string;
  /** Position of the toast */
  position?: 'top' | 'bottom';
}

/**
 * XP Toast component for displaying XP notifications
 * FR-003: Visual feedback for XP earned with animations
 */
export function XPToast({ className, position = 'top' }: XPToastProps) {
  const { currentNotification, dismissNotification } = useXPNotification();

  // Animation values
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentNotification) {
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation for emphasis
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: position === 'top' ? -100 : 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentNotification, position, slideAnim, opacityAnim, scaleAnim, glowAnim]);

  if (!currentNotification) {
    return null;
  }

  const { totalAmount, notifications } = currentNotification;
  const primaryType = notifications[0]?.type || 'like';
  const message =
    notifications.length > 1 ? `${notifications.length} actions` : getXPTypeMessage(primaryType);

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
      className={cn(
        'absolute left-4 right-4 z-50',
        position === 'top' ? 'top-16' : 'bottom-24',
        className
      )}>
      <Pressable
        onPress={dismissNotification}
        className={cn(
          'flex-row items-center justify-between',
          'rounded-2xl bg-primary/95 px-4 py-3',
          'shadow-lg',
          Platform.select({
            web: 'cursor-pointer backdrop-blur-sm transition-colors hover:bg-primary',
          })
        )}>
        {/* XP Icon */}
        <View className="flex-row items-center gap-3">
          <Animated.View
            className="h-10 w-10 items-center justify-center rounded-full bg-yellow-400"
            style={{
              shadowOpacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
              shadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 12],
              }),
              shadowColor: '#facc15',
              shadowOffset: { width: 0, height: 0 },
            }}>
            <Text className="text-lg font-bold text-yellow-900">XP</Text>
          </Animated.View>

          {/* Amount and message */}
          <View>
            <Text className="text-xl font-bold text-primary-foreground">+{totalAmount} XP</Text>
            <Text className="text-sm text-primary-foreground/80">{message}</Text>
          </View>
        </View>

        {/* Dismiss indicator */}
        <View className="rounded-full bg-primary-foreground/20 px-2 py-1">
          <Text className="text-xs text-primary-foreground">Tap to dismiss</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default XPToast;
