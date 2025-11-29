# Tasks: Client TanStack Query Migration

**Input**: Design documents from `/specs/020-client-tanstack-query-migration/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in this specification. Tasks focus on implementation only.

**Organization**: Tasks are grouped by user story (US1-US5) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend existing TanStack Query infrastructure with new query keys, stale times, and types

- [ ] T001 [P] Add transaction types (Transaction, TransactionFilters, TransactionsResponse) to client/core/types/query.types.ts
- [ ] T002 [P] Add marketplace types (Property, ClassifiedAd, PropertyFilters, ClassifiedFilters) to client/core/types/query.types.ts
- [ ] T003 [P] Add certificate types (Certificate, CertificateFilters) to client/core/types/query.types.ts
- [ ] T004 [P] Add notification settings types (NotificationSettings, UpdateNotificationSettingsInput) to client/core/types/query.types.ts
- [ ] T005 Add new stale times (TRANSACTIONS: 1min, MARKETPLACE: 5min, CERTIFICATES: 5min, NOTIFICATION_SETTINGS: 5min) to client/core/query/constants.ts
- [ ] T006 Add transaction query keys factory to client/core/query/keys.ts
- [ ] T007 Add marketplace query keys factory (properties, classifieds) to client/core/query/keys.ts
- [ ] T008 Add certificates query keys factory to client/core/query/keys.ts
- [ ] T009 Add notificationSettings query keys factory to client/core/query/keys.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shared utilities needed by multiple user stories

**⚠️ CRITICAL**: User story work requires these foundational hooks to exist first

- [ ] T010 Create useInfiniteScrollList generic hook utility in client/core/hooks/queries/useInfiniteScrollList.ts
- [ ] T011 Add dev-only cache logging extension to client/core/query/cacheMonitor.ts per FR-014
- [ ] T012 Export new types from client/core/types/index.ts
- [ ] T013 Export query key additions from client/core/query/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Transaction History with Offline Access (Priority: P1) 🎯 MVP

**Goal**: Migrate transactions from useState/useEffect to TanStack Query with caching, offline support, and instant display

**Independent Test**: Navigate to Transactions screen - cached data displays immediately. Enable airplane mode, navigate away and back - transactions visible with offline indicator.

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create useTransactions hook in client/core/hooks/queries/useTransactions.ts
- [ ] T015 [P] [US1] Create useTransaction (single item) hook in client/core/hooks/queries/useTransactions.ts
- [ ] T016 [P] [US1] Create useInfiniteTransactions hook in client/core/hooks/queries/useTransactions.ts
- [ ] T017 [US1] Export transaction hooks from client/core/hooks/queries/index.ts
- [ ] T018 [US1] Migrate client/app/transactions.tsx from useState/useEffect to useTransactions hook
- [ ] T019 [US1] Migrate client/components/pages/transactions/TransactionList.tsx to use useInfiniteTransactions
- [ ] T020 [US1] Add offline indicator component for stale data display in TransactionList.tsx
- [ ] T021 [US1] Add pull-to-refresh support using refetch in TransactionList.tsx

**Checkpoint**: User Story 1 complete - Transactions screen works with caching, offline support, and instant display

---

## Phase 4: User Story 2 - Marketplace Browsing with Instant Navigation (Priority: P1)

**Goal**: Migrate marketplace from useState/useEffect to TanStack Query with caching and detail prefetching

**Independent Test**: Browse marketplace, view item detail, go back, view same item - second view instant from cache. List maintains scroll position.

### Implementation for User Story 2

- [ ] T022 [P] [US2] Create useMarketplaceProperties hook in client/core/hooks/queries/useMarketplace.ts
- [ ] T023 [P] [US2] Create useMarketplaceProperty (single item) hook in client/core/hooks/queries/useMarketplace.ts
- [ ] T024 [P] [US2] Create useInfiniteMarketplaceProperties hook in client/core/hooks/queries/useMarketplace.ts
- [ ] T025 [P] [US2] Create useMarketplaceClassifieds hook in client/core/hooks/queries/useMarketplace.ts
- [ ] T026 [P] [US2] Create useMarketplaceClassified (single item) hook in client/core/hooks/queries/useMarketplace.ts
- [ ] T027 [P] [US2] Create useInfiniteMarketplaceClassifieds hook in client/core/hooks/queries/useMarketplace.ts
- [ ] T028 [US2] Export marketplace hooks from client/core/hooks/queries/index.ts
- [ ] T029 [US2] Migrate client/app/marketplace.tsx from useState/useEffect to marketplace hooks
- [ ] T030 [US2] Migrate client/components/pages/marketplace/MarketplaceList.tsx to use infinite query hooks
- [ ] T031 [US2] Add offline indicator for stale marketplace data display in MarketplaceList.tsx
- [ ] T032 [US2] Add pull-to-refresh support using refetch in MarketplaceList.tsx

**Checkpoint**: User Story 2 complete - Marketplace works with caching, offline support, and instant navigation

---

## Phase 5: User Story 3 - Certificate Display with Prefetching (Priority: P2)

**Goal**: Migrate certificates from deprecated hook to TanStack Query with prefetching on long-press

**Independent Test**: Navigate to certificates - instant display from cache. Long-press certificate card, tap to view detail - instant display (prefetched).

### Implementation for User Story 3

- [ ] T033 [P] [US3] Create useCertificates hook in client/core/hooks/queries/useCertificates.ts
- [ ] T034 [P] [US3] Create useCertificate (single item) hook in client/core/hooks/queries/useCertificates.ts
- [ ] T035 [P] [US3] Create usePrefetchCertificate hook in client/core/hooks/queries/useCertificates.ts
- [ ] T036 [US3] Export certificate hooks from client/core/hooks/queries/index.ts
- [ ] T037 [US3] Migrate client/components/pages/learning/CertificateCard.tsx to use useCertificates and prefetch
- [ ] T038 [US3] Add onLongPress prefetch handler to CertificateCard.tsx
- [ ] T039 [US3] Add offline indicator for stale certificate data display

**Checkpoint**: User Story 3 complete - Certificates display instantly with prefetching on user intent

---

## Phase 6: User Story 4 - Notification Settings with Optimistic Updates (Priority: P2)

**Goal**: Implement notification settings with optimistic UI updates and rollback on error

**Independent Test**: Toggle notification setting - UI updates immediately. Simulate server failure - UI reverts with error toast.

### Implementation for User Story 4

- [ ] T040 [P] [US4] Create useNotificationSettings query hook in client/core/hooks/queries/useNotificationSettings.ts
- [ ] T041 [P] [US4] Create useUpdateNotificationSettings mutation hook with optimistic update in client/core/hooks/mutations/useNotificationSettingsMutations.ts
- [ ] T042 [US4] Export notification settings hooks from client/core/hooks/queries/index.ts
- [ ] T043 [US4] Export notification settings mutation from client/core/hooks/mutations/index.ts
- [ ] T044 [US4] Migrate client/app/notifications.tsx settings section to use useNotificationSettings
- [ ] T045 [US4] Implement optimistic toggle with rollback on error in notifications.tsx
- [ ] T046 [US4] Add toast notification for sync failures per FR-013
- [ ] T047 [US4] Add offline queue support for notification setting mutations

**Checkpoint**: User Story 4 complete - Notification settings update instantly with proper error handling

---

## Phase 7: User Story 5 - Infinite Scroll Lists with Seamless Loading (Priority: P2)

**Goal**: Enhance InfiniteScrollList and FollowLists components with TanStack Query infinite queries

**Independent Test**: Scroll through followers list - new items load automatically. Scroll back up - all items remain visible, no re-fetching.

### Implementation for User Story 5

- [ ] T048 [P] [US5] Create useFollowers infinite query hook in client/core/hooks/queries/useSocial.ts (extend existing)
- [ ] T049 [P] [US5] Create useFollowing infinite query hook in client/core/hooks/queries/useSocial.ts (extend existing)
- [ ] T050 [US5] Export new social hooks from client/core/hooks/queries/index.ts
- [ ] T051 [US5] Enhance client/components/shared/InfiniteScrollList.tsx with FlashList and useInfiniteQuery integration
- [ ] T052 [US5] Migrate client/components/shared/FollowLists.tsx to use useFollowers/useFollowing hooks
- [ ] T053 [US5] Add automatic page loading on scroll threshold in InfiniteScrollList.tsx
- [ ] T054 [US5] Implement cursor-based pagination in useInfiniteScrollList to prevent duplicate/missing items per Edge Case 3
- [ ] T055 [US5] Add per-page retry button for failed page loads in InfiniteScrollList.tsx

**Checkpoint**: User Story 5 complete - Infinite scroll works seamlessly with automatic page loading

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T056 [P] Verify all hooks follow patterns in core/hooks/queries/useSocial.ts (check: return types, error handling, staleTime config)
- [ ] T057 [P] Ensure consistent error handling across all new hooks
- [ ] T058 [P] Update client/core/hooks/index.ts to export all new hooks
- [ ] T059 Run quickstart.md validation steps to verify all migrations work
- [ ] T060 [P] Add JSDoc comments to all new hook exports
- [ ] T061 Remove deprecated useState/useEffect patterns from migrated components

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 (P1) can proceed in parallel
  - US3, US4, US5 (P2) can proceed in parallel after P1 if desired
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Uses useInfiniteScrollList from Phase 2

### Within Each User Story

- Hook creation tasks [P] can run in parallel (different files)
- Export tasks depend on hook creation
- Migration tasks depend on hooks being exported
- Component enhancements depend on migration completion

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All hook creation tasks within a story marked [P] can run in parallel
- P1 stories (US1, US2) can run in parallel
- P2 stories (US3, US4, US5) can run in parallel
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all hook creation for User Story 1 together:
Task: "Create useTransactions hook in client/core/hooks/queries/useTransactions.ts"
Task: "Create useTransaction (single item) hook in client/core/hooks/queries/useTransactions.ts"
Task: "Create useInfiniteTransactions hook in client/core/hooks/queries/useTransactions.ts"

# Then sequentially:
Task: "Export transaction hooks from client/core/hooks/queries/index.ts"
Task: "Migrate client/app/transactions.tsx from useState/useEffect to useTransactions hook"
```

