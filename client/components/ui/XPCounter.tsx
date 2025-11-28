import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform } from 'react-native';
import { cn } from '@/core';
import { Text } from '@/components/ui/text';

interface XPCounterProps {
  /** Current XP value */
  value: number;
  /** Previous XP value for animation */
  previousValue?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show XP label */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * XP Counter component with animated value changes
 * FR-003: Visual XP display in header/profile
 */
export function XPCounter({
  value,
  previousValue,
  size = 'md',
  showLabel = true,
  className,
}: XPCounterProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Only animate if value increased
    if (previousValue !== undefined && value > previousValue) {
      // Bounce animation
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Small bounce up
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 0,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value, previousValue, scaleAnim, bounceAnim, glowAnim]);

  const sizeClasses = {
    sm: 'px-2 py-0.5',
    md: 'px-3 py-1',
    lg: 'px-4 py-2',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const formatXP = (xp: number): string => {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    }
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }, { translateY: bounceAnim }],
        },
      ]}
      className={cn(
        'flex-row items-center gap-1.5 rounded-full bg-yellow-500/20',
        sizeClasses[size],
        Platform.select({
          web: 'transition-shadow',
        }),
        className
      )}>
      {/* XP Icon */}
      <Animated.View
        className={cn('items-center justify-center rounded-full bg-yellow-400', iconSizes[size])}
        style={{
          shadowOpacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.8],
          }),
          shadowRadius: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 8],
          }),
          shadowColor: '#facc15',
          shadowOffset: { width: 0, height: 0 },
        }}>
        <Text
          className={cn(
            'font-bold text-yellow-900',
            size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-xs'
          )}>
          XP
        </Text>
      </Animated.View>

      {/* Value */}
      <View className="flex-row items-baseline">
        <Text className={cn('font-bold text-yellow-600', textSizes[size])}>{formatXP(value)}</Text>
        {showLabel && (
          <Text
            className={cn('ml-0.5 text-yellow-600/70', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
            XP
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * XP Counter with change indicator
 */
interface XPCounterWithChangeProps extends XPCounterProps {
  /** Amount of recent XP change to display */
  recentChange?: number;
}

export function XPCounterWithChange({ recentChange, ...props }: XPCounterWithChangeProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (recentChange && recentChange > 0) {
      // Show change indicator
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Fade out after delay
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -10,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [recentChange, fadeAnim, slideAnim]);

  return (
    <View className="flex-row items-center">
      <XPCounter {...props} />

      {recentChange && recentChange > 0 && (
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
          className="ml-1">
          <Text className="text-xs font-bold text-green-500">+{recentChange}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default XPCounter;
