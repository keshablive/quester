/**
 * Debounce Hooks
 *
 * React hooks for debouncing values and callbacks.
 * Used for optimistic updates with rate limiting.
 *
 * US3: Notification Settings with 300ms debounce
 *
 * @module core/hooks/useDebounce
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounce a value
 *
 * Returns a debounced version of the value that only updates
 * after the specified delay has passed without changes.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *
 *   useEffect(() => {
 *     // Only fires 300ms after user stops typing
 *     performSearch(debouncedQuery);
 *   }, [debouncedQuery]);
 *
 *   return <TextInput value={query} onChangeText={setQuery} />;
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function
 *
 * Returns a memoized debounced version of the callback that only
 * executes after the specified delay has passed without calls.
 * The returned function is stable across re-renders.
 *
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * function NotificationSettings() {
 *   const { mutate: updateSettings } = useUpdateNotificationSettings();
 *
 *   const debouncedUpdate = useDebouncedCallback(
 *     (key: string, value: boolean) => {
 *       updateSettings({ [key]: value });
 *     },
 *     300
 *   );
 *
 *   return (
 *     <Switch
 *       onValueChange={(value) => debouncedUpdate('pushNotifications', value)}
 *     />
 *   );
 * }
 * ```
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number = 300
): (...args: TArgs) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on each render to capture latest closure
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}
