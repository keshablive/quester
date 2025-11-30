# Query Keys Contract

**Feature**: 020-client-tanstack-query-migration  
**Date**: 2025-11-30  
**Purpose**: Define query key factory additions for cache management

## Query Key Factory Extensions

```typescript
// Add to core/query/keys.ts

export const queryKeys = {
  // ... existing keys (users, courses, quests, etc.)

  // ═══════════════════════════════════════════════════════════════
  // Transaction Queries
  // ═══════════════════════════════════════════════════════════════
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters?: TransactionFilters) =>
      filters
        ? ([...queryKeys.transactions.lists(), filters] as const)
        : queryKeys.transactions.lists(),
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
    /** Infinite scroll paginated list */
    infinite: (filters?: TransactionFilters) =>
      [...queryKeys.transactions.all, 'infinite', filters ?? {}] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Marketplace Queries
  // ═══════════════════════════════════════════════════════════════
  marketplace: {
    all: ['marketplace'] as const,
    
    /** Property listings */
    properties: {
      all: () => [...queryKeys.marketplace.all, 'properties'] as const,
      lists: () => [...queryKeys.marketplace.properties.all(), 'list'] as const,
      list: (filters?: PropertyFilters) =>
        filters
          ? ([...queryKeys.marketplace.properties.lists(), filters] as const)
          : queryKeys.marketplace.properties.lists(),
      details: () => [...queryKeys.marketplace.properties.all(), 'detail'] as const,
      detail: (id: string) =>
        [...queryKeys.marketplace.properties.details(), id] as const,
      infinite: (filters?: PropertyFilters) =>
        [...queryKeys.marketplace.properties.all(), 'infinite', filters ?? {}] as const,
    },
    
    /** Classified ad listings */
    classifieds: {
      all: () => [...queryKeys.marketplace.all, 'classifieds'] as const,
      lists: () => [...queryKeys.marketplace.classifieds.all(), 'list'] as const,
      list: (filters?: ClassifiedFilters) =>
        filters
          ? ([...queryKeys.marketplace.classifieds.lists(), filters] as const)
          : queryKeys.marketplace.classifieds.lists(),
      details: () => [...queryKeys.marketplace.classifieds.all(), 'detail'] as const,
      detail: (id: string) =>
        [...queryKeys.marketplace.classifieds.details(), id] as const,
      infinite: (filters?: ClassifiedFilters) =>
        [...queryKeys.marketplace.classifieds.all(), 'infinite', filters ?? {}] as const,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // Certificate Queries
  // ═══════════════════════════════════════════════════════════════
  certificates: {
    all: ['certificates'] as const,
    lists: () => [...queryKeys.certificates.all, 'list'] as const,
    list: (filters?: CertificateFilters) =>
      filters
        ? ([...queryKeys.certificates.lists(), filters] as const)
        : queryKeys.certificates.lists(),
    details: () => [...queryKeys.certificates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.certificates.details(), id] as const,
  },

  // ═══════════════════════════════════════════════════════════════
  // Notification Settings Queries
  // ═══════════════════════════════════════════════════════════════
  notificationSettings: {
    all: ['notificationSettings'] as const,
    /** Current user's notification settings */
    current: () => [...queryKeys.notificationSettings.all, 'current'] as const,
  },
} as const;
```

## Query Key Types

```typescript
// Add to core/types/query.types.ts

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'credit' | 'debit';
  status?: 'pending' | 'completed' | 'failed';
  startDate?: string;
  endDate?: string;
}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  query?: string;
  type?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  city?: string;
}

export interface ClassifiedFilters {
  page?: number;
  limit?: number;
  query?: string;
  category?: string;
  condition?: 'new' | 'used' | 'refurbished';
  minPrice?: number;
  maxPrice?: number;
}

export interface CertificateFilters {
  page?: number;
  limit?: number;
  courseId?: string;
}
```

## Invalidation Helpers

```typescript
// Add to core/query/invalidation.ts

/**
 * Invalidate all transaction queries
 */
export function invalidateTransactions(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
}

/**
 * Invalidate all marketplace queries
 */
export function invalidateMarketplace(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
}

/**
 * Invalidate marketplace properties only
 */
export function invalidateProperties(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ 
    queryKey: queryKeys.marketplace.properties.all() 
  });
}

/**
 * Invalidate marketplace classifieds only
 */
export function invalidateClassifieds(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ 
    queryKey: queryKeys.marketplace.classifieds.all() 
  });
}

/**
 * Invalidate all certificate queries
 */
export function invalidateCertificates(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
}

/**
 * Invalidate notification settings
 */
export function invalidateNotificationSettings(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ 
    queryKey: queryKeys.notificationSettings.all 
  });
}
```
