/**
 * Logger Utility Module
 * 
 * Centralized structured logging system with levels, metadata, and environment awareness.
 * Provides consistent logging across the application with automatic production filtering.
 * 
 * @module lib/utils/logger
 * 
 * Key Features:
 * - Five log levels: DEBUG, INFO, WARN, ERROR, SILENT
 * - Environment-aware: verbose in development, minimal in production
 * - Structured metadata support
 * - Scoped loggers for components/modules
 * - Performance tracking
 * - API request logging
 * - Analytics event logging
 * 
 * @example
 * ```typescript
 * import logger from '@/lib/utils/logger';
 * 
 * // Basic logging
 * logger.debug('User state updated', { userId: '123' });
 * logger.info('Profile loaded');
 * logger.warn('API rate limit approaching', { remaining: 10 });
 * logger.error('Failed to fetch', error, { endpoint: '/users' });
 * 
 * // Scoped logger
 * const log = logger.scope('ProfileScreen');
 * log.info('Component mounted');
 * log.error('Failed to load', error);
 * 
 * // Performance tracking
 * logger.perf('fetchUserData', 245);
 * 
 * // API logging
 * logger.api('POST', '/users', { userId: '123' });
 * ```
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LogMetadata {
  [key: string]: any;
}

export interface LogConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
  prefix?: string;
}

/**
 * Default configuration
 * In production, only WARN and ERROR are logged
 */
const defaultConfig: LogConfig = {
  level: __DEV__ ? LogLevel.DEBUG : LogLevel.WARN,
  enableTimestamps: __DEV__,
  enableColors: __DEV__,
  prefix: '[Quester]',
};

let currentConfig: LogConfig = { ...defaultConfig };

/**
 * Configure the logger
 * 
 * @param config - Partial configuration to override defaults
 * 
 * @example
 * ```typescript
 * // Set to only show errors
 * configureLogger({ level: LogLevel.ERROR });
 * 
 * // Disable timestamps
 * configureLogger({ enableTimestamps: false });
 * ```
 */
export function configureLogger(config: Partial<LogConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Reset logger to default configuration
 */
export function resetLogger(): void {
  currentConfig = { ...defaultConfig };
}

/**
 * Format timestamp for logs
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Format log message with metadata
 */
function formatMessage(level: string, message: string, metadata?: LogMetadata): string {
  const parts: string[] = [];

  // Prefix
  if (currentConfig.prefix) {
    parts.push(currentConfig.prefix);
  }

  // Timestamp
  if (currentConfig.enableTimestamps) {
    parts.push(`[${getTimestamp()}]`);
  }

  // Level
  parts.push(`[${level}]`);

  // Message
  parts.push(message);

  // Metadata
  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(JSON.stringify(metadata, null, 2));
  }

  return parts.join(' ');
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return level >= currentConfig.level;
}

/**
 * Debug level logging
 * Use for detailed diagnostic information
 * 
 * @param message - Log message
 * @param metadata - Optional structured data
 * 
 * @example
 * ```typescript
 * logger.debug('User state updated', { userId: '123', action: 'profile_edit' });
 * ```
 */
export function debug(message: string, metadata?: LogMetadata): void {
  if (shouldLog(LogLevel.DEBUG)) {
    const formatted = formatMessage('DEBUG', message, metadata);
    console.log(formatted);
  }
}

/**
 * Info level logging
 * Use for general informational messages
 * 
 * @param message - Log message
 * @param metadata - Optional structured data
 * 
 * @example
 * ```typescript
 * logger.info('User logged in', { userId: '123', method: 'oauth' });
 * ```
 */
export function info(message: string, metadata?: LogMetadata): void {
  if (shouldLog(LogLevel.INFO)) {
    const formatted = formatMessage('INFO', message, metadata);
    console.log(formatted);
  }
}

/**
 * Warning level logging
 * Use for potentially harmful situations
 * 
 * @param message - Log message
 * @param metadata - Optional structured data
 * 
 * @example
 * ```typescript
 * logger.warn('API rate limit approaching', { remaining: 10, limit: 100 });
 * ```
 */
export function warn(message: string, metadata?: LogMetadata): void {
  if (shouldLog(LogLevel.WARN)) {
    const formatted = formatMessage('WARN', message, metadata);
    console.warn(formatted);
  }
}

