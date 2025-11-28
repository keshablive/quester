/**
 * Date Formatting and Manipulation Utilities
 * 
 * Provides consistent date handling across the application
 * with support for relative time, formatting, and duration.
 * 
 * @example
 * ```tsx
 * import { formatTimeAgo, formatDate, formatDuration } from '@/core';
 * 
 * formatTimeAgo(new Date('2024-01-01')); // "2 months ago"
 * formatDate(new Date(), 'PP'); // "Jan 1, 2024"
 * formatDuration(3665); // "1:01:05"
 * ```
 */

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * 
 * @param date - The date to format
 * @returns Human-readable relative time string
 * 
 * @example
 * ```tsx
 * formatTimeAgo(new Date(Date.now() - 3600000)); // "1 hour ago"
 * formatTimeAgo(new Date(Date.now() + 3600000)); // "in 1 hour"
 * ```
 */
export function formatTimeAgo(date: Date | string | number): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (seconds < 31536000) {
    const months = Math.floor(seconds / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(seconds / 31536000);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Format a date with a specific pattern
 * 
 * @param date - The date to format
 * @param formatStr - Format pattern (default: 'PP' for "Jan 1, 2024")
 * @returns Formatted date string
 * 
 * @example
 * ```tsx
 * formatDate(new Date(), 'PP'); // "Jan 1, 2024"
 * formatDate(new Date(), 'PPpp'); // "Jan 1, 2024, 2:30 PM"
 * formatDate(new Date(), 'yyyy-MM-dd'); // "2024-01-01"
 * ```
 */
export function formatDate(date: Date | string | number, formatStr: string = 'PP'): string {
  const d = new Date(date);
  
  // Simple format patterns - extend as needed
  const patterns: Record<string, string> = {
    'PP': d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    'PPpp': d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    'yyyy-MM-dd': d.toISOString().split('T')[0],
    'MM/dd/yyyy': `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`,
    'HH:mm': `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };

  return patterns[formatStr] || d.toLocaleDateString();
}

/**
 * Format seconds into a duration string (HH:MM:SS or MM:SS)
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 * 
 * @example
 * ```tsx
 * formatDuration(65); // "1:05"
 * formatDuration(3665); // "1:01:05"
 * formatDuration(45); // "0:45"
 * ```
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format date for accessibility (screen readers)
 * 
 * @param date - The date to format
 * @returns Accessible date string
 * 
 * @example
 * ```tsx
 * formatAccessibleDate(new Date()); // "Saturday, January 1, 2024"
 * ```
 */
export function formatAccessibleDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Check if a date is today
 * 
 * @param date - The date to check
 * @returns True if the date is today
 * 
 * @example
 * ```tsx
 * isToday(new Date()); // true
 * isToday(new Date('2023-01-01')); // false
 * ```
 */
export function isToday(date: Date | string | number): boolean {
  const today = new Date();
  const check = new Date(date);
  return check.toDateString() === today.toDateString();
}

/**
 * Check if a date is within the last N days
 * 
 * @param date - The date to check
 * @param days - Number of days to check
 * @returns True if the date is within the last N days
 * 
 * @example
 * ```tsx
 * isWithinDays(new Date(), 7); // true
 * isWithinDays(new Date('2023-01-01'), 7); // false (if more than 7 days ago)
 * ```
 */
export function isWithinDays(date: Date | string | number, days: number): boolean {
  const now = new Date();
  const check = new Date(date);
  const diff = now.getTime() - check.getTime();
  const daysDiff = diff / (1000 * 60 * 60 * 24);
  return daysDiff <= days && daysDiff >= 0;
}

/**
 * Add days to a date
 * 
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 * 
 * @example
 * ```tsx
 * addDays(new Date('2024-01-01'), 7); // 2024-01-08
 * addDays(new Date('2024-01-01'), -7); // 2023-12-25
 * ```
 */
export function addDays(date: Date | string | number, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get start of day (00:00:00)
 * 
 * @param date - The date
 * @returns Date set to start of day
 * 
 * @example
 * ```tsx
 * startOfDay(new Date('2024-01-01T15:30:00')); // 2024-01-01T00:00:00
 * ```
 */
export function startOfDay(date: Date | string | number): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day (23:59:59.999)
 * 
 * @param date - The date
 * @returns Date set to end of day
 * 
 * @example
 * ```tsx
 * endOfDay(new Date('2024-01-01T15:30:00')); // 2024-01-01T23:59:59.999
 * ```
 */
export function endOfDay(date: Date | string | number): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}
