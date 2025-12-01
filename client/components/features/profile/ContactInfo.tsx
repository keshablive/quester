import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Icon, Skeleton } from '@/components/ui';
import { Mail, Calendar, AtSign } from 'lucide-react-native';
import { useCurrentUser, useUser } from '@/core/hooks/queries';
import type { ProfileProps } from './types';

/**
 * Format a date string to a human-readable "Joined" format
 */
function formatJoinedDate(dateString?: string): string {
  if (!dateString) return 'Joined recently';

  try {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `Joined ${month} ${year}`;
  } catch {
    return 'Joined recently';
  }
}

/**
 * Contact info component displaying user's email, username, and join date
 *
 * @param userId - Optional user ID. If provided, displays that user's contact info.
 *                 If omitted, displays the current authenticated user's contact info.
 *
 * Note: Email is only shown when viewing your own profile for privacy reasons.
 *
 * @example
 * ```tsx
 * // Current user's contact info (shows email)
 * <ContactInfo />
 *
 * // Another user's contact info (email hidden)
 * <ContactInfo userId="user-123" />
 * ```
 */
export function ContactInfo({ userId }: ProfileProps) {
  // Use conditional hook based on whether viewing own profile or another user's
  const { data: user, isLoading, error } = userId ? useUser(userId) : useCurrentUser();

  const isOwnProfile = !userId;

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="gap-3 p-4">
        <Skeleton className="mb-2 h-6 w-40 rounded" />
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-row items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </View>
        ))}
      </Card>
    );
  }

  // Error state - don't show the section
  if (error || !user) {
    return null;
  }

  return (
    <Card className="gap-3 p-4">
      <Text className="mb-2 text-lg font-semibold">Contact Information</Text>

      {/* Username - always shown */}
      {user.username && (
        <View className="flex-row items-center gap-3">
          <Icon as={AtSign} size={18} className="text-muted-foreground" />
          <Text className="text-muted-foreground">@{user.username}</Text>
        </View>
      )}

      {/* Email - only shown for own profile */}
      {isOwnProfile && user.email && (
        <View className="flex-row items-center gap-3">
          <Icon as={Mail} size={18} className="text-muted-foreground" />
          <Text className="text-muted-foreground">{user.email}</Text>
        </View>
      )}

      {/* Join date - always shown */}
      <View className="flex-row items-center gap-3">
        <Icon as={Calendar} size={18} className="text-muted-foreground" />
        <Text className="text-muted-foreground">{formatJoinedDate(user.createdAt)}</Text>
      </View>
    </Card>
  );
}
