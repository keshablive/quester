/**
 * Error Boundary Logging Utility
 * 
 * Handles error logging for React error boundaries with monitoring integration.
 * Sanitizes props to prevent leaking sensitive data.
 * Fixed T127: Prevent circular reference stack overflow
 * 
 * @module error-logger
 */

import React from 'react';

export interface ErrorLogEntry {
  componentName: string;
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  props?: Record<string, unknown>;
  timestamp: number;
  screenName?: string;
}

/**
 * Sensitive keys to exclude from error logs
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'session',
  'jwt',
  'bearer',
  'credentials',
  'auth',
];

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs: number = 50;

  /**
   * Sanitize props by removing sensitive data
   * Fixed T127: Prevent circular reference stack overflow
   */
  private sanitizeProps(props: Record<string, unknown>, depth: number = 0, seen: WeakSet<object> = new WeakSet()): Record<string, unknown> {
    // Prevent infinite recursion - max depth of 3
    if (depth > 3) {
      return { '[MAX_DEPTH_EXCEEDED]': true };
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
      // Skip sensitive keys
      if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        sanitized[key] = value;
        continue;
      }

      // Handle primitives
      if (typeof value !== 'object' && typeof value !== 'function') {
        sanitized[key] = value;
        continue;
      }

      // Skip functions
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
        continue;
      }

      // Skip React elements (they have circular refs)
      if (React.isValidElement(value)) {
        sanitized[key] = '[ReactElement]';
        continue;
      }

      // Check for circular references
      if (seen.has(value as object)) {
        sanitized[key] = '[Circular]';
        continue;
      }

      // Mark as seen
      seen.add(value as object);

      // Handle arrays
      if (Array.isArray(value)) {
        // Limit array length to prevent huge logs
        sanitized[key] = value.length > 10 
          ? `[Array(${value.length})]` 
          : value.map(item => {
              if (item && typeof item === 'object') {
                return this.sanitizeProps(item as Record<string, unknown>, depth + 1, seen);
              }
              return item;
            });
      } 
      // Handle plain objects
      else if (value.constructor === Object || value.constructor === undefined) {
        sanitized[key] = this.sanitizeProps(value as Record<string, unknown>, depth + 1, seen);
      }
      // Handle other objects (Date, RegExp, etc.)
      else {
        sanitized[key] = `[${value.constructor.name}]`;
      }
    }

    return sanitized;
  }

  /**
   * Log an error from React error boundary
   */
  logError(
    error: Error,
    errorInfo: React.ErrorInfo,
    componentName: string,
    props?: Record<string, unknown>,
    screenName?: string
  ): void {
    const entry: ErrorLogEntry = {
      componentName,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      props: props ? this.sanitizeProps(props) : undefined,
      timestamp: Date.now(),
      screenName,
    };

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console log in development
    if (__DEV__) {
      console.error(`[ErrorLogger] ${componentName}:`, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        props: entry.props,
        screenName,
      });
    }

    // TODO: Send to monitoring system in production
    // Example: analytics.logError(entry);
  }

  /**
   * Get all logged errors
   */
  getAllLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs for a specific screen
   */
  getLogsByScreen(screenName: string): ErrorLogEntry[] {
    return this.logs.filter((log) => log.screenName === screenName);
  }

  /**
   * Get logs for a specific component
   */
  getLogsByComponent(componentName: string): ErrorLogEntry[] {
    return this.logs.filter((log) => log.componentName === componentName);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set maximum number of logs to keep in memory
   */
  setMaxLogs(maxLogs: number): void {
    this.maxLogs = maxLogs;
    
    // Trim if needed
    while (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();
