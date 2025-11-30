# Research: Client TanStack Query Migration Phase 3

**Feature**: 023-client-tanstack-phase3  
**Date**: 2025-01-21  
**Status**: Complete

## Overview

This document consolidates research findings and clarified decisions for Phase 3 of the TanStack Query migration. Most decisions were resolved during the clarification session.

## Resolved Decisions

### 1. Stale Time Configuration

**Decision**: Tiered stale times based on data volatility

| Data Type | Stale Time | Rationale |
|-----------|------------|-----------|
| Dashboard | 30 seconds | User expects fresh stats; high visibility |
| Quests | 2 minutes | Progress changes frequently |
| Achievements | 2 minutes | Progress changes frequently |
| Learning/Courses | 5 minutes | Content is relatively stable |
| Badges | 5 minutes | Badge criteria rarely changes |
| Notifications | 1 minute | New notifications should appear quickly |
| Transactions | 1 minute | Financial data needs reasonable freshness |

**Alternatives Considered**:
- Uniform 5 minutes: Too stale for dashboard
- All 30 seconds: Excessive network usage
- All 1 minute: Doesn't account for data volatility

### 2. Offline Mutation Handling

**Decision**: Block mutations when offline with clear messaging

**Implementation**:
```typescript
// useNetworkAware wrapper pattern
function useOfflineAwareMutation<T>(mutation: UseMutationResult<T>) {
  const { isConnected } = useNetworkStatus();
  
  const mutate = (...args) => {
    if (!isConnected) {
      showToast('Requires internet connection');
      return;
    }
    mutation.mutate(...args);
  };
  
  return { ...mutation, mutate };
}
```

**Alternatives Considered**:
- Queue mutations offline: Complex conflict resolution required
- Selective queuing: Inconsistent user experience
- No handling: Poor UX when offline

### 3. Pagination Page Size

**Decision**: 20 items per page

**Rationale**:
- Balanced load time and scroll depth
- Matches common mobile UX patterns
- Aligns with Phase 2 implementation

### 4. Retry Configuration

**Decision**: 3 retries with exponential backoff (1s, 2s, 4s)

**Implementation**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    },
  },
});
```

### 5. Garbage Collection Time

**Decision**: 24 hours

**Rationale**:
- Full day of offline access
- Reasonable device storage usage
- Matches user expectation for "recently viewed" content

## Codebase Analysis

### Already Migrated (Phase 2)

| Component | Status | Notes |
|-----------|--------|-------|
| `AchievementsList.tsx` | ✅ Complete | Uses `useAchievements`, `useClaimAchievement` |
| `BadgesList.tsx` | ✅ Complete | Uses `useBadges`, `useUserBadges` |
| `TransactionList.tsx` | ✅ Complete | Uses `useInfiniteTransactions` |
| `NotificationList.tsx` | ✅ Complete | Uses `useNotifications`, mutation hooks |
| `MarketplaceList.tsx` | ✅ Complete | Uses `useInfiniteMarketplaceProperties/Classifieds` |

### Requires Migration (Phase 3)

| Route File | Current State | Action Required |
|------------|---------------|-----------------|
| `app/achievements.tsx` | useState/useEffect | Replace with `<AchievementsList />` |
| `app/badges.tsx` | useState/useEffect | Replace with `<BadgesList />` |
| `app/dashboard.tsx` | Components use hooks internally | Verify hook integration |
| `app/quests.tsx` | Mixed: some useState, some TanStack | Complete migration |
| `app/learning.tsx` | Uses custom hooks | Verify TanStack integration |

### Hooks Available (from Phase 2)

```
core/hooks/queries/
├── useAchievements.ts     ✅
├── useBadges.ts           ✅
├── useCourses.ts          ✅
├── useDashboard.ts        ✅
├── useMarketplace.ts      ✅
├── useNotifications.ts    ✅
├── useQuests.ts           ✅
├── useTransactions.ts     ✅
└── ...others

core/hooks/mutations/
├── useAchievementMutations.ts  ✅
├── useNotificationMutations.ts ✅
├── useGroupMutations.ts        ✅
└── ...others
```

### Shared Components Available

```
components/shared/
├── ErrorState.tsx          ✅ Error display with retry
├── OfflineIndicator.tsx    ✅ Network status banner
├── StaleDataIndicator.tsx  ✅ Stale data warning
├── MutationErrorToast.tsx  ✅ Toast for mutation errors
└── InfiniteScrollList.tsx  ✅ Infinite scroll wrapper
```

## Technical Patterns

### Query Hook Pattern (established)

```typescript
export function useEntityData(options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.entity.all,
    queryFn: () => entityService.getAll(),
    staleTime: STALE_TIMES.ENTITY,
    ...options,
  });
}
```

### Mutation Hook Pattern (established)

```typescript
export function useEntityMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: entityService.update,
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.entity.all });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.entity.all);
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.entity.all, (old) => ({
        ...old,
        ...newData,
      }));
      
      return { previous };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.entity.all, context?.previous);
      showErrorToast('Update failed');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.entity.all });
    },
  });
}
```

### Component Pattern (established)

```tsx
function EntityList() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useEntityData();
  
  if (error && !data) {
    return <ErrorState onRetry={refetch} message={error.message} />;
  }
  
  return (
    <View>
      <OfflineIndicator />
      <StaleDataIndicator dataUpdatedAt={dataUpdatedAt} />
      {isLoading ? <Skeleton /> : <List data={data} />}
    </View>
  );
}
```

## Dependencies

### Existing (no new packages needed)

- `@tanstack/react-query` v5.x
- `@tanstack/react-query-persist-client`
- `@react-native-async-storage/async-storage`
- React Native Reusables (@shadcn components)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type mismatches between hooks and components | Low | Medium | Types already defined in Phase 2 |
| Cache invalidation bugs | Low | High | Use established queryKeys factory |
| Performance regression | Low | Medium | Follow established patterns |
| Offline state race conditions | Medium | Low | Block mutations when offline |

## Conclusion

Phase 3 is primarily a **route file migration** rather than new feature development. Most infrastructure and components already exist from Phase 2. The main work involves:

1. Replacing useState/useEffect in route files with existing TanStack Query hooks
2. Ensuring all route files use shared components (ErrorState, OfflineIndicator, etc.)
3. Creating missing mutation hooks (quest completion, marketplace purchase)
4. Updating stale time constants to match clarified configuration
