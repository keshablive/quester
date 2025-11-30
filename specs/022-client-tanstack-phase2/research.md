# Research: Complete TanStack Query Migration Phase 2

**Created**: 2025-11-30  
**Purpose**: Resolve NEEDS CLARIFICATION items and document technical decisions

## Research Tasks Completed

### 1. Service Method Audit

**Task**: Verify all service methods assumed in spec exist with expected signatures

#### gamificationService (`client/core/api/gamificationApi.ts`)

| Method | Signature | Exists | Notes |
|--------|-----------|--------|-------|
| `getAchievements` | `(filters?: AchievementFilters) => Promise<Achievement[]>` | ✅ Yes | Paginated response |
| `getUserBadges` | `(userId: string) => Promise<Badge[]>` | ✅ Yes | Returns earned badges |
| `getBadges` | `() => Promise<Badge[]>` | ✅ Yes | All available badges |
| `claimAchievement` | `(achievementId: string) => Promise<Achievement>` | ✅ Yes | For manual claims |

**Decision**: Use existing methods directly, no adapter needed.

#### questService (`client/core/api/questApi.ts`)

| Method | Signature | Exists | Notes |
|--------|-----------|--------|-------|
| `getQuests` | `(filters?: QuestFilters) => Promise<Quest[]>` | ✅ Yes | |
| `getQuestProgress` | `(questId: string) => Promise<QuestProgress>` | ✅ Yes | |
| `completeStep` | `(questId: string, stepId: string) => Promise<QuestProgress>` | ✅ Yes | Returns updated progress |

**Decision**: Use existing methods. `useQuests` hook already exists; need `useQuestProgress` and `useCompleteQuestStep`.

#### adminService (`client/core/api/adminApi.ts`)

| Method | Signature | Exists | Notes |
|--------|-----------|--------|-------|
| `getStats` | `() => Promise<AdminStats>` | ✅ Yes | Dashboard summary |
| `getUsers` | `(filters?: AdminUserFilters) => Promise<PaginatedResponse<User>>` | ✅ Yes | Paginated |
| `getKeys` | `() => Promise<EncryptionKey[]>` | ✅ Yes | DEK management |
| `getAuditLog` | `() => Promise<AuditLogEntry[]>` | ✅ Yes | |
| `rotateDEK` | `() => Promise<void>` | ✅ Yes | Mutation |

**Decision**: Use existing methods directly.

#### analyticsService (`client/core/api/analyticsApi.ts`)

| Method | Signature | Exists | Notes |
|--------|-----------|--------|-------|
| `getUserAnalytics` | `(userId?: string) => Promise<UserAnalytics>` | ✅ Yes | |
| `getEngagement` | `(timeRange: TimeRange) => Promise<EngagementData>` | ✅ Yes | Chart data |

**Decision**: `useAnalytics` hook exists and covers `getUserAnalytics`. Need to add `useEngagementChart` for time-range specific data.

#### socialService (`client/core/api/socialApi.ts`)

| Method | Signature | Exists | Notes |
|--------|-----------|--------|-------|
| `getFeed` | `(cursor?: string, limit?: number) => Promise<PaginatedResponse<Post>>` | ✅ Yes | Cursor-based |
| `getPosts` | `(userId: string) => Promise<Post[]>` | ✅ Yes | User's posts |
| `likePost` | `(postId: string) => Promise<Post>` | ✅ Yes | Returns updated post |
| `unlikePost` | `(postId: string) => Promise<Post>` | ✅ Yes | |
| `createPost` | `(content: CreatePostInput) => Promise<Post>` | ✅ Yes | |
| `deletePost` | `(postId: string) => Promise<void>` | ✅ Yes | |

**Decision**: Use existing methods. `getFeed` supports cursor pagination for infinite scroll.

#### groupService (`client/core/api/groupApi.ts`)

