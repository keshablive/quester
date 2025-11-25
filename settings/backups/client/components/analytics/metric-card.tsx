/**
 * MetricCard Component (T190)
 *
 * Displays a KPI metric with value, trend indicator, and change percentage.
 * Used in dashboards to show key performance indicators.
 *
 * Features:
 * - Value display with formatting options
 * - Trend indicators (up, down, neutral)
 * - Change percentage with color coding
 * - Icon support
 * - Multiple size variants
 * - Loading skeleton
 * - Comparison period labels
 */

import * as React from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LucideIcon,
} from 'lucide-react-native';

// Trend direction
export type TrendDirection = 'up' | 'down' | 'neutral';

// Format type for value display
export type MetricFormat = 'number' | 'currency' | 'percentage' | 'duration';

export interface MetricData {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend?: TrendDirection;
  format?: MetricFormat;
  category?: string;
  updatedAt?: string;
}

export interface MetricCardProps {
  metric: MetricData;
  icon?: LucideIcon;
  size?: 'small' | 'medium' | 'large';
  showTrend?: boolean;
  showChange?: boolean;
  showComparison?: boolean;
  comparisonLabel?: string; // e.g., "vs last week"
  isLoading?: boolean;
  onPress?: () => void;
  className?: string;
}

// Format value based on type
const formatValue = (value: number, format: MetricFormat = 'number'): string => {
  switch (format) {
    case 'currency':
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'duration':
      // Convert minutes to hours:minutes format
      const hours = Math.floor(value / 60);
      const minutes = Math.floor(value % 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    case 'number':
    default:
      return value.toLocaleString('en-US');
  }
};

// Get trend color classes
const getTrendColor = (trend: TrendDirection, isPositiveGood: boolean = true) => {
  if (trend === 'neutral') return 'text-muted-foreground';

  const isPositive = trend === 'up';
  const shouldBeGreen = isPositiveGood ? isPositive : !isPositive;

  return shouldBeGreen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
};

// Get trend icon
const getTrendIcon = (trend: TrendDirection) => {
  switch (trend) {
    case 'up':
      return TrendingUpIcon;
    case 'down':
      return TrendingDownIcon;
    case 'neutral':
    default:
      return MinusIcon;
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  icon: Icon,
  size = 'medium',
  showTrend = true,
  showChange = true,
  showComparison = true,
  comparisonLabel = 'vs last period',
  isLoading = false,
  onPress,
  className,
}) => {
  // Calculate change if not provided
  const change = React.useMemo(() => {
    if (metric.change !== undefined) return metric.change;
    if (metric.previousValue !== undefined && metric.previousValue !== 0) {
      return metric.value - metric.previousValue;
    }
    return 0;
  }, [metric.change, metric.value, metric.previousValue]);

  // Calculate change percentage if not provided
  const changePercentage = React.useMemo(() => {
    if (metric.changePercentage !== undefined) return metric.changePercentage;
    if (metric.previousValue !== undefined && metric.previousValue !== 0) {
      return ((metric.value - metric.previousValue) / metric.previousValue) * 100;
    }
    return 0;
  }, [metric.changePercentage, metric.value, metric.previousValue]);

  // Determine trend if not provided
  const trend: TrendDirection = React.useMemo(() => {
    if (metric.trend) return metric.trend;
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  }, [metric.trend, change]);

  // Size-based styling
  const sizeClasses = {
    small: {
      card: 'p-3',
      icon: 'h-6 w-6',
      value: 'text-xl',
      label: 'text-xs',
      change: 'text-xs',
    },
    medium: {
      card: 'p-4',
      icon: 'h-8 w-8',
      value: 'text-2xl',
      label: 'text-sm',
      change: 'text-sm',
    },
    large: {
      card: 'p-6',
      icon: 'h-10 w-10',
      value: 'text-3xl',
      label: 'text-base',
      change: 'text-base',
    },
  };

  const styles = sizeClasses[size];
  const TrendIcon = getTrendIcon(trend);
  const trendColor = getTrendColor(trend);

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn(styles.card, className)}>
        <CardContent className="flex min-h-[100px] items-center justify-center">
          <ActivityIndicator size="large" />
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <Card className={cn(styles.card, className)}>
      <CardContent className="p-0">
        {/* Header with icon and name */}
        <View className="mb-2 flex flex-row items-start justify-between">
          <View className="flex-1">
            <Text className={cn(styles.label, 'font-medium text-muted-foreground')}>
              {metric.name}
            </Text>
          </View>
          {Icon && <Icon className={cn(styles.icon, 'text-muted-foreground')} />}
        </View>

        {/* Main value */}
        <Text className={cn(styles.value, 'mb-2 font-bold')}>
          {formatValue(metric.value, metric.format)}
        </Text>

        {/* Trend and change indicators */}
        {(showTrend || showChange) && (
          <View className="flex flex-row items-center gap-2">
            {showTrend && (
              <View className="flex flex-row items-center">
                <TrendIcon className={cn('h-4 w-4', trendColor)} />
              </View>
            )}
            {showChange && changePercentage !== 0 && (
              <View className="flex flex-row items-center gap-1">
                {changePercentage > 0 ? (
                  <ArrowUpIcon className={cn('h-3 w-3', trendColor)} />
                ) : (
                  <ArrowDownIcon className={cn('h-3 w-3', trendColor)} />
                )}
                <Text className={cn(styles.change, 'font-medium', trendColor)}>
                  {Math.abs(changePercentage).toFixed(1)}%
                </Text>
              </View>
            )}
            {showChange && change !== 0 && (
              <Text className={cn(styles.change, 'text-muted-foreground')}>
                ({change > 0 ? '+' : ''}
                {formatValue(change, metric.format)})
              </Text>
            )}
          </View>
        )}

        {/* Comparison label */}
        {showComparison && (metric.previousValue !== undefined || comparisonLabel) && (
          <Text className={cn(styles.change, 'mt-1 text-muted-foreground')}>{comparisonLabel}</Text>
        )}

        {/* Category badge */}
        {metric.category && (
          <View className="mt-2">
            <View className="self-start rounded-full bg-secondary px-2 py-1">
              <Text variant="small" className="text-secondary-foreground">
                {metric.category}
              </Text>
            </View>
          </View>
        )}

        {/* Last updated */}
        {metric.updatedAt && (
          <Text className={cn(styles.change, 'mt-2 text-muted-foreground')}>
            Updated {new Date(metric.updatedAt).toLocaleTimeString()}
          </Text>
        )}
      </CardContent>
    </Card>
  );

  // Wrap in Pressable if onPress is provided
  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};

// MetricCard Grid Layout Helper Component
export interface MetricCardGridProps {
  metrics: MetricData[];
  columns?: 1 | 2 | 3 | 4;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  onMetricPress?: (metric: MetricData) => void;
  className?: string;
}

export const MetricCardGrid: React.FC<MetricCardGridProps> = ({
  metrics,
  columns = 2,
  size = 'medium',
  isLoading = false,
  onMetricPress,
  className,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  if (isLoading) {
    return (
      <View className={cn('grid gap-4', gridCols[columns], className)}>
        {Array.from({ length: columns * 2 }).map((_, index) => (
          <MetricCard key={index} metric={{ name: 'Loading...', value: 0 }} size={size} isLoading />
        ))}
      </View>
    );
  }

  return (
    <View className={cn('grid gap-4', gridCols[columns], className)}>
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          metric={metric}
          size={size}
          onPress={() => onMetricPress?.(metric)}
        />
      ))}
    </View>
  );
};

export default MetricCard;
