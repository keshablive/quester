import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text, Button, Icon, XPToast, XPCounter, AchievementUnlockModal } from '@/components/ui';
import { PostCard } from './PostCard';
import { SocialLeaderboardWidget } from './SocialLeaderboardWidget';
import { DailyChallengesWidget } from './DailyChallengesWidget';
import {
  socialService,
  Post,
  useXPNotification,
  useSocialXP,
  useAchievementNotification,
  useSocialLeaderboard,
} from '@/core';
import { Plus } from 'lucide-react-native';

import { FeedProps } from './types';

export function Feed({ onCreatePost, onPostPress }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Responsive layout
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 1024;

  // XP notification context
  const { addNotification } = useXPNotification();
  const { summary, previousXP } = useSocialXP();

  // Achievement notification context (US3)
  const { currentAchievement, isModalOpen, dismissAchievement } = useAchievementNotification();

  // T061: Social leaderboard hook
  const {
    entries: leaderboardEntries,
    userPosition,
    loading: leaderboardLoading,
  } = useSocialLeaderboard({
    period: 'alltime',
    limit: 5,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  useEffect(() => {
    loadFeed();
  }, [page]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await socialService.getFeed(page);
      setPosts((prev) => (page === 1 ? data : [...prev, ...data]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (post: Post) => {
    try {
      const result = await socialService.likePost(post.id);
      // Optimistically update UI
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likesCount: p.likesCount + 1 } : p))
      );
      // Show XP notification
      if (result.xp) {
        addNotification({
          amount: result.xp.xpAwarded,
          type: 'like',
          message: 'Liked a post',
        });
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleComment = (post: Post) => {
    // Navigate to post detail with comments
    onPostPress?.(post);
  };

  const renderHeader = () => (
    <View className="mb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Text className="text-3xl font-bold text-foreground">Feed</Text>
          {/* XP Counter in header */}
          <XPCounter value={summary?.totalSocialXP || 0} previousValue={previousXP} size="md" />
        </View>
        <Button onPress={onCreatePost} className="rounded-full">
          <Icon as={Plus} size={20} className="mr-1 text-primary-foreground" />
          <Text>New Post</Text>
        </Button>
      </View>

      {/* T061: Show leaderboard widget in header on narrow screens */}
      {!isWideScreen && (
        <>
          <SocialLeaderboardWidget
            entries={leaderboardEntries}
            userPosition={userPosition}
            loading={leaderboardLoading}
            maxEntries={3}
            compact
            className="mt-4"
          />
          {/* T082: Daily challenges widget for mobile */}
          <View className="mt-4">
            <DailyChallengesWidget compact />
          </View>
        </>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View className="items-center py-12">
      <Text className="mb-2 text-lg font-semibold text-foreground">No posts yet</Text>
      <Text className="mb-6 text-sm text-muted-foreground">Be the first to share something!</Text>
      <Button onPress={onCreatePost}>
        <Text>Create Post</Text>
      </Button>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Text className="mb-4 text-center text-base text-destructive">{error}</Text>
      <Button onPress={loadFeed}>
        <Text>Retry</Text>
      </Button>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading feed...</Text>
      </View>
    );
  }

  if (error && posts.length === 0) {
    return renderError();
  }

  return (
    <View className="flex-1 flex-row bg-background">
      {/* Main feed content */}
      <View className={isWideScreen ? 'flex-1' : 'flex-1'}>
        {/* XP Toast notification */}
        <XPToast position="top" />

        {/* Achievement unlock modal (US3) */}
        <AchievementUnlockModal
          achievement={currentAchievement}
          isOpen={isModalOpen}
          onClose={dismissAchievement}
        />

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
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ padding: 16 }}
          refreshing={loading}
          onRefresh={() => {
            setPage(1);
            loadFeed();
          }}
          onEndReached={() => {
            if (!loading) {
              setPage((prev) => prev + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      </View>

      {/* T061: Sidebar with leaderboard on wide screens */}
      {isWideScreen && (
        <View className="w-80 border-l border-border p-4">
          <SocialLeaderboardWidget
            entries={leaderboardEntries}
            userPosition={userPosition}
            loading={leaderboardLoading}
            maxEntries={10}
          />
          {/* T082: Daily challenges widget for desktop */}
          <View className="mt-4">
            <DailyChallengesWidget />
          </View>
        </View>
      )}
    </View>
  );
}
