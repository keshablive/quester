/**
 * Example: Optimistic UI Patterns for Social Actions
 *
 * This file demonstrates how to use useOptimisticUpdate hook
 * for common social actions like likes, comments, and follows.
 *
 * These patterns can be copied and adapted to actual components.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useOptimisticUpdate } from '@/lib/hooks/use-optimistic-update';
import { useOfflineQueue } from '@/lib/hooks/use-offline-queue';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Heart, MessageCircle, UserPlus } from 'lucide-react-native';

/**
 * Example 1: Like/Unlike Button with Optimistic UI
 *
 * Features:
 * - Instant visual feedback
 * - Rollback on error
 * - Offline queue integration
 * - Error toast notification
 */
export function OptimisticLikeButton({
  contentId,
  initialLiked = false,
  initialCount = 0,
}: {
  contentId: string;
  initialLiked?: boolean;
  initialCount?: number;
}) {
  const [error, setError] = useState<string | null>(null);

  const {
    value: isLiked,
    update: updateLike,
    isPending,
  } = useOptimisticUpdate({
    initialValue: initialLiked,
    onError: () => {
      setError('Failed to update like');
      setTimeout(() => setError(null), 3000);
    },
  });

  const { value: likeCount, update: updateCount } = useOptimisticUpdate({
    initialValue: initialCount,
  });

  const { addToQueue } = useOfflineQueue({
    processor: async (action) => {
      if (action.type === 'like') {
        await fetch(`/api/content/${action.payload.contentId}/like`, {
          method: 'POST',
        });
      } else if (action.type === 'unlike') {
        await fetch(`/api/content/${action.payload.contentId}/unlike`, {
          method: 'POST',
        });
      }
    },
  });

  const handleToggleLike = async () => {
    const newLikedState = !isLiked;
    const countDelta = newLikedState ? 1 : -1;

    try {
      // Update both liked state and count optimistically
      await Promise.all([
        updateLike(newLikedState, async () => {
          // Queue for offline support
          await addToQueue({
            type: newLikedState ? 'like' : 'unlike',
            payload: { contentId },
          });

          // Simulated API call
          const response = await fetch(
            `/api/content/${contentId}/${newLikedState ? 'like' : 'unlike'}`,
            { method: 'POST' }
          );

          if (!response.ok) throw new Error('Failed to update like');

          return newLikedState;
        }),
        updateCount(
          (prev: number) => prev + countDelta,
          async () => {
            // Return actual count from server
            return initialCount + countDelta;
          }
        ),
      ]);
    } catch (err) {
      // Rollback happens automatically
      console.error('Like failed:', err);
    }
  };

  return (
    <View>
      <Button
        onPress={handleToggleLike}
        disabled={isPending}
        variant={isLiked ? 'default' : 'outline'}>
        <Heart size={20} fill={isLiked ? 'red' : 'none'} color={isLiked ? 'red' : 'gray'} />
        <Text>{likeCount}</Text>
      </Button>
      {error && <Text className="text-destructive">{error}</Text>}
    </View>
  );
}

/**
 * Example 2: Comment Counter with Optimistic Updates
 *
 * Features:
 * - Instant count update
 * - Server value reconciliation
 * - Error handling
 */
export function OptimisticCommentCount({
  postId,
  initialCount = 0,
  onAddComment,
}: {
  postId: string;
  initialCount?: number;
  onAddComment?: () => void;
}) {
  const {
    value: commentCount,
    update: updateCount,
    isPending,
  } = useOptimisticUpdate({
    initialValue: initialCount,
    onSuccess: (actualCount) => {
      console.log(`Comments updated: ${actualCount}`);
    },
    onError: () => {
      console.log('Failed to add comment');
    },
  });

  const handleAddComment = async (commentText: string) => {
    await updateCount(
      (prev: number) => prev + 1, // Optimistic increment
      async () => {
        // API call to add comment
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ text: commentText }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to add comment');

        const data = await response.json();
        onAddComment?.();
        return data.commentCount; // Use actual count from server
      }
    );
  };

  return (
    <Button onPress={() => handleAddComment('Great post!')} disabled={isPending}>
      <MessageCircle size={20} />
      <Text>{commentCount} Comments</Text>
    </Button>
  );
}

/**
 * Example 3: Follow Button with Optimistic UI
 *
 * Features:
 * - Button state changes instantly
 * - Follower count updates
 * - Rollback on API failure
 */
