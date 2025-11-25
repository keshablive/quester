/**
 * Analytics Dashboard Screen (T196)
 *
 * Main analytics dashboard with customizable widgets showing key metrics,
 * charts, and performance indicators.
 *
 * Features:
 * - Real-time metrics display
 * - Interactive charts (line, bar, pie)
 * - Period selection (today, 7days, 30days, etc.)
 * - Widget customization
 * - Refresh on demand
 * - Export functionality
 */

import * as React from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartWidget } from '@/components/analytics/chart-widget';
import { MetricCardGrid } from '@/components/analytics/metric-card';
import {
  useDashboardData,
  useUserAnalyticsTimeSeries,
  useEngagementAnalyticsTimeSeries,
} from '@/lib/hooks/useAnalytics';
import { useDefaultDashboard, useRefreshDashboard } from '@/lib/hooks/useReports';
import { useAuth } from '@/lib/hooks/useAuth';
import type { AnalyticsPeriod } from '@/lib/api/analytics';
import type { ChartDataPoint } from '@/components/analytics/chart-widget';
import type { MetricData } from '@/components/analytics/metric-card';
import { RefreshCwIcon, SettingsIcon, DownloadIcon, CalendarIcon } from 'lucide-react-native';

const PERIOD_OPTIONS: { label: string; value: string }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'Last 90 Days', value: '90days' },
  { label: 'This Year', value: 'year' },
];

