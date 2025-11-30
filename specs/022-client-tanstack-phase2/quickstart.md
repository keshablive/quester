# Quickstart: Complete TanStack Query Migration Phase 2

**Created**: 2025-11-30  
**Purpose**: Rapid onboarding guide for implementing Phase 2 hooks

## Prerequisites

- Spec 020 TanStack Query infrastructure complete and working
- Spec 021 patterns (optimistic updates, mutations) understood
- Access to `client/core/` directory

## Implementation Order

### Phase 2A: Query Keys & Types (Day 1)

1. **Extend queryKeys factory** (`client/core/query/keys.ts`)
2. **Add stale time configs** (`client/core/query/config.ts`)
3. **Add entity types** (`client/core/types/query.types.ts`)

### Phase 2B: P1 Hooks (Days 2-3)

4. **Create `useAchievements.ts`** - Query hook for achievements
5. **Create `useBadges.ts`** - Query hook for badges
6. **Extend `useQuests.ts`** - Add `useQuestProgress`
7. **Create `useQuestMutations.ts`** - `useCompleteQuestStep` with optimistic updates

### Phase 2C: P2 Hooks (Days 4-5)

8. **Create `useAdmin.ts`** - Admin dashboard queries
9. **Extend `useAnalytics.ts`** - Add `useEngagementChart`
10. **Create `useSocialFeed.ts`** - Infinite query for feed
11. **Create `useSocialMutations.ts`** - Like/unlike with optimistic updates

### Phase 2D: P3 Hooks (Day 6)

12. **Create `useGroups.ts`** - Group list and detail queries
13. **Create `useGroupMutations.ts`** - Join/leave mutations

### Phase 2E: Component Migration (Days 7-9)

14. **Migrate `AdminDashboard.tsx`**
15. **Migrate `SocialFeed.tsx`**
16. **Migrate `GroupList.tsx`**
17. **Create `AchievementsList.tsx`** (new component)
18. **Create `BadgesList.tsx`** (new component)
19. **Create `GroupDetail.tsx`** (new component)

## Quick Reference

### Hook Creation Template

```typescript
// client/core/hooks/queries/useExample.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { STALE_TIMES, GC_TIME } from '@/core/query/config';
import { exampleService } from '@/core/api';
import type { Example, ExampleFilters } from '@/core/types';

export function useExample(filters?: ExampleFilters) {
  return useQuery({
    queryKey: queryKeys.example.list(filters),
    queryFn: () => exampleService.getExamples(filters),
    staleTime: STALE_TIMES.example,
    gcTime: GC_TIME,
  });
}
```

### Infinite Query Template

```typescript
// client/core/hooks/queries/useInfiniteExample.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { STALE_TIMES, GC_TIME } from '@/core/query/config';
import { exampleService } from '@/core/api';

const PAGE_SIZE = 20;
const MAX_PAGES = 10;

export function useInfiniteExample() {
  return useInfiniteQuery({
    queryKey: queryKeys.example.infinite(),
    queryFn: ({ pageParam }) => 
      exampleService.getList({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.example,
    gcTime: GC_TIME,
    maxPages: MAX_PAGES,  // Memory limit per FR-017
  });
}
```

### Mutation with Optimistic Update Template

```typescript
// client/core/hooks/mutations/useExampleMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { exampleService } from '@/core/api';
import { Toast } from '@/components/ui';

export function useUpdateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateInput) => exampleService.update(input),
    
    onMutate: async (input) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.example.detail(input.id) 
      });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(
        queryKeys.example.detail(input.id)
      );
      
      // Optimistic update
      queryClient.setQueryData(
        queryKeys.example.detail(input.id),
        (old) => old ? { ...old, ...input } : old
      );
      
      return { previous };
    },
    
    onError: (err, input, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.example.detail(input.id),
          context.previous
        );
      }
      
      // Show error toast with retry (per FR-024)
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: 'Tap to retry',
        onPress: () => {/* retry logic */},
      });
    },
    
    onSettled: (_, __, input) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.example.detail(input.id) 
      });
    },
  });
}
```

### Component Migration Template

```tsx
// Before (useState/useEffect)
function ExampleList() {
  const [data, setData] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    exampleService.getList()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  return <List data={data} />;
}

// After (TanStack Query)
function ExampleList() {
  const { data, isLoading, error, isFetching, dataUpdatedAt, refetch } = useExample();
  const { isOffline } = useNetworkState();
  
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data?.length) return <EmptyState />;
  
  return (
    <>
      {isOffline && <OfflineIndicator />}
      {isFetching && <RefreshIndicator />}
      <StaleDataIndicator dataUpdatedAt={dataUpdatedAt} staleThreshold={300000} />
      <List data={data} onRefresh={refetch} />
    </>
  );
}
```

