/**
 * PrefetchableAvatar Component
 *
 * An Avatar wrapper that prefetches user data on hover/focus.
 * This improves perceived performance by loading user profile data
 * before the user navigates to the profile.
 *
 * @module components/shared/PrefetchableAvatar
 */

import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui';
import { User } from 'lucide-react-native';
import { prefetchUser } from '@/core/query/prefetch';
import { useQueryClient } from '@tanstack/react-query';

export interface PrefetchableAvatarProps {
  /** User ID to prefetch on hover */
  userId: string;
  /** Avatar image URL */
  imageUrl?: string;
  /** Display name for alt text and fallback */
  displayName?: string;
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show online indicator */
  showOnlineIndicator?: boolean;
  /** Whether the user is online */
  isOnline?: boolean;
  /** Callback when avatar is pressed */
  onPress?: () => void;
  /** Additional className for styling */
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const ICON_SIZE_MAP = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

/**
 * Avatar component that prefetches user data on hover
 *
 * Uses TanStack Query prefetching to load user profile data
 * when the user hovers over the avatar, before they click.
 *
 * @example
 * ```tsx
 * <PrefetchableAvatar
 *   userId="user-123"
 *   imageUrl={user.avatarUrl}
 *   displayName={user.displayName}
 *   onPress={() => router.push(`/profile/${userId}`)}
 * />
 * ```
 */
export function PrefetchableAvatar({
  userId,
  imageUrl,
  displayName = 'User',
  size = 'md',
  showOnlineIndicator = false,
  isOnline = false,
  onPress,
  className,
}: PrefetchableAvatarProps) {
  const queryClient = useQueryClient();
  const prefetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPrefetchedRef = React.useRef(false);

  /**
   * Prefetch user data with debounce to avoid excessive prefetching
   */
  const handleHoverIn = React.useCallback(() => {
    // Only prefetch once per mount
    if (hasPrefetchedRef.current) return;

    // Debounce prefetch to avoid triggering on quick mouse movements
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchUser(userId, queryClient);
      hasPrefetchedRef.current = true;
    }, 100);
  }, [queryClient, userId]);

  /**
   * Cancel prefetch if hover ends quickly
   */
  const handleHoverOut = React.useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  /**
   * Cleanup timeout on unmount
   */
  React.useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  const sizeClass = SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarContent = (
    <View className="relative">
      <Avatar alt={displayName} className={`${sizeClass} ${className || ''}`}>
        {imageUrl ? (
          <AvatarImage source={{ uri: imageUrl }} />
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70">
            {initials ? (
              <View className="items-center justify-center">
                <User size={iconSize} className="text-primary-foreground" strokeWidth={2.5} />
              </View>
            ) : (
              <User size={iconSize} className="text-primary-foreground" strokeWidth={2.5} />
            )}
          </AvatarFallback>
        )}
      </Avatar>

      {/* Online indicator */}
      {showOnlineIndicator && (
        <View
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        onPressIn={handleHoverIn}
        accessible
        accessibilityLabel={`View ${displayName}'s profile`}
        accessibilityRole="button">
        {avatarContent}
      </Pressable>
    );
  }

  return (
    <Pressable onHoverIn={handleHoverIn} onHoverOut={handleHoverOut} accessible={false}>
      {avatarContent}
    </Pressable>
  );
}

export default PrefetchableAvatar;