| Method | Signature | Exists | Notes |
|--------|-----------|--------|-------|
| `getGroups` | `(filters?: GroupFilters) => Promise<Group[]>` | ✅ Yes | |
| `getGroup` | `(groupId: string) => Promise<Group>` | ✅ Yes | Detail with members |
| `createGroup` | `(input: CreateGroupInput) => Promise<Group>` | ✅ Yes | |
| `joinGroup` | `(groupId: string) => Promise<Group>` | ✅ Yes | |
| `leaveGroup` | `(groupId: string) => Promise<void>` | ✅ Yes | |

**Decision**: Use existing methods directly.

---

### 2. Existing Hook Pattern Analysis

**Task**: Document patterns from specs 020/021 for consistency

#### Query Hook Pattern (from `useTransactions.ts`)

```typescript
export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => transactionService.getTransactions(filters),
    staleTime: STALE_TIMES.transactions,
    gcTime: GC_TIME,
  });
}
```

**Pattern elements**:
- Named export function
- Optional filters parameter
- Uses `queryKeys` factory for cache key
- Uses `STALE_TIMES` constant from config
- Uses shared `GC_TIME` (24 hours)

#### Infinite Query Pattern (from `useNotifications.ts`)

```typescript
export function useInfiniteNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite(),
    queryFn: ({ pageParam }) => 
      notificationService.getNotifications({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIMES.notifications,
    gcTime: GC_TIME,
  });
}
```

**Pattern elements**:
- Uses `useInfiniteQuery` from TanStack Query
- `initialPageParam` typed explicitly
- `getNextPageParam` extracts cursor from response
- Page size hardcoded or from config

#### Mutation Pattern with Optimistic Updates (from `useNotificationMutations.ts`)

```typescript
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => 
      notificationService.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previous = queryClient.getQueryData(queryKeys.notifications.list());
      
      queryClient.setQueryData(queryKeys.notifications.list(), (old) => 
        old?.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(queryKeys.notifications.list(), context?.previous);
      Toast.show({ type: 'error', text1: 'Failed to mark as read' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
```

**Pattern elements**:
- Cancel in-flight queries before optimistic update
- Save previous state for rollback
- Update cache optimistically in `onMutate`
- Restore previous on `onError`
- Invalidate queries on `onSettled` (success or error)
- Show toast on error

---

### 3. Component Existence Verification

**Task**: Verify which components from spec exist vs need creation

| Component (from spec) | File Path | Exists | Action |
|----------------------|-----------|--------|--------|
| `AchievementsList.tsx` | `components/pages/achievements/AchievementsList.tsx` | ❌ No | CREATE |
| `BadgesList.tsx` | `components/pages/badges/BadgesList.tsx` | ❌ No | CREATE |
| `QuestDetail.tsx` | `components/pages/quests/QuestDetail.tsx` | ✅ Yes | VERIFY (already migrated) |
| `QuestsList.tsx` | `components/pages/quests/QuestsList.tsx` | ✅ Yes | VERIFY |
| `AdminDashboard.tsx` | `components/pages/admin/AdminDashboard.tsx` | ✅ Yes | MIGRATE |
| `AdminUsers.tsx` | N/A | ❌ No | OUT OF SCOPE (not in current admin) |
| `AnalyticsDashboard.tsx` | `components/pages/analytics/AnalyticsDashboard.tsx` | ✅ Yes | VERIFY (already migrated) |
| `SocialFeed.tsx` | `components/pages/communicate/Social/SocialFeed.tsx` | ✅ Yes | MIGRATE |
| `PostCard.tsx` | `components/pages/communicate/Social/PostCard.tsx` | ✅ Yes | ADD useLikePost |
| `GroupList.tsx` | `components/pages/communicate/Groups/GroupList.tsx` | ✅ Yes | MIGRATE |
| `GroupDetail.tsx` | `components/pages/communicate/Groups/GroupDetail.tsx` | ❌ No | CREATE |