## Parallel Example: P1 Stories Together

```bash
# After Phase 2 completion, launch US1 and US2 in parallel:

# US1 team:
Task: "Create useTransactions hook..."
Task: "Migrate transactions.tsx..."

# US2 team:
Task: "Create useMarketplaceProperties hook..."
Task: "Migrate marketplace.tsx..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types, constants, keys)
2. Complete Phase 2: Foundational (shared utilities)
3. Complete Phase 3: User Story 1 (Transactions)
4. **STOP and VALIDATE**: Test transactions screen independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Marketplace)
4. Add User Stories 3-5 → Test independently → Deploy/Demo (Certificates, Settings, Lists)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Transactions)
   - Developer B: User Story 2 (Marketplace)
3. Once P1 complete:
   - Developer A: User Story 3 (Certificates)
   - Developer B: User Story 4 (Notification Settings)
   - Developer C: User Story 5 (Infinite Scroll)
4. Stories complete and integrate independently

---

## Success Criteria Mapping

| Success Criteria | Tasks |
|------------------|-------|
| SC-001: <100ms cached display | T018, T019, T029, T030, T037, T044, T051, T052 |
| SC-002: Zero requests in stale time | T005 (stale times), all query hooks |
| SC-003: Offline functionality | T020, T031, T039, T047 |
| SC-004: 50% boilerplate reduction | T018, T019, T029, T030, T037, T044, T051, T052, T061 |
| SC-005: <50ms optimistic updates | T041, T045, T046 |
| SC-006: 60fps infinite scroll | T051, T053, T054, T055 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests not included (not explicitly requested in specification)
- Follow existing patterns in core/hooks/queries/useSocial.ts

### Implicit Coverage (No Explicit Tasks Required)

- **FR-003** (AsyncStorage persistence): Already configured via `@tanstack/query-async-storage-persister` in `core/query/persister.ts`
- **FR-004** (Request deduplication): Automatic TanStack Query behavior within stale time window
- **FR-006** (Loading skeletons): Use existing skeleton components from `components/shared/` or create inline
