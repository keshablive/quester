import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Newspaper } from 'lucide-react-native';

import { PostCard } from '@/components/social/PostCard';
import { useSocial } from '@/lib/hooks/useSocial';
import { Post } from '@/lib/api/social';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { GamificationHeader } from '@/components/gamification/gamification-header';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { useEnhancedPerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
import SuggestedContent from '@/components/workflow/suggested-content';
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';
import LevelUpModal from '@/components/gamification/level-up-modal';

/**
 * Feed Screen - P1 Priority Migration (Phase 4, T062-T073)
 *
 * Implements:
 * - FR-001: Button Text wrapping
 * - FR-016: FlatList optimization (removeClippedSubviews, maxToRenderPerBatch, windowSize)
 * - FR-006 to FR-010: Accessibility roles, labels, hints
 * - FR-025: Performance monitoring via useScreenPerformanceMetrics
 * - T124-T130: Enhanced FPS monitoring via useEnhancedPerformanceMonitor
 * - ErrorBoundary via ScreenWrapper
 * - WCAG 2.1 Level AA compliance
 */
export default function FeedScreen() {
  useScreenPerformanceMetrics('FeedScreen');
  const { metrics: _fpsMetrics } = useEnhancedPerformanceMonitor('FeedScreen');
  const router = useRouter();
  const { loading, getFeed, likePost, unlikePost, sharePost } = useSocial();

  // Gamification feedback hook for social interactions
  const {
    awardXP,
    dismissXPAnimation,
    dismissLevelUpModal,
    activeXPAnimation,
    showLevelUpModal,
    levelUpInfo,
  } = useGamificationFeedback();

  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState<'following' | 'public'>('following');

  const loadFeed = useCallback(
    async (pageNum: number, refresh = false) => {
      try {
        const result = await getFeed(feedType, pageNum, 20);
        if (refresh) {
          setPosts(result.data);
        } else {
          setPosts((prev) => [...prev, ...result.data]);
        }
        setHasMore(result.data.length === 20);
      } catch (err) {
        console.error('Failed to load feed:', err);
      }
    },
    [feedType, getFeed]
  );

  useEffect(() => {
    loadFeed(1, true);
  }, [feedType]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadFeed(1, true);
    setRefreshing(false);
  }, [loadFeed]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      loadFeed(nextPage).finally(() => setLoadingMore(false));
    }
  }, [loadingMore, hasMore, page, loadFeed]);

  const handleLike = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // Save previous state for rollback
      const previousState = {
        is_liked: post.is_liked,
        like_count: post.like_count,
      };

      // Optimistic update
      const newLikeState = !post.is_liked;
      const newLikeCount = newLikeState ? post.like_count + 1 : post.like_count - 1;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_liked: newLikeState, like_count: newLikeCount } : p
        )
      );

      try {
        if (previousState.is_liked) {
          await unlikePost(postId);
        } else {
          await likePost(postId);
          // Award XP for liking a post (10 XP)
          awardXP(10, 'social_interaction');
        }
      } catch (err) {
        // Rollback on error
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...previousState } : p)));
        console.error('Failed to toggle like:', err);
      }
    },
    [posts, likePost, unlikePost, awardXP]
  );

  const handleComment = useCallback(
    (postId: string) => {
      router.push(`/posts/${postId}` as any);
    },
    [router]
  );

  const handleShare = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // Save previous state for rollback
      const previousShareCount = post.share_count;

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, share_count: p.share_count + 1 } : p))
      );

      try {
        await sharePost(postId);
        // Award XP for sharing a post (15 XP)
        awardXP(15, 'social_interaction');
      } catch (err) {
        // Rollback on error
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, share_count: previousShareCount } : p))
        );
        console.error('Failed to share post:', err);
      }
    },
    [posts, sharePost, awardXP]
  );

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push(`/profile/${userId}` as any);
    },
    [router]
  );

  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/posts/${postId}` as any);
    },
    [router]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Gamification Header */}
        <View style={suggestedStyles.gamificationHeaderContainer}>
          <GamificationHeader compact />
        </View>

        {/* Feed Tabs */}
        <View className="flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
          <View className="flex-1 flex-row" accessibilityRole="tablist">
            <Button
              variant={feedType === 'following' ? 'default' : 'ghost'}
              size="sm"
              onPress={() => setFeedType('following')}
              accessibilityRole="tab"
              accessibilityState={{ selected: feedType === 'following' }}
              accessibilityLabel="Following feed tab"
              className="mr-2">
              <Text>Following</Text>
            </Button>
            <Button
              variant={feedType === 'public' ? 'default' : 'ghost'}
              size="sm"
              onPress={() => setFeedType('public')}
              accessibilityRole="tab"
              accessibilityState={{ selected: feedType === 'public' }}
              accessibilityLabel="Public feed tab"
              className="mr-2">
              <Text>Public</Text>
            </Button>
          </View>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/create-post' as any)}
            accessibilityLabel="Create new post"
            accessibilityHint="Opens the post creation screen">
            <Icon as={Plus} size={24} className="text-primary" />
          </Button>
        </View>
      </View>
    ),
    [feedType, router]
  );

  const emptyComponent = useMemo(
    () =>
      !loading ? (
        <View className="flex-1 items-center justify-center p-12" accessibilityRole="text">
          <Icon as={Newspaper} size={64} className="text-muted-foreground" />
          <Text variant="h3" className="mb-2 mt-4">
            No posts yet
          </Text>
          <Text variant="muted" className="text-center">
            {feedType === 'following'
              ? 'Follow users to see their posts'
              : 'Be the first to create a post!'}
          </Text>
        </View>
      ) : null,
    [loading, feedType]
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onUserPress={handleUserPress}
        onPostPress={handlePostPress}
      />
    ),
    [handleLike, handleComment, handleShare, handleUserPress, handlePostPress]
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  // T118: getItemLayout optimization for fixed-height posts
  // Estimated height: ~400px (varies by content, but provides scroll performance boost)
  const POST_ESTIMATED_HEIGHT = 400;
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: POST_ESTIMATED_HEIGHT,
      offset: POST_ESTIMATED_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <ScreenWrapper screenName="FeedScreen">
      {/* XP Gain Animation */}
      {activeXPAnimation && (
        <XPGainAnimation
          amount={activeXPAnimation.amount}
          source={activeXPAnimation.source}
          visible={true}
          onComplete={dismissXPAnimation}
        />
      )}

      {/* Level Up Modal */}
      {showLevelUpModal && levelUpInfo && (
        <LevelUpModal
          visible={true}
          level={levelUpInfo.level}
          unlockedFeatures={levelUpInfo.unlockedFeatures}
          onClose={dismissLevelUpModal}
        />
      )}

      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={emptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            accessibilityLabel="Pull to refresh feed"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ flexGrow: 1 }}
        // FR-016: FlatList optimizations for performance
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={21}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        accessibilityLabel={`${feedType === 'following' ? 'Following' : 'Public'} feed`}
        accessibilityRole="list"
        ListFooterComponent={
          !loading && posts.length > 0 ? (
            <View style={suggestedStyles.section}>
              <Text className="mb-3 text-lg font-semibold text-foreground">Discover More</Text>
              <SuggestedContent
                currentFeature="social"
                context="browsing"
                contextData={{
                  feedType,
                  hasInteractions: posts.some((p) => p.is_liked),
                }}
                onSuggestionPress={(suggestion: any) => {
                  if (suggestion.route) router.push(suggestion.route);
                }}
                layout="list"
                maxSuggestions={3}
              />
            </View>
          ) : null
        }
      />
    </ScreenWrapper>
  );
}

const suggestedStyles = StyleSheet.create({
  gamificationHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
});
