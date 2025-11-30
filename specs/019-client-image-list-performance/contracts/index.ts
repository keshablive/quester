/**
 * Contract Index
 * Feature: 019-client-image-list-performance
 * 
 * Re-exports all type contracts for easy importing.
 */

// Image types
export type {
  OptimizedImageProps,
} from './image.types';

export {
  DEFAULT_BLURHASH,
  IMAGE_CACHE_CONFIG,
} from './image.types';

// List types
export type {
  OptimizedListProps,
  ListRenderItemInfo,
  ListLoadingState,
} from './list.types';

export {
  LIST_CONFIG,
  isNonEmptyList,
} from './list.types';

// Auth context types
export type {
  CoreAuthState,
  CoreAuthMethods,
  CoreAuthContextType,
  TwoFactorState,
  TwoFactorMethods,
  TwoFactorContextType,
  BiometricState,
  BiometricType,
  BiometricMethods,
  BiometricContextType,
  AuthContextType,
} from './auth-context.types';

export {
  initialTwoFactorState,
  initialBiometricState,
  BIOMETRIC_CONFIG,
  isAuthenticated,
  requiresTwoFactor,
  canUseBiometric,
} from './auth-context.types';

// Lazy route types
export type {
  LazyRouteConfig,
  PreloadTrigger,
  ChunkLoadingState,
  LazyRouteWrapperProps,
  ChunkErrorBoundaryProps,
  ChunkErrorProps,
  CodeSplitScreen,
} from './lazy-routes.types';

export {
  CODE_SPLIT_SCREENS,
  LAZY_ROUTE_DEFAULTS,
  calculateRetryDelay,
  isChunkLoadError,
} from './lazy-routes.types';
