# Tasks: Framework Reusability & Code Consolidation

**Input**: Design documents from `specs/004-framework-reusability/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are included as TDD is best practice for framework code that will be widely reused.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Exact file paths from plan.md project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new framework package directories and foundational types

- [ ] T001 Create framework/repository/ package directory at server/internal/framework/repository/
- [ ] T002 [P] Create framework/controller/ package directory at server/internal/framework/controller/
- [ ] T003 [P] Create framework/service/ package directory at server/internal/framework/service/
- [ ] T004 [P] Create tests/integration/framework/ directory at server/tests/integration/framework/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core framework types that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create TenantModel interface in server/internal/framework/repository/tenant_model.go
- [ ] T006 [P] Create repository error types in server/internal/framework/repository/errors.go
- [ ] T007 [P] Create controller error types in server/internal/framework/controller/errors.go
- [ ] T008 [P] Create service error types in server/internal/framework/service/errors.go
- [ ] T009 [P] Create QueryOption type for repository queries in server/internal/framework/repository/options.go

**Checkpoint**: Foundation ready - all error types and base interfaces defined

---

## Phase 3: User Story 1 - Developer Adds New CRUD Entity (Priority: P1) 🎯 MVP

**Goal**: GenericRepository[T] enables type-safe CRUD with <50 lines of custom code

**Independent Test**: Create TestEntity using GenericRepository, verify all CRUD operations work without custom repository code

### Tests for User Story 1

- [ ] T010 [P] [US1] Unit test for TenantModel interface validation in server/tests/integration/framework/tenant_model_test.go
- [ ] T011 [P] [US1] Integration test for GenericRepository CRUD in server/tests/integration/framework/generic_repository_test.go

### Implementation for User Story 1

- [ ] T012 [US1] Implement GenericRepository[T] struct in server/internal/framework/repository/generic.go
- [ ] T013 [US1] Implement Create method with TenantID auto-set in server/internal/framework/repository/generic.go
- [ ] T014 [US1] Implement FindByID with tenant scoping in server/internal/framework/repository/generic.go
- [ ] T015 [US1] Implement FindAll with QueryOptions and pagination in server/internal/framework/repository/generic.go
- [ ] T016 [US1] Implement Update with tenant verification in server/internal/framework/repository/generic.go
- [ ] T017 [US1] Implement Delete with tenant scoping in server/internal/framework/repository/generic.go
- [ ] T018 [US1] Implement FindByCondition for custom queries in server/internal/framework/repository/generic.go
- [ ] T019 [US1] Implement Count and Exists helpers in server/internal/framework/repository/generic.go
- [ ] T020 [US1] Implement WithTransaction method for transactional operations in server/internal/framework/repository/generic.go
- [ ] T021 [US1] Add TenantID enforcement validation (reject models without TenantID) in server/internal/framework/repository/generic.go

**Checkpoint**: GenericRepository complete - new entities need <50 lines of custom code

---

## Phase 4: User Story 2 - Developer Creates New Controller Endpoint (Priority: P1)

**Goal**: Controller helpers reduce endpoint boilerplate from 50+ to <20 lines

**Independent Test**: Create test endpoint using only framework helpers, verify handling of invalid JSON, missing auth, pagination limits

### Tests for User Story 2

- [ ] T022 [P] [US2] Unit test for GetAuthContext in server/tests/integration/framework/auth_context_test.go
- [ ] T023 [P] [US2] Unit test for ParseAndValidate in server/tests/integration/framework/parse_validate_test.go
- [ ] T024 [P] [US2] Unit test for ParsePagination in server/tests/integration/framework/pagination_test.go

### Implementation for User Story 2

- [ ] T025 [US2] Create AuthContext struct in server/internal/framework/controller/auth_context.go
- [ ] T026 [US2] Implement GetAuthContext function extracting UserID, TenantID, Role, Email in server/internal/framework/controller/auth_context.go
- [ ] T027 [US2] Create PaginationParams struct with constants in server/internal/framework/controller/pagination.go
- [ ] T028 [US2] Implement ParsePagination with defaults (20) and max cap (100) in server/internal/framework/controller/pagination.go
- [ ] T029 [US2] Implement ParseAndValidate[T] generic function in server/internal/framework/controller/helpers.go
- [ ] T030 [US2] Integrate go-playground/validator with ParseAndValidate in server/internal/framework/controller/helpers.go
- [ ] T031 [US2] Add automatic error response on validation failure in server/internal/framework/controller/helpers.go

**Checkpoint**: Controller helpers complete - new endpoints need <20 lines boilerplate

---

## Phase 5: User Story 3 - Developer Implements Service Business Logic (Priority: P2)

**Goal**: BaseService and TransactionManager provide consistent patterns for service layer

**Independent Test**: Create test service with transaction spanning multiple entities, verify rollback on failure

### Tests for User Story 3

- [ ] T032 [P] [US3] Unit test for BaseService dependency injection in server/tests/integration/framework/base_service_test.go
- [ ] T033 [P] [US3] Integration test for TransactionManager rollback in server/tests/integration/framework/transaction_manager_test.go
- [ ] T034 [P] [US3] Integration test for savepoint partial rollback in server/tests/integration/framework/transaction_savepoint_test.go

### Implementation for User Story 3

- [ ] T035 [US3] Create BaseService struct with DB, Logger, Cache, TxManager in server/internal/framework/service/base.go
- [ ] T036 [US3] Implement NewBaseService constructor with logger defaults in server/internal/framework/service/base.go
- [ ] T037 [US3] Implement helper methods (GetLogger, HasCache) in server/internal/framework/service/base.go
- [ ] T038 [US3] Create TransactionManager struct in server/internal/framework/service/transaction.go
- [ ] T039 [US3] Implement RunInTransaction with auto commit/rollback in server/internal/framework/service/transaction.go
- [ ] T040 [US3] Implement RunWithSavepoint for nested transactions in server/internal/framework/service/transaction.go
- [ ] T041 [US3] Add error conversion (gorm.ErrRecordNotFound → service.ErrNotFound) in server/internal/framework/service/errors.go

**Checkpoint**: Service patterns complete - services can embed BaseService and use TransactionManager

---

## Phase 6: User Story 4 - Remove Duplicate Middleware Code (Priority: P2)

**Goal**: Single rate limiter implementation in framework, zero duplicates

**Independent Test**: Delete internal/middleware/rate_limit.go, verify all rate limiting works from framework version

### Tests for User Story 4

- [ ] T042 [US4] Verify framework middleware rate_limit.go exists and is complete in server/internal/framework/middleware/rate_limit.go

### Implementation for User Story 4

- [ ] T043 [US4] Audit internal/middleware/rate_limit.go for any unique functionality not in framework version
- [ ] T044 [US4] Copy any missing features from internal/middleware/rate_limit.go to framework version if needed
- [ ] T045 [US4] Update all imports from internal/middleware to internal/framework/middleware for rate limiting
- [ ] T046 [US4] Delete duplicate server/internal/middleware/rate_limit.go file
- [ ] T047 [US4] Verify rate limiting still works on all protected endpoints

**Checkpoint**: Zero duplicate middleware files - SC-005 achieved

---

## Phase 7: User Story 5 - Consistent Error Responses Across API (Priority: P3)

**Goal**: All error responses use format with request_id for tracing

**Independent Test**: Call 10 different endpoints with invalid requests, verify all return same error structure

### Tests for User Story 5

- [ ] T048 [P] [US5] Unit test for error response format with request_id in server/tests/integration/framework/error_response_test.go

### Implementation for User Story 5

- [ ] T049 [US5] Add request_id to BadRequest response in server/internal/framework/responses/helpers.go
- [ ] T050 [US5] Add request_id to Unauthorized response in server/internal/framework/responses/helpers.go
- [ ] T051 [US5] Add request_id to Forbidden response in server/internal/framework/responses/helpers.go
- [ ] T052 [US5] Add request_id to NotFound response in server/internal/framework/responses/helpers.go
- [ ] T053 [US5] Add request_id to InternalError response in server/internal/framework/responses/helpers.go
- [ ] T054 [US5] Add request_id to ValidationError response in server/internal/framework/responses/helpers.go
- [ ] T055 [US5] Add code field to all error responses in server/internal/framework/responses/helpers.go
- [ ] T056 [US5] Create GetRequestID helper function in server/internal/framework/responses/helpers.go

**Checkpoint**: Error responses standardized - SC-004 ready for migration

---

## Phase 8: Migration - Low-Risk Repositories (Phase 1 per FR-061)

**Goal**: Migrate badges, quests, leaderboards to GenericRepository

**Independent Test**: Run existing tests for migrated repositories, all should pass

### Implementation

- [ ] T057 [P] Add TenantModel methods to Badge model in server/internal/models/badge.go
- [ ] T058 [P] Add TenantModel methods to Quest model in server/internal/models/quest.go
- [ ] T059 [P] Add TenantModel methods to QuestProgress model in server/internal/models/quest_progress.go
- [ ] T060 [P] Add TenantModel methods to Leaderboard model in server/internal/models/leaderboard.go
- [ ] T061 [P] Add TenantModel methods to Achievement model in server/internal/models/achievement.go
- [ ] T062 Refactor BadgeRepository to embed GenericRepository in server/internal/repositories/badge_repository.go
- [ ] T063 Refactor QuestRepository to embed GenericRepository in server/internal/repositories/quest_repository.go
- [ ] T064 Refactor QuestProgressRepository to embed GenericRepository in server/internal/repositories/quest_progress_repository.go
- [ ] T065 Refactor LeaderboardRepository to embed GenericRepository in server/internal/repositories/leaderboard_repository.go
- [ ] T066 Refactor AchievementRepository to embed GenericRepository in server/internal/repositories/achievement_repository.go
- [ ] T067 Run tests for all migrated low-risk repositories

**Checkpoint**: 5 repositories migrated, pattern validated - ready for medium-risk migration

---

## Phase 9: Migration - Low-Risk Controllers

**Goal**: Migrate badge, quest, leaderboard controllers to use framework helpers

### Implementation

- [ ] T068 [P] Refactor BadgeController to use GetAuthContext in server/internal/controllers/badge_controller.go
- [ ] T069 [P] Refactor QuestController to use GetAuthContext in server/internal/controllers/quest_controller.go
- [ ] T070 [P] Refactor LeaderboardController to use GetAuthContext in server/internal/controllers/leaderboard_controller.go
- [ ] T071 [P] Refactor AchievementController to use GetAuthContext in server/internal/controllers/achievement_controller.go
- [ ] T072 Refactor controllers to use ParseAndValidate for request parsing
- [ ] T073 Refactor controllers to use ParsePagination for list endpoints
- [ ] T074 Refactor controllers to use framework response helpers with request_id

**Checkpoint**: Low-risk controllers migrated - consistent patterns validated

---

## Phase 10: Migration - Low-Risk Services

**Goal**: Migrate badge, quest, leaderboard services to embed BaseService

### Implementation

- [ ] T075 [P] Refactor BadgeService to embed BaseService in server/internal/services/badge_service.go
- [ ] T076 [P] Refactor QuestService to embed BaseService in server/internal/services/quest_service.go
- [ ] T077 [P] Refactor LeaderboardService to embed BaseService in server/internal/services/leaderboard_service.go
- [ ] T078 [P] Refactor AchievementService to embed BaseService in server/internal/services/achievement_service.go
- [ ] T079 Update services to use TransactionManager where applicable
- [ ] T080 Run full test suite for low-risk domain migration

**Checkpoint**: Low-risk domain migration complete - badges, quests, leaderboards use framework patterns

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final cleanup

- [ ] T081 [P] Update framework architecture document in server/docs/ARCHITECTURE.md
- [ ] T082 [P] Create framework usage guide in server/docs/FRAMEWORK_PATTERNS.md
- [ ] T083 [P] Add framework examples to AGENT.md for AI reference
- [ ] T084 Run quickstart.md validation - verify all examples compile
- [ ] T085 Measure code reduction - verify SC-001 (2000+ lines reduced)
- [ ] T086 Count migrated repositories - verify progress toward SC-006 (20/32)
- [ ] T087 Final test suite run - all framework and integration tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──► Phase 2 (Foundational) ──┬──► Phase 3 (US1: Repository)
                                              │
                                              ├──► Phase 4 (US2: Controller)
                                              │
                                              └──► Phase 5 (US3: Service)
                                                         │
Phase 6 (US4: Middleware) ◄────────────────────────────┘
                │
                ▼
Phase 7 (US5: Responses)
                │
                ▼
Phase 8-10 (Migration: Low-Risk)
                │
                ▼
Phase 11 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Repository) | Phase 2 | Foundation complete |
| US2 (Controller) | Phase 2 | Foundation complete |
| US3 (Service) | Phase 2 | Foundation complete |
| US4 (Middleware) | US1, US2, US3 | All core framework done |
| US5 (Responses) | US2 | Controller helpers done |

### Parallel Opportunities

**Within Phase 1 (Setup)**:
```
T001 ─┐
T002 ─┼── All parallel (different directories)
T003 ─┤
T004 ─┘
```

**Within Phase 2 (Foundational)**:
```
T005 (TenantModel) ─┐
T006 (repo errors) ─┼── T006-T009 parallel after T005
T007 (ctrl errors) ─┤
T008 (svc errors) ──┤
T009 (QueryOption) ─┘
```

**User Stories 1, 2, 3 can run in parallel** after Phase 2:
```
Phase 2 complete ──┬──► US1 (T010-T021)
                   ├──► US2 (T022-T031)
                   └──► US3 (T032-T041)