**Decisions**:
- Remove `AdminUsers.tsx` from scope (doesn't exist, admin uses single dashboard)
- Add `ProfileAchievements.tsx` migration (uses achievements data)
- Create `GroupDetail.tsx` to support group routes

---

### 4. QueryKeys Factory Extension Design

**Task**: Design queryKeys additions following existing patterns

**Existing pattern** (from `keys.ts`):

```typescript
export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    list: (filters?: TransactionFilters) => [...queryKeys.transactions.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.transactions.all, 'detail', id] as const,
  },
  // ...
};
```

**New keys to add**:

```typescript
// Achievement keys
achievements: {
  all: ['achievements'] as const,
  list: (filters?: AchievementFilters) => [...queryKeys.achievements.all, 'list', filters] as const,
  detail: (id: string) => [...queryKeys.achievements.all, 'detail', id] as const,
  user: (userId: string) => [...queryKeys.achievements.all, 'user', userId] as const,
},

// Badge keys
badges: {
  all: ['badges'] as const,
  list: () => [...queryKeys.badges.all, 'list'] as const,
  user: (userId: string) => [...queryKeys.badges.all, 'user', userId] as const,
  detail: (id: string) => [...queryKeys.badges.all, 'detail', id] as const,
},

// Admin keys
admin: {
  all: ['admin'] as const,
  stats: () => [...queryKeys.admin.all, 'stats'] as const,
  users: (filters?: AdminUserFilters) => [...queryKeys.admin.all, 'users', filters] as const,
  keys: () => [...queryKeys.admin.all, 'keys'] as const,
  auditLog: (filters?: AuditLogFilters) => [...queryKeys.admin.all, 'auditLog', filters] as const,
},

// Extend existing social keys
social: {
  ...existingSocialKeys,
  feed: () => [...queryKeys.social.all, 'feed'] as const,
  feedInfinite: () => [...queryKeys.social.all, 'feed', 'infinite'] as const,
  post: (id: string) => [...queryKeys.social.all, 'post', id] as const,
  groups: (filters?: GroupFilters) => [...queryKeys.social.all, 'groups', filters] as const,
  group: (id: string) => [...queryKeys.social.all, 'group', id] as const,
  groupMembers: (groupId: string) => [...queryKeys.social.all, 'group', groupId, 'members'] as const,
},
```

---

### 5. Stale Time Configuration

**Task**: Define stale times for new domains per spec requirements

| Domain | Stale Time | Rationale (from spec) |
|--------|------------|----------------------|
| Achievements | 5 min | FR-004: "cached with 5-minute stale time" |
| Badges (list) | 10 min | FR-004: Badge catalog rarely changes |
| Badges (user) | 5 min | FR-004: User badges update on earn |
| Quest Progress | 1 min | Active engagement, need fresh data |
| Admin Stats | 5 min | FR-011: "auto-refresh every 5 minutes" |
| Admin Users | 2 min | Moderately dynamic |
| Analytics | 5 min | Summary data, not real-time |
| Engagement Charts | 5 min | Chart data doesn't change rapidly |
| Social Feed | 2 min | Active content, but not real-time |
| Groups | 5 min | Relatively stable |
| Group Detail | 5 min | Relatively stable |

---

## Decisions Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Missing service methods? | None - all exist | Audit confirmed all methods available |
| AdminUsers component? | Remove from scope | Component doesn't exist; admin is single dashboard |
| GroupDetail component? | Create new | Route exists, component missing |
| Infinite scroll page size? | 20 items | Per clarification: "20 items per page" |
| Max pages in memory? | 10 pages (200 posts) | Per clarification: "limit to 10 pages" |
| Mutation retry behavior? | Manual retry button | Per clarification: "no auto-retry" |

## Alternatives Considered

### 1. Service Adapter Layer

**Considered**: Creating adapter wrappers for all services to normalize interfaces

**Rejected because**: All existing service methods match expected signatures. Adapter would add complexity without benefit.

### 2. Separate Query Files per Entity

**Considered**: `useAchievementsList.ts`, `useAchievementDetail.ts`, etc.

**Rejected because**: Existing pattern groups related hooks in single file (e.g., `useTransactions.ts` contains list, detail, mutations). Follow established pattern for consistency.

### 3. Global Error Boundary for Mutations

**Considered**: Wrap all mutations in global error handler

**Rejected because**: Spec requires per-mutation error toasts with manual retry. Global handler would lose context needed for retry functionality.
