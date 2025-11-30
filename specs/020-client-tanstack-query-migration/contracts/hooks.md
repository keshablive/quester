# Query Hook Contracts

**Feature**: 020-client-tanstack-query-migration  
**Date**: 2025-11-30  
**Purpose**: Define TypeScript interfaces for new query and mutation hooks

## Transaction Hooks

### useTransactions

```typescript
/**
 * Hook for fetching paginated transaction list
 * 
 * @param filters - Optional filters for transactions
 * @param options - TanStack Query options
 * @returns Query result with transactions data
 * 
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useTransactions({ type: 'credit' });
 * ```
 */
export function useTransactions(
  filters?: TransactionFilters,
  options?: Omit<UseQueryOptions<TransactionsResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TransactionsResponse, ApiError>;
```

### useTransaction

```typescript
/**
 * Hook for fetching a single transaction by ID
 * 
 * @param transactionId - The transaction's unique identifier
 * @param options - TanStack Query options
 * @returns Query result with transaction data
 * 
 * @example
 * ```tsx
 * const { data: transaction, isLoading } = useTransaction(transactionId);
 * ```
 */
export function useTransaction(
  transactionId: string,
  options?: Omit<UseQueryOptions<Transaction, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<Transaction, ApiError>;
```

### useInfiniteTransactions

```typescript
/**
 * Hook for infinite scroll transaction list
 * 
 * @param filters - Optional filters for transactions
 * @param options - TanStack Query infinite options
 * @returns Infinite query result with pagination controls
 * 
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useInfiniteTransactions();
 * const transactions = data?.pages.flatMap(p => p.data) ?? [];
 * ```
 */
export function useInfiniteTransactions(
  filters?: Omit<TransactionFilters, 'page'>,
  options?: Omit<UseInfiniteQueryOptions<TransactionsResponse, ApiError>, 'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'>
): UseInfiniteQueryResult<{ pages: TransactionsResponse[]; pageParams: string[] }, ApiError>;
```

## Marketplace Hooks

### useMarketplaceProperties

```typescript
/**
 * Hook for fetching property listings
 * 
 * @param filters - Optional filters for properties
 * @param options - TanStack Query options
 * @returns Query result with properties data
 */
export function useMarketplaceProperties(
  filters?: PropertyFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<Property>, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResponse<Property>, ApiError>;
```

### useMarketplaceProperty

```typescript
/**
 * Hook for fetching a single property by ID
 * 
 * @param propertyId - The property's unique identifier
 * @param options - TanStack Query options
 * @returns Query result with property data
 */
export function useMarketplaceProperty(
  propertyId: string,
  options?: Omit<UseQueryOptions<Property, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<Property, ApiError>;
```

### useMarketplaceClassifieds

```typescript
/**
 * Hook for fetching classified ad listings
 * 
 * @param filters - Optional filters for classifieds
 * @param options - TanStack Query options
 * @returns Query result with classifieds data
 */
export function useMarketplaceClassifieds(
  filters?: ClassifiedFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<ClassifiedAd>, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResponse<ClassifiedAd>, ApiError>;
```

### useMarketplaceClassified

```typescript
/**
 * Hook for fetching a single classified ad by ID
 * 
 * @param classifiedId - The classified ad's unique identifier
 * @param options - TanStack Query options
 * @returns Query result with classified data
 */
export function useMarketplaceClassified(
  classifiedId: string,
  options?: Omit<UseQueryOptions<ClassifiedAd, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<ClassifiedAd, ApiError>;
```

### useInfiniteMarketplaceProperties

```typescript
/**
 * Hook for infinite scroll property listings
 * 
 * @param filters - Optional filters for properties
 * @returns Infinite query result with pagination controls
 */
export function useInfiniteMarketplaceProperties(
  filters?: Omit<PropertyFilters, 'page'>
): UseInfiniteQueryResult<{ pages: PaginatedResponse<Property>[]; pageParams: string[] }, ApiError>;
```

### useInfiniteMarketplaceClassifieds

```typescript
/**
 * Hook for infinite scroll classified listings
 * 
 * @param filters - Optional filters for classifieds
 * @returns Infinite query result with pagination controls
 */
export function useInfiniteMarketplaceClassifieds(
  filters?: Omit<ClassifiedFilters, 'page'>
): UseInfiniteQueryResult<{ pages: PaginatedResponse<ClassifiedAd>[]; pageParams: string[] }, ApiError>;
```

## Certificate Hooks

### useCertificates

```typescript
/**
 * Hook for fetching user's certificates
 * 
 * @param filters - Optional filters for certificates
 * @param options - TanStack Query options
 * @returns Query result with certificates data
 */
export function useCertificates(
  filters?: CertificateFilters,
  options?: Omit<UseQueryOptions<Certificate[], ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<Certificate[], ApiError>;
```

### useCertificate

```typescript
/**
 * Hook for fetching a single certificate by ID
 * 
 * @param certificateId - The certificate's unique identifier
 * @param options - TanStack Query options
 * @returns Query result with certificate data
 */
export function useCertificate(
  certificateId: string,
  options?: Omit<UseQueryOptions<Certificate, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<Certificate, ApiError>;
```

### usePrefetchCertificate

```typescript
/**
 * Hook for prefetching certificate data on user intent
 * 
 * @returns Function to prefetch a certificate
 * 
 * @example
 * ```tsx
 * const prefetchCertificate = usePrefetchCertificate();
 * <Pressable onLongPress={() => prefetchCertificate(cert.id)}>
 * ```
 */
export function usePrefetchCertificate(): (certificateId: string) => void;
```

## Notification Settings Hooks

### useNotificationSettings

```typescript
/**
 * Hook for fetching current user's notification settings
 * 
 * @param options - TanStack Query options
 * @returns Query result with notification settings
 */
export function useNotificationSettings(
  options?: Omit<UseQueryOptions<NotificationSettings, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<NotificationSettings, ApiError>;
```

### useUpdateNotificationSettings

```typescript
/**
 * Hook for updating notification settings with optimistic updates
 * 
 * Features:
 * - Optimistic UI update (<50ms)
 * - Automatic rollback on error
 * - Toast notification on sync failure
 * - Offline queue support
 * 
 * @returns Mutation result with update function
 * 
 * @example
 * ```tsx
 * const { mutate: updateSettings } = useUpdateNotificationSettings();
 * updateSettings({ push: { newMessages: false } });
 * ```
 */
export function useUpdateNotificationSettings(): UseMutationResult<
  NotificationSettings,
  ApiError,
  UpdateNotificationSettingsInput,
  { previousSettings: NotificationSettings | undefined }
>;
```

## Infinite Scroll Utilities

### useInfiniteScrollList

```typescript
/**
 * Generic hook for infinite scroll lists
 * Integrates with InfiniteScrollList component
 * 
 * @param queryKey - Query key for caching
 * @param queryFn - Function to fetch page data
 * @param options - Configuration options
 * @returns Infinite query result formatted for InfiniteScrollList
 */
export function useInfiniteScrollList<TItem>(
  queryKey: QueryKey,
  queryFn: (params: { pageParam: string }) => Promise<PaginatedResponse<TItem>>,
  options?: {
    staleTime?: number;
    enabled?: boolean;
  }
): {
  data: TItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};
```

## Social Hooks (Follow Lists)

### useFollowers

```typescript
/**
 * Hook for infinite scroll followers list
 * 
 * @param userId - User ID to fetch followers for
 * @returns Infinite query result with followers
 */
export function useFollowers(
  userId: string
): UseInfiniteQueryResult<{ pages: PaginatedResponse<User>[]; pageParams: string[] }, ApiError>;
```

### useFollowing

```typescript
/**
 * Hook for infinite scroll following list
 * 
 * @param userId - User ID to fetch following for
 * @returns Infinite query result with following users
 */
export function useFollowing(
  userId: string
): UseInfiniteQueryResult<{ pages: PaginatedResponse<User>[]; pageParams: string[] }, ApiError>;
```

## Shared Types

```typescript
// Re-exported from core/types/query.types.ts
export type {
  ApiError,
  PaginatedResponse,
  UseQueryOptions,
  UseQueryResult,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseMutationResult,
  QueryKey,
};
```
