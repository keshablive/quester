import React, { memo } from 'react';
import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Play, Heart, MessageCircle, Share2 } from 'lucide-react-native';

interface Post {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  media_type: 'text' | 'image' | 'video';
  media_url?: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  is_liked?: boolean;
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onPostPress: (postId: string) => void;
  onMediaPress?: (mediaUrl: string, mediaType: 'image' | 'video') => void;
}

/**
 * PostCard Component - Optimized with React.memo (Phase 5, T111)
 *
 * Memoized to prevent unnecessary re-renders when parent re-renders.
 * Only re-renders when post data or callbacks change.
 */
export const PostCard: React.FC<PostCardProps> = memo(
  ({ post, onLike, onComment, onShare, onUserPress, onPostPress, onMediaPress }) => {
    const formatTimestamp = (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 7) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (days > 0) {
        return `${days}d ago`;
      } else if (hours > 0) {
        return `${hours}h ago`;
      } else if (minutes > 0) {
        return `${minutes}m ago`;
      } else {
        return 'Just now';
      }
    };

    const formatCount = (count: number) => {
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
      }
      return count.toString();
    };

    return (
      <View className="border-b border-border bg-background py-3">
        {/* Header */}
        <Pressable
          testID="post-header"
          accessibilityRole="button"
          accessibilityLabel={`View profile of ${post.user.username}`}
          className="mb-3 flex-row items-center px-4"
          onPress={() => onUserPress(post.user.id)}>
          <View className="mr-3">
            {post.user.avatar_url ? (
              <Image
                testID="post-avatar-image"
                source={{ uri: post.user.avatar_url }}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Text variant="h3" className="text-primary-foreground">
                  {post.user.username[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-1">
            <Text variant="h4" className="mb-0.5">
              {post.user.username}
            </Text>
            <Text variant="muted" className="text-sm">
              {formatTimestamp(post.created_at)}
            </Text>
          </View>
        </Pressable>

        {/* Content */}
        <Pressable
          onPress={() => onPostPress(post.id)}
          accessibilityRole="button"
          accessibilityLabel="View full post">
          <Text variant="p" className="mb-3 px-4 leading-6">
            {post.content}
          </Text>

          {/* Media */}
          {post.media_type === 'image' && post.media_url && (
            <Pressable
              testID="post-image-media"
              onPress={() => onMediaPress?.(post.media_url!, 'image')}
              accessibilityRole="button"
              accessibilityLabel="View image">
              <Image
                testID="post-media-image"
                source={{ uri: post.media_url }}
                className="mb-3 h-[300px] w-full bg-muted"
              />
            </Pressable>
          )}

          {post.media_type === 'video' && post.media_url && (
            <Pressable
              testID="video-container"
              onPress={() => onMediaPress?.(post.media_url!, 'video')}
              className="relative mb-3"
              accessibilityRole="button"
              accessibilityLabel="Play video">
              <Image
                testID="post-media-video"
                source={{ uri: post.media_url }}
                className="h-[300px] w-full bg-muted"
              />
              <View
                testID="video-play-button"
                className="absolute h-12 w-12 items-center justify-center rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: [{ translateX: -24 }, { translateY: -24 }],
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                }}>
                <Play testID="video-play-icon" size={32} color="#fff" fill="#fff" />
              </View>
            </Pressable>
          )}
        </Pressable>

        {/* Actions */}
        <View className="flex-row items-center gap-6 px-4">
          <Pressable
            testID="like-button"
            accessibilityRole="button"
            accessibilityLabel={post.is_liked ? 'Unlike post' : 'Like post'}
            className="flex-row items-center gap-1.5"
            onPress={() => onLike(post.id)}>
            <Heart
              testID="like-icon"
              size={24}
              color={post.is_liked ? '#EF4444' : '#6B7280'}
              fill={post.is_liked ? '#EF4444' : 'none'}
            />
            {post.like_count > 0 && (
              <Text variant="small" className="font-medium text-muted-foreground">
                {formatCount(post.like_count)}
              </Text>
            )}
          </Pressable>

          <Pressable
            testID="comment-button"
            accessibilityRole="button"
            accessibilityLabel="Comment on post"
            className="flex-row items-center gap-1.5"
            onPress={() => onComment(post.id)}>
            <MessageCircle testID="comment-icon" size={24} color="#6B7280" />
            {post.comment_count > 0 && (
              <Text variant="small" className="font-medium text-muted-foreground">
                {formatCount(post.comment_count)}
              </Text>
            )}
          </Pressable>

          <Pressable
            testID="share-button"
            accessibilityRole="button"
            accessibilityLabel="Share post"
            className="flex-row items-center gap-1.5"
            onPress={() => onShare(post.id)}>
            <Share2 testID="share-icon" size={24} color="#6B7280" />
            {post.share_count > 0 && (
              <Text variant="small" className="font-medium text-muted-foreground">
                {formatCount(post.share_count)}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }
);

PostCard.displayName = 'PostCard';
