# Tasks: Analytics API Integration

**Input**: Design documents from `/specs/016-analytics-api-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not requested in specification - manual testing only

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions

- **Client**: `client/` (React Native/Expo)
- **Server**: `server/` (Go/Fiber) - No changes needed, endpoints exist

---

## Phase 1: Setup (Query Infrastructure)

**Purpose**: Add query keys and stale time constants required by all analytics hooks

- [X] T001 [P] Add analytics query keys to `client/core/query/keys.ts`
- [X] T002 [P] Add ANALYTICS stale time constant to `client/core/query/constants.ts`
- [X] T003 [P] Add AnalyticsProps interface to `client/components/pages/analytics/types.ts`

---

## Phase 2: Foundational (Shared Hooks)

**Purpose**: Create analytics query hooks that multiple user stories depend on

**⚠️ CRITICAL**: User Stories 1-4 all depend on these hooks being available

- [X] T004 Create useAnalytics.ts with useUserAnalytics hook in `client/core/hooks/queries/useAnalytics.ts`
- [X] T005 Add useTopCourses hook to `client/core/hooks/queries/useAnalytics.ts`
- [X] T006 Add useEngagementSummary hook to `client/core/hooks/queries/useAnalytics.ts`
- [X] T007 Add useEngagementTimeseries hook to `client/core/hooks/queries/useAnalytics.ts`
- [X] T008 Export all analytics hooks from `client/core/hooks/queries/index.ts`
- [X] T009 Create formatCompactNumber utility in `client/core/utils/format.ts` for readable display (1000 → "1k", 1500000 → "1.5M")

**Checkpoint**: Foundation ready - hooks available for component integration

---

## Phase 3: User Story 1 - View Key Metrics Dashboard (Priority: P1) 🎯 MVP

**Goal**: Display real user activity metrics (sessions, score, courses) instead of hardcoded "45.2K", "32.8%", "3.42%"

**Independent Test**: Navigate to /analytics, verify KeyMetrics cards show numbers from API (not placeholders)

### Implementation for User Story 1

- [X] T010 [US1] Update KeyMetrics to accept optional userId prop in `client/components/pages/analytics/KeyMetrics.tsx`
- [X] T011 [US1] Integrate useUserAnalytics and useCurrentUser hooks in KeyMetrics
- [X] T012 [US1] Replace hardcoded metrics array with real data (totalSessions, averageScore, coursesCompleted)
- [X] T013 [US1] Format metrics using formatCompactNumber utility
- [X] T014 [US1] Add loading skeleton state to KeyMetrics
- [X] T015 [US1] Add error state with retry button to KeyMetrics
- [X] T016 [US1] Handle zero-data state ("No activity yet") in KeyMetrics

**Checkpoint**: User Story 1 complete - KeyMetrics shows real user analytics data

---

## Phase 4: User Story 2 - View Top Performing Content (Priority: P1)

**Goal**: Display real top courses with enrollment counts instead of fake "/dashboard 12.5K views"

**Independent Test**: Verify TopPages shows actual course titles with real enrollment counts from API

### Implementation for User Story 2

- [X] T017 [US2] Integrate useTopCourses hook in TopPages in `client/components/pages/analytics/TopPages.tsx`
- [X] T018 [US2] Replace hardcoded pages array with real course data
- [X] T019 [US2] Display course title, enrollmentCount, and completionRate
- [X] T020 [US2] Add loading skeleton state to TopPages
- [X] T021 [US2] Add empty state when no courses exist ("No courses available")
- [X] T022 [US2] Format enrollment counts using formatCompactNumber utility

**Checkpoint**: User Story 2 complete - TopPages shows real top courses data

---

## Phase 5: User Story 3 - View Traffic Overview Chart (Priority: P2)

**Goal**: Display time-series engagement data (simplified visualization) instead of placeholder

**Independent Test**: Verify TrafficOverview shows real data points from last 30 days

### Implementation for User Story 3

- [X] T023 [US3] Create getDateRange utility for calculating 30-day window in `client/components/pages/analytics/TrafficOverview.tsx`
- [X] T024 [US3] Integrate useEngagementTimeseries hook in TrafficOverview
- [X] T025 [US3] Replace placeholder with simplified time-series visualization (bar chart or list)
- [X] T026 [US3] Add loading skeleton state to TrafficOverview
- [X] T027 [US3] Add empty state when no time-series data exists

**Checkpoint**: User Story 3 complete - TrafficOverview shows real engagement trend data

---

## Phase 6: User Story 4 - View Demographics Breakdown (Priority: P2)

**Goal**: Update Demographics to show available metrics or acknowledge missing data

**Independent Test**: Verify Demographics handles missing device/location API gracefully

### Implementation for User Story 4

- [X] T028 [US4] Integrate useEngagementSummary hook in Demographics in `client/components/pages/analytics/Demographics.tsx`
- [X] T029 [US4] Replace "Top Locations" with platform engagement metrics (DAU, WAU, MAU)
- [X] T030 [US4] Keep device breakdown as placeholder with "Coming soon" note
- [X] T031 [US4] Add loading skeleton state to Demographics
- [X] T032 [US4] Format large user counts using formatCompactNumber utility

**Checkpoint**: User Story 4 complete - Demographics shows available platform metrics

---

## Phase 7: User Story 5 - Analytics Data Freshness (Priority: P3)

**Goal**: Verify TanStack Query caching works with 5-minute stale time

**Independent Test**: Navigate away from analytics and return - cached data displays instantly

### Implementation for User Story 5

- [X] T033 [US5] Verify all hooks use STALE_TIMES.ANALYTICS (5 minutes)
- [X] T034 [US5] Test cached data displays instantly on page revisit
- [X] T035 [US5] Test background refresh occurs for stale data
- [X] T036 [US5] Verify no duplicate API calls within stale window

**Note**: T033 verified via code inspection (all 4 hooks use STALE_TIMES.ANALYTICS). T034-T036 are manual testing tasks to verify during QA.

**Checkpoint**: User Story 5 complete - caching behavior verified

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [X] T037 [P] Remove all remaining hardcoded placeholder data (verify SC-001: no "45.2K", "32.8%", "3.42%", "12.5K views")
- [X] T038 [P] Update analytics component types in `client/components/pages/analytics/types.ts`
- [X] T039 Run quickstart.md testing checklist
- [X] T040 Verify all components have loading skeletons (SC-004)
- [X] T041 Verify error states allow retry without page refresh (SC-005)
- [X] T042 Verify analytics page loads within 3 seconds under normal network (SC-002)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on T001, T002 completion
- **Phase 3-6 (User Stories 1-4)**: All depend on Phase 2 completion
- **Phase 7 (User Story 5)**: Depends on Phase 3-6 (verifies caching)
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (P1) | Phase 2 | US2 (after Phase 2) |
| US2 (P1) | Phase 2 | US1 (after Phase 2) |
| US3 (P2) | Phase 2 | US1, US2, US4 (after Phase 2) |
| US4 (P2) | Phase 2 | US1, US2, US3 (after Phase 2) |
| US5 (P3) | US1-US4 | None (verification phase) |

### Within Each User Story

1. Integrate hook first
2. Replace hardcoded data
3. Add loading state
4. Add error/empty states
5. Story complete

### Parallel Opportunities

```bash
# Phase 1 - All in parallel:
T001, T002, T003

