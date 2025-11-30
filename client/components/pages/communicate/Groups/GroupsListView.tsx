/**
 * GroupsListView Component
 *
 * Group list with TanStack Query caching and offline support.
 *
 * US6: Group Management with Cache (Priority: P3)
 * FR-018: useGroups() returns group list with cache
 *
 * @module components/pages/communicate/Groups/GroupsListView
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, TextInput, Pressable, RefreshControl } from 'react-native';
import { Text, Skeleton, Icon, Card } from '@/components/ui';
import { Users, Plus, Search } from 'lucide-react-native';
import { useGroups, type Group, cn, OptimizedList, type ListRenderItemInfo } from '@/core';
import { OfflineIndicator, ErrorState } from '@/components/shared';
import { useRouter } from 'expo-router';

// ============================================================================
// Types
// ============================================================================

interface GroupsListViewProps {
  /** Callback when create group button is pressed */
  onCreateGroup?: () => void;
  /** Callback when a group is selected */
  onGroupPress?: (group: Group) => void;
  /** Test ID for automation */
  testID?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

interface GroupCardProps {
  group: Group;
  onPress: (id: string) => void;
}

function GroupCard({ group, onPress }: GroupCardProps) {
  return (
    <Pressable
      className="mb-3 flex-row items-center rounded-xl border border-border bg-card p-4"
      onPress={() => onPress(group.id)}>
      <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Icon as={Users} size={24} className="text-primary" />
      </View>
      <View className="flex-1">
        <Text className="mb-1 text-base font-semibold text-foreground">{group.name}</Text>
        {group.description && (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {group.description}
          </Text>
        )}
        <Text className="mt-1 text-xs text-muted-foreground">
          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * T052: Empty state for no groups
 */
function EmptyGroups({ onCreateGroup }: { onCreateGroup?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon as={Users} size={40} className="text-muted-foreground" />
      </View>
      <Text className="mb-2 text-lg font-semibold text-foreground">No groups yet</Text>
      <Text className="mb-4 text-center text-sm text-muted-foreground">
        Join a group or create your own to connect with others
      </Text>
      {onCreateGroup && (
        <Pressable className="rounded-lg bg-primary px-4 py-2" onPress={onCreateGroup}>
          <Text className="font-semibold text-primary-foreground">Create Group</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Loading skeleton for groups list
 */
function GroupsSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="flex-row items-center p-4">
          <Skeleton className="mr-3 h-12 w-12 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * GroupsListView
 *
 * T050: Migrated from useState/useEffect to useGroups() hook
 * T052: Empty state for no groups
 * T055: OfflineIndicator integration
 *
 * @example
 * ```tsx
 * <GroupsListView
 *   onCreateGroup={() => router.push('/groups/create')}
 *   onGroupPress={(group) => router.push(`/groups/${group.id}`)}
 * />
 * ```
 */
export function GroupsListView({
  onCreateGroup,
  onGroupPress,
  testID = 'groups-list',
}: GroupsListViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // T050: Use TanStack Query hook
  const { data: groupsData, isLoading, isRefetching, error, refetch } = useGroups();

  // Ensure groups is always an array for type safety
  const groups = groupsData ?? [];

  // Client-side search filtering
  const filteredGroups = useMemo(() => {
    if (!groups.length) return [];
    if (!searchQuery) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter(
      (g) => g.name.toLowerCase().includes(query) || g.description?.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Group press handler
  const handleGroupPress = useCallback(
    (group: Group) => {
      if (onGroupPress) {
        onGroupPress(group);
      } else {
        // Type assertion needed for dynamic routes
        router.push(`/groups/${group.id}` as any);
      }
    },
    [onGroupPress, router]
  );

  // Render item callback
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Group>) => (
      <GroupCard group={item} onPress={() => handleGroupPress(item)} />
    ),
    [handleGroupPress]
  );

  const keyExtractor = useCallback((item: Group) => item.id, []);

  // Error state
  if (error && !groups.length) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <ErrorState
          title="Failed to Load Groups"
          message={error.message || 'Could not load groups'}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  // Loading state
  if (isLoading && !groups.length) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <GroupsSkeleton />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* T055: OfflineIndicator */}
      <OfflineIndicator />

      {/* Search */}
      <View className="p-4">
        <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
          <Icon as={Search} size={20} className="mr-2 text-muted-foreground" />
          <TextInput
            className="flex-1 text-base text-foreground"
            placeholder="Search groups..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Groups List */}
      {filteredGroups.length === 0 && !searchQuery ? (
        <EmptyGroups onCreateGroup={onCreateGroup} />
      ) : (
        <OptimizedList<Group>
          data={filteredGroups}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          estimatedItemSize={100}
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          testID={testID}
          ListEmptyComponent={
            searchQuery ? (
              <View className="items-center py-8">
                <Text className="text-muted-foreground">No groups matching "{searchQuery}"</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Create Group FAB */}
      <Pressable
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
        onPress={onCreateGroup || (() => router.push('/groups/create' as any))}>
        <Icon as={Plus} size={24} className="text-primary-foreground" />
      </Pressable>
    </View>
  );
}

export default GroupsListView;
