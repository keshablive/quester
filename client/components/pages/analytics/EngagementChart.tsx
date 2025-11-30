/**
 * EngagementChart Component
 *
 * Engagement chart with time range selector using TanStack Query.
 * Supports independent loading per chart section and error states.
 *
 * US4: Analytics Dashboard with Efficient Data Loading (Priority: P2)
 * FR-013: useEngagementChart(timeRange) returns chart data
 * FR-014: Independent loading indicators per chart section
 *
 * @module components/pages/analytics/EngagementChart
 */

import * as React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text, Card, Icon, Skeleton } from '@/components/ui';
import { BarChart3, RefreshCw, TrendingUp, Calendar, ChevronDown } from 'lucide-react-native';
import { useEngagementChart, cn } from '@/core';
import type { TimeRange } from '@/core/types/query.types';
import { ErrorState } from '@/components/shared';
import { formatCompactNumber } from '@/core/utils/format';

// ============================================================================
// Types
// ============================================================================

interface EngagementChartProps {
  /** Initial time range selection */
  defaultTimeRange?: TimeRange;
  /** Title for the chart */
  title?: string;
  /** Show time range selector */
  showSelector?: boolean;
}

interface TimeRangeOption {
  value: TimeRange;
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
];

// ============================================================================
// Sub-components
// ============================================================================

/**
 * T039: Loading skeleton for chart
 */
function ChartSkeleton() {
  return (
    <View className="h-48 rounded-lg bg-muted/20 p-4">
      <View className="h-full flex-row items-end justify-between">
        {[0.4, 0.6, 0.8, 0.5, 0.7, 0.9, 0.6, 0.8, 0.5, 0.7].map((h, i) => (
          <Skeleton key={i} className="rounded" style={{ width: 20, height: `${h * 100}%` }} />
        ))}
      </View>
    </View>
  );
}

/**
 * T041: Time range selector component
 */
function TimeRangeSelector({
  value,
  onChange,
  disabled,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = TIME_RANGE_OPTIONS.find((opt) => opt.value === value);

  return (
    <View className="relative">
      <Pressable
        className={cn(
          'flex-row items-center gap-1 rounded-lg border border-border bg-card px-3 py-2',
          disabled && 'opacity-50'
        )}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}>
        <Icon as={Calendar} size={14} className="text-muted-foreground" />
        <Text className="text-sm">{selectedOption?.label}</Text>
        <Icon
          as={ChevronDown}
          size={14}
          className={cn('text-muted-foreground transition-transform', isOpen && 'rotate-180')}
        />
      </Pressable>

      {isOpen && (
        <View className="absolute right-0 top-12 z-50 min-w-[160px] rounded-lg border border-border bg-card shadow-lg">
          {TIME_RANGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              className={cn(
                'border-b border-border px-4 py-3 last:border-b-0',
                option.value === value && 'bg-primary/10'
              )}
              onPress={() => {
                onChange(option.value);
                setIsOpen(false);
              }}>
              <Text
                className={cn(
                  'text-sm',
                  option.value === value ? 'font-semibold text-primary' : 'text-foreground'
                )}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * EngagementChart
 *
 * T038: Uses useEngagementChart(timeRange) for chart data
 * T039: Independent loading indicators
 * T040: Error state per chart
 * T041: Time range selector that triggers chart refetch
 *
 * @example
 * ```tsx
 * <EngagementChart defaultTimeRange="7d" showSelector />
 * ```
 */
export function EngagementChart({
  defaultTimeRange = '7d',
  title = 'Engagement Overview',
  showSelector = true,
}: EngagementChartProps) {
  // T041: Time range state for selector
  const [timeRange, setTimeRange] = React.useState<TimeRange>(defaultTimeRange);

  // T038: Fetch chart data with time range
  const { data: chartData, isLoading, isFetching, error, refetch } = useEngagementChart(timeRange);

  // Handle time range change
  const handleTimeRangeChange = React.useCallback((newRange: TimeRange) => {
    setTimeRange(newRange);
    // TanStack Query will automatically refetch with new time range
  }, []);

  // T040: Error state with retry
  if (error && !chartData) {
    return (
      <Card className="p-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold">{title}</Text>
          {showSelector && (
            <TimeRangeSelector
              value={timeRange}
              onChange={handleTimeRangeChange}
              disabled={isLoading}
            />
          )}
        </View>
        <ErrorState
          title="Failed to Load Chart"
          message={error.message || 'Could not load engagement data'}
          onRetry={refetch}
        />
      </Card>
    );
  }

  // T039: Loading skeleton for initial load
  if (isLoading && !chartData) {
    return (
      <Card className="p-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold">{title}</Text>
          {showSelector && (
            <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled />
          )}
        </View>
        <ChartSkeleton />
      </Card>
    );
  }

  // Empty state
  if (!chartData?.length) {
    return (
      <Card className="p-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold">{title}</Text>
          {showSelector && <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />}
        </View>
        <View className="h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20">
          <Icon as={BarChart3} size={48} className="text-muted-foreground/50" />
          <Text className="mt-2 text-muted-foreground">No engagement data for this period</Text>
        </View>
      </Card>
    );
  }

  // Calculate chart metrics - chartData is TimeSeriesData[]
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const totalEngagement = chartData.reduce((sum, d) => sum + d.value, 0);
  const displayData = chartData.slice(-10); // Show last 10 points

  return (
    <Card className="p-6">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold">{title}</Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Icon as={TrendingUp} size={14} className="text-green-500" />
            <Text className="text-sm text-muted-foreground">
              {formatCompactNumber(totalEngagement)} total
            </Text>
            {/* T039: Independent loading indicator during refetch */}
            {isFetching && !isLoading && <ActivityIndicator size="small" className="ml-2" />}
          </View>
        </View>
        {showSelector && (
          <TimeRangeSelector
            value={timeRange}
            onChange={handleTimeRangeChange}
            disabled={isFetching}
          />
        )}
      </View>

      {/* Bar chart visualization */}
      <View className="h-48 rounded-lg bg-muted/10 p-4">
        <View className="h-full flex-row items-end justify-between gap-1">
          {displayData.map((dataPoint, index) => {
            const heightPercent = (dataPoint.value / maxValue) * 100;
            return (
              <View key={index} className="h-full flex-1 items-center justify-end">
                <View
                  className="min-h-[4px] w-full rounded-t bg-primary"
                  style={{ height: `${heightPercent}%` }}
                />
                {/* Show date label for every other point on smaller datasets */}
                {displayData.length <= 7 && (
                  <Text className="mt-1 text-[8px] text-muted-foreground">
                    {new Date(dataPoint.date).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View className="mt-3 flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-2 rounded bg-primary" />
          <Text className="text-xs text-muted-foreground">Engagement</Text>
        </View>
        {chartData.length > 0 && (
          <Text className="text-xs text-muted-foreground">
            {new Date(chartData[0].date).toLocaleDateString()} -{' '}
            {new Date(chartData[chartData.length - 1].date).toLocaleDateString()}
          </Text>
        )}
      </View>
    </Card>
  );
}

export default EngagementChart;
