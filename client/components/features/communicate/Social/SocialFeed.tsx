/**
 * SocialFeed Component
 *
 * Social feed with optimistic likes and pull-to-refresh.
 * Follows US5: Social Feed with Infinite Scroll (Priority: P2)
 *
 * @module components/features/communicate/Social/SocialFeed
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, useWindowDimensions } from 'react-native';
import {
  Text,
  Skeleton,
  Button,
  Icon,
  XPCounter,
  XPToast,
  AchievementUnlockModal,
} from '@/components/ui';
import { Plus, Feather } from 'lucide-react-native';
import {
  socialService,
  Post,
  useXPNotification,
  useSocialXP,
  useAchievementNotification,
  useSocialLeaderboard,
} from '@/core';
import { OfflineIndicator, ErrorState } from '@/components/shared';
import { PostCard } from './PostCard';
import { SocialLeaderboardWidget } from './SocialLeaderboardWidget';
import { DailyChallengesWidget } from './DailyChallengesWidget';
import type { FeedProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 20;
const MAX_POSTS = 200; // FR-017: Memory limit

// ============================================================================
// Sub-components
// ============================================================================

function EmptyFeed({ onCreatePost }: { onCreatePost?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon as={Feather} size={40} className="text-muted-foreground" />
      </View>
      <Text className="mb-2 text-lg font-semibold text-foreground">No posts yet</Text>
      <Text className="mb-4 text-center text-sm text-muted-foreground">
        Be the first to share something with the community
      </Text>
      {onCreatePost && (
        <Button onPress={onCreatePost}>
          <Text>Create Post</Text>
        </Button>
      )}
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View className="gap-4 p-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="rounded-xl border border-border bg-card p-4">
          <View className="mb-3 flex-row items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <View className="gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </View>
          </View>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-3/4" />
        </View>
      ))}
    </View>
  );
}

function AllCaughtUp() {
  return (
    <View className="items-center py-8">
      <Text className="text-lg font-semibold text-foreground">You're all caught up!</Text>
      <Text className="text-sm text-muted-foreground">You've seen all recent posts</Text>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SocialFeed({ onCreatePost, onPostPress }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());

  const { width } = useWindowDimensions();
  const isWideScreen = width >= 1024;

  const { addNotification } = useXPNotification();
  const { summary, previousXP } = useSocialXP();
  const { currentAchievement, isModalOpen, dismissAchievement } = useAchievementNotification();
  const {
    entries: leaderboardEntries,
    userPosition,
    loading: leaderboardLoading,
  } = useSocialLeaderboard({
    period: 'alltime',
    limit: isWideScreen ? 10 : 5,
    refreshInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    loadFeed(1);
  }, []);

  const loadFeed = async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const data = await socialService.getFeed(pageNum);
      if (pageNum === 1) {
        setPosts(data.slice(0, MAX_POSTS));
      } else {
        setPosts((prev) => [...prev, ...data].slice(0, MAX_POSTS));
      }
      setHasMore(data.length >= PAGE_SIZE && posts.length < MAX_POSTS);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed(1);
    setRefreshing(false);
  }, []);

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && posts.length < MAX_POSTS) {
      loadFeed(page + 1);
    }
  }, [loadingMore, hasMore, page, posts.length]);

  const handleLike = useCallback(
    async (post: Post) => {
      if (likingPosts.has(post.id)) return;

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likesCount: p.likesCount + 1 } : p))
      );
      setLikingPosts((prev) => new Set(prev).add(post.id));

      try {
        const result = await socialService.likePost(post.id);
        if (result.xp) {
          addNotification({
            amount: result.xp.xpAwarded,
            type: 'like',
            message: 'Liked a post',
          });
        }
      } catch (err) {
        // Rollback
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, likesCount: Math.max(0, p.likesCount - 1) } : p
          )
        );
      } finally {
        setLikingPosts((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
    },
    [likingPosts, addNotification]
  );

  const handleComment = useCallback(
    (post: Post) => {
      onPostPress?.(post);
    },
    [onPostPress]
  );

  const renderHeader = () => (
    <View className="mb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Text className="text-3xl font-bold text-foreground">Feed</Text>
          <XPCounter value={summary?.totalSocialXP || 0} previousValue={previousXP} size="md" />
        </View>
        <Button onPress={onCreatePost} className="rounded-full">
          <Icon as={Plus} size={20} className="mr-1 text-primary-foreground" />
          <Text>New Post</Text>
        </Button>
      </View>
      {isWideScreen && (
        <View className="mt-4 flex-row gap-4">
          <View className="flex-1">
            <SocialLeaderboardWidget
              entries={leaderboardEntries}
              userPosition={userPosition}
              loading={leaderboardLoading}
            />
          </View>
          <View className="flex-1">
            <DailyChallengesWidget />
          </View>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View className="items-center py-4">
          <Skeleton className="h-4 w-32" />
        </View>
      );
    }
    if (!hasMore && posts.length > 0) {
      return <AllCaughtUp />;
    }
    return null;
  };

  if (error && !posts.length) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <ErrorState title="Failed to Load Feed" message={error} onRetry={handleRefresh} />
      </View>
    );
  }

  if (loading && !posts.length) {
    return (
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <FeedSkeleton />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <OfflineIndicator />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
            onPress={onPostPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={<EmptyFeed onCreatePost={onCreatePost} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
      />
      <XPToast />
      <AchievementUnlockModal
        achievement={currentAchievement}
        isOpen={isModalOpen}
        onClose={dismissAchievement}
      />
    </View>
  );
}

export default SocialFeed;
