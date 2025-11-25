/**
 * PostCard Skeleton Loader (Phase 7, T119)
 *
 * Loading placeholder for social feed post cards.
 * Used while post data is being fetched.
 */

import React from 'react';
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PostCardSkeletonProps {
  className?: string;
  showMedia?: boolean;
}

export function PostCardSkeleton({ className, showMedia = false }: PostCardSkeletonProps) {
  return (
    <Card testID="post-skeleton" className={cn('mb-3', className)}>
      <CardContent className="p-4">
        {/* Header Section - Author Info */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            {/* Avatar Skeleton */}
            <Skeleton className="h-10 w-10 rounded-full" />

            {/* Author Info */}
            <View>
              <Skeleton className="mb-1.5 h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </View>
          </View>

          {/* Menu Button Skeleton */}
          <Skeleton className="h-6 w-6 rounded-full" />
        </View>

        {/* Content Section */}
        <View className="mb-3">
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </View>

        {/* Media Skeleton (if post has media) */}
        {showMedia && (
          <View className="mb-3">
            <Skeleton className="h-48 w-full rounded-lg" />
          </View>
        )}

        {/* Actions Section */}
        <View className="flex-row items-center justify-between border-t border-border pt-3">
          {/* Like Button Skeleton */}
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </View>

          {/* Comment Button Skeleton */}
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </View>

          {/* Share Button Skeleton */}
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

/**
 * PostFeedSkeleton - Multiple post card skeletons
 * Used while initial feed is loading
 */
export function PostFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View testID="feed-skeleton" className="p-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton
          key={i}
          showMedia={i % 3 === 0} // Show media on every 3rd post for variety
        />
      ))}
    </View>
  );
}

/**
 * CommentSkeleton - Loading placeholder for comments
 */
export function CommentSkeleton({ className }: { className?: string }) {
  return (
    <View testID="comment-skeleton" className={cn('flex-row gap-3 py-3', className)}>
      {/* Avatar Skeleton */}
      <Skeleton className="h-8 w-8 rounded-full" />

      {/* Comment Content */}
      <View className="flex-1">
        <Skeleton className="mb-1.5 h-3 w-20" />
        <Skeleton className="mb-1 h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />

        {/* Actions */}
        <View className="mt-2 flex-row items-center gap-4">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-8" />
        </View>
      </View>
    </View>
  );
}

/**
 * CommentListSkeleton - Multiple comment skeletons
 */
export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View testID="comment-list-skeleton" className="border-t border-border">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </View>
  );
}
