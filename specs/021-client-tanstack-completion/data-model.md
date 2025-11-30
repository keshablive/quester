# Data Model: Complete TanStack Query Component Integration

**Feature**: 021-client-tanstack-completion  
**Date**: November 30, 2025

## Overview

This feature does not introduce new data models. All required types exist in `core/types/query.types.ts` from spec 020.

## Existing Types Used

### Transaction

```typescript
interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: string;
  updatedAt: string;
  // ... additional fields
}
```

**Location**: `core/types/query.types.ts`  
**Used by**: `useTransaction`, `useInfiniteTransactions`

### Property

```typescript
interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  images: string[];
  // ... additional fields
}
```

**Location**: `core/types/query.types.ts`  
**Used by**: `useMarketplaceProperty`, `useInfiniteMarketplaceProperties`

### ClassifiedAd

```typescript
interface ClassifiedAd {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  // ... additional fields
}
```

**Location**: `core/types/query.types.ts`  
**Used by**: `useMarketplaceClassified`, `useInfiniteMarketplaceClassifieds`

### NotificationSettings

```typescript
interface NotificationSettings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  // ... additional notification preferences
}
```

**Location**: `core/api/services/notifications.service.ts`  
**Used by**: `useNotificationSettings`, `useUpdateNotificationSettings`

## Query Key Structure

All query keys are defined in `core/query/keys.ts`:

```typescript
export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
    // ...
  },
  marketplace: {
    properties: {
      detail: (id: string) => ['marketplace', 'properties', 'detail', id] as const,
      // ...
    },
    classifieds: {
      detail: (id: string) => ['marketplace', 'classifieds', 'detail', id] as const,
      // ...
    },
  },
  notificationSettings: {
    current: () => ['notificationSettings'] as const,
  },
};
```

## Cache Invalidation Mapping

Defined in `core/query/invalidation.ts`:

| Mutation | Invalidates |
|----------|-------------|
| `updateNotificationSettings` | `notificationSettings.current()` |
| (Transaction mutations handled by server) | N/A |
| (Marketplace mutations handled by server) | N/A |

## No New Types Required

This feature is purely an integration task. The migration involves:

1. Replacing `useState`/`useEffect` with existing query hooks
2. Using existing type definitions
3. No schema changes or API contract updates
