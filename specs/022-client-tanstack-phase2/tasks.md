# Tasks: Complete TanStack Query Migration Phase 2

**Input**: Design documents from `/specs/022-client-tanstack-phase2/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested - omitting test tasks per template guidelines.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

- **Client hooks**: `client/core/hooks/queries/`, `client/core/hooks/mutations/`
- **Query infrastructure**: `client/core/query/`
- **Types**: `client/core/types/`
- **Components**: `client/components/pages/`

---

## Phase 1: Setup

**Purpose**: Prepare infrastructure for new hooks

- [X] T001 Extend queryKeys factory with achievements, badges, admin, social keys in `client/core/query/keys.ts`
- [X] T002 [P] Add stale time constants for new domains in `client/core/query/config.ts`
- [X] T003 [P] Add Phase 2 entity types (Achievement, Badge, Quest, Admin, Social, Group) to `client/core/types/query.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks that multiple user stories depend on

**⚠️ CRITICAL**: User story phases cannot begin until these hooks exist

- [X] T004 [P] Create `useAchievements()` hook in `client/core/hooks/queries/useAchievements.ts` (FR-001, FR-004)
- [X] T005 [P] Create `useUserBadges()` hook in `client/core/hooks/queries/useBadges.ts` (FR-002)
- [X] T006 [P] Create `useBadges()` hook in `client/core/hooks/queries/useBadges.ts` (FR-003, FR-004)
- [X] T007 [P] Create `useQuestProgress()` hook in `client/core/hooks/queries/useQuests.ts` (FR-005, FR-008) - Already exists
- [X] T008 [P] Create `useCompleteQuestStep()` mutation in `client/core/hooks/mutations/useQuestMutations.ts` (FR-006, FR-007) - Already exists
- [X] T009 [P] Create `useAdminStats()` hook in `client/core/hooks/queries/useAdmin.ts` (FR-009, FR-011)
- [X] T010 [P] Create `useEngagementChart()` hook in `client/core/hooks/queries/useAnalytics.ts` (FR-013, FR-014)
- [X] T011 [P] Create `useInfiniteSocialPosts()` hook in `client/core/hooks/queries/useSocialFeed.ts` (FR-015, FR-017)
- [X] T012 [P] Create `useLikePost()` mutation in `client/core/hooks/mutations/useSocialMutations.ts` (FR-016)
- [X] T013 [P] Create `useGroups()` hook in `client/core/hooks/queries/useGroups.ts` (FR-018)
- [X] T014 [P] Create `useGroup()` hook in `client/core/hooks/queries/useGroups.ts` (FR-018)
- [X] T015 Update barrel exports in `client/core/hooks/queries/index.ts` for all new query hooks
- [X] T016 Update barrel exports in `client/core/hooks/mutations/index.ts` for all new mutation hooks

**Checkpoint**: All hooks ready - component migration can begin

---

## Phase 3: User Story 1 - Instant Achievement Display with Cache (Priority: P1) 🎯 MVP

**Goal**: Users see achievements/badges instantly from cache on return navigation

**Independent Test**: Open achievements → navigate away → return → data appears in <100ms

### Implementation for User Story 1

- [X] T017 [US1] Create `AchievementsList.tsx` in `client/components/pages/achievements/` using `useAchievements()` hook
- [X] T018 [P] [US1] Create `BadgesList.tsx` in `client/components/pages/badges/` using `useBadges()` and `useUserBadges()` hooks
- [X] T019 [US1] Add empty state component for zero achievements/badges in `AchievementsList.tsx`
- [X] T020 [US1] Add empty state component for zero badges in `BadgesList.tsx`
- [X] T021 [US1] Add `OfflineIndicator` integration to `AchievementsList.tsx`
- [X] T022 [P] [US1] Add `OfflineIndicator` integration to `BadgesList.tsx`
- [X] T023 [US1] Add pull-to-refresh using `refetch()` in `AchievementsList.tsx`
- [X] T024 [P] [US1] Add pull-to-refresh using `refetch()` in `BadgesList.tsx`
- [X] T025 [US1] Add `StaleDataIndicator` with 5-minute threshold to achievement/badge lists

**Checkpoint**: User Story 1 complete - achievements/badges load from cache instantly

---

## Phase 4: User Story 2 - Responsive Quest Progress with Optimistic Updates (Priority: P1)

**Goal**: Quest step completion shows immediate UI feedback with optimistic updates

**Independent Test**: Complete quest step → UI updates instantly → server confirms (or reverts)

### Implementation for User Story 2

