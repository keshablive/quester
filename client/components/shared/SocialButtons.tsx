import React, { useState, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { UserPlus, UserMinus, Users as UsersIcon } from 'lucide-react-native';
import { cn } from '@/core';
import { useFollowUser, useUnfollowUser } from '@/core/hooks/mutations';
import { MutationErrorToast } from './MutationErrorToast';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  /** @deprecated Use TanStack Query mutation instead */
  onFollow?: (userId: string) => void;
  /** @deprecated Use TanStack Query mutation instead */
  onUnfollow?: (userId: string) => void;
}

/**
 * FollowButton Component
 *
 * Integrates with TanStack Query mutations for optimistic updates.
 * US2: Optimistic Updates for User Actions
 */
export function FollowButton({
  userId,
  isFollowing: initialFollowing,
  onFollow,
  onUnfollow,
}: FollowButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const followMutation = useFollowUser({
    onSuccess: () => {
      // Legacy callback support
      onFollow?.(userId);
    },
    onError: (err) => {
      setError(err.message || 'Failed to follow user');
    },
  });

  const unfollowMutation = useUnfollowUser({
    onSuccess: () => {
      // Legacy callback support
      onUnfollow?.(userId);
    },
    onError: (err) => {
      setError(err.message || 'Failed to unfollow user');
    },
  });

  // Derive following state from mutation state or initial prop
  const isFollowing = followMutation.isSuccess
    ? true
    : unfollowMutation.isSuccess
      ? false
      : initialFollowing;

  const loading = followMutation.isPending || unfollowMutation.isPending;

  const handleToggle = useCallback(() => {
    setError(null);
    if (isFollowing) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate(userId);
    }
  }, [isFollowing, userId, followMutation, unfollowMutation]);

  return (
    <>
      <Pressable
        className={cn(
          'flex-row items-center rounded-lg px-4 py-2',
          isFollowing ? 'border border-border bg-muted' : 'bg-primary'
        )}
        onPress={handleToggle}
        disabled={loading}>
        {isFollowing ? (
          <>
            <UserMinus size={16} className="mr-2 text-foreground" />
            <Text className="text-sm font-semibold text-foreground">
              {loading ? 'Unfollowing...' : 'Unfollow'}
            </Text>
          </>
        ) : (
          <>
            <UserPlus size={16} color="#fff" className="mr-2" />
            <Text className="text-sm font-semibold text-primary-foreground">
              {loading ? 'Following...' : 'Follow'}
            </Text>
          </>
        )}
      </Pressable>
      <MutationErrorToast
        message={error ?? ''}
        visible={!!error}
        onDismiss={() => setError(null)}
        onRetry={handleToggle}
      />
    </>
  );
}

interface ShareButtonProps {
  postId: string;
  onShare?: (postId: string) => void;
}

export function ShareButton({ postId, onShare }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    try {
      setSharing(true);
      await onShare?.(postId);
    } catch (err) {
      console.error('Failed to share:', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Pressable className="flex-row items-center" onPress={handleShare} disabled={sharing}>
      <UsersIcon size={20} className="mr-1 text-muted-foreground" />
      <Text className="text-sm text-muted-foreground">Share</Text>
    </Pressable>
  );
}
