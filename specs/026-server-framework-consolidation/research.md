# Research: Server Framework Consolidation

**Feature**: 026-server-framework-consolidation
**Date**: 2025-12-01
**Status**: Complete

## Research Tasks

### 1. Duplicate Declaration Analysis

**Task**: Identify all duplicate type declarations in auth services

**Findings**:

| Type | Files Declaring |
|------|-----------------|
| `LoginRequest` | `auth_service.go:26`, `login_service.go:19` |
| `SignupRequest` | `auth_service.go:20`, `signup_service.go:30` |
| `RefreshResponse` | `auth_service.go:38`, `refresh_token_service.go:18` |
| `UserRepository` interface | `auth_service.go:45`, `login_service.go:41` |
| `RefreshTokenRepository` interface | `auth_service.go:52`, `login_service.go:48` |

**Decision**: Extract all shared types to `auth_types.go`
**Rationale**: Single source of truth prevents redeclaration errors; service files import shared types
**Alternatives Considered**: Merging all auth into single file - rejected due to file size and separation of concerns

---

### 2. Service Layer Pattern Analysis

**Task**: Verify BaseService embedding pattern compatibility

**Findings**:

- `BaseService` in `framework/service/base.go` provides:
  - `GetDB()` - database connection
  - `GetLogger()` - structured logging
  - `GetCache()` - Redis client
  - `GetTxManager()` - transaction management
- Services in `internal/services/` do NOT currently embed BaseService
- Migration requires adding `service.BaseService` embedding to each service

**Decision**: Keep base patterns separate; domain services embed `BaseService`
**Rationale**: Matches Q1 clarification; provides consistent logging/caching/transactions
**Alternatives Considered**: Creating new base class - rejected; existing BaseService is sufficient

---

### 3. Repository Layer Pattern Analysis

**Task**: Verify GenericRepository embedding pattern compatibility

**Findings**:

- `GenericRepository[T]` in `framework/repository/generic.go` provides:
  - `Create(ctx, entity)` - tenant-scoped insert
  - `FindByID(ctx, id)` - tenant-scoped lookup
  - `FindAll(ctx, opts...)` - tenant-scoped list with pagination
  - `Update(ctx, entity)` - tenant-scoped update
  - `Delete(ctx, id)` - tenant-scoped soft delete
- Repositories in `internal/repositories/` have mixed patterns:
  - Some use `base_repository.go` pattern
  - Some are standalone
- All repositories MUST enforce tenant isolation per Constitution Principle I

**Decision**: Keep base patterns separate; domain repos embed `GenericRepository`
**Rationale**: Matches Q2 clarification; ensures consistent tenant isolation
**Alternatives Considered**: Direct GORM usage - rejected; violates Constitution Principle I

---

### 4. Controller Layer Pattern Analysis

**Task**: Verify controller helper usage patterns

**Findings**:

- Controller helpers in `framework/controller/`:
  - `pagination.go` - pagination utilities
  - `errors.go` - error response formatting
  - `auth_context.go` - JWT/tenant extraction
  - `helpers.go` - common HTTP utilities
- Controllers in `internal/controllers/` import helpers directly
- No embedding pattern for controllers (per Q3 clarification)

**Decision**: Keep helpers separate; controllers import directly
**Rationale**: Matches Q3 clarification; controllers are HTTP handlers, not services
**Alternatives Considered**: BaseController struct - rejected; unnecessary abstraction

---

### 5. Import Path Migration Strategy

**Task**: Determine import update approach

**Findings**:

- Module path: `github.com/keshablive/quester`
- Current import paths:
  - `internal/services` → `internal/framework/service`
  - `internal/repositories` → `internal/framework/repository`
  - `internal/controllers` → `internal/framework/controller`
  - `internal/routes` → `internal/framework/routes`
  - `internal/utils` → `internal/framework/utils`
- Tools available:
  - `goimports` - automatic import organization
  - `sed`/`grep` - batch text replacement
  - Go tooling respects module boundaries

**Decision**: Use `sed` for batch replacement, then `goimports` for cleanup
**Rationale**: Deterministic replacement; `goimports` handles edge cases
**Alternatives Considered**: Manual replacement - rejected; error-prone with 200+ files

---

### 6. Package Export Strategy

**Task**: Determine `index.go` export pattern

**Findings**:

- Go packages export via capitalized identifiers
- `index.go` pattern used in some Go projects as documentation
- Purpose: provide clean facade, document public API
- Content: type aliases or re-exports for commonly used types

**Decision**: Single `index.go` per package with facade exports (per Q5)
**Rationale**: Matches existing patterns in codebase; improves discoverability
**Alternatives Considered**: Direct imports - acceptable but facade provides better API

Example `index.go` structure:

```go
// Package service provides business logic services for Quester.
package service

// Re-export base types for convenience
type (
    Base = BaseService
    TxManager = TransactionManager
)

// Re-export common services
// (This documents the public API without changing behavior)
```

---

### 7. Test Migration Strategy

**Task**: Determine test file handling approach

**Findings**:

- Current test locations:
  - `tests/unit/` - centralized unit tests
  - `tests/integration/` - integration tests
  - Some `*_test.go` files co-located with production code
- Per Q9: Centralize all tests in `tests/unit/` with mirrored structure
- Test imports will need updating to new paths

**Decision**: Keep tests in `tests/unit/`, update imports only
**Rationale**: Matches Q9 clarification; existing structure is suitable
**Alternatives Considered**: Moving tests with code - rejected per user preference

---

### 8. Rollback Strategy

**Task**: Determine rollback approach for failed phases

**Findings**:

- Git provides atomic rollback capability
- Phase boundaries provide natural rollback points
- Tags recommended: `pre-phase-1`, `post-phase-1`, etc.

**Decision**: Create git tags at phase boundaries
**Rationale**: Enables precise rollback to last working state
**Alternatives Considered**: Branch-per-phase - rejected; unnecessary complexity

---

## Summary

All research tasks complete. Key decisions:

1. **Auth duplicates**: Extract to `auth_types.go`
2. **Services**: Embed `BaseService` from framework
3. **Repositories**: Embed `GenericRepository` from framework
4. **Controllers**: Import helpers directly (no embedding)
5. **Imports**: Batch replace with `sed`, cleanup with `goimports`
6. **Exports**: `index.go` facade per package
7. **Tests**: Update imports only, keep in `tests/unit/`
8. **Rollback**: Git tags at phase boundaries

No NEEDS CLARIFICATION items remain.
