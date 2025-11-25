import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, RotateCw, Film, PlusCircle, Plus } from 'lucide-react-native';
import { ReelsFeed, Reel } from '@/components/video/reels-feed';
import { useStreams } from '@/lib/hooks/useStream';
import { Stream } from '@/lib/api/videos';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function ReelsScreen() {
  const router = useRouter();
  const [_isRefreshing, _setIsRefreshing] = useState(false);

  const { streams, isLoading, error, refetch, loadMore, hasMore } = useStreams({
    streamType: 'vod',
    status: 'ended',
    limit: 10,
  });

  // Convert Stream objects to Reel format
  const reels: Reel[] = streams.map((stream: Stream) => ({
    id: stream.id,
    videoUrl: stream.playbackUrl,
    title: stream.title,
    description: stream.description,
    creatorName: stream.userId, // TODO: Get actual creator name from user service
    creatorAvatar: undefined, // TODO: Get avatar URL
    likes: 0, // TODO: Get likes from stream metadata
    views: stream.totalViews,
    duration: stream.duration,
    isLiked: false, // TODO: Check if user has liked
  }));

  const handleRefresh = useCallback(async () => {
    _setIsRefreshing(true);
    await refetch();
    _setIsRefreshing(false);
  }, [refetch]);

  const handleLike = useCallback((reelId: string) => {
    // TODO: Implement like functionality via API
    console.log('Like reel:', reelId);
  }, []);

  const handleShare = useCallback((reelId: string) => {
    // TODO: Implement share functionality
    console.log('Share reel:', reelId);
  }, []);

  const handleComment = useCallback(
    (reelId: string) => {
      router.push(`/live-stream/${reelId}`);
    },
    [router]
  );

  const handleViewCountUpdate = useCallback((reelId: string) => {
    // TODO: Track view analytics
    console.log('View reel:', reelId);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  if (isLoading && reels.length === 0) {
    return (
      <ScreenWrapper screenName="Reels">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-3 text-base text-foreground">Loading reels...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper screenName="Reels">
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text className="mb-6 mt-4 text-lg text-foreground">Failed to load reels</Text>
          <Button onPress={handleRefresh} className="flex-row gap-2">
            <RotateCw size={20} color="#ffffff" />
            <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  if (reels.length === 0) {
    return (
      <ScreenWrapper screenName="Reels">
        <View style={styles.emptyContainer}>
          <Film size={80} color="#d1d5db" />
          <Text className="mb-2 mt-6 text-2xl font-bold text-foreground">No Reels Yet</Text>
          <Text className="mb-8 text-center text-base leading-6 text-muted-foreground">
            Be the first to create amazing short videos!
          </Text>
          <Button
            onPress={() => router.push('/stream-setup')}
            size="lg"
            className="flex-row gap-2 rounded-3xl px-8">
            <PlusCircle size={24} color="#ffffff" />
            <Text className="text-base font-semibold text-primary-foreground">Upload Video</Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenName="Reels">
      <View style={styles.container}>
        <ReelsFeed
          reels={reels}
          onLike={handleLike}
          onShare={handleShare}
          onComment={handleComment}
          onViewCountUpdate={handleViewCountUpdate}
          onEndReached={handleEndReached}
        />

        {/* Top Header Overlay */}
        <View style={styles.headerOverlay}>
          <Text style={styles.headerTitle}>Reels</Text>
          <View style={styles.headerActions}>
            <Button
              variant="ghost"
              size="icon"
              onPress={() => router.push('/stream-setup')}
              style={styles.headerButton}>
              <Plus size={28} color="#ffffff" />
            </Button>
          </View>
        </View>

        {/* Loading More Indicator */}
        {isLoading && reels.length > 0 && (
          <View style={styles.loadingMoreOverlay}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreOverlay: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 12,
  },
});
