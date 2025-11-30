/**
 * StaleDataIndicator Component
 *
 * Displays a warning banner when cached data may be outdated.
 * Uses dataUpdatedAt timestamp to determine staleness.
 *
 * FR-008: All screens MUST display indicator when showing cached data
 *
 * @module components/shared/StaleDataIndicator
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { WifiOff, Clock } from 'lucide-react-native';
import { cn } from '@/core';

/** One hour threshold for showing stale data indicator */
const DEFAULT_STALE_THRESHOLD_MS = 60 * 60 * 1000;

export interface StaleDataIndicatorProps {
  /** Timestamp when data was last updated (from TanStack Query's dataUpdatedAt) */
  dataUpdatedAt: number;
  /** Custom stale threshold in milliseconds (default: 1 hour) */
  staleThreshold?: number;
  /** Custom message to display */
  message?: string;
  /** Whether to show timestamp in message */
  showTimestamp?: boolean;
  /** Variant for different severity levels */
  variant?: 'warning' | 'info';
  /** Additional className for container */
  className?: string;
}

/**
 * StaleDataIndicator
 *
 * Shows when cached data may be outdated (>1 hour old by default).
 * Used alongside TanStack Query's dataUpdatedAt to inform users.
 *
 * @example
 * ```tsx
 * const { data, dataUpdatedAt } = useTransaction(id);
 * return (
 *   <>
 *     <StaleDataIndicator dataUpdatedAt={dataUpdatedAt} />
 *     <TransactionContent data={data} />
 *   </>
 * );
 * ```
 */
export function StaleDataIndicator({
  dataUpdatedAt,
  staleThreshold = DEFAULT_STALE_THRESHOLD_MS,
  message,
  showTimestamp = false,
  variant = 'warning',
  className,
}: StaleDataIndicatorProps) {
  const isStale = Date.now() - dataUpdatedAt > staleThreshold;

  // Don't render if data is fresh
  if (!isStale || dataUpdatedAt === 0) {
    return null;
  }

  const lastUpdated = new Date(dataUpdatedAt).toLocaleTimeString();
  const defaultMessage = showTimestamp
    ? `Showing cached data (updated: ${lastUpdated})`
    : 'Showing cached data. Pull down to refresh.';

  const isWarning = variant === 'warning';
  const Icon = isWarning ? WifiOff : Clock;

  return (
    <View
      className={cn(
        'mx-4 mb-2 flex-row items-center gap-2 rounded-lg px-3 py-2',
        isWarning ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30',
        className
      )}>
      <Icon
        size={16}
        className={cn(
          isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
        )}
      />
      <Text
        className={cn(
          'flex-1 text-sm',
          isWarning ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'
        )}>
        {message ?? defaultMessage}
      </Text>
    </View>
  );
}
