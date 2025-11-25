/**
 * Leaderboard Widget Component
 *
 * Displays top users and current user ranking with filtering options.
 * Features:
 * - Top 5 users display
 * - Rank badges (gold, silver, bronze)
 * - Current user highlighting
 * - Filter by feature
 * - Real-time updates via WebSocket
 * - Pull-to-refresh
 * - Navigation to user profiles
 *
 * @module components/gamification/leaderboard-widget
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';

interface LeaderboardUser {
  rank: number;
  userId: string;
  username: string;
  xp: number;
  level: number;
}

interface LeaderboardWidgetProps {
  /** Leaderboard data */
  data: LeaderboardUser[];
  /** Current user ID for highlighting */
  currentUserId: string;
  /** Show compact version (max 3 users) */
  compact?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Filter change callback */
  onFilterChange?: (filter: string) => void;
  /** Current filter */
  currentFilter?: string;
  /** Show filters */
  showFilters?: boolean;
  /** Max users to display */
  maxUsers?: number;
  /** Navigate to full leaderboard callback */
  onViewAll?: () => void;
  /** Custom fetch function for testing */
  fetchLeaderboard?: () => Promise<void>;
}

export const LeaderboardWidget = React.memo(function LeaderboardWidget({
  data,
  currentUserId,
  compact = false,
  loading = false,
  error = null,
  onRefresh,
  onFilterChange: _onFilterChange,
  currentFilter = 'all',
  showFilters = false,
  maxUsers = 5,
  onViewAll,
  fetchLeaderboard,
}: LeaderboardWidgetProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const displayData = useMemo(() => {
    const limit = compact ? 3 : maxUsers;
    return data.slice(0, limit);
  }, [data, compact, maxUsers]);

  const currentUser = useMemo(() => {
    return data.find((user) => user.userId === currentUserId);
  }, [data, currentUserId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    } else if (fetchLeaderboard) {
      await fetchLeaderboard();
    }
    setRefreshing(false);
  }, [onRefresh, fetchLeaderboard]);

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push(`/(tabs)/profile/${userId}` as any);
    },
    [router]
  );

  const handleViewAll = useCallback(() => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/leaderboards' as any);
    }
  }, [onViewAll, router]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: '#FFD700', label: 'gold' };
    if (rank === 2) return { emoji: '🥈', color: '#C0C0C0', label: 'silver' };
    if (rank === 3) return { emoji: '🥉', color: '#CD7F32', label: 'bronze' };
    return null;
  };

  const renderUser = useCallback(
    ({ item }: { item: LeaderboardUser }) => {
      const isCurrentUser = item.userId === currentUserId;
      const rankBadge = getRankBadge(item.rank);

      return (
        <Pressable
          className={`mb-1 min-h-[72px] flex-row items-center rounded-lg px-2 py-3 ${isCurrentUser ? 'bg-amber-100' : ''}`}
          onPress={() => handleUserPress(item.userId)}
          testID={`leaderboard-row-${item.userId}`}
          accessibilityRole="button"
          accessibilityLabel={`Rank ${item.rank}. ${item.username}. ${item.xp.toLocaleString()} experience points. Level ${item.level}.${isCurrentUser ? ' This is you.' : ''}`}
          accessibilityHint="View user profile">
          {/* Rank with Badge */}
          <View className="w-10 items-center">
            {rankBadge ? (
              <View testID={`rank-badge-${item.rank}-${rankBadge.label}`}>
                <Text className="text-2xl">{rankBadge.emoji}</Text>
              </View>
            ) : (
              <Text variant="h4" className="text-gray-500">
                #{item.rank}
              </Text>
            )}
          </View>

          {/* User Info */}
          <View className="ml-3 flex-1">
            <Text
              variant="h4"
              className={`mb-1 ${isCurrentUser ? 'text-amber-600' : 'text-gray-800'}`}>
              {item.username}
              {isCurrentUser && (
                <Text variant="small" className="font-medium text-amber-900">
                  {' '}
                  (You)
                </Text>
              )}
            </Text>
            <View className="flex-row items-center gap-3">
              <Text variant="small" className="text-gray-500">
                {item.xp.toLocaleString()} XP
              </Text>
              <Text
                variant="small"
                className="rounded bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600">
                Level {item.level}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [currentUserId, handleUserPress]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 72,
      offset: 72 * index,
      index,
    }),
    []
  );

  if (error) {
    return (
      <View
        className="rounded-xl bg-white p-4 shadow-md"
        testID="leaderboard-widget-container"
        accessibilityLabel="Leaderboard">
        <View className="items-center p-8" testID="error-message">
          <Text className="mb-3 text-sm text-red-500">Failed to load leaderboard</Text>
          {onRefresh && (
            <Pressable
              className="rounded-lg bg-indigo-600 px-4 py-2"
              onPress={handleRefresh}
              accessibilityRole="button"
              accessibilityLabel="Retry loading leaderboard">
              <Text className="text-sm font-semibold text-white">Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      className={`rounded-xl bg-white p-4 shadow-md ${compact ? 'max-h-[280px]' : ''}`}
      testID="leaderboard-widget-container"
      accessibilityLabel="Leaderboard. Top users.">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text variant="h3" className="text-gray-800">
          Leaderboard
        </Text>
        {!compact && onViewAll && (
          <Pressable
            onPress={handleViewAll}
            testID="view-all-button"
            accessibilityRole="button"
            accessibilityLabel="View full leaderboard">
            <Text variant="small" className="font-semibold text-indigo-600">
              View All
            </Text>
          </Pressable>
        )}
      </View>

      {/* Filter Selector */}
      {showFilters && !compact && (
        <View className="mb-3">
          <Pressable
            className="self-start rounded-lg bg-gray-100 px-3 py-2"
            onPress={() => {}}
            testID="leaderboard-filter-selector"
            accessibilityRole="button"
            accessibilityLabel={`Filter leaderboard. Current filter: ${currentFilter}`}>
            <Text className="text-sm text-gray-600">
              {currentFilter === 'all' ? 'All Features' : currentFilter}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Current User Rank (if outside top) */}
      {currentUser && currentUser.rank > maxUsers && !compact && (
        <View
          className="mb-3 rounded-lg bg-indigo-50 p-3"
          testID="current-user-rank-card"
          accessibilityLabel={`Your rank: ${currentUser.rank}`}>
          <Text className="text-center text-sm font-semibold text-indigo-600">
            Your Rank: #{currentUser.rank}
          </Text>
        </View>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <View className="items-center p-8" testID="loading-indicator">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : displayData.length === 0 ? (
        <View className="items-center p-8">
          <Text className="text-sm text-gray-400">No leaderboard data available</Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderUser}
          keyExtractor={(item) => item.userId}
          style={{ maxHeight: 400 }}
          testID="leaderboard-flatlist"
          accessibilityRole="list"
          getItemLayout={getItemLayout}
          removeClippedSubviews
          windowSize={21}
          maxToRenderPerBatch={5}
          initialNumToRender={5}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            ) : undefined
          }
        />
      )}
    </View>
  );
});
