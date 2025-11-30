/**
 * GroupDetailView Component
 *
 * Group detail with TanStack Query caching and member management.
 *
 * US6: Group Management with Cache (Priority: P3)
 * T051: GroupDetail uses useGroup(groupId) hook
 *
 * @module components/pages/communicate/Groups/GroupDetailView
 */

import React, { useCallback } from 'react';
import { View, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import {
  Text,
  Skeleton,
  Icon,
  Button,
  Card,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui';
import { Users, ChevronLeft, Settings, LogOut, UserPlus } from 'lucide-react-native';
import {
  useGroup,
  useGroupMembers,
  type Group,
  type GroupMember,
  cn,
  OptimizedList,
  type ListRenderItemInfo,
} from '@/core';
import { useJoinGroup, useLeaveGroup } from '@/core/hooks/mutations/useGroupMutations';
import { OfflineIndicator, ErrorState } from '@/components/shared';
import { useRouter, useLocalSearchParams } from 'expo-router';

// ============================================================================
// Types
// ============================================================================

interface GroupDetailViewProps {
  /** Group ID (can also be retrieved from route params) */
  groupId?: string;
  /** Callback when back button is pressed */
  onBack?: () => void;
  /** Test ID for automation */
  testID?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Member card component
 */
function MemberCard({ member }: { member: GroupMember }) {
  return (
    <View className="mr-4 items-center">
      <Avatar alt={member.displayName || member.username} className="h-12 w-12">
        {member.avatarUrl ? (
          <AvatarImage source={{ uri: member.avatarUrl }} />
        ) : (
          <AvatarFallback>
            <Text className="text-sm font-semibold text-muted-foreground">
              {(member.displayName || member.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </AvatarFallback>
        )}
      </Avatar>
      <Text className="mt-1 text-xs text-foreground" numberOfLines={1}>
        {member.displayName || member.username}
      </Text>
      {member.role !== 'member' && (
        <Text className="text-xs capitalize text-primary">{member.role}</Text>
      )}
    </View>
  );
}

/**
 * Loading skeleton for group detail
 */
function GroupDetailSkeleton() {
  return (
    <View className="flex-1 bg-background p-4">
      {/* Header skeleton */}
      <View className="items-center pb-6">
        <Skeleton className="mb-4 h-24 w-24 rounded-full" />
        <Skeleton className="mb-2 h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </View>

      {/* Stats skeleton */}
      <View className="mb-6 flex-row justify-center gap-8">
        <View className="items-center">
          <Skeleton className="mb-1 h-6 w-12" />
          <Skeleton className="h-4 w-16" />
        </View>
        <View className="items-center">
          <Skeleton className="mb-1 h-6 w-12" />
          <Skeleton className="h-4 w-16" />
        </View>
      </View>

      {/* Action button skeleton */}
      <Skeleton className="mx-4 mb-6 h-12 rounded-lg" />

      {/* Members skeleton */}
      <View className="px-4">
        <Skeleton className="mb-3 h-5 w-24" />
        <View className="flex-row">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="mr-4 items-center">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="mt-1 h-3 w-16" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * T052: Empty state for no group found
 */
function GroupNotFound({ onBack }: { onBack?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-background py-12">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon as={Users} size={40} className="text-muted-foreground" />
      </View>
      <Text className="mb-2 text-lg font-semibold text-foreground">Group not found</Text>
      <Text className="mb-4 text-center text-sm text-muted-foreground">
        This group may have been deleted or you don't have access
      </Text>
      {onBack && (
        <Button variant="outline" onPress={onBack}>
          Go Back
        </Button>
      )}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * GroupDetailView
 *
 * T051: Uses useGroup(groupId) hook for data fetching
 * T053: Error state with retry
 * T054: Cache invalidation on join/leave via useJoinGroup/useLeaveGroup
 * T055: OfflineIndicator integration
 *
 * @example
 * ```tsx
 * <GroupDetailView
 *   groupId="group-123"
 *   onBack={() => router.back()}
 * />
 * ```
 */
export function GroupDetailView({
  groupId: propsGroupId,
  onBack,
  testID = 'group-detail',
}: GroupDetailViewProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const groupId = propsGroupId || params.id;

  // T051: Use TanStack Query hooks
  const { data: group, isLoading, isRefetching, error, refetch } = useGroup(groupId ?? '');

  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId ?? '');

  // T054: Mutations for join/leave with cache invalidation
  const { mutate: joinGroup, isPending: isJoining } = useJoinGroup();
  const { mutate: leaveGroup, isPending: isLeaving } = useLeaveGroup();

  // Navigation handler
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Join/Leave handler
  const handleToggleMembership = useCallback(() => {
    if (!groupId) return;

    if (group?.isJoined) {
      leaveGroup(groupId);
    } else {
      joinGroup(groupId);
    }
  }, [groupId, group?.isJoined, joinGroup, leaveGroup]);

  // Member render callback
  const renderMember = useCallback(
    ({ item }: ListRenderItemInfo<GroupMember>) => <MemberCard member={item} />,
    []
  );

  const keyExtractor = useCallback((item: GroupMember) => item.userId, []);

  // No group ID provided
  if (!groupId) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <GroupNotFound onBack={handleBack} />
      </View>
    );
  }

  // T053: Error state with retry
  if (error && !group) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <View className="flex-row items-center border-b border-border p-4">
          <Pressable onPress={handleBack} className="mr-4">
            <Icon as={ChevronLeft} size={24} className="text-foreground" />
          </Pressable>
          <Text className="text-lg font-semibold text-foreground">Group</Text>
        </View>
        <ErrorState
          title="Failed to Load Group"
          message={error.message || 'Could not load group details'}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  // Loading state
  if (isLoading && !group) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <View className="flex-row items-center border-b border-border p-4">
          <Pressable onPress={handleBack} className="mr-4">
            <Icon as={ChevronLeft} size={24} className="text-foreground" />
          </Pressable>
          <Skeleton className="h-5 w-32" />
        </View>
        <GroupDetailSkeleton />
      </View>
    );
  }

  // Group not found
  if (!group) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <GroupNotFound onBack={handleBack} />
      </View>
    );
  }

  const isMutating = isJoining || isLeaving;

  return (
    <View className="flex-1 bg-background" testID={testID}>
      {/* T055: OfflineIndicator */}
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border p-4">
        <View className="flex-row items-center">
          <Pressable onPress={handleBack} className="mr-4">
            <Icon as={ChevronLeft} size={24} className="text-foreground" />
          </Pressable>
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {group.name}
          </Text>
        </View>
        {group.isJoined && (
          <Pressable className="p-2">
            <Icon as={Settings} size={20} className="text-muted-foreground" />
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}>
        {/* Group Image */}
        <View className="items-center py-6">
          {group.imageUrl ? (
            <Image source={{ uri: group.imageUrl }} className="mb-4 h-24 w-24 rounded-full" />
          ) : (
            <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <Icon as={Users} size={48} className="text-primary" />
            </View>
          )}
          <Text className="mb-2 text-xl font-bold text-foreground">{group.name}</Text>
          {group.description && (
            <Text className="px-8 text-center text-sm text-muted-foreground">
              {group.description}
            </Text>
          )}
        </View>

        {/* Stats */}
        <View className="mb-6 flex-row justify-center gap-12">
          <View className="items-center">
            <Text className="text-xl font-bold text-foreground">{group.memberCount}</Text>
            <Text className="text-sm text-muted-foreground">Members</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-foreground">
              {group.isPublic ? 'Public' : 'Private'}
            </Text>
            <Text className="text-sm text-muted-foreground">Visibility</Text>
          </View>
        </View>

        {/* Action Button */}
        <View className="mx-4 mb-6">
          <Button
            variant={group.isJoined ? 'outline' : 'default'}
            className="w-full"
            onPress={handleToggleMembership}
            disabled={isMutating}>
            <View className="flex-row items-center justify-center gap-2">
              <Icon
                as={group.isJoined ? LogOut : UserPlus}
                size={20}
                className={group.isJoined ? 'text-foreground' : 'text-primary-foreground'}
              />
              <Text
                className={cn(
                  'font-semibold',
                  group.isJoined ? 'text-foreground' : 'text-primary-foreground'
                )}>
                {isMutating
                  ? group.isJoined
                    ? 'Leaving...'
                    : 'Joining...'
                  : group.isJoined
                    ? 'Leave Group'
                    : 'Join Group'}
              </Text>
            </View>
          </Button>
        </View>

        {/* Members Section */}
        <View className="px-4 pb-8">
          <Text className="mb-3 text-base font-semibold text-foreground">
            Members ({group.memberCount})
          </Text>

          {membersLoading ? (
            <View className="flex-row">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="mr-4 items-center">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </View>
              ))}
            </View>
          ) : members?.length ? (
            <OptimizedList<GroupMember>
              data={members}
              keyExtractor={keyExtractor}
              renderItem={renderMember}
              horizontal
              showsHorizontalScrollIndicator={false}
              estimatedItemSize={80}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          ) : (
            <Text className="text-sm text-muted-foreground">No members yet</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default GroupDetailView;
