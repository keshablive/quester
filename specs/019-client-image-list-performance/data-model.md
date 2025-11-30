# Data Model: Client Image & List Performance Optimization

**Feature**: 019-client-image-list-performance  
**Date**: November 29, 2025

## Overview

This feature is primarily client-side performance optimization. No new database entities are required. This document defines TypeScript interfaces for the new components and split contexts.

---

## 1. Image Component Types

### OptimizedImage Props

```typescript
// core/components/OptimizedImage.types.ts

import { ImageStyle, StyleProp } from 'react-native';

export interface OptimizedImageProps {
  /** Image source URL or local require */
  source: string | number | { uri: string };
  
  /** Style for the image container */
  style?: StyleProp<ImageStyle>;
  
  /** How the image should be resized to fit container */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  
  /** BlurHash placeholder string for loading state */
  placeholder?: string | { blurhash: string } | { thumbhash: string };
  
  /** Transition duration in ms when image loads */
  transition?: number;
  
  /** Cache policy for the image */
  cachePolicy?: 'disk' | 'memory' | 'none';
  
  /** Callback when image loads successfully */
  onLoad?: () => void;
  
  /** Callback when image fails to load */
  onError?: (error: Error) => void;
  
  /** Accessibility label */
  accessibilityLabel?: string;
  
  /** Fallback source when primary fails */
  fallbackSource?: string | number | { uri: string };
}

export interface ImageCacheConfig {
  /** Maximum cache size in bytes (default: 100MB = 104857600) */
  maxCacheSize: number;
  
  /** Cache eviction policy */
  evictionPolicy: 'lru' | 'fifo';
}

export const DEFAULT_IMAGE_CACHE_CONFIG: ImageCacheConfig = {
  maxCacheSize: 100 * 1024 * 1024, // 100MB as per spec
  evictionPolicy: 'lru',
};
```

---

## 2. List Component Types

### OptimizedList Props

```typescript
// core/components/OptimizedList.types.ts

import { ReactElement } from 'react';
import { ViewStyle, StyleProp } from 'react-native';

export interface OptimizedListProps<T> {
  /** Array of data items to render */
  data: T[];
  
  /** Function to render each item */
  renderItem: (info: { item: T; index: number }) => ReactElement | null;
  
  /** Estimated height/width of items (required for FlashList) */
  estimatedItemSize: number;
  
  /** Function to extract unique key for each item */
  keyExtractor?: (item: T, index: number) => string;
  
  /** Function to determine item type for heterogeneous lists */
  getItemType?: (item: T, index: number) => string | number;
  
  /** Style for the list container */
  style?: StyleProp<ViewStyle>;
  
  /** Style for the content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  
  /** Number of columns for grid layout */
  numColumns?: number;
  
  /** Enable masonry layout (requires numColumns > 1) */
  masonry?: boolean;
  
  /** Component to render at list header */
  ListHeaderComponent?: ReactElement | (() => ReactElement);
  
  /** Component to render at list footer */
  ListFooterComponent?: ReactElement | (() => ReactElement);
  
  /** Component to render when list is empty */
  ListEmptyComponent?: ReactElement | (() => ReactElement);
  
  /** Component to render between items */
  ItemSeparatorComponent?: ReactElement | (() => ReactElement);
  
  /** Enable pull-to-refresh */
  refreshing?: boolean;
  
  /** Callback for pull-to-refresh */
  onRefresh?: () => void;
  
  /** Callback when end of list is reached */
  onEndReached?: () => void;
  
  /** Distance from end to trigger onEndReached (0-1) */
  onEndReachedThreshold?: number;
  
  /** Enable horizontal scrolling */
  horizontal?: boolean;
  
  /** Show scroll indicators */
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  
  /** Indices of items that should stick to top */
  stickyHeaderIndices?: number[];
  
  /** Callback when scroll position changes */
  onScroll?: (event: { nativeEvent: { contentOffset: { x: number; y: number } } }) => void;
  
  /** Pixels to render ahead of visible area */
  drawDistance?: number;
}

export interface ListLoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
}
```