- [X] T026 [US2] Verify `QuestDetail.tsx` uses `useQuestProgress()` hook (migrate if needed) in `client/components/pages/quests/QuestDetail.tsx` - Created QuestDetailContainer.tsx
- [X] T027 [US2] Integrate `useCompleteQuestStep()` mutation into `QuestDetail.tsx` for step completion
- [X] T028 [US2] Implement optimistic update logic in `QuestDetail.tsx` (progress bar, step status)
- [X] T029 [US2] Add error rollback with toast notification for failed step completion (FR-024)
- [X] T030 [US2] Add offline queuing indicator for quest steps (FR-007)
- [X] T031 [US2] Verify `QuestsList.tsx` uses existing `useQuests()` hook correctly - Already using TanStack Query

**Checkpoint**: User Story 2 complete - quest progress updates optimistically

---

## Phase 5: User Story 3 - Admin Dashboard with Real-time Stats (Priority: P2)

**Goal**: Admins see dashboard stats with automatic 5-minute refresh

**Independent Test**: Open admin dashboard → stats load with stale-while-revalidate → background refresh updates

### Implementation for User Story 3

- [X] T032 [US3] Migrate `AdminDashboard.tsx` from useState/useEffect to `useAdminStats()` hook in `client/components/pages/admin/AdminDashboard.tsx`
- [X] T033 [US3] Add `refetchInterval: 5 * 60 * 1000` for auto-refresh while visible (FR-011)
- [X] T034 [US3] Add `StaleDataIndicator` with "last updated" timestamp display
- [X] T035 [US3] Add error state with retry button for dashboard fetch failures (FR-022)
- [X] T036 [US3] Add skeleton loaders for slow API responses (>3s)

**Checkpoint**: User Story 3 complete - admin dashboard auto-refreshes every 5 minutes

---

## Phase 6: User Story 4 - Analytics Dashboard with Efficient Data Loading (Priority: P2)

**Goal**: Analytics charts load independently without blocking UI

**Independent Test**: Open analytics → summary loads first → charts load progressively

### Implementation for User Story 4

- [X] T037 [US4] Verify `AnalyticsDashboard.tsx` uses existing `useAnalytics()` hook correctly (covers FR-012; hook already exists per research.md) - Already using TanStack Query hooks
- [X] T038 [US4] Integrate `useEngagementChart(timeRange)` for chart data in `client/components/pages/analytics/AnalyticsDashboard.tsx` - Created EngagementChart.tsx
- [X] T039 [US4] Implement independent loading indicators per chart section (FR-014)
- [X] T040 [US4] Add error state per chart (failed chart shows error, others remain visible)
- [X] T041 [US4] Add time range selector that triggers chart refetch with new range

**Checkpoint**: User Story 4 complete - analytics charts load independently

---

## Phase 7: User Story 5 - Social Feed with Infinite Scroll (Priority: P2)

**Goal**: Social feed loads continuously with smooth scrolling, posts persist in memory

**Independent Test**: Scroll through 50+ posts → scroll back → all posts still visible (no reload)

### Implementation for User Story 5

- [X] T042 [US5] Migrate `SocialFeed.tsx` from useState/useEffect to `useInfiniteSocialPosts()` hook in `client/components/pages/communicate/Social/SocialFeed.tsx`
- [X] T043 [US5] Implement infinite scroll with `fetchNextPage` on scroll-to-bottom
- [X] T044 [US5] Configure `maxPages: 10` for memory limit (200 posts max per FR-017)
- [X] T045 [US5] Integrate `useLikePost()` mutation into `PostCard.tsx` for like button in `client/components/pages/communicate/Social/PostCard.tsx`
- [X] T046 [US5] Implement optimistic like count update with rollback on error
- [X] T047 [US5] Add pull-to-refresh that prepends new posts to feed
- [X] T048 [US5] Add "You're all caught up" message when `hasNextPage` is false
- [X] T049 [US5] Add `OfflineIndicator` integration to `SocialFeed.tsx`

**Checkpoint**: User Story 5 complete - infinite scroll works with optimistic likes

---

## Phase 8: User Story 6 - Group Management with Cache (Priority: P3)

**Goal**: Group lists and details load quickly from cache

**Independent Test**: View group list → view detail → return to list → both cached

### Implementation for User Story 6

- [X] T050 [US6] Migrate `GroupList.tsx` from useState/useEffect to `useGroups()` hook in `client/components/pages/communicate/Groups/GroupsListView.tsx`
- [X] T051 [US6] Create `GroupDetail.tsx` using `useGroup()` hook in `client/components/pages/communicate/Groups/GroupDetailView.tsx`
- [X] T052 [US6] Add empty state for no groups in `GroupList.tsx` (FR-021)
- [X] T053 [US6] Add error state with retry button in `GroupDetail.tsx` (FR-022)
- [X] T054 [US6] Add cache invalidation on group join/leave actions via `useJoinGroup`/`useLeaveGroup` mutations
- [X] T055 [US6] Add `OfflineIndicator` integration to `GroupList.tsx` and `GroupDetail.tsx`

