import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Video as VideoIcon, Clock, Eye, Users, PlusCircle, Search, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useStreams, useActiveStreams, useStreamSearch } from '@/lib/hooks/useStream';
import { Stream } from '@/lib/api/videos';

type TabType = 'live' | 'vod' | 'search';

export default function VideosScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch streams based on active tab
  const {
    streams: liveStreams,
    isLoading: isLoadingLive,
    refetch: refetchLive,
    loadMore: loadMoreLive,
    hasMore: hasMoreLive,
  } = useStreams({
    streamType: 'live',
    status: 'live',
    limit: 20,
  });

  const {
    streams: vodStreams,
    isLoading: isLoadingVod,
    refetch: refetchVod,
    loadMore: loadMoreVod,
    hasMore: hasMoreVod,
  } = useStreams({
    streamType: 'vod',
    status: 'ended',
    limit: 20,
  });

  const { activeStreams } = useActiveStreams();

  const {
    streams: searchResults,
    isSearching,
    setQuery: setSearchQueryDebounced,
  } = useStreamSearch(searchQuery);

  // Determine which data to show
  const isLoading =
    activeTab === 'live' ? isLoadingLive : activeTab === 'vod' ? isLoadingVod : isSearching;
  const streams =
    activeTab === 'live' ? liveStreams : activeTab === 'vod' ? vodStreams : searchResults;
  const hasMore = activeTab === 'live' ? hasMoreLive : activeTab === 'vod' ? hasMoreVod : false;

  const handleRefresh = () => {
    if (activeTab === 'live') {
      refetchLive();
    } else if (activeTab === 'vod') {
      refetchVod();
    }
  };

  const handleLoadMore = () => {
    if (activeTab === 'live') {
      loadMoreLive();
    } else if (activeTab === 'vod') {
      loadMoreVod();
    }
  };

  const handleStreamPress = (stream: Stream) => {
    router.push(`/live-stream/${stream.id}`);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setSearchQueryDebounced(text);
    if (text.length > 0) {
      setActiveTab('search');
    }
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStreamItem = ({ item }: { item: Stream }) => {
    const isLive = item.status === 'live';

    return (
      <Button variant="ghost" style={styles.streamItem} onPress={() => handleStreamPress(item)}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
              <VideoIcon size={48} color="#6b7280" />
            </View>
          )}

          {/* Live badge or duration */}
          {isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
            </View>
          )}

          {/* DVR indicator */}
          {item.dvrEnabled && (
            <View style={styles.dvrBadge}>
              <Clock size={12} color="#ffffff" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.streamContent}>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.streamDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Eye size={14} color="#6b7280" />
              <Text style={styles.statText}>
                {isLive ? formatViewCount(item.viewerCount) : formatViewCount(item.totalViews)}
              </Text>
            </View>

            {isLive && (
              <View style={styles.stat}>
                <Users size={14} color="#6b7280" />
                <Text style={styles.statText}>{formatViewCount(item.peakViewers)}</Text>
              </View>
            )}

            <Text style={styles.creatorText}>by {item.userId}</Text>
          </View>
        </View>
      </Button>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;

    const message =
      activeTab === 'search'
        ? 'No streams found'
        : activeTab === 'live'
          ? 'No live streams right now'
          : 'No VOD content available';

    return (
      <View style={styles.emptyState}>
        {activeTab === 'search' ? (
          <Search size={64} color="#d1d5db" />
        ) : (
          <VideoIcon size={64} color="#d1d5db" />
        )}
        <Text style={styles.emptyText}>{message}</Text>
        {activeTab === 'live' && (
          <Text style={styles.emptySubtext}>Check back soon or start your own stream!</Text>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper screenName="Videos">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Videos</Text>
          <Button
            variant="ghost"
            size="icon"
            style={styles.createButton}
            onPress={() => router.push('/stream-setup')}>
            <PlusCircle size={28} color="#3b82f6" />
          </Button>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search streams..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onPress={() => handleSearch('')}
              style={styles.clearButton}>
              <X size={20} color="#6b7280" />
            </Button>
          )}
        </View>

        {/* Tabs */}
        {searchQuery.length === 0 && (
          <View style={styles.tabContainer}>
            <Button
              variant="ghost"
              style={[styles.tab, activeTab === 'live' && styles.activeTab]}
              onPress={() => setActiveTab('live')}>
              <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>
                Live
              </Text>
              {activeStreams.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{activeStreams.length}</Text>
                </View>
              )}
            </Button>

            <Button
              variant="ghost"
              style={[styles.tab, activeTab === 'vod' && styles.activeTab]}
              onPress={() => setActiveTab('vod')}>
              <Text style={[styles.tabText, activeTab === 'vod' && styles.activeTabText]}>VOD</Text>
            </Button>
          </View>
        )}

        {/* Stream List - Optimized (Phase 7, T115-T118) */}
        <FlatList
          data={streams}
          renderItem={renderStreamItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          windowSize={21}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={() =>
            hasMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : null
          }
        />

        {/* Loading Overlay */}
        {isLoading && streams.length === 0 && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading streams...</Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  tabBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    flexGrow: 1,
  },
  streamItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 140,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  dvrBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    padding: 4,
    borderRadius: 4,
  },
  streamContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  streamTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  streamDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  creatorText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});
