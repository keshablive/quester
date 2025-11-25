# Implementation Plan: Framework Reusability & Code Consolidation

**Branch**: `004-framework-reusability` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-framework-reusability/spec.md`

---

## Summary

**Primary Requirement**: Reduce ~2,000+ lines of duplicate code across repositories, controllers, and services by creating reusable framework components.

**Technical Approach**:
1. **GenericRepository[T]**: Go generics-based repository providing type-safe CRUD operations with mandatory TenantID enforcement
2. **Controller Helpers**: Unified `ParseAndValidate[T]()`, `GetAuthContext()`, `ParsePagination()` functions
3. **Service Patterns**: `BaseService` struct with common dependencies, `TransactionManager` with savepoint support
4. **Error Standardization**: All error responses use format `{"success": false, "error": "message", "code": N, "request_id": "uuid"}`
5. **Middleware Consolidation**: Remove duplicate `internal/middleware/rate_limit.go`, use framework version only

**Migration Strategy**: Phased by domain risk - badges/quests/leaderboards first, users/transactions last.

---

## Technical Context

**Language/Version**: Go 1.25.0 (Windows AMD64)  
**Primary Dependencies**: Fiber (web), GORM (ORM), go-playground/validator (validation), google/uuid  
**Storage**: PostgreSQL with PostGIS, Redis (caching)  
**Testing**: Go test with integration tests in `tests/integration/`  
**Target Platform**: Linux server (production), Windows (development)  
**Project Type**: Monorepo (client + server)  
**Performance Goals**: Support existing API throughput; no performance regression from abstraction  
**Constraints**: All queries MUST be tenant-scoped (NON-NEGOTIABLE per constitution)  
**Scale/Scope**: 32 repositories, 30+ controllers, 45+ services to consolidate

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Multi-Tenancy (NON-NEGOTIABLE) ✅ PASS

| Requirement | Feature Compliance |
|-------------|-------------------|
| All queries MUST filter by TenantID | GenericRepository[T] enforces TenantID at compile/runtime; models without TenantID are rejected |
| Never allow cross-tenant data access | `WithTenantContext()` returns empty result set if TenantID missing |
| Cascade deletes within tenant scope | Base repository handles tenant-scoped cascades |

### II. Security First (NON-NEGOTIABLE) ✅ PASS

| Requirement | Feature Compliance |
|-------------|-------------------|
| Input validation on all endpoints | `ParseAndValidate[T]()` uses go-playground/validator automatically |
| Auth context extraction consistency | Single `GetAuthContext()` method with validated Claims |
| No sensitive data in error responses | Standard error format excludes internal details |

### III. Type Safety (MANDATORY) ✅ PASS

| Requirement | Feature Compliance |
|-------------|-------------------|
| Compile-time type checking | Go generics provide type safety: `GenericRepository[T TenantModel]` |
| No interface{} abuse | Generics replace existing `interface{}` patterns |
| UUID handling consistency | All IDs use `uuid.UUID` type in interfaces |

### IV. Error Handling (MANDATORY) ✅ PASS

| Requirement | Feature Compliance |
|-------------|-------------------|
| Wrap errors with context | Service layer wraps DB errors with domain context |
| Never panic in business logic | All repository methods return errors, never panic |
| Consistent error responses | Standard format: `{"success": false, "error": "...", "code": N, "request_id": "uuid"}` |

### V. Context Propagation (MANDATORY) ✅ PASS

| Requirement | Feature Compliance |
|-------------|-------------------|
| Pass context.Context through layers | All repository/service methods accept `ctx context.Context` |
| Extract claims from context | `GetAuthContext(c *fiber.Ctx)` provides unified extraction |
| Timeout/cancellation support | Context propagation enables proper timeout handling |

### VI. Consistency & Pattern Adherence (MANDATORY) ✅ PASS

| Requirement | Feature Compliance |
|-------------|-------------------|
| Single pattern for common operations | Framework provides ONE way to do CRUD, pagination, auth extraction |
| Documentation of patterns | Framework architecture document (FR-052) |
| Phased migration approach | Low-risk domains first, high-risk last (FR-061, FR-062) |

### VII. Observability & Debugging (MANDATORY) ✅ PASS

| Requirement | Feature Compliance |
|-------------|-------------------|
| Request tracing | `request_id` in all error responses |
| Structured logging | BaseService includes Logger dependency |
| Error context for debugging | Error wrapping preserves stack context |

**Gate Status**: ✅ ALL CHECKS PASS - Proceed to Phase 0

---

## Project Structure

### Documentation (this feature)

```text
specs/004-framework-reusability/
├── plan.md              # This file
├── research.md          # Phase 0: Technical research decisions
├── data-model.md        # Phase 1: Entity and interface definitions
├── quickstart.md        # Phase 1: Developer usage guide
├── contracts/           # Phase 1: Interface contracts
│   ├── generic_repository.go
│   ├── controller_helpers.go
│   ├── base_service.go
│   └── transaction_manager.go
└── tasks.md             # Phase 2 output (separate command)
```

### Source Code (server directory)

```text
server/internal/framework/
├── repository/                    # NEW: Generic repository package
│   ├── generic.go                 # GenericRepository[T] implementation
│   ├── tenant_model.go            # TenantModel interface/constraint
│   └── errors.go                  # Repository-level errors
├── controller/                    # NEW: Controller helpers package
│   ├── helpers.go                 # ParseAndValidate, GetAuthContext, ParsePagination
│   ├── auth_context.go            # AuthContext struct
│   └── pagination.go              # PaginationParams struct
├── service/                       # NEW: Service patterns package
│   ├── base.go                    # BaseService struct
│   ├── transaction.go             # TransactionManager with savepoints
│   └── errors.go                  # Service-level errors
├── responses/                     # EXISTING: Enhanced with request_id
│   ├── helpers.go                 # Add request_id to error responses
│   └── response.go                # Existing response types
├── middleware/                    # EXISTING: Authoritative location
│   └── rate_limit.go              # Keep this, delete duplicate
└── [existing packages...]

server/internal/middleware/
└── rate_limit.go                  # DELETE: Duplicate to be removed

server/internal/repositories/
├── base_repository.go             # MODIFY: Extend with generics
└── [32 domain repositories]       # MIGRATE: Use GenericRepository as base

server/internal/services/
└── [45+ services]                 # MIGRATE: Embed BaseService

server/internal/controllers/
└── [30+ controllers]              # MIGRATE: Use controller helpers

server/tests/integration/
└── framework/                     # NEW: Framework integration tests
    ├── generic_repository_test.go
    ├── controller_helpers_test.go
    └── transaction_manager_test.go
```

**Structure Decision**: Extend existing `server/internal/framework/` with new packages for repository, controller, and service patterns. This maintains separation of concerns while consolidating shared code into the authoritative framework location.

---

## Complexity Tracking

> No violations requiring justification. Feature aligns with all constitutional principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