export function OptimisticFollowButton({
  userId,
  initialIsFollowing = false,
  initialFollowerCount = 0,
}: {
  userId: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
}) {
  const {
    value: isFollowing,
    update: updateFollowing,
    isPending,
  } = useOptimisticUpdate({
    initialValue: initialIsFollowing,
  });

  const { value: followerCount, update: updateFollowerCount } = useOptimisticUpdate({
    initialValue: initialFollowerCount,
  });

  const handleToggleFollow = async () => {
    const newFollowingState = !isFollowing;
    const countDelta = newFollowingState ? 1 : -1;

    try {
      await Promise.all([
        updateFollowing(newFollowingState, async () => {
          const response = await fetch(
            `/api/users/${userId}/${newFollowingState ? 'follow' : 'unfollow'}`,
            { method: 'POST' }
          );

          if (!response.ok) throw new Error('Failed to update follow status');

          return newFollowingState;
        }),
        updateFollowerCount(
          (prev: number) => prev + countDelta,
          async () => initialFollowerCount + countDelta
        ),
      ]);
    } catch (err) {
      // Both states will rollback automatically
      console.error('Follow action failed:', err);
    }
  };

  return (
    <View>
      <Button
        onPress={handleToggleFollow}
        disabled={isPending}
        variant={isFollowing ? 'outline' : 'default'}>
        <UserPlus size={20} />
        <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
      </Button>
      <Text className="text-muted-foreground">
        {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}
      </Text>
    </View>
  );
}

/**
 * Example 4: List Operations with Optimistic Updates
 *
 * Features:
 * - Add items instantly to UI
 * - Remove on error
 * - Server reconciliation
 */
export function OptimisticCommentList({
  postId,
  initialComments = [],
}: {
  postId: string;
  initialComments?: Array<{ id: string; text: string; author: string }>;
}) {
  const {
    value: comments,
    update: updateComments,
    isPending,
  } = useOptimisticUpdate({
    initialValue: initialComments,
  });

  const handleAddComment = async (text: string, author: string) => {
    // Generate temporary ID for optimistic UI
    const tempId = `temp-${Date.now()}`;
    const newComment = { id: tempId, text, author };

    await updateComments(
      (prev: typeof initialComments) => [...prev, newComment], // Add immediately
      async () => {
        // API call
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ text, author }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to add comment');

        const data = await response.json();

        // Return updated list with real IDs from server
        return [...initialComments, data.comment];
      }
    );
  };

  return (
    <View>
      {comments.map((comment) => (
        <View key={comment.id}>
          <Text className="font-bold">{comment.author}</Text>
          <Text>{comment.text}</Text>
        </View>
      ))}
      <Button onPress={() => handleAddComment('Nice!', 'CurrentUser')} disabled={isPending}>
        <Text>Add Comment</Text>
      </Button>
    </View>
  );
}

/**
 * Example 5: Complex State with Multiple Updates
 *
 * Features:
 * - Multiple optimistic updates in single action
 * - Coordinated rollback
 * - State synchronization
 */
export function OptimisticPostEngagement({
  postId,
  initialState = {
    likes: 0,
    comments: 0,
    shares: 0,
    isLiked: false,
  },
}: {
  postId: string;
  initialState?: {
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
  };
}) {
  const {
    value: engagement,
    update: updateEngagement,
    isPending,
  } = useOptimisticUpdate({
    initialValue: initialState,
    onError: () => {
      console.log('Engagement update failed, rolled back');
    },
  });

  const handleLike = async () => {
    const newIsLiked = !engagement.isLiked;
    const likeDelta = newIsLiked ? 1 : -1;

    await updateEngagement(
      (prev: typeof initialState) => ({
        ...prev,
        isLiked: newIsLiked,
        likes: prev.likes + likeDelta,
      }),
      async () => {
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: 'POST',
          body: JSON.stringify({ liked: newIsLiked }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to like post');

        const data = await response.json();
        return data.engagement; // Server returns full engagement object
      }
    );
  };

  return (
    <View>
      <Button onPress={handleLike} disabled={isPending}>
        <Heart fill={engagement.isLiked ? 'red' : 'none'} />
        <Text>{engagement.likes}</Text>
      </Button>
      <Text>{engagement.comments} Comments</Text>
      <Text>{engagement.shares} Shares</Text>
    </View>
  );
}