## Key Imports

```typescript
// Query hooks
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Project utilities
import { queryKeys } from '@/core/query/keys';
import { STALE_TIMES, GC_TIME } from '@/core/query/config';

// Shared components
import { 
  LoadingState, 
  ErrorState, 
  EmptyState,
  OfflineIndicator,
  StaleDataIndicator,
  MutationErrorToast 
} from '@/components/shared';

// Network state
import { useNetworkState } from '@/core/hooks';
```

## Testing Checklist

For each migrated component:

- [ ] Cached data loads in <100ms on return navigation
- [ ] Offline indicator shows when network unavailable
- [ ] Stale data indicator shows when data is old
- [ ] Pull-to-refresh triggers refetch
- [ ] Error state shows with retry button on failure
- [ ] Empty state shows when no data
- [ ] Background refetch shows subtle indicator
- [ ] Optimistic updates (if mutations) update UI immediately
- [ ] Mutation errors revert UI and show toast

## Common Pitfalls

1. **Forgetting to export from barrel** - Add to `index.ts` after creating hook
2. **Missing query key in factory** - Add to `keys.ts` before using in hook
3. **Not handling empty state** - Check `data?.length` not just `data`
4. **Optimistic update type mismatch** - Ensure `setQueryData` types match
5. **Missing `gcTime`** - Always include for offline persistence
6. **Infinite query without `maxPages`** - Memory will grow unbounded

---

## Implementation Notes (Post-Phase 2)

### Type Mappings

During implementation, we discovered several type mismatches between service types and query types:

| Service Type | Query Type | Key Differences |
|--------------|------------|-----------------|
| `gamification.Achievement` | `query.Achievement` | Query uses `title`, `isEarned`, `criteria`; Service uses `name`, `unlocked` |
| `gamification.Badge` | `query.ExtendedBadge` | Query uses `imageUrl`, `tier`, `criteria`, `isEarned`; Service uses `icon`, `rarity`, `earned` |
| `messages.Group` | `query.Group` | Query adds `isJoined`, `isPublic`, `createdBy`, `members` |
| `messages.GroupMember` | `query.GroupMember` | Both use `userId` (not `id`) as member identifier |

**Pattern**: Hooks should map service responses to query types in `queryFn`:
```typescript
queryFn: async () => {
  const result = await service.getData();
  return {
    id: result.id,
    title: result.name,  // Map service -> query naming
    isEarned: result.unlocked,
    // ... other mappings
  };
}
```

### Router Type Assertions

Expo Router's typed routes don't include dynamic segments by default. Use type assertions for dynamic routes:
```typescript
router.push(`/groups/${groupId}` as any);
```

### Toast Notifications

The `react-native-toast-message` package may not be installed. Use safe fallback pattern:
```typescript
const showToast = (type: 'success' | 'error', title: string, message?: string) => {
  try {
    const Toast = require('react-native-toast-message').default;
    Toast.show({ type, text1: title, text2: message });
  } catch {
    console.log(`[Toast] ${title}: ${message || ''}`);
  }
};
```

### Pre-existing Type Errors

The codebase has ~149 pre-existing TypeScript errors in files outside this feature scope:
- `app/achievements.tsx`, `app/badges.tsx` - Route files with old type usage
- `components/pages/learning/*` - Course/Certificate type mismatches  
- `components/pages/marketplace/*` - Marketplace type issues
- `components/pages/admin/AdminDashboard.tsx` - KMS types mismatch

These are out of scope for this migration but should be addressed in future cleanup.

### Files Created/Modified

**New Hooks:**
- `core/hooks/queries/useGroups.ts` - Group list and detail queries
- `core/hooks/mutations/useGroupMutations.ts` - Join/leave/create with optimistic updates

**New Components:**
- `components/pages/communicate/Groups/GroupsListView.tsx` - Group list with TanStack Query
- `components/pages/communicate/Groups/GroupDetailView.tsx` - Group detail with member management
- `components/pages/communicate/Social/SocialFeed.tsx` - Simplified feed wrapper

**Modified Components:**
- `components/pages/achievements/AchievementsList.tsx` - Fixed type mappings
- `components/pages/badges/BadgesList.tsx` - Fixed imports and type mappings
- `components/pages/admin/AdminDashboard.tsx` - Stats card property fixes
- `components/pages/analytics/EngagementChart.tsx` - TimeRange and data access fixes
