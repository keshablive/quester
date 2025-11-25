/**
 * OnlineStatusBadge Component (T149)
 * Feature 003: Real-Time Collaboration
 * Phase 9 US7: Real-Time Collaboration & Social Engagement
 *
 * Displays user online status with:
 * - Status colors (online: green, offline: gray, away: yellow, busy: red)
 * - Size variants (small, medium, large)
 * - Optional absolute positioning (for avatars)
 * - Optional last seen timestamp
 * - Border for visibility on avatars
 * - Accessibility support
 *
 * Usage:
 * ```tsx
 * // Simple badge
 * <OnlineStatusBadge status="online" />
 *
 * // On avatar with last seen
 * <View>
 *   <Image source={avatar} />
 *   <OnlineStatusBadge
 *     status="offline"
 *     lastSeen={timestamp}
 *     showLastSeen
 *     showAbsolute
 *   />
 * </View>
 * ```
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { OnlinePresence } from '@/lib/types/real-time';

interface OnlineStatusBadgeProps {
  status: OnlinePresence['status'];
  size?: 'small' | 'medium' | 'large';
  showBorder?: boolean;
  showAbsolute?: boolean;
  showLastSeen?: boolean;
  lastSeen?: number;
  className?: string;
}

export function OnlineStatusBadge({
  status,
  size = 'medium',
  showBorder = true,
  showAbsolute = false,
  showLastSeen = false,
  lastSeen,
  className = '',
}: OnlineStatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-2 h-2';
      case 'large':
        return 'w-4 h-4';
      case 'medium':
      default:
        return 'w-3 h-3';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  };

  const shouldShowLastSeen = showLastSeen && status === 'offline' && lastSeen;
  const lastSeenText = shouldShowLastSeen ? formatLastSeen(lastSeen) : '';
  const accessibilityLabel = shouldShowLastSeen
    ? `${getStatusLabel()}. Last seen ${lastSeenText}`
    : getStatusLabel();

  const positionClasses = showAbsolute ? 'absolute bottom-0 right-0' : '';
  const borderClasses = showBorder ? 'border-2 border-white' : '';

  return (
    <View testID="online-status-container" className={`${positionClasses} ${className}`}>
      <View
        testID="online-status-badge"
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        className={`${getSizeClasses()} ${getStatusColor()} ${borderClasses} rounded-full`}
      />
      {shouldShowLastSeen && (
        <Text variant="small" className="mt-1 text-muted-foreground">
          Last seen {lastSeenText}
        </Text>
      )}
    </View>
  );
}
