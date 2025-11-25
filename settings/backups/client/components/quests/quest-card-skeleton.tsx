/**
 * QuestCard Skeleton Loader (Phase 7, T119)
 *
 * Loading placeholder for quest cards with smooth shimmer animation.
 * Used while quest data is being fetched.
 */

import React from 'react';
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuestCardSkeletonProps {
  className?: string;
}

export function QuestCardSkeleton({ className }: QuestCardSkeletonProps) {
  return (
    <Card className={cn('mb-3', className)}>
      <CardContent className="p-4">
        {/* Header Section */}
        <View className="mb-3 flex-row items-start justify-between">
          {/* Title Skeleton */}
          <View className="flex-1">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </View>

          {/* Status Badge Skeleton */}
          <Skeleton className="h-6 w-20 rounded-full" />
        </View>

        {/* Description Skeleton */}
        <View className="mb-3">
          <Skeleton className="mb-1.5 h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </View>

        {/* Progress Bar Skeleton */}
        <View className="mb-3">
          <Skeleton className="h-2 w-full rounded-full" />
        </View>

        {/* Footer Section */}
        <View className="flex-row items-center justify-between">
          {/* XP Reward Skeleton */}
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </View>

          {/* Metadata Skeleton */}
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

/**
 * QuestListSkeleton - Multiple quest card skeletons
 * Used while initial quest list is loading
 */
export function QuestListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View className="p-4">
      {Array.from({ length: count }).map((_, i) => (
        <QuestCardSkeleton key={i} />
      ))}
    </View>
  );
}
