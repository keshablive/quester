/**
 * useErrorHandling Hook (Phase 8, T138)
 * 
 * Provides comprehensive error handling with:
 * - Error tracking and state management
 * - Retry logic with exponential backoff
 * - Error categorization (network, validation, system)
 * - User feedback (toasts, modals)
 * - Recovery strategies
 * - Error logging
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface AppError {
  type: 'network' | 'validation' | 'system' | 'unknown';
  message: string;
  code?: string;
  originalError?: Error;
  timestamp?: number;
}

export interface ErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  trackHistory?: boolean;
  showToast?: (config: ToastConfig) => void;
  showModal?: (config: ModalConfig) => void;
  logger?: (error: any) => void;
  enableLogging?: boolean;
  clearOnUnmount?: boolean;
}

export interface ToastConfig {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  actions?: Array<{ label: string; onPress: () => void }>;
}

export interface ModalConfig {
  message: string;
  type: 'info' | 'warning' | 'error';
  actions?: Array<{ label: string; onPress: () => void }>;
}

export interface ErrorHandlingResult {
  error: AppError | null;
  hasError: boolean;
  errorHistory: AppError[];
  retryCount: number;
  isRetrying: boolean;
  recoveryStrategy: 'retry' | 'offline' | 'navigate' | null;
  setError: (error: AppError) => void;
  clearError: () => void;
  handleError: (error: Error | any, options?: HandleErrorOptions) => void;
  retryOperation: <T>(operation: () => Promise<T>) => Promise<T>;
  executeRecovery: (recoveryFn: () => Promise<any>) => Promise<void>;
}

export interface HandleErrorOptions {
  severity?: 'info' | 'warning' | 'error';
  silent?: boolean;
  transient?: boolean;
  fatal?: boolean;
  context?: Record<string, any>;
}

/**
 * Hook for comprehensive error handling
 */
export function useErrorHandling(options: ErrorHandlingOptions = {}): ErrorHandlingResult {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    trackHistory = false,
    showToast,
    showModal,
    logger,
    enableLogging = true,
    clearOnUnmount = false,
  } = options;

  const [error, setErrorState] = useState<AppError | null>(null);
  const [errorHistory, setErrorHistory] = useState<AppError[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [recoveryStrategy, setRecoveryStrategy] = useState<'retry' | 'offline' | 'navigate' | null>(null);

  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Cancel pending retries
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Clear errors on unmount if configured
      if (clearOnUnmount) {
        setErrorState(null);
        setErrorHistory([]);
      }
    };
  }, [clearOnUnmount]);

  const setError = useCallback((newError: AppError) => {
    if (!isMountedRef.current) return;

    const errorWithTimestamp = {
      ...newError,
      timestamp: newError.timestamp || Date.now(),
    };

    setErrorState(errorWithTimestamp);

    if (trackHistory) {
      setErrorHistory((prev) => [...prev, errorWithTimestamp]);
    }

    // Determine recovery strategy
    if (newError.type === 'network') {
      setRecoveryStrategy('offline');
    } else if (newError.type === 'system') {
      setRecoveryStrategy('navigate');
    } else {
      setRecoveryStrategy('retry');
    }
  }, [trackHistory]);

  const clearError = useCallback(() => {
    if (!isMountedRef.current) return;

    setErrorState(null);
    setRetryCount(0);
    setRecoveryStrategy(null);
  }, []);

  const categorizeError = useCallback((err: Error | any): AppError => {
    const message = err?.message || String(err);
    const code = err?.code || err?.status?.toString();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('Network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('CONNECTION_REFUSED') ||
      message.includes('ERR_NETWORK') ||
      code === 'ERR_NETWORK' ||
      code === 'ERR_CONNECTION_REFUSED'
    ) {
      return {
        type: 'network',
        message: 'A network error occurred. Please check your connection and try again.',
        code,
        originalError: err,
      };
    }

    // Validation errors
    if (
      err?.type === 'validation' ||
      message.includes('validation') ||
      message.includes('invalid') ||
      code?.startsWith('VAL_')
    ) {
      return {
        type: 'validation',
        message: err?.message || 'Validation failed. Please check your input.',
        code,
        originalError: err,
      };
    }

    // System/server errors
    if (
      message.includes('Internal') ||
      message.includes('server error') ||
      code === '500' ||
      code === '503'
    ) {
      return {
        type: 'system',
        message: 'A system error occurred. Please try again later.',
        code,
        originalError: err,
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      message: err?.message || 'An unexpected error occurred.',
      code,
      originalError: err,
    };
  }, []);

  const handleError = useCallback((err: Error | any, handleOptions: HandleErrorOptions = {}) => {
    const categorized = categorizeError(err);
    setError(categorized);

    const {
      severity = 'error',
      silent = false,
      transient = false,
      fatal = false,
      context,
    } = handleOptions;

    // Log error if logging enabled
    if (enableLogging && logger) {
      logger({
        ...categorized,
        severity,
        context,
        timestamp: Date.now(),
      });
    }

    // Update recovery strategy based on options
    if (transient) {
      setRecoveryStrategy('retry');
    } else if (fatal) {
      setRecoveryStrategy('navigate');
    }

    // Show user feedback if not silent
    if (!silent) {
      const feedbackConfig = {
        message: categorized.message,
        type: severity as any,
        actions: [
          {
            label: 'Retry',
            onPress: () => clearError(),
          },
        ],
      };

      if (severity === 'error' && showModal) {
        showModal(feedbackConfig);
      } else if (showToast) {
        showToast(feedbackConfig);
      }
    }
  }, [categorizeError, setError, enableLogging, logger, showToast, showModal, clearError]);

  const retryOperation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    let lastError: Error | null = null;
    let currentDelay = retryDelay;

    setIsRetrying(true);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait with exponential backoff
          await new Promise((resolve) => {
            retryTimeoutRef.current = setTimeout(resolve, currentDelay);
          });
          currentDelay *= 2; // Exponential backoff
        }

        const result = await operation();
        
        if (isMountedRef.current) {
          setRetryCount(0);
          setIsRetrying(false);
          clearError();
        }

        return result;
      } catch (err) {
        lastError = err as Error;
        
        if (isMountedRef.current) {
          setRetryCount(attempt + 1);
        }

        // If last attempt, throw error
        if (attempt === maxRetries - 1) {
          if (isMountedRef.current) {
            setIsRetrying(false);
            handleError(err);
          }
          throw err;
        }
      }
    }

    setIsRetrying(false);
    throw lastError || new Error('Operation failed after retries');
  }, [maxRetries, retryDelay, handleError, clearError]);

  const executeRecovery = useCallback(async (recoveryFn: () => Promise<any>): Promise<void> => {
    try {
      await recoveryFn();
      clearError();
    } catch (err) {
      handleError(err);
    }
  }, [clearError, handleError]);

  return {
    error,
    hasError: error !== null,
    errorHistory,
    retryCount,
    isRetrying,
    recoveryStrategy,
    setError,
    clearError,
    handleError,
    retryOperation,
    executeRecovery,
  };
}
