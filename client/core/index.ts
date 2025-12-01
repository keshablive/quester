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
 * 
 * // Import performance components
 * import { OptimizedImage, OptimizedList } from '@/core';
 * ```
 */

// Configuration
export * from './config';

// Constants (including performance config)
export * from './constants';

// Utilities
export * from './utils';

// Hooks
export * from './hooks';

// Types
export * from './types';

// Routes (including lazy loading utilities)
export * from './routes';

// Auth
export * from './auth';

// API Client
export * from './api';

// Services
export * from './services';

// Layout Components
export * from './components/Layout';

// Performance Components
export { OptimizedImage } from './components/OptimizedImage';
export type { OptimizedImageProps } from './components/OptimizedImage';
export { OptimizedList } from './components/OptimizedList';
export type { OptimizedListProps, ListRenderItemInfo, ListLoadingState } from './components/OptimizedList';
export { LoadingFallback, PageLoadingFallback, ComponentLoadingFallback } from './components/LoadingFallback';
export type { LoadingFallbackProps } from './components/LoadingFallback';

// Lazy Loading Utilities (re-export from routes)
export { ChunkErrorBoundary, LazyLoadComponent, preloadRoute, lazyWithPreload } from './routes/LazyRoute';
export type { ChunkErrorBoundaryProps, ChunkErrorFallbackProps, LazyRouteConfig } from './routes/LazyRoute.types';

