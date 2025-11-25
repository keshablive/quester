/**
 * MarketplaceCard Skeleton Loader (Phase 7, T119)
 *
 * Loading placeholder for marketplace item cards.
 * Used while marketplace data is being fetched.
 */

import React from 'react';
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MarketplaceCardSkeletonProps {
  className?: string;
  variant?: 'grid' | 'list';
}

export function MarketplaceCardSkeleton({
  className,
  variant = 'grid',
}: MarketplaceCardSkeletonProps) {
  if (variant === 'list') {
    return (
      <Card
        testID="skeleton-card-list"
        className={cn('mb-3', className)}
        accessibilityLabel="Loading marketplace item"
        accessibilityState={{ busy: true }}>
        <CardContent className="p-0">
          <View testID="skeleton-list-content" className="flex-row">
            {/* Image Skeleton */}
            <View testID="skeleton-image-list">
              <Skeleton className="h-24 w-24 rounded-l-lg" />
            </View>

            {/* Content */}
            <View className="flex-1 p-3">
              {/* Title */}
              <View testID="skeleton-title-list">
                <Skeleton className="mb-2 h-4 w-3/4" />
              </View>

              {/* Price */}
              <View testID="skeleton-price-list">
                <Skeleton className="mb-2 h-5 w-1/3" />
              </View>

              {/* Metadata */}
              <View testID="skeleton-metadata-list" className="flex-row items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </View>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  }

  // Grid variant
  return (
    <Card
      testID="skeleton-card"
      className={cn('overflow-hidden', className)}
      accessibilityLabel="Loading marketplace item"
      accessibilityState={{ busy: true }}>
      <CardContent testID="skeleton-card-content" className="p-0">
        {/* Image Skeleton */}
        <View testID="skeleton-image">
          <Skeleton className="h-40 w-full" />
        </View>

        {/* Content */}
        <View className="p-3">
          {/* Title */}
          <View testID="skeleton-title">
            <Skeleton className="mb-2 h-4 w-4/5" />
          </View>

          {/* Price */}
          <View testID="skeleton-price">
            <Skeleton className="mb-2 h-5 w-2/5" />
          </View>

          {/* Seller Info */}
          <View className="flex-row items-center gap-2">
            <View testID="skeleton-avatar">
              <Skeleton className="h-5 w-5 rounded-full" />
            </View>
            <View testID="skeleton-seller">
              <Skeleton className="h-3 w-20" />
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

/**
 * MarketplaceListSkeleton - Multiple marketplace card skeletons
 */
export function MarketplaceListSkeleton({
  count = 6,
  variant = 'grid',
}: {
  count?: number;
  variant?: 'grid' | 'list';
}) {
  if (variant === 'grid') {
    return (
      <View
        testID="skeleton-list-container"
        className="flex-row flex-wrap gap-2 p-4"
        accessibilityLabel="Loading marketplace items"
        accessibilityRole="list">
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} className="w-[48%]">
            <MarketplaceCardSkeleton variant="grid" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      testID="skeleton-list-container"
      className="p-4"
      accessibilityLabel="Loading marketplace items"
      accessibilityRole="list">
      {Array.from({ length: count }).map((_, i) => (
        <MarketplaceCardSkeleton key={i} variant="list" />
      ))}
    </View>
  );
}
