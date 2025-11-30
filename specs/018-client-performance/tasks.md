# Tasks: Client Performance Optimization

**Input**: Design documents from `/specs/018-client-performance/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No tests requested - performance validation via React DevTools Profiler

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6) this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create shared infrastructure needed by multiple user stories

- [X] T001 Create ErrorState shared component in client/components/shared/ErrorState.tsx
- [X] T001a [US1] Add retry functionality to ErrorState with onRetry callback prop (FR-004: retry uses TanStack Query's refetch(), visual feedback during retry)
- [X] T002 [P] Export ErrorState from client/components/shared/index.ts
- [X] T003 [P] Verify ErrorBoundary exists at route level in client/app/_layout.tsx

**Checkpoint**: ✅ Shared error infrastructure ready

---

## Phase 2: Foundational (API Client Enhancement)

**Purpose**: Core API client changes that enable error propagation and request cancellation

**⚠️ CRITICAL**: These changes affect all user stories and must complete first

- [X] T004 Add AbortController support to apiClient in client/core/api/client.ts
- [X] T005 Add 10-second default timeout to apiClient in client/core/api/client.ts
- [X] T006 Add signal parameter passthrough to all HTTP methods in client/core/api/client.ts
- [X] T007 Update error handling to use toast for network errors in client/core/api/client.ts

**Checkpoint**: ✅ API client enhanced - user story implementation can begin

---

## Phase 3: User Story 1 - Error Transparency (Priority: P1) 🎯 MVP

**Goal**: Remove mock data fallbacks so API errors propagate to UI and are logged

**Independent Test**: Disable network → Navigate to courses page → Should see error state, not mock data

### Implementation for User Story 1

- [X] T008 [US1] Remove mock data fallback from getCourses() in client/core/api/services/courses.service.ts
- [X] T009 [US1] Remove mock data fallback from getCourse() in client/core/api/services/courses.service.ts
- [X] T010 [US1] Remove mock data fallback from getCourseLessons() in client/core/api/services/courses.service.ts
- [X] T011 [P] [US1] Remove mock data fallback from getCertificates() in client/core/api/services/certificates.service.ts
- [X] T012 [US1] Add error logging with context to courses.service.ts catch blocks
- [X] T013 [P] [US1] Add error logging with context to certificates.service.ts catch blocks
- [X] T014 [US1] Update Learning page to use ErrorState for data failures in client/app/learning.tsx

**Checkpoint**: ✅ User Story 1 complete - errors propagate correctly, no mock data returned

---

## Phase 4: User Story 2 - Smooth List Scrolling (Priority: P1)

**Goal**: Add React.memo to list components to prevent unnecessary re-renders

**Independent Test**: Open React DevTools Profiler → Scroll quest list → Verify memoized items don't re-render

### Implementation for User Story 2

- [X] T015 [P] [US2] Wrap QuestCard with React.memo in client/components/pages/quests/QuestCard.tsx
- [X] T016 [P] [US2] Add custom comparison function to QuestCard for complex props
- [X] T017 [P] [US2] Wrap MessageItem with React.memo in client/components/pages/communicate/Messages/MessageItem.tsx
- [X] T018 [P] [US2] Add custom comparison function to MessageItem for complex props
- [X] T019 [P] [US2] Wrap PostCard with React.memo in client/components/pages/communicate/Social/PostCard.tsx
- [X] T020 [P] [US2] Add custom comparison function to PostCard for complex props
- [X] T020a [P] [US2] Apply useMemo for expensive derived calculations (FR-008: list filtering/sorting in QuestList.tsx, PostList.tsx, aggregations in DashboardStats.tsx)
- [X] T021 [US2] Validate scroll performance with React DevTools Profiler

**Checkpoint**: ✅ User Story 2 complete - list scrolling maintains 55+ fps

---

## Phase 5: User Story 3 - Reliable Component Behavior (Priority: P1)

**Goal**: Fix useEffect dependency issues to prevent infinite loops and stale closures

**Independent Test**: Navigate communicate dashboard → Switch conversations → Should load once, no flicker

### Implementation for User Story 3

- [X] T022 [US3] Extract loadDashboardData to useCallback in client/components/pages/communicate/CommunicateDashboard.tsx
- [X] T023 [US3] Fix useEffect dependencies to include all used variables in CommunicateDashboard.tsx
- [X] T024 [US3] Split single useEffect into separate effects for different concerns in CommunicateDashboard.tsx
- [X] T025 [US3] Add cleanup function to prevent state updates on unmounted component
- [X] T026 [US3] Verify no React dependency warnings in console

**Checkpoint**: ✅ User Story 3 complete - effects run exactly once per change

---

## Phase 6: User Story 4 - Consistent Data Loading (Priority: P2)

**Goal**: Remove deprecated hooks, ensure all data fetching uses TanStack Query

**Independent Test**: Search codebase for useDashboardData usage → Should find 0 results

### Implementation for User Story 4

- [X] T027 [US4] Remove useDashboardData hook from client/core/hooks/queries/useDashboard.ts
- [X] T028 [US4] Verify no components import useDashboardData (grep search)
- [X] T029 [US4] Update hook exports in client/core/hooks/queries/index.ts if needed

**Checkpoint**: ✅ User Story 4 complete - deprecated hooks removed, TanStack Query only

---

## Phase 7: User Story 5 - Predictable Type Safety (Priority: P2)

**Goal**: Eliminate `any` types in target files for TypeScript strict compliance

**Independent Test**: Run `npx tsc --noEmit` → Should complete with no errors

### Implementation for User Story 5

- [X] T030 [P] [US5] Fix `(error as any).message` with type guard in client/core/utils/error.ts
- [X] T031 [P] [US5] Replace `Record<string, any>` with `Record<string, unknown>` in client/core/utils/error.ts
- [X] T032 [P] [US5] Define QuestContent interface to replace `content: any` in client/core/types/quest.ts
- [X] T033 [P] [US5] Define QuestMetadata interface to replace `metadata?: any` in client/core/types/quest.ts
- [X] T034 [P] [US5] Fix debounce function generic types in client/core/utils/common.ts
- [X] T035 [P] [US5] Fix throttle function generic types in client/core/utils/common.ts
- [X] T036 [P] [US5] Define ThemeColors type to replace `any` in client/core/types/index.ts
- [X] T037 [P] [US5] Fix theme object types with proper ColorValue in client/core/types/index.ts
- [X] T038 [P] [US5] Fix SelectOption generic default from `any` to `string` in client/core/types/components.ts
- [X] T039 [P] [US5] Fix FormField value/onChange types in client/core/types/components.ts
- [X] T040 [US5] Run TypeScript check to verify no `any` type errors

**Checkpoint**: ✅ User Story 5 complete - TypeScript compilation passes with strict mode

---

## Phase 8: User Story 6 - Cancellable Requests (Priority: P3)

**Goal**: Requests are cancelled when components unmount to prevent race conditions

**Independent Test**: Open network tab → Navigate away quickly → Verify pending requests cancelled

### Implementation for User Story 6

- [X] T041 [US6] Update TanStack Query hooks to pass signal to API calls in client/core/hooks/queries/
- [X] T042 [US6] Update courses service methods to accept AbortSignal in client/core/api/services/courses.service.ts
- [X] T043 [P] [US6] Update certificates service methods to accept AbortSignal in client/core/api/services/certificates.service.ts
- [X] T044 [US6] Verify mutations (POST/PUT/DELETE) are NOT cancelled
- [X] T045 [US6] Test request cancellation on quick navigation

**Checkpoint**: ✅ User Story 6 complete - requests cancel within 100ms of unmount

---

## Phase 9: Polish & Verification

**Purpose**: Final validation across all user stories

- [X] T046 Run `npx tsc --noEmit` to verify no TypeScript errors
- [X] T047 [P] Run `npm run dev` to verify app starts without errors
- [X] T048 Validate ErrorState displays correctly when API fails
- [X] T049 [P] Validate toast appears for network errors
- [X] T050 Validate list scrolling with React DevTools Profiler
- [X] T051 [P] Search for remaining `any` types in target files (grep)
- [X] T052 [P] Search for remaining mock data patterns (grep)
- [X] T053 Run quickstart.md validation checklist

**Checkpoint**: ✅ All user stories verified and working

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────────────────────────────────────────────┐
│ User Stories can proceed in parallel OR in priority order │
├───────────────────────────────────────────────────────────┤
│ Phase 3: US1 - Error Transparency (P1) 🎯 MVP             │
│ Phase 4: US2 - Smooth List Scrolling (P1)                 │
│ Phase 5: US3 - Reliable Component Behavior (P1)           │
│ Phase 6: US4 - Consistent Data Loading (P2)               │
│ Phase 7: US5 - Predictable Type Safety (P2)               │
│ Phase 8: US6 - Cancellable Requests (P3)                  │
└───────────────────────────────────────────────────────────┘
    ↓
Phase 9 (Polish)
```

