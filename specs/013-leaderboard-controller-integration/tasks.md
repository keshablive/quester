# Tasks: Leaderboard Controller Integration

**Input**: Design documents from `/specs/013-leaderboard-controller-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: NOT explicitly requested in specification. Test tasks excluded per template guidelines.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization - no setup needed as project already exists

- [X] T001 Verify LeaderboardService exists in server/internal/services/leaderboard_service.go
- [X] T002 Verify LeaderboardRepository registered in DI container at server/internal/app/app.go

**Checkpoint**: Existing infrastructure verified

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Register LeaderboardService in DI container in server/internal/app/app.go (after line 780, in registerServices function)
- [X] T004 Create LeaderboardController struct type in server/internal/controllers/leaderboard_controller.go
- [X] T005 Create NewLeaderboardController constructor accepting *services.LeaderboardService in server/internal/controllers/leaderboard_controller.go
- [X] T006 Create SetupLeaderboardRoutes function in server/internal/routes/leaderboard_routes.go
- [X] T007 Wire SetupLeaderboardRoutes call in server/internal/routes/routes.go

**Checkpoint**: Foundation ready - LeaderboardController struct exists with service injection; routes wired

---

## Phase 3: User Story 1 - View Global Leaderboard Rankings (Priority: P1) 🎯 MVP

**Goal**: Users can view global leaderboard with real data from Redis instead of empty mock responses

**Independent Test**: Request `/api/v1/leaderboards/global` and verify entries array contains ranked users

### Implementation for User Story 1

- [X] T008 [US1] Refactor GetLeaderboard handler to method on LeaderboardController struct in server/internal/controllers/leaderboard_controller.go
- [X] T009 [US1] Remove mock response and wire service.GetTopN() call in GetLeaderboard handler
- [X] T010 [US1] Add pagination limit enforcement (max 100) per FR-008 in GetLeaderboard handler
- [X] T011 [US1] Add Redis error handling returning 503 ServiceUnavailable per FR-010 in GetLeaderboard handler
- [X] T012 [US1] Register GET /api/v1/leaderboards/:type route in server/internal/routes/leaderboard_routes.go

**Checkpoint**: User Story 1 complete - Global leaderboard returns real data

---

## Phase 4: User Story 2 - Check My Leaderboard Position (Priority: P1)

**Goal**: Users can view their exact rank, percentile, and position in any leaderboard

**Independent Test**: Request `/api/v1/users/{id}/leaderboard-position` and verify rank/percentile are calculated from Redis

### Implementation for User Story 2

- [X] T013 [US2] Refactor GetUserPosition handler to method on LeaderboardController struct in server/internal/controllers/leaderboard_controller.go
- [X] T014 [US2] Remove mock response and wire service.GetUserRank() call in GetUserPosition handler
- [X] T015 [US2] Add Redis error handling returning 503 ServiceUnavailable in GetUserPosition handler
- [X] T016 [US2] Register GET /api/v1/users/:id/leaderboard-position route in server/internal/routes/leaderboard_routes.go

**Checkpoint**: User Story 2 complete - User position returns real rank/percentile

---

## Phase 5: User Story 3 - View Category Leaderboards (Priority: P2)

**Goal**: Users can view category-specific leaderboards (quest, learning, social)

**Independent Test**: Request `/api/v1/leaderboards/category?category=quest` and verify category-filtered results

### Implementation for User Story 3

- [X] T017 [US3] Add category parameter validation in GetLeaderboard handler (required when type=category) per FR-007
- [X] T018 [US3] Verify category parameter passed to service.GetTopN() in GetLeaderboard handler

**Checkpoint**: User Story 3 complete - Category leaderboards work with validation

---

## Phase 6: User Story 4 - Admin Cache Invalidation (Priority: P3)

**Goal**: Administrators can manually clear leaderboard cache for data corrections

**Independent Test**: Call `/api/v1/admin/leaderboards/invalidate` and verify Redis keys are deleted

### Implementation for User Story 4

- [X] T019 [US4] Refactor InvalidateLeaderboardCache handler to method on LeaderboardController struct in server/internal/controllers/leaderboard_controller.go
- [X] T020 [US4] Remove mock response and wire service.InvalidateCache() call in InvalidateLeaderboardCache handler
- [X] T021 [US4] Add admin role middleware check for cache invalidation endpoint
- [X] T022 [US4] Register POST /api/v1/admin/leaderboards/invalidate route in server/internal/routes/leaderboard_routes.go

**Checkpoint**: User Story 4 complete - Admin cache invalidation works

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, and documentation

- [X] T023 [P] Remove all TODO comments from server/internal/controllers/leaderboard_controller.go (SC-005)
- [X] T024 [P] Add Cache-Control headers: 5 min for leaderboards, 2 min for positions per FR-009
- [X] T025 [P] Verify API contract unchanged per SC-006 by comparing request/response shapes
- [X] T026 Run quickstart.md validation steps to verify all endpoints work

**Checkpoint**: Feature complete and validated

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────┬───────────────────┐
│                   │                   │
Phase 3 (US1)   Phase 4 (US2)          │
│    P1              P1                 │
│         ↘     ↙                       │
│         Phase 5 (US3)                 │
│            P2                         │
│              ↓                        │
│         Phase 6 (US4)                 │
│            P3                         │
└───────────────────────────────────────┘
    ↓
Phase 7 (Polish)
```

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 only - can start immediately after foundation
- **User Story 2 (P1)**: Depends on Phase 2 only - can run in parallel with US1
- **User Story 3 (P2)**: Depends on US1 (uses GetLeaderboard handler) - must wait for T008-T012
- **User Story 4 (P3)**: Depends on Phase 2 only - can run in parallel with US1/US2

### Within Each Phase

- Tasks in same phase without [P] marker must be sequential
- Tasks with [P] marker can run in parallel if different files

### Parallel Opportunities

```bash
# After Phase 2 completes, can run in parallel:
# - US1: T008-T012 (GetLeaderboard wiring)
# - US2: T013-T016 (GetUserPosition wiring)
# - US4: T019-T022 (InvalidateCache wiring)

# Phase 7 parallel tasks:
# - T023, T024, T025 can all run in parallel (different concerns)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (verify existing code)
2. Complete Phase 2: Foundational (DI, struct, routes)
3. Complete Phase 3: User Story 1 (GetLeaderboard)
4. Complete Phase 4: User Story 2 (GetUserPosition)
5. **STOP and VALIDATE**: Both P1 stories work
6. Deploy/demo if ready

### Full Feature Delivery

1. MVP first (US1 + US2)
2. Add US3 (Category validation) - minimal work
3. Add US4 (Admin cache invalidation)
4. Polish phase
5. Final validation via quickstart.md

---

## Notes

- No new models needed - all exist in `models/leaderboard.go`
- Service already implemented - only controller wiring needed
- Total: 26 tasks (2 setup, 5 foundation, 5 US1, 4 US2, 2 US3, 4 US4, 4 polish)
- Estimated effort: Small feature (~4-6 hours)
- Commit after each user story checkpoint
