import * as React from 'react';
import { View, ActivityIndicator, FlatList } from 'react-native';
import { Text, Card, Icon } from '@/components/ui';
import {
  Users,
  FileText,
  TrendingUp,
  Activity,
  ArrowRight,
  BookOpen,
  Target,
  Trophy,
  Bell,
} from 'lucide-react-native';
import { useDashboardActivity } from '@/core/hooks/queries';
import type { ActivityItem } from './types';

/**
 * Get icon component for activity type
 */
const getActivityIcon = (type: string) => {
  const icons: Record<string, typeof Users> = {
    quest_complete: Target,
    course_progress: BookOpen,
    achievement: Trophy,
    level_up: TrendingUp,
    notification: Bell,
    social: Users,
    default: Activity,
  };
  return icons[type] || icons.default;
};

/**
 * Format relative time
 */
const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

/**
 * RecentActivity Component
 *
 * Displays recent user activity with infinite scroll support.
 * Uses cached data for instant display on return visits.
 *
 * US1: Instant Data Display with Background Refresh
 * US5: Paginated Data with Infinite Scroll
 */
export function RecentActivity() {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDashboardActivity();

  // Flatten pages into single array
  const activities = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data?.pages]);

  // Loading state
  if (isLoading && activities.length === 0) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Recent Activity</Text>
        <Card className="items-center justify-center p-8">
          <ActivityIndicator size="small" color="#6366F1" />
          <Text className="mt-2 text-muted-foreground">Loading activity...</Text>
        </Card>
      </View>
    );
  }

  // Error state with fallback
  if (error && activities.length === 0) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Recent Activity</Text>
        <Card className="p-4">
          <Text className="text-destructive">Failed to load activity</Text>
        </Card>
      </View>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <View>
        <Text className="mb-3 text-lg font-semibold">Recent Activity</Text>
        <Card className="items-center p-8">
          <Icon as={Activity} size={32} className="text-muted-foreground" />
          <Text className="mt-2 text-muted-foreground">No recent activity</Text>
        </Card>
      </View>
    );
  }

  const renderActivityItem = ({ item, index }: { item: ActivityItem; index: number }) => {
    const IconComponent = getActivityIcon(item.type || 'default');

    return (
      <View
        className={`flex-row items-center justify-between p-4 ${
          index < activities.length - 1 ? 'border-b border-border' : ''
        }`}>
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Icon as={IconComponent} size={16} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-medium">{item.title}</Text>
            <Text className="text-xs text-muted-foreground">
              {item.time ? formatRelativeTime(item.time) : 'Unknown time'}
            </Text>
          </View>
        </View>
        <Icon as={ArrowRight} size={16} className="text-muted-foreground" />
      </View>
    );
  };

  return (
    <View>
      <Text className="mb-3 text-lg font-semibold">Recent Activity</Text>
      <Card>
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item, index) => item.id || `activity-${index}`}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          scrollEnabled={false}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center p-4">
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            ) : null
          }
        />
      </Card>
    </View>
  );
}