---

## 3. Lazy Route Types

### Code-Split Route Configuration

```typescript
// core/routes/LazyRoutes.types.ts

import { ComponentType, LazyExoticComponent, ReactNode } from 'react';

export interface LazyRouteConfig {
  /** Route name/path */
  name: string;
  
  /** Lazy-loaded component */
  component: LazyExoticComponent<ComponentType<unknown>>;
  
  /** Loading fallback component */
  fallback?: ReactNode;
  
  /** Timeout before showing error (ms) */
  loadTimeout?: number;
  
  /** Number of retry attempts on load failure */
  maxRetries?: number;
  
  /** Preload trigger (e.g., on hover, on visible) */
  preloadTrigger?: 'none' | 'hover' | 'visible';
}

export interface ChunkLoadingState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

export interface LazyRouteProps {
  children?: ReactNode;
}

export const LAZY_ROUTE_DEFAULTS = {
  loadTimeout: 10000, // 10 seconds
  maxRetries: 3,
  preloadTrigger: 'none' as const,
};
```

---

## 4. Split Auth Context Types

### Core Auth Context

```typescript
// core/auth/types/CoreAuthTypes.ts

import { User } from '../types';

export interface CoreAuthState {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  
  /** Whether initial auth check is in progress */
  isInitializing: boolean;
  
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  
  /** Current error message, null if no error */
  error: string | null;
}

export interface CoreAuthMethods {
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<void>;
  
  /** Register new user */
  signUp: (name: string, email: string, password: string) => Promise<void>;
  
  /** Sign out current session */
  signOut: () => Promise<void>;
  
  /** Sign out all sessions for current user */
  signOutAll: () => Promise<void>;
  
  /** Request password reset email */
  forgotPassword: (email: string) => Promise<void>;
  
  /** Reset password with token */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  /** Clear current error */
  clearError: () => void;
}

export interface CoreAuthContextType extends CoreAuthState, CoreAuthMethods {}
```

### Two-Factor Context

```typescript
// core/auth/types/TwoFactorTypes.ts

export interface TwoFactorState {
  /** Whether 2FA is required for current login attempt */
  isRequired: boolean;
  
  /** Pending credentials during 2FA flow */
  pendingCredentials?: {
    email: string;
    password: string;
  };
  
  /** Whether 2FA code submission is in progress */
  isSubmitting: boolean;
  
  /** 2FA-specific error message */
  error: string | null;
}

export interface TwoFactorMethods {
  /** Submit 2FA verification code */
  submitTwoFactorCode: (code: string, trustDevice?: boolean) => Promise<void>;
  
  /** Cancel 2FA flow and return to login */
  cancelTwoFactor: () => void;
}

export interface TwoFactorContextType {
  twoFactor: TwoFactorState;
  submitTwoFactorCode: TwoFactorMethods['submitTwoFactorCode'];
  cancelTwoFactor: TwoFactorMethods['cancelTwoFactor'];
}
```

### Biometric Context

```typescript
// core/auth/types/BiometricTypes.ts

export interface BiometricState {
  /** Whether biometric auth is available on device */
  isAvailable: boolean;
  
  /** Whether user has enrolled biometrics on device */
  isEnrolled: boolean;
  
  /** Whether biometric auth is enabled for this app */
  isEnabled: boolean;
  
  /** Number of failed biometric attempts in current session */
  failedAttempts: number;
  
  /** Maximum allowed biometric attempts */
  maxAttempts: number;
  
  /** Supported biometric types on device */
  supportedTypes: BiometricType[];
  
  /** Whether biometric operation is in progress */
  isLoading: boolean;
  
  /** Biometric-specific error message */
  error: string | null;
}

export type BiometricType = 'fingerprint' | 'facial' | 'iris';

export interface BiometricMethods {
  /** Enable biometric auth (prompts for current credentials) */
  enableBiometric: () => Promise<void>;
  
  /** Enable biometric with provided credentials */
  enableBiometricWithCredentials: (email: string, password: string) => Promise<void>;
  
  /** Disable biometric auth */
  disableBiometric: () => Promise<void>;
  
  /** Sign in using biometric authentication */
  signInWithBiometric: () => Promise<void>;
  
  /** Check biometric availability on device */
  checkBiometricAvailability: () => Promise<void>;
}

export interface BiometricContextType {
  biometric: BiometricState;
  enableBiometric: BiometricMethods['enableBiometric'];
  enableBiometricWithCredentials: BiometricMethods['enableBiometricWithCredentials'];
  disableBiometric: BiometricMethods['disableBiometric'];
  signInWithBiometric: BiometricMethods['signInWithBiometric'];
}
```

