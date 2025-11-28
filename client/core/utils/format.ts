/**
 * Formatting Utilities
 *
 * Number and data formatting functions for display.
 *
 * @module core/utils/format
 */

/**
 * Format a number in compact notation (1K, 1.5M, etc.)
 *
 * FR-010: System MUST format large numbers for readability
 * Note: Use formatNumber from common.ts for locale formatting (1,234,567)
 *
 * @param num - Number to format
 * @returns Formatted string with K/M suffix
 *
 * @example
 * ```tsx
 * formatCompactNumber(1000)      // "1k"
 * formatCompactNumber(1500)      // "1.5k"
 * formatCompactNumber(1000000)   // "1M"
 * formatCompactNumber(1500000)   // "1.5M"
 * formatCompactNumber(999)       // "999"
 * formatCompactNumber(0)         // "0"
 * ```
 */
export function formatCompactNumber(num: number): string {
  if (num === 0) return '0';

  if (num >= 1000000) {
    const value = num / 1000000;
    return `${value.toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (num >= 1000) {
    const value = num / 1000;
    return `${value.toFixed(1).replace(/\.0$/, '')}k`;
  }

  return num.toString();
}

/**
 * Format a percentage with sign indicator
 *
 * @param value - Percentage value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string with + or - prefix
 *
 * @example
 * ```tsx
 * formatPercentageChange(12.5)   // "+12.5%"
 * formatPercentageChange(-5.2)   // "-5.2%"
 * formatPercentageChange(0)      // "0%"
 * ```
 */
export function formatPercentageChange(
  value: number,
  decimals: number = 1
): string {
  if (value === 0) return '0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 *
 * @example
 * ```tsx
 * formatDuration(3600)  // "1h 0m"
 * formatDuration(5400)  // "1h 30m"
 * formatDuration(300)   // "5m"
 * formatDuration(45)    // "0m"
 * ```
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Get date range for analytics queries
 *
 * @param days - Number of days back from today
 * @returns Object with start and end dates in YYYY-MM-DD format
 *
 * @example
 * ```tsx
 * const { start, end } = getDateRange(30);
 * // start: "2025-10-29", end: "2025-11-28" (if today is Nov 28)
 * ```
 */
export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
