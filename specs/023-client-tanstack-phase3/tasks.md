# Tasks: Client TanStack Query Migration Phase 3

**Input**: Design documents from `/specs/023-client-tanstack-phase3/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested - test tasks omitted per specification.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Route-based grouping (US1=Achievements, US2=Badges, US3=Quests, US4=Dashboard, US5=Learning, US6=Remaining)
  - *Note*: These map to spec user stories via acceptance scenarios (e.g., spec US1 "View Pages Offline" is validated across all route migrations)
- All paths relative to `client/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure stale times and query constants per clarified requirements

- [X] T001 Update stale time constants with tiered configuration in client/core/query/constants.ts
- [X] T002 [P] Add STALE_TIMES type definitions in client/core/types/query.types.ts
- [X] T003 [P] Update QueryClient default options with retry configuration in client/core/query/client.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shared hooks and components required by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create useQuestMutations hook with optimistic updates in client/core/hooks/mutations/useQuestMutations.ts
- [X] T005 [P] Create useMarketplaceMutations hook with optimistic updates in client/core/hooks/mutations/useMarketplaceMutations.ts
- [X] T006 [P] Verify OfflineIndicator component exists and functions correctly; create if missing in client/components/shared/OfflineIndicator.tsx
- [X] T007 [P] Verify ErrorState component exists with retry functionality; create if missing in client/components/shared/ErrorState.tsx
- [X] T008 [P] Verify StaleDataIndicator component exists; create if missing in client/components/shared/StaleDataIndicator.tsx
- [X] T009 Export new mutation hooks from client/core/hooks/index.ts
- [X] T010 Export shared components from client/components/shared/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Achievement Page (Priority: P1) 🎯 MVP

**Goal**: Replace useState/useEffect with TanStack Query in achievements route

**Independent Test**: Navigate to Achievements page, verify list loads, pull-to-refresh works, offline indicator shows when disconnected

### Implementation for User Story 1

- [X] T011 [US1] Analyze current achievements.tsx to identify all useState/useEffect patterns in client/app/achievements.tsx
- [X] T012 [US1] Remove useState/useEffect for achievements data, replace with AchievementsList component in client/app/achievements.tsx
- [X] T013 [US1] Add OfflineIndicator to achievements page in client/app/achievements.tsx
- [X] T014 [US1] Verify useAchievements hook uses correct stale time (2 minutes) in client/core/hooks/queries/useAchievements.ts
- [X] T015 [US1] Add error boundary wrapper to achievements page in client/app/achievements.tsx

**Checkpoint**: Achievements page migrated and independently testable

---

## Phase 4: User Story 2 - Badge Page (Priority: P1) 🎯 MVP

**Goal**: Replace useState/useEffect with TanStack Query in badges route

**Independent Test**: Navigate to Badges page, verify list loads, pull-to-refresh works, stale indicator shows for data > 5min old

### Implementation for User Story 2

- [X] T016 [US2] Analyze current badges.tsx to identify all useState/useEffect patterns in client/app/badges.tsx
- [X] T017 [US2] Remove useState/useEffect for badges data, replace with BadgesList component in client/app/badges.tsx
- [X] T018 [US2] Add OfflineIndicator to badges page in client/app/badges.tsx
- [X] T019 [US2] Verify useBadges hook uses correct stale time (5 minutes) in client/core/hooks/queries/useBadges.ts
- [X] T020 [US2] Add error boundary wrapper to badges page in client/app/badges.tsx

**Checkpoint**: Badges page migrated and independently testable

---

## Phase 5: User Story 3 - Quest Page with Mutations (Priority: P1)

**Goal**: Complete migration of quests route and add quest action mutations

**Independent Test**: Navigate to Quests page, verify list loads, start/complete/abandon quest actions work with optimistic updates, rollback on error

### Implementation for User Story 3

- [X] T021 [US3] Analyze current quests.tsx to identify remaining useState/useEffect patterns in client/app/quests.tsx
- [X] T022 [US3] Remove remaining useState/useEffect for quest data in client/app/quests.tsx
- [X] T023 [US3] Integrate useQuestMutations hook for start/complete/abandon actions in client/app/quests.tsx
- [X] T024 [US3] Add OfflineIndicator to quests page in client/app/quests.tsx
- [X] T025 [US3] Verify useQuests hook uses correct stale time (2 minutes) in client/core/hooks/queries/useQuests.ts
- [X] T026 [US3] Add offline-aware mutation blocking for quest actions in client/app/quests.tsx
- [X] T027 [US3] Add error boundary wrapper to quests page in client/app/quests.tsx

