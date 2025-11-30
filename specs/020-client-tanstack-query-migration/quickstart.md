# Quickstart Guide: Client TanStack Query Migration

**Feature**: 020-client-tanstack-query-migration  
**Date**: 2025-11-30  
**Purpose**: Step-by-step migration guide for each component

## Prerequisites

Before starting migration:

1. ✅ TanStack Query v5 installed (`@tanstack/react-query ^5.90.11`)
2. ✅ QueryProvider configured in app root
3. ✅ AsyncStorage persister set up
4. ✅ Existing hooks in `core/hooks/queries/` for reference

## Migration Pattern

### Before (Manual State)

```tsx
// ❌ Old pattern - lots of boilerplate
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    setError(null);
    const result = await service.getData();
    setData(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed');
  } finally {
    setLoading(false);
  }
};
```

### After (TanStack Query)

```tsx
// ✅ New pattern - declarative, cached, offline-ready
const { data, isLoading, error, refetch } = useData();
```

## Component Migration Steps

### 1. TransactionList.tsx

**File**: `client/components/pages/transactions/TransactionList.tsx`

**Step 1**: Create `useTransactions` hook in `core/hooks/queries/useTransactions.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { transactionsService } from '../../api/services';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES } from '../../query/constants';
import type { Transaction, ApiError } from '../../types/query.types';

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions.list(),
    queryFn: () => transactionsService.getMyTransactions(),
    staleTime: STALE_TIMES.TRANSACTIONS,
  });
}
```

**Step 2**: Replace state management in component

```diff
- const [transactions, setTransactions] = useState<Transaction[]>([]);
- const [loading, setLoading] = useState(true);
- const [error, setError] = useState<string | null>(null);
- 
- useEffect(() => { loadTransactions(); }, []);
- 
- const loadTransactions = async () => { ... };
+ const { 
+   data: transactions = [], 
+   isLoading: loading, 
+   error,
+   refetch 
+ } = useTransactions();
```

**Step 3**: Update pull-to-refresh

```diff
- onRefresh={loadTransactions}
+ onRefresh={refetch}
```

---

### 2. MarketplaceList.tsx

**File**: `client/components/pages/marketplace/MarketplaceList.tsx`

**Step 1**: Create hooks in `core/hooks/queries/useMarketplace.ts`

```typescript
export function useMarketplaceProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: queryKeys.marketplace.properties.list(filters),
    queryFn: () => propertiesService.search(filters ?? {}),
    staleTime: STALE_TIMES.MARKETPLACE,
  });
}

export function useMarketplaceClassifieds(filters?: ClassifiedFilters) {
  return useQuery({
    queryKey: queryKeys.marketplace.classifieds.list(filters),
    queryFn: () => classifiedsService.search(filters ?? {}),
    staleTime: STALE_TIMES.MARKETPLACE,
  });
}
```

**Step 2**: Replace state + effects

```diff
- const [items, setItems] = useState<MarketplaceItem[]>([]);
- const [loading, setLoading] = useState(true);
- const [error, setError] = useState<string | null>(null);
- 
- useEffect(() => { loadItems(); }, [activeTab, viewMode]);
+ const propertiesQuery = useMarketplaceProperties({ query: searchQuery });
+ const classifiedsQuery = useMarketplaceClassifieds({ query: searchQuery });
+ 
+ const { data, isLoading, error } = activeTab === 'properties' 
+   ? propertiesQuery 
+   : classifiedsQuery;
+ const items = data?.data ?? [];
```

---

### 3. Notification Settings

**File**: `client/app/notifications.tsx` (settings section)

**Step 1**: Create query hook `useNotificationSettings`

```typescript
export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notificationSettings.current(),
    queryFn: () => notificationService.getSettings(),
    staleTime: STALE_TIMES.USER_PROFILE,
  });
}
```

**Step 2**: Create mutation hook with optimistic updates

```typescript
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: UpdateNotificationSettingsInput) => 
      notificationService.updateSettings(input),
    
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.notificationSettings.current() 
      });
      
      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<NotificationSettings>(
        queryKeys.notificationSettings.current()
      );
      
      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData(
          queryKeys.notificationSettings.current(),
          { ...previousSettings, ...newSettings }
        );
      }
      
      return { previousSettings };
    },
    
    onError: (err, newSettings, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(
          queryKeys.notificationSettings.current(),
          context.previousSettings
        );
      }
      // Show error toast (FR-013)
      Toast.show({ type: 'error', text1: 'Failed to save settings' });
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notificationSettings.current() 
      });
    },
  });
}
```

**Step 3**: Use in component

