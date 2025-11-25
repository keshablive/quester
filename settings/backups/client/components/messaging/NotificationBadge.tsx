import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  style?: ViewStyle;
  showZero?: boolean;
  pulse?: boolean;
}

export function NotificationBadge({
  count,
  maxCount = 99,
  size = 'medium',
  color = '#FF3B30',
  textColor = '#FFFFFF',
  style,
  showZero = false,
  pulse = false,
}: NotificationBadgeProps) {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Format count text
  const countText = count > maxCount ? `${maxCount}+` : count.toString();

  // Get size-specific className
  const sizeClasses = {
    small: 'h-4 min-w-[16px] px-0.75',
    medium: 'h-5 min-w-[20px] px-1',
    large: 'h-6 min-w-[24px] px-1.5',
  };

  const textSizeClasses = {
    small: 'text-[10px] leading-3',
    medium: 'text-xs leading-[14px]',
    large: 'text-sm leading-4',
  };

  return (
    <View
      className={`min-w-[20px] items-center justify-center rounded-full px-1 ${sizeClasses[size]} ${pulse ? 'shadow-md' : ''}`}
      style={[
        { backgroundColor: color },
        pulse && {
          shadowColor: '#FF3B30',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: 4,
        },
        style,
      ]}>
      <Text
        className={`text-center font-bold ${textSizeClasses[size]}`}
        style={{ color: textColor }}
        numberOfLines={1}>
        {countText}
      </Text>
    </View>
  );
}