### Composite Auth Context (Backward Compatibility)

```typescript
// core/auth/types/AuthContextType.ts (updated)

import { CoreAuthState, CoreAuthMethods } from './CoreAuthTypes';
import { TwoFactorState, TwoFactorMethods } from './TwoFactorTypes';
import { BiometricState, BiometricMethods } from './BiometricTypes';

/**
 * Complete AuthContextType for backward compatibility.
 * Components can use this via useAuth() or use specific hooks:
 * - useCoreAuth() for auth state only
 * - useTwoFactor() for 2FA only
 * - useBiometricAuth() for biometric only
 */
export interface AuthContextType 
  extends CoreAuthState, 
          CoreAuthMethods,
          TwoFactorMethods,
          BiometricMethods {
  /** Two-factor authentication state */
  twoFactor: TwoFactorState;
  
  /** Biometric authentication state */
  biometric: BiometricState;
}
```

---

## 5. Constants

```typescript
// core/constants/performance.ts

/** Image cache configuration */
export const IMAGE_CACHE = {
  MAX_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  EVICTION_POLICY: 'lru' as const,
  DEFAULT_TRANSITION_MS: 300,
  DEFAULT_PLACEHOLDER_BLURHASH: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
} as const;

/** List performance configuration */
export const LIST_CONFIG = {
  DEFAULT_ESTIMATED_ITEM_SIZE: 80,
  DEFAULT_DRAW_DISTANCE: 250,
  DEFAULT_END_REACHED_THRESHOLD: 0.5,
} as const;

/** Lazy loading configuration */
export const LAZY_LOAD_CONFIG = {
  DEFAULT_TIMEOUT_MS: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

/** Biometric configuration */
export const BIOMETRIC_CONFIG = {
  MAX_ATTEMPTS: 3,
  LOCKOUT_DURATION_MS: 30000,
} as const;
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Component Tree                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AuthProviders (Composite)                                       │
│  ├── CoreAuthProvider                                            │
│  │   └── Provides: user, isAuthenticated, signIn, signOut...    │
│  │                                                               │
│  ├── TwoFactorProvider (consumes CoreAuth)                       │
│  │   └── Provides: twoFactor state, submitCode, cancel          │
│  │                                                               │
│  └── BiometricProvider (consumes CoreAuth)                       │
│      └── Provides: biometric state, enable, disable, signIn     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ App Screens                                                  ││
│  │                                                              ││
│  │  Regular Screens ─────► useCoreAuth() ──────► CoreAuth      ││
│  │  (quests, profile)                                          ││
│  │                                                              ││
│  │  Settings/Account ────► useBiometricAuth() ─► BiometricAuth ││
│  │                                                              ││
│  │  Login Flow ──────────► useAuth() ──────────► All Contexts  ││
│  │                                                              ││
│  │  Admin/Analytics ─────► React.lazy() ───────► Code-split    ││
│  │                                                              ││
│  │  Lists ───────────────► <OptimizedList> ───► FlashList      ││
│  │                                                              ││
│  │  Images ──────────────► <OptimizedImage> ──► expo-image     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Notes

### No Breaking Changes to Existing Data

This feature introduces no database changes. All changes are client-side:

1. **expo-image**: Drop-in replacement for Image component
2. **FlashList**: Drop-in replacement for FlatList (requires `estimatedItemSize`)
3. **Code splitting**: Transparent to components being split
4. **AuthContext**: Existing `useAuth()` hook maintained via facade pattern