```tsx
const { data: settings, isLoading } = useNotificationSettings();
const { mutate: updateSettings } = useUpdateNotificationSettings();

// Toggle instantly updates UI
const handleToggle = (key: string, value: boolean) => {
  updateSettings({ push: { [key]: value } });
};
```

---

### 4. InfiniteScrollList.tsx

**File**: `client/components/shared/InfiniteScrollList.tsx`

**Current state**: Already has TanStack Query integration (`query` prop), but uses FlatList.

**Migration**: Add FlashList option for 60fps performance

```diff
+ import { FlashList } from '@shopify/flash-list';
  
- <FlatList
+ <FlashList
    data={flattenedData}
    renderItem={renderItem}
    keyExtractor={keyExtractor}
+   estimatedItemSize={estimatedItemSize ?? 100}
    onEndReached={handleEndReached}
    onEndReachedThreshold={onEndReachedThreshold}
    // ...
  />
```

Add prop for FlashList:

```typescript
interface InfiniteScrollListProps<TItem> {
  // ... existing props
  /** Use FlashList instead of FlatList for 60fps performance */
  useFlashList?: boolean;
  /** Estimated item size for FlashList optimization */
  estimatedItemSize?: number;
}
```

---

### 5. FollowLists.tsx

**File**: `client/components/shared/FollowLists.tsx`

**Step 1**: Create infinite query hooks in `core/hooks/queries/useSocial.ts`

```typescript
export function useFollowers(userId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.followers(userId),
    queryFn: ({ pageParam }) => 
      socialService.getFollowers(userId, { cursor: pageParam }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
  });
}

export function useFollowing(userId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.following(userId),
    queryFn: ({ pageParam }) => 
      socialService.getFollowing(userId, { cursor: pageParam }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!userId,
  });
}
```

**Step 2**: Use with InfiniteScrollList

```tsx
const followersQuery = useFollowers(userId);

<InfiniteScrollList
  query={followersQuery}
  renderItem={renderFollower}
  keyExtractor={(item) => item.id}
  useFlashList
  estimatedItemSize={72}
/>
```

---

### 6. CertificateCard.tsx

**File**: `client/components/pages/learning/CertificateCard.tsx`

**Step 1**: Create hooks in `core/hooks/queries/useCertificates.ts`

```typescript
export function useCertificates() {
  return useQuery({
    queryKey: queryKeys.certificates.list(),
    queryFn: () => learningService.getCertificates(),
    staleTime: STALE_TIMES.CERTIFICATES,
  });
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: queryKeys.certificates.detail(id),
    queryFn: () => learningService.getCertificate(id),
    staleTime: STALE_TIMES.CERTIFICATES,
    enabled: !!id,
  });
}

export function usePrefetchCertificate() {
  const queryClient = useQueryClient();
  
  return (certificateId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.certificates.detail(certificateId),
      queryFn: () => learningService.getCertificate(certificateId),
      staleTime: STALE_TIMES.CERTIFICATES,
    });
  };
}
```

**Step 2**: Replace deprecated `useLearningProgress` usage

```diff
- const { certificates } = useLearningProgress();
+ const { data: certificates = [] } = useCertificates();
```

**Step 3**: Add prefetch on long-press

```tsx
const prefetchCertificate = usePrefetchCertificate();

<Pressable 
  onPress={() => onPress(certificate)}
  onLongPress={() => prefetchCertificate(certificate.id)}
>
```

---

## Adding Stale Times to Constants

Update `core/query/constants.ts`:

```typescript
export const STALE_TIMES = {
  // ... existing
  
  /** Transactions - 1 minute (financial data needs freshness) */
  TRANSACTIONS: 60 * 1000,
  
  /** Marketplace items - 5 minutes (catalog data) */
  MARKETPLACE: 5 * 60 * 1000,
  
  /** Certificates - 5 minutes (achievement data) */
  CERTIFICATES: 5 * 60 * 1000,
} as const;
```

---

## Testing Checklist

After each migration:

- [ ] Component renders with cached data on revisit
- [ ] Pull-to-refresh works
- [ ] Loading state shows on first load
- [ ] Error state shows with retry button
- [ ] Offline mode displays cached data
- [ ] No TypeScript errors
- [ ] No console warnings

## Common Issues

### "QueryClient not found"
Ensure component is wrapped in QueryClientProvider (already in app root).

### "Infinite re-renders"
Don't create query options inline in useQuery:
```tsx
// ❌ Bad - creates new object each render
useQuery({ queryKey: ['data', { filter }] })

// ✅ Good - stable reference
const filters = useMemo(() => ({ filter }), [filter]);
useQuery({ queryKey: ['data', filters] })
```

### "Data not refreshing"
Check staleTime isn't set too high. Use `refetch()` or invalidate queries.
