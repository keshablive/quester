import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Card, Icon, Skeleton } from '@/components/ui';
import { Users, Monitor, RefreshCw, Clock } from 'lucide-react-native';
import { useEngagementSummary } from '@/core/hooks/queries';
import { formatCompactNumber, formatDuration } from '@/core/utils/format';

/**
 * Demographics - Display platform engagement metrics
 *
 * US4: View Platform Engagement Metrics
 * FR-007: Show loading skeletons during data fetch
 * FR-010: Format large numbers for readability
 *
 * Note: Location/device breakdown APIs don't exist (out of scope).
 * Showing platform engagement metrics (DAU, WAU, MAU) instead.
 */
export function Demographics() {
  const { data: engagement, isLoading, error, refetch } = useEngagementSummary();

  // Loading skeleton state (FR-007)
  if (isLoading) {
    return (
      <View className="flex-row gap-4">
        <Card className="flex-1 p-4">
          <Skeleton className="mb-3 h-5 w-32 rounded" />
          <View className="gap-2">
            {[1, 2, 3].map((i) => (
              <View key={i} className="flex-row justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </View>
            ))}
          </View>
        </Card>
        <Card className="flex-1 p-4">
          <Skeleton className="mb-3 h-5 w-24 rounded" />
          <View className="gap-2">
            {[1, 2, 3].map((i) => (
              <View key={i} className="flex-row justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </View>
            ))}
          </View>
        </Card>
      </View>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <View className="flex-row gap-4">
        <Card className="flex-1 p-6">
          <View className="items-center">
            <Text className="mb-4 text-center text-destructive">
              Failed to load engagement data
            </Text>
            <Pressable
              className="flex-row items-center gap-2 rounded-lg bg-primary px-4 py-2"
              onPress={() => refetch()}>
              <Icon as={RefreshCw} size={16} className="text-primary-foreground" />
              <Text className="font-semibold text-primary-foreground">Retry</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    );
  }

  // Platform engagement metrics from API (replaces hardcoded locations)
  const activeUsers = [
    {
      label: 'Daily Active',
      value: engagement?.dailyActiveUsers ?? 0,
      abbr: 'DAU',
    },
    {
      label: 'Weekly Active',
      value: engagement?.weeklyActiveUsers ?? 0,
      abbr: 'WAU',
    },
    {
      label: 'Monthly Active',
      value: engagement?.monthlyActiveUsers ?? 0,
      abbr: 'MAU',
    },
  ];

  // Device breakdown - placeholder until API exists
  const devices = [
    { name: 'Desktop', percentage: '—' },
    { name: 'Mobile', percentage: '—' },
    { name: 'Tablet', percentage: '—' },
  ];

  return (
    <View className="flex-row gap-4">
      {/* Platform Engagement (real data from API) */}
      <Card className="flex-1 p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <Icon as={Users} size={16} className="text-primary" />
          <Text className="font-semibold">Platform Engagement</Text>
        </View>
        <View className="gap-2">
          {activeUsers.map((metric, idx) => (
            <View key={idx} className="flex-row items-center justify-between">
              <Text className="text-sm">{metric.label}</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-sm font-medium">{formatCompactNumber(metric.value)}</Text>
                <Text className="text-xs text-muted-foreground">{metric.abbr}</Text>
              </View>
            </View>
          ))}
          {/* Session duration */}
          <View className="mt-2 flex-row items-center justify-between border-t border-border pt-2">
            <View className="flex-row items-center gap-1">
              <Icon as={Clock} size={12} className="text-muted-foreground" />
              <Text className="text-sm">Avg Session</Text>
            </View>
            <Text className="text-sm font-medium">
              {formatDuration(engagement?.averageSessionDuration ?? 0)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Device Breakdown - placeholder until API exists */}
      <Card className="flex-1 p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <Icon as={Monitor} size={16} className="text-primary" />
          <Text className="font-semibold">Devices</Text>
        </View>
        <View className="gap-2">
          {devices.map((device, idx) => (
            <View key={idx} className="flex-row justify-between">
              <Text className="text-sm">{device.name}</Text>
              <Text className="text-sm text-muted-foreground">{device.percentage}</Text>
            </View>
          ))}
        </View>
        <Text className="mt-3 text-xs italic text-muted-foreground">
          Device analytics coming soon
        </Text>
      </Card>
    </View>
  );
}