**Checkpoint**: Quests page fully migrated with mutation support

---

## Phase 6: User Story 4 - Dashboard Integration (Priority: P2)

**Goal**: Verify and complete dashboard hook integration across all sub-components

**Independent Test**: Navigate to Dashboard, verify stats load, recent activity shows, quick actions work, all sections use TanStack Query

### Implementation for User Story 4

- [X] T028 [US4] Audit dashboard.tsx for any remaining useState/useEffect patterns in client/app/dashboard.tsx
- [X] T029 [P] [US4] Verify StatsCards component uses useDashboardStats hook in client/components/pages/dashboard/StatsCards.tsx
- [X] T030 [P] [US4] Verify RecentActivity component uses appropriate query hook in client/components/pages/dashboard/RecentActivity.tsx
- [X] T031 [P] [US4] Verify QuickActions component integrates with mutation hooks in client/components/pages/dashboard/QuickActions.tsx
- [X] T032 [US4] Add OfflineIndicator to dashboard page in client/app/dashboard.tsx
- [X] T033 [US4] Verify useDashboardStats hook uses correct stale time (30 seconds) in client/core/hooks/queries/useDashboard.ts
- [X] T034 [US4] Add error boundary wrapper to dashboard page in client/app/dashboard.tsx

**Checkpoint**: Dashboard fully verified with TanStack Query integration

---

## Phase 7: User Story 5 - Learning Page Integration (Priority: P2)

**Goal**: Verify and complete learning route hook integration

**Independent Test**: Navigate to Learning page, verify courses load, progress tracking works, offline indicator shows

### Implementation for User Story 5

- [X] T035 [US5] Audit learning.tsx for any remaining useState/useEffect patterns in client/app/learning.tsx
- [X] T036 [US5] Ensure learning page uses useCourses or appropriate TanStack Query hook in client/app/learning.tsx
- [X] T037 [US5] Add OfflineIndicator to learning page in client/app/learning.tsx
- [X] T038 [US5] Verify useCourses hook uses correct stale time (5 minutes) in client/core/hooks/queries/useCourses.ts
- [X] T039 [US5] Add error boundary wrapper to learning page in client/app/learning.tsx

**Checkpoint**: Learning page fully verified with TanStack Query integration

---

## Phase 8: User Story 6 - Remaining Routes Verification (Priority: P2)

**Goal**: Ensure marketplace, notifications, and transactions routes are fully migrated

**Independent Test**: Navigate to each page, verify infinite scroll works, offline indicators show, no useState/useEffect for data fetching

### Implementation for User Story 6

- [X] T040 [P] [US6] Verify marketplace.tsx uses MarketplaceList with TanStack Query in client/app/marketplace.tsx
- [X] T041 [P] [US6] Verify notifications.tsx uses NotificationList with TanStack Query in client/app/notifications.tsx
- [X] T042 [P] [US6] Verify transactions.tsx uses TransactionList with TanStack Query in client/app/transactions.tsx
- [X] T043 [US6] Add OfflineIndicator to marketplace page if missing in client/app/marketplace.tsx
- [X] T044 [US6] Add OfflineIndicator to notifications page if missing in client/app/notifications.tsx
- [X] T045 [US6] Add OfflineIndicator to transactions page if missing in client/app/transactions.tsx
- [X] T046 [US6] Verify useNotifications hook uses correct stale time (1 minute) in client/core/hooks/queries/useNotifications.ts
- [X] T047 [US6] Verify useTransactions hook uses correct stale time (1 minute) in client/core/hooks/queries/useTransactions.ts

