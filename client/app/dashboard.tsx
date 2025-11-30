/**
 * Dashboard Page
 *
 * Route file for dashboard view. Uses TanStack Query via sub-components
 * for data fetching with tiered caching (30s stale time for real-time feel).
 *
 * Phase 3 Migration: Verified TanStack Query integration
 * FR-006: System MUST migrate Dashboard page to use TanStack Query
 *
 * @module app/dashboard
 */

import { View, ScrollView } from 'react-native';
import {
  DashboardHeader,
  StatsCards,
  QuickActions,
  RecentActivity,
} from '@/components/pages/dashboard';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

export default function DashboardPage() {
  return (
    <ChunkErrorBoundary>
      <View className="flex-1">
        <OfflineIndicator />
        <ScrollView className="flex-1">
          <View className="gap-6 p-6">
            <DashboardHeader />
            <StatsCards />
            <QuickActions />
            <RecentActivity />
          </View>
        </ScrollView>
      </View>
    </ChunkErrorBoundary>
  );
}