### User Story Independence

| Story | Can Start After | Dependencies on Other Stories |
|-------|-----------------|-------------------------------|
| US1 | Phase 2 | None - fully independent |
| US2 | Phase 2 | None - fully independent |
| US3 | Phase 2 | None - fully independent |
| US4 | Phase 2 | None - fully independent |
| US5 | Phase 2 | None - fully independent |
| US6 | Phase 2 | US1 (services already updated) |

### Parallel Opportunities per Phase

**Phase 1**: T001, T002, T003 can run in parallel
**Phase 2**: T004-T007 are sequential (same file)
**Phase 3**: T008-T010 sequential, T011 parallel, T012-T013 parallel
**Phase 4**: T015-T020 ALL parallel (different files)
**Phase 5**: T030-T039 ALL parallel (different files)
**Phase 8**: T042-T043 parallel

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007)
3. Complete Phase 3: US1 - Error Transparency (T008-T014)
4. **VALIDATE**: Test error propagation works
5. Complete Phase 4: US2 - Smooth Scrolling (T015-T021)
6. **VALIDATE**: Test scroll performance
7. Complete Phase 5: US3 - Reliable Behavior (T022-T026)
8. **VALIDATE**: Test useEffect correctness
9. **MVP COMPLETE** - Core optimizations deployed

### Full Feature Delivery

10. Complete Phase 6: US4 - Data Loading (T027-T029)
11. Complete Phase 7: US5 - Type Safety (T030-T040)
12. Complete Phase 8: US6 - Cancellable Requests (T041-T045)
13. Complete Phase 9: Polish (T046-T053)
14. **FEATURE COMPLETE**

---

## Summary

| Phase | Tasks | Parallel | Description |
|-------|-------|----------|-------------|
| Setup | 4 | 2 | ErrorState component + retry, exports |
| Foundational | 4 | 0 | API client enhancements |
| US1 (P1) | 7 | 3 | Error transparency |
| US2 (P1) | 8 | 7 | List scrolling + useMemo |
| US3 (P1) | 5 | 0 | useEffect fixes |
| US4 (P2) | 3 | 0 | Deprecated hook removal |
| US5 (P2) | 11 | 10 | Type safety |
| US6 (P3) | 5 | 1 | Request cancellation |
| Polish | 8 | 5 | Verification |
| **Total** | **55** | **28** | |

**Parallel Opportunities**: 28 tasks (51%) can run in parallel with others
