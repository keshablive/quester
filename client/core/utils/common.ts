/**
 * Core Utility Functions
 * 
 * This file contains reusable utility functions used throughout
 * the framework.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines and merges Tailwind CSS class names
 * 
 * @description
 * This utility function combines multiple class names and resolves
 * Tailwind CSS conflicts, ensuring the last specified class takes precedence.
 * 
 * @param inputs - Class names to combine
 * @returns Merged class name string
 * 
 * @example
 * ```tsx
 * cn('px-2 py-1', 'px-4') // Returns: 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 * ```
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Formats a number with thousands separators
 * 
 * @param num - Number to format
 * @returns Formatted string
 * 
 * @example
 * ```tsx
 * formatNumber(1234567) // Returns: "1,234,567"
 * ```
 */
export function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * Truncates text to a specified length
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to append (default: '...')
 * @returns Truncated text
 * 
 * @example
 * ```tsx
 * truncateText('Hello World', 8) // Returns: "Hello..."
 * truncateText('Hello World', 8, '…') // Returns: "Hello W…"
 * ```
 */
export function truncateText(
    text: string,
    maxLength: number,
    suffix: string = '...'
): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Delays execution for a specified time
 * 
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 * 
 * @example
 * ```tsx
 * await sleep(1000); // Wait for 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounces a function call
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 * FR-011: Fixed generic types from `any[]` to `unknown[]`
 * 
 * @example
 * ```tsx
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching:', query);
 * }, 300);
 * ```
 */
export function debounce<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn,
    wait: number
): (...args: TArgs) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function executedFunction(...args: TArgs): void {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttles a function call
 * 
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 * FR-011: Fixed generic types from `any[]` to `unknown[]`
 * 
 * @example
 * ```tsx
 * const throttledScroll = throttle(() => {
 *   console.log('Scrolling');
 * }, 100);
 * ```
 */
export function throttle<TArgs extends unknown[], TReturn>(
    func: (...args: TArgs) => TReturn,
    limit: number
): (...args: TArgs) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: TArgs): void {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Checks if a value is defined (not null or undefined)
 * 
 * @param value - Value to check
 * @returns True if value is defined
 * 
 * @example
 * ```tsx
 * isDefined(null) // Returns: false
 * isDefined(undefined) // Returns: false
 * isDefined(0) // Returns: true
 * isDefined('') // Returns: true
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

/**
 * Safely parses JSON with error handling
 * 
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 * 
 * @example
 * ```tsx
 * safeJsonParse('{"name": "John"}', {}) // Returns: { name: "John" }
 * safeJsonParse('invalid json', {}) // Returns: {}
 * ```
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

/**
 * Generates a unique ID
 * 
 * @param prefix - Optional prefix for the ID
 * @returns Unique identifier string
 * 
 * @example
 * ```tsx
 * generateId() // Returns: "1234567890abc"
 * generateId('user') // Returns: "user_1234567890abc"
 * ```
 */
export function generateId(prefix?: string): string {
    const id = Math.random().toString(36).substring(2, 11);
    return prefix ? `${prefix}_${id}` : id;
}
