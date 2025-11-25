import React, { useState, useRef } from 'react';
import { View, FlatList, Dimensions, Pressable, ViewToken } from 'react-native';
import { Text } from '@/components/ui/text';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { PlayCircle, Heart, MessageCircle, Share2, VolumeX, Volume2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface Reel {
  id: string;
  videoUrl: string;
  title: string;
  description?: string;
  creatorName: string;
  creatorAvatar?: string;
  likes: number;
  views: number;
  duration: number;
  isLiked?: boolean;
}

export interface ReelsFeedProps {
  reels: Reel[];
  onLike?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onViewCountUpdate?: (reelId: string) => void;
  onEndReached?: () => void;
}

export function ReelsFeed({
  reels,
  onLike,
  onShare,
  onComment,
  onViewCountUpdate,
  onEndReached,
}: ReelsFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);

      // Track view count
      const reel = reels[viewableItems[0].index];
      if (reel && onViewCountUpdate) {
        onViewCountUpdate(reel.id);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80, // Item is considered visible when 80% is on screen
  }).current;

  const renderReel = ({ item, index }: { item: Reel; index: number }) => {
    const isActive = index === currentIndex;

    return (
      <ReelItem
        reel={item}
        isActive={isActive}
        onLike={onLike}
        onShare={onShare}
        onComment={onComment}
      />
    );
  };

  return (
    <View className="flex-1 bg-black">
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  onLike?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
}

function ReelItem({ reel, isActive, onLike, onShare, onComment }: ReelItemProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel.likes);

  React.useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
    } else {
      videoRef.current?.pauseAsync();
      videoRef.current?.setPositionAsync(0); // Reset to start
    }
  }, [isActive]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);

    // Loop video when it ends
    if (status.didJustFinish) {
      videoRef.current?.replayAsync();
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (err) {
      console.error('Failed to toggle play/pause:', err);
    }
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;

    try {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    onLike?.(reel.id);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <View className="relative w-full bg-black" style={{ height: SCREEN_HEIGHT }}>
      {/* Video Player */}
      <Pressable className="flex-1" onPress={togglePlayPause}>
        <Video
          ref={videoRef}
          source={{ uri: reel.videoUrl }}
          style={{ flex: 1, width: '100%', height: '100%' }}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isActive}
          isMuted={isMuted}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && isActive && (
          <View className="absolute inset-0 items-center justify-center">
            <PlayCircle size={80} color="rgba(255, 255, 255, 0.8)" />
          </View>
        )}
      </Pressable>

      {/* Bottom Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.8)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
      />

      {/* Content Overlay */}
      <View className="absolute bottom-0 left-0 right-0 flex-row p-4 pb-8">
        {/* Left Side - Creator Info & Description */}
        <View className="flex-1 justify-end pr-4">
          <Text variant="h4" className="mb-2 text-white">
            @{reel.creatorName}
          </Text>
          <Text className="mb-1 text-[15px] font-semibold text-white" numberOfLines={2}>
            {reel.title}
          </Text>
          {reel.description && (
            <Text variant="small" className="mb-2 leading-5 text-white" numberOfLines={2}>
              {reel.description}
            </Text>
          )}
          <Text variant="small" className="text-white/70">
            {formatNumber(reel.views)} views
          </Text>
        </View>

        {/* Right Side - Action Buttons */}
        <View className="items-center justify-end gap-5">
          {/* Like Button */}
          <Pressable className="items-center gap-1" onPress={handleLike}>
            <Heart
              size={32}
              color={isLiked ? '#ef4444' : '#ffffff'}
              fill={isLiked ? '#ef4444' : 'none'}
            />
            <Text className="text-[11px] font-semibold text-white">{formatNumber(likesCount)}</Text>
          </Pressable>

          {/* Comment Button */}
          <Pressable className="items-center gap-1" onPress={() => onComment?.(reel.id)}>
            <MessageCircle size={28} color="#ffffff" />
            <Text className="text-[11px] font-semibold text-white">Comment</Text>
          </Pressable>

          {/* Share Button */}
          <Pressable className="items-center gap-1" onPress={() => onShare?.(reel.id)}>
            <Share2 size={28} color="#ffffff" />
            <Text className="text-[11px] font-semibold text-white">Share</Text>
          </Pressable>

          {/* Mute Button */}
          <Pressable className="items-center gap-1" onPress={toggleMute}>
            {isMuted ? (
              <VolumeX size={28} color="#ffffff" />
            ) : (
              <Volume2 size={28} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
