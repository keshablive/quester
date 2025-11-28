import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Card, Icon, Skeleton } from '@/components/ui';
import {
  Activity,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react-native';
import { useUserAnalytics, useCurrentUser } from '@/core/hooks/queries';
import { formatCompactNumber, formatPercentageChange } from '@/core/utils/format';
import type { AnalyticsProps, MetricItem } from './types';

/**
 * KeyMetrics - Display user analytics summary
 *
 * US1: View Key Metrics Dashboard
 * FR-001: Fetch user analytics from API
 * FR-002: Display real totalSessions, averageScore, coursesCompleted
 * FR-007: Show loading skeletons during data fetch
 * FR-008: Show error states with retry capability
 * FR-010: Format large numbers for readability
 */
export function KeyMetrics({ userId }: AnalyticsProps) {
  const { data: currentUser } = useCurrentUser();
  const effectiveUserId = userId || currentUser?.id || '';

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useUserAnalytics(effectiveUserId, {
    enabled: !!effectiveUserId,
  });

  // Loading skeleton state (FR-007)
  if (isLoading) {
    return (
      <View className="flex-row flex-wrap gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="min-w-[150px] flex-1 p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Skeleton className="h-[18px] w-[18px] rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </View>
            <Skeleton className="mb-1 h-8 w-16 rounded" />
            <View className="mt-1 flex-row items-center gap-1">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </View>
          </Card>
        ))}
      </View>
    );
  }

  // Error state with retry (FR-008)
  if (error) {
    return (
      <Card className="p-6">
        <View className="items-center">
          <Text className="mb-4 text-center text-destructive">Failed to load analytics data</Text>
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

  // Zero-data state (Edge case: new user)
  if (!analytics || (analytics.totalSessions === 0 && analytics.coursesCompleted === 0)) {
    return (
      <Card className="p-6">
        <View className="items-center">
          <Icon as={Activity} size={32} className="mb-2 text-muted-foreground" />
          <Text className="text-center text-muted-foreground">No activity yet</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            Start learning to see your metrics here
          </Text>
        </View>
      </Card>
    );
  }

  // Build metrics from real API data (FR-002, FR-010)
  const metrics: MetricItem[] = [
    {
      label: 'Sessions',
      value: formatCompactNumber(analytics.totalSessions),
      change: '+0%', // TODO: Week-over-week when API supports it
      changeType: 'increase',
      icon: Activity,
    },
    {
      label: 'Avg Score',
      value: `${analytics.averageScore.toFixed(1)}%`,
      change: '+0%', // TODO: Week-over-week when API supports it
      changeType: 'increase',
      icon: BarChart3,
    },
    {
      label: 'Courses Done',
      value: formatCompactNumber(analytics.coursesCompleted),
      change: '+0%', // TODO: Week-over-week when API supports it
      changeType: 'increase',
      icon: PieChart,
    },
  ];

  return (
    <View className="flex-row flex-wrap gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="min-w-[150px] flex-1 p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <Icon as={metric.icon} size={18} className="text-primary" />
            <Text className="text-sm text-muted-foreground">{metric.label}</Text>
          </View>
          <Text className="text-2xl font-bold">{metric.value}</Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Icon
              as={metric.changeType === 'increase' ? TrendingUp : TrendingDown}
              size={14}
              className={metric.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}
            />
            <Text
              className={`text-xs ${metric.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
              {metric.change}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}
