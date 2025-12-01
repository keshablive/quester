import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Card, Icon, Skeleton } from '@/components/ui';
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react-native';
import { useEngagementTimeseries } from '@/core/hooks/queries';
import { getDateRange, formatCompactNumber } from '@/core/utils/format';

/**
 * TrafficOverview - Display engagement timeseries data
 *
 * US3: View Traffic Overview Chart
 * FR-005: Fetch engagement time-series from API
 * FR-006: Render time-series data in visualization
 * FR-007: Show loading skeletons during data fetch
 */
export function TrafficOverview() {
  // Calculate date range for last 30 days
  const { start, end } = React.useMemo(() => getDateRange(30), []);

  const { data: timeseries, isLoading, error, refetch } = useEngagementTimeseries(start, end);

  // Loading skeleton state (FR-007)
  if (isLoading) {
    return (
      <Card className="p-6">
        <Text className="mb-4 text-lg font-semibold">Traffic Overview</Text>
        <View className="h-48 rounded-lg bg-muted/20 p-4">
          <View className="h-full flex-row items-end justify-between">
            {[0.4, 0.6, 0.8, 0.5, 0.7, 0.9, 0.6, 0.8, 0.5, 0.7].map((h, i) => (
              <Skeleton key={i} className="rounded" style={{ width: 20, height: `${h * 100}%` }} />
            ))}
          </View>
        </View>
      </Card>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <Card className="p-6">
        <Text className="mb-4 text-lg font-semibold">Traffic Overview</Text>
        <View className="h-48 items-center justify-center">
          <Text className="mb-4 text-center text-destructive">Failed to load traffic data</Text>
          <Pressable
            className="flex-row items-center gap-2 rounded-lg bg-primary px-4 py-2"
            onPress={() => refetch()}>
            <Icon as={RefreshCw} size={16} className="text-primary-foreground" />
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  // Empty state when no time-series data exists
  if (!timeseries || timeseries.length === 0) {
    return (
      <Card className="p-6">
        <Text className="mb-4 text-lg font-semibold">Traffic Overview</Text>
        <View className="h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20">
          <Icon as={BarChart3} size={48} className="text-muted-foreground/50" />
          <Text className="mt-2 text-muted-foreground">No engagement data yet</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Data will appear as users engage with the platform
          </Text>
        </View>
      </Card>
    );
  }

  // Calculate max value for bar heights and total
  const maxValue = Math.max(...timeseries.map((d) => d.value), 1);
  const totalEngagement = timeseries.reduce((sum, d) => sum + d.value, 0);

  // Simplified bar chart visualization (FR-006)
  // Only show last 10 data points to fit nicely
  const displayData = timeseries.slice(-10);

  return (
    <Card className="p-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold">Traffic Overview</Text>
        <View className="flex-row items-center gap-1">
          <Icon as={TrendingUp} size={14} className="text-green-500" />
          <Text className="text-sm text-muted-foreground">
            {formatCompactNumber(totalEngagement)} total
          </Text>
        </View>
      </View>

      {/* Simplified bar chart */}
      <View className="h-48 rounded-lg bg-muted/10 p-4">
        <View className="h-full flex-row items-end justify-between gap-1">
          {displayData.map((dataPoint, index) => {
            const heightPercent = (dataPoint.value / maxValue) * 100;
            return (
              <View key={index} className="h-full flex-1 items-center justify-end">
                <View
                  className="min-h-[4px] w-full rounded-t bg-primary"
                  style={{ height: `${Math.max(heightPercent, 5)}%` }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Date range indicator */}
      <View className="mt-2 flex-row justify-between">
        <Text className="text-xs text-muted-foreground">
          {displayData[0]?.date.split('-').slice(1).join('/')}
        </Text>
        <Text className="text-xs text-muted-foreground">Last 30 days</Text>
        <Text className="text-xs text-muted-foreground">
          {displayData[displayData.length - 1]?.date.split('-').slice(1).join('/')}
        </Text>
      </View>
    </Card>
  );
}
