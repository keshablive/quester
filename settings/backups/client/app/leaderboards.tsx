/**
 * LeaderboardsScreen (T051-T053)
 *
 * Main leaderboard screen with tabbed navigation and user position tracking.
 *
 * Features:
 * - Type tabs (Global, Quest, Social, Learning) - T052
 * - Period selector (All-Time, Monthly) - T052
 * - User rank card at top
 * - Paginated leaderboard list with pull-to-refresh - T051
 * - Highlighted current user row with auto-scroll - T053
 * - Infinite scroll for loading more entries - T051
 * - Loading skeletons and empty states
 * - Error handling with retry
 */

import * as React from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import {
  LeaderboardRow,
  LeaderboardRowSkeleton,
  LeaderboardRowEmpty,
} from '@/components/gamification/leaderboard-row';
import { UserRankCard, UserRankCardSkeleton } from '@/components/gamification/user-rank-card';
import {
  LeaderboardTabs,
  getCategoryFromType,
  getBackendLeaderboardType,
  type LeaderboardType,
  type LeaderboardPeriod,
} from '@/components/gamification/leaderboard-tabs';
import { useLeaderboard, useUserPosition, type LeaderboardEntry } from '@/lib/hooks/useLeaderboard';
import { RefreshCwIcon, AlertCircleIcon } from 'lucide-react-native';
import { useAuth } from '@/lib/hooks/useAuth';

const ITEMS_PER_PAGE = 20;

