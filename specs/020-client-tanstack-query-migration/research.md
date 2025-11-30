# Research: Client TanStack Query Migration

**Feature**: 020-client-tanstack-query-migration  
**Date**: 2025-11-30  
**Purpose**: Resolve technical unknowns and document best practices for TanStack Query migration

## Research Tasks Completed

### 1. TanStack Query v5 Patterns for React Native

**Decision**: Use existing TanStack Query v5 infrastructure with hooks following `useFollowStats` pattern

**Rationale**: 
- Project already uses @tanstack/react-query ^5.90.11 with proper configuration
- Existing hooks in `core/hooks/queries/` (useSocial, useCourses, etc.) provide proven patterns
- AsyncStorage persister already configured via `@tanstack/query-async-storage-persister`

**Alternatives Considered**:
- Create custom caching layer → Rejected: TanStack Query already provides this
- Use React Query v4 patterns → Rejected: Project already on v5

### 2. Infinite Query Implementation

**Decision**: Use `useInfiniteQuery` with cursor-based pagination and FlashList integration

**Rationale**:
- TanStack Query v5's `useInfiniteQuery` provides:
  - `data.pages` array for accumulated data
  - `fetchNextPage()` for seamless loading
  - `hasNextPage` / `isFetchingNextPage` for UI state
  - `initialPageParam` + `getNextPageParam` for cursor management
- FlashList (`@shopify/flash-list`) already installed for 60fps performance

**Pattern (from TanStack Query docs)**:
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['items'],
  queryFn: ({ pageParam }) => fetchPage(pageParam),
  initialPageParam: '',
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});

// Flatten pages for list rendering
const items = data?.pages.flatMap(page => page.data) ?? [];
```

**Alternatives Considered**:
- Manual pagination with useState → Rejected: Already causing issues in current code
- Server-side cursor in URL params → Rejected: Cursor-based is cleaner for mobile

### 3. Optimistic Updates with Rollback

**Decision**: Use `onMutate` → snapshot → update cache → `onError` rollback pattern

**Rationale**:
- TanStack Query provides built-in optimistic update support via mutation callbacks
- Pattern ensures immediate UI feedback (<50ms) while maintaining data integrity
- `onSettled` guarantees eventual consistency via invalidation

**Pattern (from TanStack Query docs)**:
```typescript
useMutation({
  mutationFn: updateSettings,
  onMutate: async (newSettings) => {
    // Cancel ongoing fetches
    await queryClient.cancelQueries({ queryKey: ['settings'] });
    
    // Snapshot previous state
    const previousSettings = queryClient.getQueryData(['settings']);
    
    // Optimistically update
    queryClient.setQueryData(['settings'], newSettings);
    
    return { previousSettings };
  },
  onError: (err, newSettings, context) => {
    // Rollback on error
    queryClient.setQueryData(['settings'], context?.previousSettings);
    // Show error toast (FR-013)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  },
});
```

**Alternatives Considered**:
- Optimistic updates via local state → Rejected: Doesn't persist across navigation
- Wait for server response → Rejected: 500-1000ms latency unacceptable for settings

### 4. Offline Mutation Queue

**Decision**: Use TanStack Query's built-in mutation persistence with `resumePausedMutations()`

**Rationale**:
- Project already has `@tanstack/query-async-storage-persister` configured
- `setMutationDefaults()` allows defining offline-capable mutations
- `dehydrate`/`hydrate` pattern handles app restart scenarios

**Pattern (from TanStack Query docs)**:
```typescript
// In QueryProvider setup
queryClient.setMutationDefaults(['updateNotificationSettings'], {
  mutationFn: updateNotificationSettings,
  retry: 3,
});

// On app restart, resume paused mutations
useEffect(() => {
  queryClient.resumePausedMutations();
}, []);
```

**Alternatives Considered**:
- Custom offline queue (existing `offlineQueue.ts`) → Consider integrating with TanStack
- Redux Persist for mutations → Rejected: Already have TanStack Query persistence

### 5. Differentiated Stale Times

**Decision**: Add TRANSACTIONS (1 min) and MARKETPLACE (5 min) to `STALE_TIMES` constant

**Rationale**:
- Financial data (transactions) needs fresher data due to money sensitivity
- Catalog data (marketplace items) changes infrequently, can be cached longer
- Aligns with clarification session decision

**Implementation**:
```typescript
// In core/query/constants.ts
export const STALE_TIMES = {
  // ... existing
  TRANSACTIONS: 60 * 1000,      // 1 minute (financial data)
  MARKETPLACE: 5 * 60 * 1000,   // 5 minutes (catalog data)
  CERTIFICATES: 5 * 60 * 1000,  // 5 minutes (achievement data)
} as const;
```

### 6. Staleness Indicator for Offline Data

**Decision**: Add `lastUpdated` timestamp to cache and show warning when >1 hour old

**Rationale**:
- FR-012 requires indicating stale/offline data to users
- Clarification confirmed 1-hour threshold for "Data may be outdated" warning
- Can use TanStack Query's `dataUpdatedAt` from query result

**Implementation**:
```typescript
const { data, dataUpdatedAt } = useQuery(...);

const isStale = dataUpdatedAt && (Date.now() - dataUpdatedAt > 60 * 60 * 1000);
const isOffline = !navigator.onLine; // or NetInfo for React Native

// Show indicator if offline AND data is stale
{isOffline && isStale && <StaleDataBanner />}
```

### 7. Cache Logging in Development

**Decision**: Extend existing `cacheMonitor.ts` with query lifecycle logging

**Rationale**:
- FR-014 requires dev-only cache logging
- Project already has `core/query/cacheMonitor.ts` for cache metrics
- Add query observer for hit/miss/stale logging

**Implementation Direction**:
```typescript
// In cacheMonitor.ts (dev mode only)
if (__DEV__) {
  queryClient.getQueryCache().subscribe((event) => {
    console.log(`[QueryCache] ${event.type}:`, event.query.queryKey);
  });
}
```

## Summary of Decisions

| Topic | Decision | Key Benefit |
|-------|----------|-------------|
| Query Hooks | Follow `useFollowStats` pattern | Consistency with existing code |
| Infinite Queries | `useInfiniteQuery` + FlashList | 60fps scrolling, auto pagination |
| Optimistic Updates | `onMutate` snapshot + `onError` rollback | <50ms UI response |
| Offline Mutations | Built-in persistence + `resumePausedMutations` | Survives app restart |
| Stale Times | 1min transactions, 5min catalog | Balance freshness vs network |
| Staleness Warning | `dataUpdatedAt` > 1 hour | User transparency |
| Dev Logging | Extend `cacheMonitor.ts` | Debug cache issues |

## Open Questions (None)

All technical unknowns have been resolved. Ready for Phase 1 design.