export default function AnalyticsDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = React.useState<AnalyticsPeriod>('30days');
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch dashboard data
  const {
    userSummary,
    topCourses: topCoursesData,
    metrics,
    isLoading,
    refetch,
  } = useDashboardData({
    userId: user?.id || '',
    period: selectedPeriod,
    includeTopCourses: true,
    includeMetrics: true,
  });

  // Fetch time series data for charts
  const { data: userTimeSeries } = useUserAnalyticsTimeSeries({
    userId: user?.id || '',
    period: selectedPeriod,
  });

  const { data: engagementTimeSeries } = useEngagementAnalyticsTimeSeries({
    period: selectedPeriod,
  });

  // Fetch default dashboard configuration
  const { data: dashboardData } = useDefaultDashboard();
  const { mutate: refreshDashboard } = useRefreshDashboard();

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      if (dashboardData?.dashboard?.id) {
        refreshDashboard(dashboardData.dashboard.id);
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshDashboard, dashboardData]);

  // Convert metrics to MetricCard data
  const keyMetrics: MetricData[] = React.useMemo(() => {
    if (!metrics) return [];

    return [
      {
        name: 'Total Users',
        value: metrics.find((m) => m.name === 'total_users')?.value || 0,
        previousValue: metrics.find((m) => m.name === 'total_users')?.previous_value,
        format: 'number',
        category: 'Users',
      },
      {
        name: 'Active Users',
        value: metrics.find((m) => m.name === 'active_users')?.value || 0,
        previousValue: metrics.find((m) => m.name === 'active_users')?.previous_value,
        format: 'number',
        category: 'Users',
      },
      {
        name: 'Total Revenue',
        value: metrics.find((m) => m.name === 'total_revenue')?.value || 0,
        previousValue: metrics.find((m) => m.name === 'total_revenue')?.previous_value,
        format: 'currency',
        category: 'Revenue',
      },
      {
        name: 'Completion Rate',
        value: metrics.find((m) => m.name === 'avg_completion_rate')?.value || 0,
        previousValue: metrics.find((m) => m.name === 'avg_completion_rate')?.previous_value,
        format: 'percentage',
        category: 'Performance',
      },
    ];
  }, [metrics]);

  // Convert user time series to chart data
  const userActivityChartData: ChartDataPoint[] = React.useMemo(() => {
    if (!userTimeSeries?.timeseries) return [];

    return userTimeSeries.timeseries.map((point) => ({
      label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: point.active_minutes,
    }));
  }, [userTimeSeries]);

  // Convert engagement time series to chart data
  const engagementChartData: ChartDataPoint[] = React.useMemo(() => {
    if (!engagementTimeSeries?.timeseries) return [];

    return engagementTimeSeries.timeseries.map((point) => ({
      label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: point.daily_active_users,
    }));
  }, [engagementTimeSeries]);

  // Convert top courses to chart data
  const topCoursesChartData: ChartDataPoint[] = React.useMemo(() => {
    if (!topCoursesData) return [];

    return topCoursesData.slice(0, 5).map((course) => ({
      label: course.course_name || course.course_id,
      value: course.total_enrollments,
    }));
  }, [topCoursesData]);

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen
          options={{
            title: 'Analytics Dashboard',
            headerShown: true,
          }}
        />
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted-foreground">Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'Analytics Dashboard',
          headerShown: true,
          headerRight: () => (
            <View className="flex-row gap-2 pr-4">
              <Button variant="ghost" size="icon" onPress={handleRefresh} disabled={refreshing}>
                <RefreshCwIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onPress={() => router.push('/settings' as any)}>
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </View>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View className="gap-6 p-4">
          {/* Period Selector */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold">Analytics</Text>
              <Text className="text-sm text-muted-foreground">Overview of your performance</Text>
            </View>

            <Select
              value={{
                value: selectedPeriod,
                label:
                  PERIOD_OPTIONS.find((o) => o.value === selectedPeriod)?.label || 'Last 30 Days',
              }}
              onValueChange={(option) =>
                option && setSelectedPeriod(option.value as AnalyticsPeriod)
              }>
              <SelectTrigger className="w-40">
                <View className="flex-row items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select period" />
                </View>
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} label={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>

          {/* Key Metrics Grid */}
          <View>
            <Text className="mb-4 text-lg font-semibold">Key Metrics</Text>
            <MetricCardGrid metrics={keyMetrics} columns={2} size="medium" isLoading={isLoading} />
          </View>

          {/* User Activity Chart */}
          <ChartWidget
            title="User Activity"
            description="Active minutes over time"
            config={{
              type: 'line',
              data: userActivityChartData,
              showGrid: true,
              showLegend: false,
              yAxisLabel: 'Minutes',
            }}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />

          {/* Engagement Chart */}
          <ChartWidget
            title="Daily Active Users"
            description="User engagement over time"
            config={{
              type: 'area',
              data: engagementChartData,
              showGrid: true,
              showLegend: false,
              yAxisLabel: 'Users',
            }}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />

          {/* Top Courses Chart */}
          <ChartWidget
            title="Top Courses"
            description="Most popular courses by enrollment"
            config={{
              type: 'bar',
              data: topCoursesChartData,
              showGrid: false,
              showLegend: false,
            }}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />

          {/* Summary Stats */}
          {userSummary && (
            <View className="gap-4 rounded-lg border border-border bg-card p-4">
              <Text className="text-lg font-semibold">Summary Statistics</Text>

              <View className="flex-row flex-wrap gap-4">
                <View className="min-w-[45%] flex-1">
                  <Text className="text-sm text-muted-foreground">Total Logins</Text>
                  <Text className="text-xl font-bold">{userSummary.total_logins}</Text>
                </View>

                <View className="min-w-[45%] flex-1">
                  <Text className="text-sm text-muted-foreground">Avg. Active Time</Text>
                  <Text className="text-xl font-bold">
                    {Math.round(userSummary.avg_active_minutes)} min
                  </Text>
                </View>

                <View className="min-w-[45%] flex-1">
                  <Text className="text-sm text-muted-foreground">Courses Completed</Text>
                  <Text className="text-xl font-bold">{userSummary.total_courses_completed}</Text>
                </View>

                <View className="min-w-[45%] flex-1">
                  <Text className="text-sm text-muted-foreground">Points Earned</Text>
                  <Text className="text-xl font-bold">{userSummary.total_points_earned}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View className="gap-2">
            <Text className="text-lg font-semibold">Quick Actions</Text>
            <View className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onPress={() => router.push('/reports')}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                <Text>Export Data</Text>
              </Button>
              <Button variant="outline" className="flex-1" onPress={() => router.push('/reports')}>
                <Text>View Reports</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