export default function LeaderboardsScreen() {
  const { user } = useAuth();
  const flatListRef = React.useRef<FlatList>(null);

  // Tab state - T052
  const [selectedType, setSelectedType] = React.useState<LeaderboardType>('global');
  const [selectedPeriod, setSelectedPeriod] = React.useState<LeaderboardPeriod>('alltime');
  const [currentPage, setCurrentPage] = React.useState(1);

  // Get backend parameters
  const backendType = getBackendLeaderboardType(selectedType);
  const category = getCategoryFromType(selectedType);

  // Fetch leaderboard data - T051
  const {
    data: leaderboardData,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
    refetch: refetchLeaderboard,
  } = useLeaderboard({
    params: {
      type: backendType,
      period: selectedPeriod,
      category,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    },
  });

  // Fetch current user's position
  const {
    data: userPositionData,
    isLoading: isLoadingPosition,
    error: positionError,
    refetch: refetchPosition,
  } = useUserPosition({
    params: {
      userId: user?.id || '',
      type: backendType,
      period: selectedPeriod,
      category,
    },
    enabled: !!user?.id,
  });

  // Combined loading state
  const isLoading = isLoadingLeaderboard || isLoadingPosition;
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Get entries
  const entries = leaderboardData?.data.entries || [];
  const hasNextPage = currentPage < (leaderboardData?.data.pagination.total_pages || 1);

  // Handle tab change - T052 - Optimized with useCallback (Phase 7, T114)
  const handleTypeChange = React.useCallback((type: LeaderboardType) => {
    setSelectedType(type);
    setCurrentPage(1);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const handlePeriodChange = React.useCallback((period: LeaderboardPeriod) => {
    setSelectedPeriod(period);
    setCurrentPage(1);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  // Handle refresh - T051 - Optimized with useCallback (Phase 7, T114)
  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    await Promise.all([refetchLeaderboard(), refetchPosition()]);
    setIsRefreshing(false);
  }, [refetchLeaderboard, refetchPosition]);

  // Handle load more - T051 - Optimized with useCallback (Phase 7, T114)
  const handleLoadMore = React.useCallback(() => {
    if (!isLoadingLeaderboard && hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [isLoadingLeaderboard, hasNextPage]);

  // Scroll to current user - T053
  const scrollToCurrentUser = React.useCallback(() => {
    if (!user?.id || !entries.length) return;

    const userIndex = entries.findIndex((entry) => entry.userId === user.id);
    if (userIndex !== -1) {
      flatListRef.current?.scrollToIndex({
        index: userIndex,
        animated: true,
        viewPosition: 0.5, // Center the user's row
      });
    }
  }, [entries, user?.id]);

  // Auto-scroll to user on initial load - T053
  React.useEffect(() => {
    if (entries.length > 0 && user?.id) {
      const userIndex = entries.findIndex((entry) => entry.userId === user.id);
      if (userIndex !== -1 && userIndex < 20) {
        // Only auto-scroll if user is on first page
        setTimeout(() => scrollToCurrentUser(), 500);
      }
    }
  }, [entries.length, user?.id, selectedType, selectedPeriod]);

  // Render leaderboard row - T053 (highlight current user) - Optimized with useCallback (Phase 7, T114)
  const renderLeaderboardRow = React.useCallback(
    ({ item }: { item: LeaderboardEntry; index: number }) => {
      const isCurrentUser = item.userId === user?.id;
      const metricLabel = selectedType === 'global' ? 'XP' : 'Quests';

      return (
        <LeaderboardRow
          entry={{
            rank: item.rank,
            userId: Number(item.userId),
            username: item.username,
            avatar: item.avatar || item.avatarUrl,
            metricValue: item.xpPoints || item.questsCompleted || 0,
          }}
          isCurrentUser={isCurrentUser} // T053: Highlight current user
          metricLabel={metricLabel}
          onPress={(entry) => {
            // TODO: Navigate to user profile
            console.log('View profile:', entry.userId);
          }}
          className="mb-2"
        />
      );
    },
    [user?.id, selectedType]
  );

  // Render loading skeleton
  const renderSkeleton = () => (
    <View className="gap-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center p-8">
      <LeaderboardRowEmpty
        message={
          selectedPeriod === 'monthly'
            ? 'No rankings yet this month. Be the first!'
            : 'No leaderboard data available'
        }
      />
    </View>
  );

  // Render error state
  const renderError = (error: Error) => (
    <View className="flex-1 items-center justify-center p-8">
      <AlertCircleIcon size={48} className="mb-4 text-destructive" />
      <Text className="mb-2 text-center text-base font-semibold text-foreground">
        Failed to load leaderboard
      </Text>
      <Text className="mb-4 text-center text-sm text-muted-foreground">{error.message}</Text>
      <Button onPress={() => handleRefresh()} variant="outline">
        <RefreshCwIcon size={16} className="mr-2" />
        <Text>Retry</Text>
      </Button>
    </View>
  );

  // FlatList optimizations (Phase 7, T115-T118)
  const ITEM_HEIGHT = 88; // Estimated height of LeaderboardRow (padding + content)

  const getItemLayout = React.useCallback(
    (_data: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = React.useCallback(
    (item: LeaderboardEntry, index: number) => `${item.userId}-${index}`,
    []
  );

  // Render footer loader
  const renderFooter = () => {
    if (!isLoadingLeaderboard || currentPage === 1) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" />
      </View>
    );
  };

  return (
    <ScreenWrapper screenName="Leaderboards">
      <Stack.Screen
        options={{
          title: 'Leaderboards',
          headerShown: true,
        }}
      />

      <View className="flex-1 bg-background">
        {/* Header with Tabs - T052 */}
        <View className="border-b border-border bg-card p-4">
          <LeaderboardTabs
            selectedType={selectedType}
            selectedPeriod={selectedPeriod}
            onTypeChange={handleTypeChange}
            onPeriodChange={handlePeriodChange}
            enabledTabs={['global', 'quest']} // Only show implemented tabs
          />
        </View>

        {/* User Rank Card */}
        <View className="border-b border-border p-4">
          {isLoadingPosition ? (
            <UserRankCardSkeleton />
          ) : positionError ? (
            <View className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <Text className="text-center text-sm text-destructive">Unable to load your rank</Text>
            </View>
          ) : userPositionData ? (
            <UserRankCard
              data={{
                rank: userPositionData.data.rank || 0,
                metricValue:
                  userPositionData.data.xpPoints || userPositionData.data.questsCompleted || 0,
                totalUsers: userPositionData.data.totalEntries || 0,
                percentile: userPositionData.data.percentile || 0,
                previousRank: userPositionData.data.rank
                  ? userPositionData.data.rank - (userPositionData.data.rankChange || 0)
                  : undefined,
              }}
              username={user?.username || 'You'}
              leaderboardType={backendType}
              period={selectedPeriod}
              metricLabel={selectedType === 'global' ? 'XP' : 'Quests'}
              category={category}
              onPress={() => {
                // Scroll to user in list if ranked
                if (userPositionData.data.rank > 0) {
                  scrollToCurrentUser();
                }
              }}
            />
          ) : null}
        </View>

        {/* Leaderboard List - T051 */}
        {isLoading && currentPage === 1 ? (
          renderSkeleton()
        ) : leaderboardError ? (
          renderError(leaderboardError)
        ) : entries.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            ref={flatListRef}
            data={entries}
            renderItem={renderLeaderboardRow}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            windowSize={21}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            contentContainerClassName="p-4"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#3b82f6']}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            onScrollToIndexFailed={(info) => {
              // Handle scroll failure gracefully
              console.warn('Scroll to index failed:', info);
            }}
          />
        )}

        {/* Scroll to User Button - T053 */}
        {userPositionData?.data?.rank && userPositionData.data.rank > 0 && entries.length > 0 && (
          <View className="absolute bottom-4 right-4">
            <Button
              onPress={scrollToCurrentUser}
              className="rounded-full bg-primary p-4 shadow-lg"
              accessibilityLabel="Scroll to your position">
              <Text className="font-semibold text-primary-foreground">
                # {userPositionData?.data?.rank}
              </Text>
            </Button>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}
