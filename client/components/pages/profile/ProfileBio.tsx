import * as React from 'react';
import { Text, Card, Skeleton } from '@/components/ui';
import { View } from 'react-native';
import { useCurrentUser, useUser } from '@/core/hooks/queries';
import type { ProfileProps } from './types';

/**
 * Profile bio component displaying user's about/bio text
 *
 * @param userId - Optional user ID. If provided, displays that user's bio.
 *                 If omitted, displays the current authenticated user's bio.
 *
 * @example
 * ```tsx
 * // Current user's bio
 * <ProfileBio />
 *
 * // Another user's bio
 * <ProfileBio userId="user-123" />
 * ```
 */
export function ProfileBio({ userId }: ProfileProps) {
  // Use conditional hook based on whether viewing own profile or another user's
  const { data: user, isLoading, error } = userId ? useUser(userId) : useCurrentUser();

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="gap-3 p-4">
        <Skeleton className="h-6 w-16 rounded" />
        <View className="gap-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </View>
      </Card>
    );
  }

  // Error state - don't show the section
  if (error) {
    return null;
  }

  const bio = user?.bio || 'No bio yet';

  return (
    <Card className="gap-3 p-4">
      <Text className="text-lg font-semibold">About</Text>
      <Text className="text-muted-foreground">{bio}</Text>
    </Card>
  );
}
