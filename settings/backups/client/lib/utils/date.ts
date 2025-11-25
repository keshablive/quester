/**
 * Date Utilities Module
 * 
 * Centralized date formatting and manipulation utilities.
 * Consolidates date formatting logic from across the application using date-fns.
 * 
 * @module lib/utils/date
 * 
 * Key Features:
 * - Accessibility-friendly date formatting
 * - Smart time display (today/yesterday/older)
 * - ISO 8601 API formatting
 * - Duration formatting
 * - Relative time displays
 * 
 * @example
 * ```typescript
 * import { formatSmartTime, getTimeAgo, formatForAPI } from '@/lib/utils/date';
 * 
 * // Smart time formatting
 * formatSmartTime(new Date()); // "2 minutes ago"
 * formatSmartTime(yesterdayDate); // "Yesterday at 3:45 PM"
 * 
 * // Relative time
 * getTimeAgo(postDate); // "5 hours ago"
 * 
 * // API formatting
 * formatForAPI(new Date()); // "2025-11-20T15:30:45.123Z"
 * ```
 */

import { format, formatDistanceToNow, isToday, isYesterday, parseISO, isValid } from 'date-fns';

/**
 * Format date for accessibility (screen readers)
 * 
 * @param date - Date to format
 * @returns Formatted string with full weekday and month names
 * 
 * @example
 * ```typescript
 * formatAccessibleDate(new Date('2025-11-20'));
 * // Returns: "Wednesday, November 20, 2025"
 * ```
 */
export function formatAccessibleDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    return 'Invalid date';
  }

  return format(d, 'EEEE, MMMM d, yyyy');
}

/**
 * Format time for accessibility (screen readers)
 * 
 * @param date - Date to format
 * @returns Formatted time string
 * 
 * @example
 * ```typescript
 * formatAccessibleTime(new Date('2025-11-20T14:30:00'));
 * // Returns: "2:30 PM"
 * ```
 */
export function formatAccessibleTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    return 'Invalid time';
  }

  return format(d, 'h:mm a');
}

/**
 * Format date relative to now (e.g., "2 hours ago", "in 3 days")
 * 
 * @param date - Date to format
 * @param addSuffix - Whether to add "ago" or "in" suffix
 * @returns Relative date string
 * 
 * @example
 * ```typescript
 * formatRelativeTime(new Date(Date.now() - 3600000));
 * // Returns: "about 1 hour ago"
 * ```
 */
export function formatRelativeTime(date: Date | string, addSuffix: boolean = true): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    return 'Invalid date';
  }

  return formatDistanceToNow(d, { addSuffix });
}

/**
 * Format notification/comment time with smart formatting
 * - Today: "2 hours ago"
 * - Yesterday: "Yesterday at 2:30 PM"
 * - Older: "Nov 20, 2:30 PM"
 * 
 * @param date - Date to format
 * @returns Smart formatted date string
 * 
 * @example
 * ```typescript
 * formatSmartTime(new Date());
 * // Returns: "just now" or "2 hours ago"
 * ```
 */
export function formatSmartTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    return 'Invalid date';
  }

  if (isToday(d)) {
    return formatDistanceToNow(d, { addSuffix: true });
  }
  
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`;
  }
  
  return format(d, 'MMM d, h:mm a');
}

/**
 * Format date in short format (e.g., "11/20/2025")
 * 
 * @param date - Date to format
 * @returns Short date string
 * 
 * @example
 * ```typescript
 * formatShortDate(new Date('2025-11-20'));
 * // Returns: "11/20/2025"
 * ```
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    return 'Invalid date';
  }

  return format(d, 'MM/dd/yyyy');
}

/**
 * Format date in long format (e.g., "November 20, 2025")
 * 
 * @param date - Date to format
 * @returns Long date string
 * 
 * @example
 * ```typescript
 * formatLongDate(new Date('2025-11-20'));
 * // Returns: "November 20, 2025"
 * ```
 */
export function formatLongDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    return 'Invalid date';
  }

  return format(d, 'MMMM d, yyyy');
}

/**
 * Format date with time (e.g., "Nov 20, 2025 at 2:30 PM")
 * 
 * @param date - Date to format
 * @returns Date with time string
 * 
 * @example
 * ```typescript
 * formatDateTime(new Date('2025-11-20T14:30:00'));
 * // Returns: "Nov 20, 2025 at 2:30 PM"
 * ```
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    return 'Invalid date';
  }

  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format date for API requests (ISO 8601)
 * 
 * @param date - Date to format
 * @returns ISO 8601 formatted string
 * 
 * @example
 * ```typescript
 * formatForAPI(new Date('2025-11-20T14:30:00'));
 * // Returns: "2025-11-20T14:30:00.000Z"
 * ```
 */
export function formatForAPI(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(d)) {
    throw new Error('Invalid date provided for API formatting');
  }

  return d.toISOString();
}

/**
 * Parse date string safely
 * 
 * @param dateString - Date string to parse
 * @returns Date object or null if invalid
 * 
 * @example
 * ```typescript
 * const date = parseDate('2025-11-20');
 * if (date) {
 *   console.log('Valid date:', date);
 * }
 * ```
 */
export function parseDate(dateString: string): Date | null {
  try {
    const d = parseISO(dateString);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Check if a date string or Date object is valid
 * 
 * @param date - Date to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * isValidDate('2025-11-20'); // true
 * isValidDate('invalid'); // false
 * ```
 */
export function isValidDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d);
}

/**
 * Get time ago in words (e.g., "2 hours", "3 days")
 * Without "ago" suffix for compact display
 * 
 * @param date - Date to format
 * @returns Time ago string without suffix
 * 
 * @example
 * ```typescript
 * getTimeAgo(new Date(Date.now() - 3600000));
 * // Returns: "about 1 hour"
 * ```
 */
export function getTimeAgo(date: Date | string): string {
  return formatRelativeTime(date, false);
}

/**
 * Format duration in seconds to human-readable string
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "1h 23m", "45s", "2h 15m 30s")
 * 
 * @example
 * ```typescript
 * formatDuration(3665);
 * // Returns: "1h 1m 5s"
 * ```
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Centralized date utilities object
 */
const dateUtils = {
  formatAccessibleDate,
  formatAccessibleTime,
  formatRelativeTime,
  formatSmartTime,
  formatShortDate,
  formatLongDate,
  formatDateTime,
  formatForAPI,
  parseDate,
  isValidDate,
  getTimeAgo,
  formatDuration,
};

export default dateUtils;
