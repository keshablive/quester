import React, { useCallback, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, Modal } from 'react-native';
import { Text } from '@/components/ui';
import { Users, X, WifiOff, RefreshCw } from 'lucide-react-native';
import { useFollowers, useFollowing, type SocialUser } from '@/core';

// Threshold for showing offline indicator (1 hour)
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Offline Indicator Component (FR-012)
 * Shows when cached data may be outdated
 */
function OfflineIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const isStale = Date.now() - dataUpdatedAt > OFFLINE_THRESHOLD_MS;

  if (!isStale) return null;

  return (
    <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 dark:bg-amber-900/30">
      <WifiOff size={16} className="text-amber-600 dark:text-amber-400" />
      <Text className="flex-1 text-sm text-amber-700 dark:text-amber-300">
        Showing cached data. Pull down to refresh.
      </Text>
    </View>
  );
}

interface FollowersListProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onLoadFollowers?: (userId: string) => Promise<SocialUser[]>;
}

/**
 * FollowersList Component
 *
 * Displays a modal list of followers using TanStack Query for
 * caching, offline support, and pull-to-refresh.
 *
 * US5: Infinite Scroll Lists with Seamless Loading (Feature 020)
 */
export function FollowersList({ userId, visible, onClose }: FollowersListProps) {
  // TanStack Query hook for followers (US5)
  const {
    data: followers = [],
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useFollowers(userId, {
    enabled: visible && !!userId, // Only fetch when modal is visible
  });

  const renderItem = useCallback(
    ({ item }: { item: SocialUser }) => (
      <View className="flex-row items-center border-b border-border p-4">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-base font-bold text-primary">
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-base text-foreground">{item.name}</Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: SocialUser) => item.id, []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[80%] rounded-t-3xl bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <View className="flex-row items-center">
              <Users size={20} className="mr-2 text-primary" />
              <Text className="text-lg font-bold text-foreground">Followers</Text>
              <Text className="ml-2 text-sm text-muted-foreground">({followers.length})</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {!isLoading && (
                <Pressable onPress={() => refetch()} className="p-2">
                  <RefreshCw
                    size={20}
                    className={`text-muted-foreground ${isRefetching ? 'animate-spin' : ''}`}
                  />
                </Pressable>
              )}
              <Pressable onPress={onClose}>
                <X size={24} className="text-muted-foreground" />
              </Pressable>
            </View>
          </View>

          {/* Offline Indicator */}
          <OfflineIndicator dataUpdatedAt={dataUpdatedAt} />

          {/* List */}
          {isLoading && followers.length === 0 ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" className="text-primary" />
              <Text className="mt-3 text-base text-muted-foreground">Loading followers...</Text>
            </View>
          ) : error && followers.length === 0 ? (
            <View className="items-center justify-center p-6">
              <Text className="mb-4 text-center text-base text-destructive">
                {error.message ?? 'Failed to load followers'}
              </Text>
              <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={() => refetch()}>
                <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={followers}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              refreshing={isRefetching && !isLoading}
              onRefresh={() => refetch()}
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Text className="text-base text-muted-foreground">No followers yet</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

interface FollowingListProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onLoadFollowing?: (userId: string) => Promise<SocialUser[]>;
}

/**
 * FollowingList Component
 *
 * Displays a modal list of users being followed using TanStack Query for
 * caching, offline support, and pull-to-refresh.
 *
 * US5: Infinite Scroll Lists with Seamless Loading (Feature 020)
 */
export function FollowingList({ userId, visible, onClose }: FollowingListProps) {
  // TanStack Query hook for following (US5)
  const {
    data: following = [],
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useFollowing(userId, {
    enabled: visible && !!userId, // Only fetch when modal is visible
  });

  const renderItem = useCallback(
    ({ item }: { item: SocialUser }) => (
      <View className="flex-row items-center border-b border-border p-4">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-base font-bold text-primary">
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-base text-foreground">{item.name}</Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: SocialUser) => item.id, []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[80%] rounded-t-3xl bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <View className="flex-row items-center">
              <Users size={20} className="mr-2 text-primary" />
              <Text className="text-lg font-bold text-foreground">Following</Text>
              <Text className="ml-2 text-sm text-muted-foreground">({following.length})</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {!isLoading && (
                <Pressable onPress={() => refetch()} className="p-2">
                  <RefreshCw
                    size={20}
                    className={`text-muted-foreground ${isRefetching ? 'animate-spin' : ''}`}
                  />
                </Pressable>
              )}
              <Pressable onPress={onClose}>
                <X size={24} className="text-muted-foreground" />
              </Pressable>
            </View>
          </View>

          {/* Offline Indicator */}
          <OfflineIndicator dataUpdatedAt={dataUpdatedAt} />

          {/* List */}
          {isLoading && following.length === 0 ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" className="text-primary" />
              <Text className="mt-3 text-base text-muted-foreground">Loading following...</Text>
            </View>
          ) : error && following.length === 0 ? (
            <View className="items-center justify-center p-6">
              <Text className="mb-4 text-center text-base text-destructive">
                {error.message ?? 'Failed to load following'}
              </Text>
              <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={() => refetch()}>
                <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={following}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              refreshing={isRefetching && !isLoading}
              onRefresh={() => refetch()}
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Text className="text-base text-muted-foreground">Not following anyone yet</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
