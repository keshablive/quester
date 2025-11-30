/**
 * Achievements Page
 *
 * Route file for achievements view. Uses TanStack Query via AchievementsList
 * component for data fetching with caching, offline support, and pull-to-refresh.
 *
 * Phase 3 Migration: useState/useEffect replaced with TanStack Query hooks
 * FR-003: System MUST migrate Achievements page to use TanStack Query
 *
 * @module app/achievements
 */

import React from 'react';
import { View } from 'react-native';
import { AchievementsList } from '@/components/pages/achievements';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

/**
 * AchievementsPage
 *
 * Displays user achievements with TanStack Query caching.
 * - Instant cache display on navigation
 * - Pull-to-refresh support
 * - Offline indicator when disconnected
 * - Error boundary for crash protection
 */
export default function AchievementsPage() {
  return (
    <ChunkErrorBoundary>
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <AchievementsList testID="achievements-page-list" />
      </View>
    </ChunkErrorBoundary>
  );
}
