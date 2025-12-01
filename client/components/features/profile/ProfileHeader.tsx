import * as React from 'react';
import { View } from 'react-native';
import {
  Text,
  Card,
  Button,
  Icon,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Skeleton,
} from '@/components/ui';
import { User as UserIcon, Edit, Share2 } from 'lucide-react-native';
import { useCurrentUser, useUser } from '@/core/hooks/queries';
import type { ProfileProps } from './types';

/**
 * Profile header component displaying user avatar, name, and actions
 *
 * @param userId - Optional user ID. If provided, displays that user's profile.
 *                 If omitted, displays the current authenticated user's profile.
 *
 * @example
 * ```tsx
 * // Current user's profile
 * <ProfileHeader />
 *
 * // Another user's profile
 * <ProfileHeader userId="user-123" />
 * ```
 */
export function ProfileHeader({ userId }: ProfileProps) {
  // Use conditional hook based on whether viewing own profile or another user's
  const { data: user, isLoading, error } = userId ? useUser(userId) : useCurrentUser();

  const isOwnProfile = !userId;

  // Generate initials from display name or username for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="p-6">
        <View className="items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <View className="items-center gap-2">
            <Skeleton className="h-7 w-32 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
          </View>
          <View className="mt-2 flex-row gap-2">
            <Skeleton className="h-10 w-28 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </View>
        </View>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <View className="items-center gap-4">
          <Avatar alt="User Avatar" className="h-24 w-24">
            <AvatarFallback>
              <Icon as={UserIcon} size={40} />
            </AvatarFallback>
          </Avatar>
          <Text className="text-destructive">Failed to load profile</Text>
        </View>
      </Card>
    );
  }

  const displayName = user?.displayName || user?.username || 'Unknown User';
  const role = user?.role || 'User';

  return (
    <Card className="p-6">
      <View className="items-center gap-4">
        <Avatar alt={`${displayName}'s avatar`} className="h-24 w-24">
          {user?.avatarUrl ? (
            <AvatarImage source={{ uri: user.avatarUrl }} />
          ) : (
            <AvatarFallback>
              <Text className="text-2xl font-bold">{getInitials(displayName)}</Text>
            </AvatarFallback>
          )}
        </Avatar>

        <View className="items-center gap-1">
          <Text className="text-2xl font-bold">{displayName}</Text>
          <Text className="capitalize text-muted-foreground">{role}</Text>
        </View>

        <View className="mt-2 flex-row gap-2">
          {isOwnProfile ? (
            <Button variant="default">
              <Icon as={Edit} size={16} />
              <Text>Edit Profile</Text>
            </Button>
          ) : (
            <Button variant="default">
              <Text>Follow</Text>
            </Button>
          )}
          <Button variant="outline">
            <Icon as={Share2} size={16} />
            <Text>Share</Text>
          </Button>
        </View>
      </View>
    </Card>
  );
}