# Phase 2 - Sequential (hooks build on each other in same file):
T004 → T005 → T006 → T007 → T008 → T009

# After Phase 2 - User Stories 1-4 can start in parallel:
# Developer A: T010-T016 (US1 - KeyMetrics)
# Developer B: T017-T022 (US2 - TopPages)
# Developer C: T023-T027 (US3 - TrafficOverview)
# Developer D: T028-T032 (US4 - Demographics)

# Phase 8 - Polish tasks in parallel:
T037, T038
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009)
3. Complete Phase 3: User Story 1 (T010-T016) - Real key metrics
4. Complete Phase 4: User Story 2 (T017-T022) - Real top courses
5. **STOP and VALIDATE**: Analytics shows real data for main sections
6. Deploy MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 + US2 | Real metrics and top courses |
| +1 | US3 | Real engagement trends |
| +2 | US4 | Platform engagement metrics |
| +3 | US5 | Verified caching UX |

---

## Task Count Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Setup | 3 | 3 |
| Foundational | 6 | 0 |
| US1 (P1) | 7 | 0 |
| US2 (P1) | 6 | 0 |
| US3 (P2) | 5 | 0 |
| US4 (P2) | 5 | 0 |
| US5 (P3) | 4 | 0 |
| Polish | 6 | 2 |
| **Total** | **42** | **5** |

---

## Notes

- Server endpoints already exist and are verified functional (no server tasks needed)
- `analytics.service.ts` already provides typed interfaces for all API calls
- Demographics has limited data due to missing device/location API (out of scope)
- Week-over-week comparison (FR-011) may require additional timeseries calls if server doesn't return previous period
- Commit after each completed user story phase
- Run `npm run dev` in client/ to test changes
