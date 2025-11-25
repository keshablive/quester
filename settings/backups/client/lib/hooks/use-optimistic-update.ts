/**
 * useOptimisticUpdate Hook
 * 
 * Provides optimistic UI updates with automatic rollback on error.
 * Useful for social actions (likes, comments, follows) where instant
 * feedback improves UX while the API call completes in the background.
 * 
 * @example
 * ```typescript
 * const { value: isLiked, update: toggleLike, isPending } = useOptimisticUpdate({
 *   initialValue: false,
 *   onError: (error) => showToast('Failed to like post'),
 * });
 * 
 * const handleLike = async () => {
 *   await toggleLike(
 *     !isLiked, // Optimistic value
 *     async () => await api.likePost(postId) // Actual API call
 *   );
 * };
 * ```
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseOptimisticUpdateOptions<T> {
  /** Initial value for the state */
  initialValue?: T;
  
  /** Called when the update succeeds with the actual server value */
  onSuccess?: (actualValue: T, optimisticValue: T, previousValue: T) => void;
  
  /** Called when the update fails and rollback occurs */
  onError?: (error: unknown, previousValue: T, optimisticValue: T) => void;
}

export interface UseOptimisticUpdateResult<T> {
  /** Current value (optimistic or committed) */
  value: T;
  
  /** Whether the current value is optimistic (not yet confirmed by server) */
  isOptimistic: boolean;
  
  /** Whether an async operation is in progress */
  isPending: boolean;
  
  /**
   * Perform an optimistic update
   * 
   * @param optimisticValue - Value to show immediately (or function to compute it)
   * @param asyncFn - Async function that returns the actual server value
   * @returns Promise that resolves with the actual value or rejects on error
   */
  update: (
    optimisticValue: T | ((prev: T) => T),
    asyncFn: () => Promise<T>
  ) => Promise<T>;
  
  /**
   * Manually set the value (bypasses optimistic logic)
   * 
   * @param value - New value (or function to compute it)
   */
  setValue: (value: T | ((prev: T) => T)) => void;
  
  /**
   * Reset to initial value or provided value
   * 
   * @param value - Optional value to reset to (defaults to initialValue)
   */
  reset: (value?: T) => void;
}

/**
 * Hook for managing optimistic updates with automatic rollback
 */
export function useOptimisticUpdate<T = unknown>(
  options: UseOptimisticUpdateOptions<T> = {}
): UseOptimisticUpdateResult<T> {
  const { initialValue, onSuccess, onError } = options;
  
  // Current committed value (confirmed by server)
  const [committedValue, setCommittedValue] = useState<T>(initialValue as T);
  
  // Current display value (may be optimistic)
  const [displayValue, setDisplayValue] = useState<T>(initialValue as T);
  
  // Whether the current value is optimistic
  const [isOptimistic, setIsOptimistic] = useState(false);
  
  // Whether an async operation is in progress
  const [isPending, setIsPending] = useState(false);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  // Track the latest update ID to handle concurrent updates
  const updateIdRef = useRef(0);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  /**
   * Perform an optimistic update with rollback on error
   */
  const update = useCallback(
    async (
      optimisticValue: T | ((prev: T) => T),
      asyncFn: () => Promise<T>
    ): Promise<T> => {
      // Increment update ID
      updateIdRef.current += 1;
      const currentUpdateId = updateIdRef.current;
      
      // Store previous value for rollback
      const previousValue = committedValue;
      
      // Compute optimistic value
      const newOptimisticValue =
        typeof optimisticValue === 'function'
          ? (optimisticValue as (prev: T) => T)(displayValue)
          : optimisticValue;
      
      // Apply optimistic update immediately
      if (isMountedRef.current) {
        setDisplayValue(newOptimisticValue);
        setIsOptimistic(true);
        setIsPending(true);
      }
      
      try {
        // Execute async operation
        const actualValue = await asyncFn();
        
        // Only update if this is still the latest update and component is mounted
        if (isMountedRef.current && currentUpdateId === updateIdRef.current) {
          // Commit the actual value from server
          setCommittedValue(actualValue);
          setDisplayValue(actualValue);
          setIsOptimistic(false);
          setIsPending(false);
          
          // Call success callback
          onSuccess?.(actualValue, newOptimisticValue, previousValue);
        }
        
        return actualValue;
      } catch (error) {
        // Only rollback if this is still the latest update and component is mounted
        if (isMountedRef.current && currentUpdateId === updateIdRef.current) {
          // Rollback to previous committed value
          setDisplayValue(previousValue);
          setIsOptimistic(false);
          setIsPending(false);
          
          // Call error callback
          onError?.(error, previousValue, newOptimisticValue);
        }
        
        // Rethrow error for caller to handle
        throw error;
      }
    },
    [committedValue, displayValue, onSuccess, onError]
  );
  
  /**
   * Manually set the value (updates both display and committed values)
   */
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    if (!isMountedRef.current) return;
    
    const newValue =
      typeof value === 'function'
        ? (value as (prev: T) => T)(displayValue)
        : value;
    
    setCommittedValue(newValue);
    setDisplayValue(newValue);
    setIsOptimistic(false);
    setIsPending(false);
  }, [displayValue]);
  
  /**
   * Reset to initial value or provided value
   */
  const reset = useCallback(
    (value?: T) => {
      if (!isMountedRef.current) return;
      
      const resetValue = value !== undefined ? value : (initialValue as T);
      
      setCommittedValue(resetValue);
      setDisplayValue(resetValue);
      setIsOptimistic(false);
      setIsPending(false);
    },
    [initialValue]
  );
  
  return {
    value: displayValue,
    isOptimistic,
    isPending,
    update,
    setValue,
    reset,
  };
}
