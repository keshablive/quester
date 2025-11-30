# Implementation Plan: Server Service Layer DI Completion

**Branch**: `024-server-service-di` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-server-service-di/spec.md`

## Summary

Complete dependency injection refactoring for the server's service layer to eliminate `*gorm.DB` coupling, remove global state (`database.DB`, `cache.Client`), and standardize constructor patterns. This enables unit testing with mocks and follows clean architecture.

**Critical Prerequisite**: Restore full codebase from `settings/backups/server/internal/` before any refactoring.

## Technical Context

**Language/Version**: Go 1.24.0  
**Primary Dependencies**: Fiber v2, GORM, Redis (go-redis/v9), testify/mock, mockery  
**Storage**: PostgreSQL (GORM ORM), Redis (cache/sessions)  
**Testing**: go test, testify/mock, mockery for code generation  
**Target Platform**: Linux server (Docker container)  
**Project Type**: Single Go module with layered architecture  
**Performance Goals**: DI resolution <1ms, unit tests <5s total  
**Constraints**: Zero API breaking changes, 100% backward compatibility  
**Scale/Scope**: 57 services, 36 controllers, 25 repositories, 15 interfaces to extract

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Clean Architecture | ✅ PASS | Services depend on interfaces, not implementations |
| Test-First | ⚠️ PARTIAL | Mocks generated, but tests written after refactoring |
| Fail-Fast | ✅ PASS | DI container crashes on missing dependency |
| Backward Compatibility | ✅ PASS | V2 constructors alongside deprecated V1 |

**Violations Requiring Justification**: Test-First is partially followed - tests are created alongside refactoring rather than strictly before, due to needing working interfaces first.

## Project Structure

### Documentation (this feature)

```text
specs/024-server-service-di/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (consolidated from R2, R3)
├── data-model.md        # Phase 1 output (interface definitions)
├── quickstart.md        # Phase 1 output (developer guide)
├── tasks.md             # Task breakdown (78 tasks across 6 phases)
└── contracts/           # Phase 1 output (API contracts - N/A for this spec)
```

### Source Code (repository root)

```text
server/
├── internal/
│   ├── app/
│   │   └── app.go                    # DI container initialization
│   │
│   ├── framework/                    # Infrastructure layer
│   │   ├── interfaces/               # ← NEW: Repository interfaces
│   │   │   ├── repository.go         # Base repository interface
│   │   │   ├── transaction.go        # TransactionManager interface
│   │   │   ├── cache.go              # CacheClient interface
│   │   │   ├── property_repository.go
│   │   │   ├── quest_repository.go
│   │   │   ├── user_repository.go
│   │   │   ├── transaction_repository.go
│   │   │   ├── badge_repository.go
│   │   │   ├── notification_repository.go
│   │   │   └── ... (9 more)
│   │   ├── container/
│   │   │   └── container.go          # Existing DI container
│   │   ├── database/
│   │   ├── cache/
│   │   └── ... (14 more dirs)
│   │
│   ├── services/                     # Business logic layer
│   │   ├── property_service.go       # ← REFACTOR: Interface injection
│   │   ├── quest_service.go          # ← REFACTOR: Interface injection
│   │   ├── user_service.go           # ← REFACTOR: Remove global state
│   │   ├── transaction_service.go    # ← REFACTOR: Config struct
│   │   ├── badge_service.go          # ← VERIFY: Already uses repo
│   │   ├── notification_service.go   # ← REFACTOR: Interface injection
│   │   ├── audit_log_service.go      # ← REFACTOR: Remove database.DB
│   │   ├── auth_service.go           # ← REFACTOR: Remove database.DB
│   │   ├── two_factor_service.go     # ← REFACTOR: Remove database.DB (22 calls)
│   │   ├── kms_service.go            # ← REFACTOR: Remove database.DB
│   │   ├── blacklist_service.go      # ← REFACTOR: Remove cache.Client
│   │   ├── social_service.go         # ← REFACTOR: Config struct
│   │   ├── marketplace_service.go    # ← REFACTOR: Config struct
│   │   └── ... (44 more services)
│   │
│   ├── repositories/                 # Data access layer
│   │   ├── property_repository.go
│   │   ├── quest_repository.go
│   │   └── ... (23 more repositories)
│   │
│   ├── controllers/                  # HTTP handlers
│   │   └── ... (36 controllers)
│   │
│   ├── models/                       # Domain models
│   │   └── ...
│   │
│   └── mocks/                        # ← NEW: Generated mocks
│       ├── property_repository_mock.go
│       ├── quest_repository_mock.go
│       └── ... (15 mocks)
│
└── tests/
    ├── unit/
    │   └── services/                 # ← NEW: Service unit tests
    │       ├── property_service_test.go
    │       ├── quest_service_test.go
    │       └── ... (6 P1 service tests)
    └── integration/
        └── ...
```

**Structure Decision**: Single Go module with layered architecture (framework → repositories → services → controllers). Interfaces extracted to `framework/interfaces/` to maintain framework independence from application layer.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Test-First partial | Interfaces must exist before mocks can be generated | Writing tests against non-existent interfaces is not possible |
| V2 constructors | Backward compatibility required | Breaking change would disrupt existing consumers |

## Phase Execution Summary

| Phase | Focus | Tasks | Duration | Output |
|-------|-------|-------|----------|--------|
| 0 | Codebase Restoration | T001-T007 | 0.5 days | Compilable server |
| 1 | Interface Extraction | T008-T025 | 2 days | 15 interfaces in `framework/interfaces/` |
| 2 | P1 Service DI | T026-T043 | 3 days | 6 services refactored |
| 3 | Global State Removal | T044-T061 | 2 days | 0 global state accesses |
| 4 | Config Structs | T062-T067 | 1 day | 3 config structs |
| 5 | Mocks & Tests | T068-T078 | 2 days | 80% coverage |

**Total**: 78 tasks, 10.5 working days

## Validation Gates

### After Phase 0 (Codebase Restoration)

- [ ] `server/internal/services/` has 57 files
- [ ] `server/internal/controllers/` has 36 files
- [ ] `server/internal/repositories/` has 25 files
- [ ] `go build ./cmd/server/...` succeeds

### After Phase 1 (Interface Extraction)

- [ ] `go build ./internal/framework/interfaces/...` succeeds
- [ ] All interfaces follow `context.Context` first pattern
- [ ] Existing repositories satisfy new interfaces (compile check)

### After Phase 2 (P1 Service DI)

- [ ] `go build ./internal/services/...` succeeds
- [ ] DI container registers all 6 P1 services
- [ ] Server starts without errors

### After Phase 3 (Global State Removal)

- [ ] `grep -r "database\.DB" ./internal/services/` returns 0 matches
- [ ] `grep -r "cache\.Client" ./internal/services/` returns 0 matches
- [ ] Integration tests pass

### After Phase 5 (Mocks & Tests)

- [ ] `go test ./internal/services/... -cover` shows ≥80%
- [ ] All unit tests pass in <5 seconds
- [ ] All integration tests pass

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| TwoFactorService (22 calls) | Refactor one method at a time, test each, security review |
| Breaking existing functionality | Per-service incremental migration with integration tests |
| Performance regression | Benchmark critical paths before/after |

## Next Steps

1. Execute Phase 0: `rsync -av settings/backups/server/internal/ server/internal/`
2. Verify compilation: `go build ./cmd/server/...`
3. Proceed with Phase 1 interface extraction

---

*Generated by `/speckit.plan` on 2025-12-01*
