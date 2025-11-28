/**
 * Core Framework Barrel Export
 * 
 * This is the main entry point for the framework's core functionality.
 * Import from '@/core' to access all framework utilities, hooks, config, and types.
 * 
 * @example
 * ```tsx
 * // Import configuration
 * import { appConfig, featureFlags } from '@/core';
 * 
 * // Import hooks
 * import { useResponsive, useToggle, useWebSocket } from '@/core';
 * 
 * // Import utilities
 * import { cn, formatNumber, getDeviceType } from '@/core';
 * 
 * // Import types
 * import type { NavigationItem, ThemeMode } from '@/core';
 * 
 * // Import API services
 * import { apiClient, authService, coursesService } from '@/core';
 * ```
 */

// Configuration
export * from './config';

// Utilities
export * from './utils';

// Hooks
export * from './hooks';

// Types
export * from './types';

// Routes
export * from './routes';

// Auth
export * from './auth';

// API (Client, Services, WebSocket)
export * from './api';

// Layout Components
export * from './components/Layout';
