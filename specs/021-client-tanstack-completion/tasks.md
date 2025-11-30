# Tasks: Complete TanStack Query Component Integration

**Input**: Design documents from `/specs/021-client-tanstack-completion/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Manual testing checklist per component (per FR-014 and quickstart.md)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4, US5)
- Exact file paths included in descriptions

## Path Conventions

- **Client**: `client/components/`, `client/core/`, `client/app/`
- **Shared Components**: `client/components/shared/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extract shared utilities and prepare for component migrations

- [X] T001 [P] Extract shared OfflineIndicator component to `client/components/shared/OfflineIndicator.tsx`
- [X] T002 [P] Export OfflineIndicator from `client/components/shared/index.ts`
- [X] T003 [P] Add useDebouncedCallback utility to `client/core/hooks/useDebounce.ts` (for 300ms mutation debounce)
- [X] T004 Export useDebouncedCallback from `client/core/hooks/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify hooks and exports are ready for component integration

**⚠️ CRITICAL**: Verify these before starting user story migrations

- [X] T005 Verify `useTransaction` hook exports from `client/core/hooks/queries/useTransactions.ts`
- [X] T006 [P] Verify `useMarketplaceProperty` hook exports from `client/core/hooks/queries/useMarketplace.ts`
- [X] T007 [P] Verify `useMarketplaceClassified` hook exports from `client/core/hooks/queries/useMarketplace.ts`
- [X] T008 [P] Verify `useNotificationSettings` hook exports from `client/core/hooks/queries/useNotificationSettings.ts`
- [X] T009 [P] Verify `useUpdateNotificationSettings` mutation exports from `client/core/hooks/queries/useNotificationSettings.ts`
- [X] T010 Export all required hooks from `client/core/hooks/queries/index.ts` barrel file
- [X] T011 Export all required hooks from `client/core/index.ts` main barrel file

**Checkpoint**: All hooks accessible via `@/core` imports ✅

---

## Phase 3: User Story 1 - Instant Transaction History (Priority: P1) 🎯 MVP

**Goal**: TransactionDetail displays instantly from cache, supports offline viewing

**Independent Test**: Open transaction detail → navigate away → return → data appears in <100ms

### Implementation for User Story 1

- [X] T012 [US1] Replace useState/useEffect with `useTransaction` hook in `client/components/pages/transactions/TransactionDetail.tsx`
- [X] T013 [US1] Add OfflineIndicator component to TransactionDetail in `client/components/pages/transactions/TransactionDetail.tsx`
- [X] T014 [US1] Update loading state to show only on initial load (when no cached data) in `client/components/pages/transactions/TransactionDetail.tsx`
- [X] T015 [US1] Update error state to show retry button using `refetch` in `client/components/pages/transactions/TransactionDetail.tsx`
- [X] T016 [US1] Add subtle background refetch indicator (isRefetching) in `client/components/pages/transactions/TransactionDetail.tsx`
- [X] T017 [US1] Verify TransactionDetail types match `useTransaction` return types in `client/components/pages/transactions/TransactionDetail.tsx`

**Checkpoint**: TransactionDetail fully migrated ✅ - test per quickstart.md checklist

---

## Phase 4: User Story 2 - Fast Marketplace Browsing (Priority: P1)

**Goal**: MarketplaceDetail displays instantly from cache for both properties and classifieds

**Independent Test**: View property detail → navigate away → return → data appears in <100ms

### Implementation for User Story 2

- [X] T018 [US2] Replace useState/useEffect with `useMarketplaceProperty` hook for property type in `client/components/pages/marketplace/MarketplaceDetail.tsx`
- [X] T019 [US2] Add `useMarketplaceClassified` hook for classified type in `client/components/pages/marketplace/MarketplaceDetail.tsx`
- [X] T020 [US2] Implement conditional hook usage based on `type` prop in `client/components/pages/marketplace/MarketplaceDetail.tsx`
- [X] T021 [US2] Add OfflineIndicator component to MarketplaceDetail in `client/components/pages/marketplace/MarketplaceDetail.tsx`
- [X] T022 [US2] Update loading state to show only on initial load in `client/components/pages/marketplace/MarketplaceDetail.tsx`
- [X] T023 [US2] Update error state to show retry button using `refetch` in `client/components/pages/marketplace/MarketplaceDetail.tsx`
- [X] T024 [US2] Add subtle background refetch indicator in `client/components/pages/marketplace/MarketplaceDetail.tsx`
- [X] T025 [US2] Remove manual loadItem async function in `client/components/pages/marketplace/MarketplaceDetail.tsx`

**Checkpoint**: MarketplaceDetail fully migrated ✅ - test per quickstart.md checklist

---

## Phase 5: User Story 3 - Responsive Settings Updates (Priority: P2)

**Goal**: Notification settings toggles respond instantly with optimistic updates

**Independent Test**: Toggle setting → UI updates immediately → server confirms (or reverts on error)

### Implementation for User Story 3

- [X] T026 [US3] Replace useState with `useNotificationSettings` query hook in `client/components/pages/settings/NotificationSettings.tsx`
- [X] T027 [US3] Add `useUpdateNotificationSettings` mutation hook in `client/components/pages/settings/NotificationSettings.tsx`
- [X] T028 [US3] Implement 300ms debounced toggle handlers using `useDebouncedCallback` in `client/components/pages/settings/NotificationSettings.tsx`
- [X] T029 [US3] Connect Switch components to mutation with optimistic updates in `client/components/pages/settings/NotificationSettings.tsx`
- [X] T030 [US3] Add loading state indicator during initial settings fetch in `client/components/pages/settings/NotificationSettings.tsx`
- [X] T031 [US3] Add error toast display on mutation failure in `client/components/pages/settings/NotificationSettings.tsx`
- [X] T032 [US3] Add isPending indicator on toggles during mutation in `client/components/pages/settings/NotificationSettings.tsx`

**Checkpoint**: NotificationSettings fully migrated - test per quickstart.md checklist

---

## Phase 6: User Story 4 - Certificate Display with Cache (Priority: P2)

**Goal**: Verify CertificateList already uses useCertificates correctly

**Independent Test**: View certificates → navigate away → return → data appears instantly

### Verification for User Story 4

- [X] T033 [US4] Verify CertificateList uses `useCertificates` hook correctly in `client/components/pages/learning/CertificateList.tsx`
- [X] T034 [US4] Verify OfflineIndicator is present in CertificateList in `client/components/pages/learning/CertificateList.tsx`
- [X] T035 [US4] Verify pull-to-refresh uses `refetch` in CertificateList in `client/components/pages/learning/CertificateList.tsx`

**Checkpoint**: CertificateList verified - no migration needed (already migrated in spec 020)

---

## Phase 7: User Story 5 - Seamless Infinite Scrolling (Priority: P3)

**Goal**: Verify infinite scroll components use TanStack Query correctly

**Independent Test**: Scroll followers list → new items load automatically → scroll back → items persist

### Verification for User Story 5

- [X] T036 [US5] Verify TransactionList uses `useInfiniteTransactions` in `client/components/pages/transactions/TransactionList.tsx`
- [X] T037 [US5] Verify MarketplaceList uses `useInfiniteMarketplace*` hooks in `client/components/pages/marketplace/MarketplaceList.tsx`
- [X] T038 [US5] Verify FollowLists uses `useFollowers`/`useFollowing` hooks in `client/components/shared/FollowLists.tsx`

**Checkpoint**: All infinite scroll components verified

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [X] T039 [P] Remove duplicate OfflineIndicator implementations from TransactionList, MarketplaceList, FollowLists, CertificateList (use shared component)
- [X] T040 [P] Update imports in migrated components to use shared OfflineIndicator
- [ ] T041 Run full quickstart.md testing checklist for TransactionDetail
- [ ] T042 Run full quickstart.md testing checklist for MarketplaceDetail
- [ ] T043 Run full quickstart.md testing checklist for NotificationSettings
- [X] T044 Verify no useState/useEffect data fetching patterns remain in migrated components (SC-002)
- [ ] T045 Verify <100ms cached load times across all migrated screens (SC-001)
- [X] T046 Update component documentation comments to reflect TanStack Query usage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority - can proceed in parallel
  - US3 and US4 are P2 priority - can proceed after US1/US2 or in parallel
  - US5 is P3 priority - verification only
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - uses useTransaction
- **User Story 2 (P1)**: No dependencies on other stories - uses useMarketplaceProperty/useMarketplaceClassified
- **User Story 3 (P2)**: No dependencies - uses useNotificationSettings + useUpdateNotificationSettings
- **User Story 4 (P2)**: Verification only - already migrated
- **User Story 5 (P3)**: Verification only - already migrated

### Within Each User Story

- Hook import/verification before component changes
- State replacement before UI updates
- Error handling before loading states
- Test checklist after all tasks complete

### Parallel Opportunities

- T001, T002, T003 can run in parallel (different files)
- T005-T009 can run in parallel (verification only)
- US1 and US2 can run in parallel (different components)
- US3 and US4 can run in parallel after US1/US2
- T039, T040 can run in parallel (different files)
- T041, T042, T043 can run in parallel (independent tests)

---

## Parallel Example: User Story 1 + User Story 2

```bash
# After Foundational phase completes:

# Developer A - User Story 1 (TransactionDetail):
T012 → T013 → T014 → T015 → T016 → T017 → Test Checklist

# Developer B - User Story 2 (MarketplaceDetail):
T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025 → Test Checklist

# Both can work simultaneously since they modify different files
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T011)
3. Complete Phase 3: User Story 1 (T012-T017)
4. **STOP and VALIDATE**: Run quickstart.md checklist for TransactionDetail
5. TransactionDetail now has instant caching, offline support

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. User Story 1 → TransactionDetail migrated → Test
3. User Story 2 → MarketplaceDetail migrated → Test
4. User Story 3 → NotificationSettings migrated → Test
5. User Story 4, 5 → Verification only
6. Polish → Cleanup duplicates, final validation

### Full Feature Completion

Complete all phases → All 3 components migrated, verified, tested

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- US4 and US5 are verification-only (components already migrated in spec 020)
- Commit after each task or logical group
- Run quickstart.md checklist at each checkpoint
- Total new tasks: 46
- Tasks requiring actual code changes: ~25
- Tasks that are verification only: ~10
- Tasks that are testing/polish: ~11
