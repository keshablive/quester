import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

type NotificationBadgeProps = {
  count: number;
  size?: 'small' | 'medium';
};

/**
 * NotificationBadge Component - Optimized with React.memo (Phase 7, T112)
 *
 * Prevents unnecessary re-renders when parent navigation components update.
 * Only re-renders when count or size props change.
 */
export const NotificationBadge = React.memo(({ count, size = 'small' }: NotificationBadgeProps) => {
  if (count === 0) {
    return null;
  }

  const displayCount = count > 9 ? '9+' : count.toString();
  const sizeClasses = size === 'small' ? 'h-[18px]' : 'h-5 min-w-[20px] px-[5px]';

  return (
    <View
      testID="notification-badge"
      accessibilityLabel={`${count} unread notifications`}
      accessibilityRole="text"
      className={`min-w-[18px] items-center justify-center rounded-[10px] bg-red-500 px-1 ${sizeClasses}`}>
      <Text className="text-center text-[11px] font-semibold text-white">{displayCount}</Text>
    </View>
  );
});