```

**Migration phases (8-10) run after core framework**:
```
T057-T061 ── Models (all parallel)
T062-T066 ── Repositories (sequential for safety)
T068-T074 ── Controllers (parallel per controller)
T075-T080 ── Services (parallel per service)
```

---

## Parallel Example: User Story 1

```bash
# Launch tests first (TDD):
T010: "Unit test for TenantModel interface"
T011: "Integration test for GenericRepository CRUD"

# After tests written, implement in order:
T012: "Implement GenericRepository[T] struct"
T013-T21: Implementation tasks (sequential - same file)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (GenericRepository)
4. **STOP and VALIDATE**: Create TestEntity, verify CRUD works
5. Measure: New entity needs <50 lines of custom code?

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Repository) → Test independently → **MVP: GenericRepository works**
3. Add US2 (Controller) → Test independently → Controller helpers work
4. Add US3 (Service) → Test independently → Service patterns work
5. Add US4 (Middleware) → Test independently → Duplicates removed
6. Add US5 (Responses) → Test independently → Error format standardized
7. Migration phases → Existing code uses new patterns

### Success Criteria Checkpoints

| Checkpoint | Success Criteria | Verified By |
|------------|------------------|-------------|
| US1 Complete | SC-002: <50 lines for new entity | T011 test |
| US2 Complete | SC-003: <20 lines endpoint boilerplate | T022-T024 tests |
| US4 Complete | SC-005: Zero duplicate middleware | T047 verification |
| Phase 8 Complete | SC-006 progress: 5/32 repositories | T067 test run |
| Phase 11 Complete | SC-001: 2000+ lines reduced | T085 measurement |

---

## Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| 1 | T001-T004 | Setup directories |
| 2 | T005-T009 | Foundation types |
| 3 | T010-T021 | US1: GenericRepository (P1) |
| 4 | T022-T031 | US2: Controller Helpers (P1) |
| 5 | T032-T041 | US3: Service Patterns (P2) |
| 6 | T042-T047 | US4: Middleware Consolidation (P2) |
| 7 | T048-T056 | US5: Error Responses (P3) |
| 8 | T057-T067 | Migration: Low-Risk Repos |
| 9 | T068-T074 | Migration: Low-Risk Controllers |
| 10 | T075-T080 | Migration: Low-Risk Services |
| 11 | T081-T087 | Polish & Validation |

**Total Tasks**: 87  
**Parallel Opportunities**: 40+ tasks can run in parallel with others  
**MVP Scope**: Phases 1-3 (T001-T021, 21 tasks)
