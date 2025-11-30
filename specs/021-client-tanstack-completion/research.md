# Research: Complete TanStack Query Component Integration

**Feature**: 021-client-tanstack-completion  
**Date**: November 30, 2025  
**Status**: Complete

## Research Tasks

### Task 1: Hook Availability Audit

**Question**: Are all required TanStack Query hooks implemented and ready?

**Finding**: ✅ All hooks are ready

| Hook | File | Status | Notes |
|------|------|--------|-------|
| `useTransaction` | `core/hooks/queries/useTransactions.ts` | ✅ Ready | Fetches single transaction by ID |
| `useInfiniteTransactions` | `core/hooks/queries/useTransactions.ts` | ✅ Ready | Already used in TransactionList |
| `useMarketplaceProperty` | `core/hooks/queries/useMarketplace.ts` | ✅ Ready | Fetches single property by ID |
| `useMarketplaceClassified` | `core/hooks/queries/useMarketplace.ts` | ✅ Ready | Fetches single classified by ID |
| `useNotificationSettings` | `core/hooks/queries/useNotificationSettings.ts` | ✅ Ready | Fetches current settings |
| `useUpdateNotificationSettings` | `core/hooks/queries/useNotificationSettings.ts` | ✅ Ready | Mutation with optimistic updates |

**Decision**: No new hooks needed. Proceed with integration.

---

### Task 2: Current Implementation Pattern Analysis

**Question**: What patterns do components currently use that need migration?

**Finding**: 3 components use `useState`/`useEffect` pattern

#### TransactionDetail.tsx (Lines 8-28)

```typescript
// Current Pattern - NEEDS MIGRATION
const [transaction, setTransaction] = useState<Transaction | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadTransaction();
}, [transactionId]);

const loadTransaction = async () => {
  try {
    setLoading(true);
    const data = await transactionsService.get(transactionId);
    setTransaction(data);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load');
  } finally {
    setLoading(false);
  }
};
```

#### MarketplaceDetail.tsx (Lines 21-44)

```typescript
// Current Pattern - NEEDS MIGRATION
const [item, setItem] = useState<Property | ClassifiedAd | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadItem();
}, [itemId]);

const loadItem = async () => {
  // Similar pattern to TransactionDetail
};
```

#### NotificationSettings.tsx (Lines 7-8)

```typescript
// Current Pattern - NEEDS MIGRATION
const [notifications, setNotifications] = React.useState(true);
const [emailUpdates, setEmailUpdates] = React.useState(false);
// No server sync - purely local state!
```

**Decision**: Follow existing migrated patterns (TransactionList, CertificateList, FollowLists)

---

### Task 3: Migration Pattern from Existing Components

**Question**: What is the established pattern for migrated components?

**Finding**: Consistent pattern across TransactionList, CertificateList, FollowLists

#### Standard Migration Pattern

```typescript
// Import hook
import { useTransaction, useMarketplaceProperty } from '@/core';

// In component
const {
  data: transaction,
  isLoading,
  isRefetching,
  error,
  refetch,
  dataUpdatedAt,
} = useTransaction(transactionId);

// Loading state (initial only)
if (isLoading && !transaction) {
  return <LoadingIndicator />;
}

// Error state (only when no cached data)
if (error && !transaction) {
  return <ErrorState error={error} onRetry={refetch} />;
}

// Content with offline indicator
return (
  <>
    <OfflineIndicator dataUpdatedAt={dataUpdatedAt} />
    <Content data={transaction} />
  </>
);
```

#### Offline Indicator Pattern (reusable)

```typescript
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

function OfflineIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const isStale = Date.now() - dataUpdatedAt > OFFLINE_THRESHOLD_MS;
  if (!isStale) return null;
  
  return (
    <View className="...">
      <WifiOff size={16} />
      <Text>Showing cached data. Pull down to refresh.</Text>
    </View>
  );
}
```

**Decision**: Extract OfflineIndicator to shared component to avoid duplication.

---

### Task 4: Optimistic Updates Pattern

**Question**: How should NotificationSettings implement optimistic updates?

**Finding**: Pattern already implemented in `useUpdateNotificationSettings`

The hook in `core/hooks/queries/useNotificationSettings.ts` already implements:

1. **onMutate**: Cancel queries, snapshot previous, apply optimistic update
2. **onError**: Rollback to previous state, show toast
3. **onSettled**: Invalidate queries to sync

```typescript
// Usage in component
const { mutate: updateSettings, isPending } = useUpdateNotificationSettings({
  onError: () => {
    // Show error toast (already handled by hook, but can add custom)
  },
});

// Toggle handler with debounce
const handleToggle = useDebouncedCallback((key: string, value: boolean) => {
  updateSettings({ [key]: value });
}, 300);
```

**Decision**: Use existing `useUpdateNotificationSettings` with 300ms debounce wrapper.

---

### Task 5: Empty State Requirements

**Question**: What empty states need to be implemented?

**Finding**: Per clarification, empty states should show action prompts.

| Component | Empty State Message | Action |
|-----------|---------------------|--------|
| TransactionDetail | N/A (always has ID) | - |
| MarketplaceDetail | N/A (always has ID) | - |
| NotificationSettings | N/A (always has settings) | - |

**Note**: List components (TransactionList, CertificateList) already have empty states. Detail components don't need them since they're only shown when an item is selected.

**Decision**: No new empty states needed for the 3 migration targets.

---

## Summary

| Research Area | Decision | Rationale |
|---------------|----------|-----------|
| Hook availability | All hooks ready | Implemented in spec 020 |
| Migration pattern | Follow existing pattern | Consistency with TransactionList, CertificateList |
| Offline indicator | Extract to shared | Avoid duplication across 3+ components |
| Optimistic updates | Use existing hook | `useUpdateNotificationSettings` already implements |
| Empty states | Not needed | Detail views always have item context |
| Debounce interval | 300ms | Per clarification session |

## Alternatives Considered

### Creating new hooks vs using existing

- **Rejected**: Creating wrapper hooks for detail views
- **Reason**: Direct usage of `useTransaction`, `useMarketplaceProperty` is simpler and follows DRY

### Full loading overlay vs subtle indicator

- **Rejected**: Full overlay during background refetch
- **Reason**: Per clarification, subtle indicator preferred to maintain instant-display feel