/**
 * Error level logging
 * Use for error events
 * 
 * @param message - Log message
 * @param error - Optional error object
 * @param metadata - Optional structured data
 * 
 * @example
 * ```typescript
 * logger.error('Failed to fetch user data', error, { userId: '123' });
 * ```
 */
export function error(message: string, error?: Error, metadata?: LogMetadata): void {
  if (shouldLog(LogLevel.ERROR)) {
    const errorData: LogMetadata = {
      ...metadata,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };
    const formatted = formatMessage('ERROR', message, errorData);
    console.error(formatted);
  }
}

/**
 * Log API request
 * 
 * @param method - HTTP method
 * @param url - Request URL
 * @param metadata - Optional request data
 * 
 * @example
 * ```typescript
 * logger.api('POST', '/api/users', { userId: '123' });
 * ```
 */
export function api(method: string, url: string, metadata?: LogMetadata): void {
  debug(`API ${method} ${url}`, metadata);
}

/**
 * Log performance metric
 * 
 * @param operation - Operation name
 * @param duration - Duration in milliseconds
 * @param metadata - Optional performance data
 * 
 * @example
 * ```typescript
 * const start = Date.now();
 * await fetchData();
 * logger.perf('fetchData', Date.now() - start);
 * ```
 */
export function perf(operation: string, duration: number, metadata?: LogMetadata): void {
  debug(`Performance: ${operation} took ${duration}ms`, metadata);
}

/**
 * Log navigation event
 * 
 * @param screen - Screen name
 * @param metadata - Optional navigation data
 * 
 * @example
 * ```typescript
 * logger.navigation('ProfileScreen', { userId: '123' });
 * ```
 */
export function navigation(screen: string, metadata?: LogMetadata): void {
  info(`Navigation: ${screen}`, metadata);
}

/**
 * Log analytics event
 * 
 * @param event - Event name
 * @param metadata - Event properties
 * 
 * @example
 * ```typescript
 * logger.analytics('button_click', { buttonId: 'submit', screen: 'ProfileScreen' });
 * ```
 */
export function analytics(event: string, metadata?: LogMetadata): void {
  info(`Analytics: ${event}`, metadata);
}

/**
 * Create a scoped logger with prefix
 * 
 * @param scope - Scope name (e.g., component name, module name)
 * @returns Scoped logger instance
 * 
 * @example
 * ```typescript
 * const log = logger.scope('ProfileScreen');
 * log.info('Component mounted');
 * log.error('Failed to load profile', error);
 * ```
 */
export function scope(scope: string) {
  const scopePrefix = `[${scope}]`;
  
  return {
    debug: (message: string, metadata?: LogMetadata) => {
      debug(`${scopePrefix} ${message}`, metadata);
    },
    info: (message: string, metadata?: LogMetadata) => {
      info(`${scopePrefix} ${message}`, metadata);
    },
    warn: (message: string, metadata?: LogMetadata) => {
      warn(`${scopePrefix} ${message}`, metadata);
    },
    error: (message: string, err?: Error, metadata?: LogMetadata) => {
      error(`${scopePrefix} ${message}`, err, metadata);
    },
    api: (method: string, url: string, metadata?: LogMetadata) => {
      api(method, url, { scope, ...metadata });
    },
    perf: (operation: string, duration: number, metadata?: LogMetadata) => {
      perf(operation, duration, { scope, ...metadata });
    },
  };
}

/**
 * Group related logs
 * 
 * @param label - Group label
 * @param fn - Function containing grouped logs
 * 
 * @example
 * ```typescript
 * logger.group('User Profile Load', () => {
 *   logger.info('Fetching user data');
 *   logger.info('Fetching user posts');
 *   logger.info('Profile loaded successfully');
 * });
 * ```
 */
export function group(label: string, fn: () => void): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.group(label);
    fn();
    console.groupEnd();
  } else {
    fn();
  }
}

/**
 * Centralized logger instance
 */
const logger = {
  debug,
  info,
  warn,
  error,
  api,
  perf,
  navigation,
  analytics,
  scope,
  group,
  configure: configureLogger,
  reset: resetLogger,
  LogLevel,
};

export default logger;