**Checkpoint**: All data-fetching routes migrated to TanStack Query

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T048 [P] Implement prefetching for likely navigation targets (Dashboard→Quests, Dashboard→Achievements) in client/app/_layout.tsx
- [X] T049 [P] Verify abandoned queries are cancelled on navigation (TanStack Query handles automatically; confirm no memory leaks)
- [X] T050 [P] Remove any unused useState/useEffect imports across all migrated files
- [X] T051 [P] Ensure all pages have consistent error boundary wrapper pattern
- [X] T052 [P] Verify TypeScript strict mode compliance across all changes
- [X] T053 Run quickstart.md validation checklist against all migrated routes
- [X] T054 Update IMPORT_PATTERNS.md if hook import patterns changed in client/IMPORT_PATTERNS.md
- [ ] T055 Create PR with comprehensive migration summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Dependencies | Can Parallelize With |
|-------|----------|--------------|---------------------|
| US1 (Achievements) | P1 | Foundational only | US2, US4, US5, US6 |
| US2 (Badges) | P1 | Foundational only | US1, US4, US5, US6 |
| US3 (Quests) | P1 | Foundational (needs useQuestMutations) | US1, US2, US4, US5, US6 |
| US4 (Dashboard) | P2 | Foundational only | US1, US2, US3, US5, US6 |
| US5 (Learning) | P2 | Foundational only | US1, US2, US3, US4, US6 |
| US6 (Remaining) | P2 | Foundational only | US1, US2, US3, US4, US5 |

### Within Each User Story

- Audit/analyze task FIRST
- Remove useState/useEffect
- Add TanStack Query integration
- Add OfflineIndicator
- Verify stale time configuration
- Add error boundary

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T002, T003 can run in parallel
```

**Phase 2 (Foundational)**:
```
T005, T006, T007, T008 can run in parallel after T004
```

**User Stories** (after Foundational complete):
```
US1, US2, US3, US4, US5, US6 can all run in parallel
```

**Within Phase 6 (Dashboard)**:
```
T029, T030, T031 can run in parallel
```

**Within Phase 8 (Remaining)**:
```
T040, T041, T042 can run in parallel
T043, T044, T045 can run in parallel
```

**Phase 9 (Polish)**:
```
T048, T049, T050 can run in parallel
```

---

## Parallel Example: User Story 3 (Quests)

```bash
# Sequential within story (dependencies exist):
T021: Analyze current quests.tsx patterns
  ↓
T022: Remove useState/useEffect
  ↓
T023: Integrate useQuestMutations
  ↓
T024: Add OfflineIndicator
  ↓
T025: Verify stale time
  ↓
T026: Add offline-aware mutation blocking
  ↓
T027: Add error boundary
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 - Achievements (T011-T015)
4. **STOP and VALIDATE**: Test Achievements page independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Achievements) → Test → Deploy (MVP!)
3. Add US2 (Badges) → Test → Deploy
4. Add US3 (Quests with mutations) → Test → Deploy
5. Add US4, US5, US6 → Test → Deploy
6. Polish → Final validation

### Recommended Order for Single Developer

1. T001-T003 (Setup)
2. T004-T010 (Foundational)
3. T011-T015 (US1 - Achievements) - VALIDATE
4. T016-T020 (US2 - Badges) - VALIDATE
5. T021-T027 (US3 - Quests) - VALIDATE
6. T028-T034 (US4 - Dashboard) - VALIDATE
7. T035-T039 (US5 - Learning) - VALIDATE
8. T040-T047 (US6 - Remaining) - VALIDATE
9. T048-T053 (Polish)

---

## Success Criteria Mapping

| Criterion | Tasks | Validation |
|-----------|-------|------------|
| SC-001: All 9 data pages use TanStack Query | T011-T047 | No useState/useEffect for data |
| SC-002: Zero loading regressions | T011-T047 | Skeleton states show during load |
| SC-003: Offline indicators on all pages | T013,T018,T024,T032,T037,T043-T045 | Banner shows when offline |
| SC-004: Optimistic updates work | T004,T005,T023 | Instant UI feedback |
| SC-005: Rollback on mutation error | T004,T005,T023 | Original state restored |
| SC-006: Tiered stale times configured | T001,T014,T019,T025,T033,T038,T046,T047 | Correct intervals per data type |
| SC-007: TypeScript strict compliance | T002,T052 | No type errors |
| SC-008: Cache persists 24 hours | T001,T003 | gcTime = 24h |
| SC-009: 3 retry attempts | T003 | Retry config in QueryClient |
| SC-010: 20 items per page | Existing | Already configured in Phase 2 |
| FR-028: Prefetch navigation targets | T048 | Prefetch on Dashboard load |
| FR-027: Cancel abandoned queries | T049 | No memory leaks on navigation |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Most hooks already exist from Phase 2 - this phase focuses on route integration
- Verify hooks use correct stale times per clarified configuration