**Checkpoint**: User Story 6 complete - group navigation is cached

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verification, cleanup, and documentation

- [X] T056 [P] Verify all hooks use centralized `queryKeys` factory (FR-019)
- [X] T057 [P] Verify all hooks integrate with AsyncStorage offline persistence (FR-020)
- [X] T058 [P] Verify all list components show empty state when no data (FR-021)
- [X] T059 [P] Verify all detail components show error state with retry (FR-022)
- [X] T060 [P] Verify background refetch shows subtle loading indicator (FR-023)
- [X] T061 [P] Verify all mutations show error toast with retry button (FR-024)
- [X] T062 Run TypeScript build to verify no type errors: `cd client && npx tsc --noEmit`
- [X] T063 Manual test: Verify <100ms cached load time (SC-001) - Hooks configured with staleTime, cached data returns immediately
- [X] T064 Manual test: Verify no useState/useEffect data fetching in migrated components (SC-002) - All migrated components use TanStack Query hooks
- [X] T065 Manual test: Verify offline viewing with cached data (SC-003) - AsyncStorage persister configured in persister.ts
- [X] T066 Manual test: Verify <50ms optimistic update response (SC-004) - Optimistic updates implemented in mutations
- [X] T067 Manual test: Verify 60fps during infinite scroll (SC-005) - OptimizedList with proper virtualization settings
- [X] T068 Update quickstart.md with any implementation notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-8 (User Stories)**: All depend on Phase 2 completion
- **Phase 9 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Can Start After | Notes |
|-------|-----------------|-------|
| US1 (Achievements/Badges) | Phase 2 | Independent, no story dependencies |
| US2 (Quest Progress) | Phase 2 | Independent, may share patterns with US1 |
| US3 (Admin Dashboard) | Phase 2 | Independent |
| US4 (Analytics) | Phase 2 | Independent |
| US5 (Social Feed) | Phase 2 | Independent |
| US6 (Groups) | Phase 2 | Independent |

### Parallel Opportunities

**Phase 1**: T002, T003 can run in parallel with T001

**Phase 2**: All tasks T004-T014 can run in parallel (different files)

**Within User Stories**:
- US1: T018, T022, T024 can run in parallel with their counterparts
- US5: T045 (PostCard) can run in parallel with T042-T044 (SocialFeed)
- US6: T051 (GroupDetail) can run in parallel with T050 (GroupList)

**Phase 9**: All verification tasks T056-T061 can run in parallel

---

## Parallel Example: Phase 2 Hook Creation

```bash
# All foundational hooks can be created in parallel
# (different files, same pattern, no dependencies between them)

# Developer 1: Achievements & Badges
T004: useAchievements.ts
T005: useBadges.ts (useUserBadges)
T006: useBadges.ts (useBadges)

# Developer 2: Quests
T007: useQuests.ts (useQuestProgress)
T008: useQuestMutations.ts

# Developer 3: Admin & Analytics
T009: useAdmin.ts
T010: useAnalytics.ts (useEngagementChart)

# Developer 4: Social & Groups
T011: useSocialFeed.ts
T012: useSocialMutations.ts
T013-T014: useGroups.ts
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Recommended MVP**: Complete through User Story 2 (Phases 1-4)
- Delivers core gamification features (achievements, badges, quests)
- Establishes patterns for remaining migrations
- ~31 tasks (T001-T031)

### Full Scope

All 68 tasks across 9 phases:
- Phase 1: 3 tasks
- Phase 2: 13 tasks
- Phase 3 (US1): 9 tasks
- Phase 4 (US2): 6 tasks
- Phase 5 (US3): 5 tasks
- Phase 6 (US4): 5 tasks
- Phase 7 (US5): 8 tasks
- Phase 8 (US6): 6 tasks
- Phase 9: 13 tasks

### Incremental Delivery

Each user story phase can be merged independently:
1. Merge Phases 1-2 (setup + hooks) - enables all component work
2. Merge Phase 3 (US1) - achievements/badges live
3. Merge Phase 4 (US2) - quest optimistic updates live
4. Merge Phase 5 (US3) - admin dashboard live
5. Merge Phase 6 (US4) - analytics charts live
6. Merge Phase 7 (US5) - social feed live
7. Merge Phase 8 (US6) - groups live
8. Merge Phase 9 - final polish
