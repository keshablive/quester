/**
 * Analytics Hook Interfaces
 * 
 * Contract for analytics hook extensions
 */

import type { UseQueryResult } from '@tanstack/react-query';
import type { EngagementData, TimeRange } from './types';

/**
 * Hook to fetch engagement chart data for a specific time range
 * 
 * Implements:
 * - FR-013: Engagement chart data by time range
 * - FR-014: Independent loading (charts load separately)
 * 
 * @param timeRange - Time range for the chart data ('7d', '30d', '90d', '1y')
 * @returns TanStack Query result with engagement chart data
 * 
 * @example
 * ```tsx
 * const [timeRange, setTimeRange] = useState<TimeRange>('7d');
 * const { data: engagement, isLoading } = useEngagementChart(timeRange);
 * 
 * // Chart only shows loading when its own data is fetching
 * if (isLoading) return <ChartSkeleton />;
 * ```
 */
export type UseEngagementChart = (
  timeRange: TimeRange
) => UseQueryResult<EngagementData, Error>;

/**
 * Configuration for analytics hooks
 */
export const ANALYTICS_CONFIG = {
  /** Stale time for engagement chart in milliseconds (5 minutes) */
  chartStaleTime: 5 * 60 * 1000,
  /** Query key prefix for engagement */
  engagementKeyPrefix: 'analytics.engagement',
} as const;
