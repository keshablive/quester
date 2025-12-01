/**
 * Badges Page
 *
 * Route file for badges view. Uses TanStack Query via BadgesList
 * component for data fetching with caching, offline support, and pull-to-refresh.
 *
 * Phase 3 Migration: useState/useEffect replaced with TanStack Query hooks
 * FR-004: System MUST migrate Badges page to use TanStack Query
 *
 * @module app/badges
 */

import React from 'react';
import { View } from 'react-native';
import { BadgesList } from '@/components/features/badges';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

/**
 * BadgesPage
 *
 * Displays user badges with TanStack Query caching.
 * - Instant cache display on navigation
 * - Pull-to-refresh support
 * - Offline indicator when disconnected
 * - Error boundary for crash protection
 */
export default function BadgesPage() {
  return (
    <ChunkErrorBoundary>
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <BadgesList showAll testID="badges-page-list" />
      </View>
    </ChunkErrorBoundary>
  );
}
