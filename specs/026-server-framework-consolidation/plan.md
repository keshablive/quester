# Implementation Plan: Server Framework Consolidation

**Branch**: `026-server-framework-consolidation` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-server-framework-consolidation/spec.md`

## Summary

Consolidate all server code into `internal/framework/` with consistent patterns:

1. **Fix P1 duplicate declarations** in auth services (extract to `auth_types.go`)
2. **Move 60 services** from `internal/services/` to `internal/framework/service/`
3. **Move 39 repositories** from `internal/repositories/` to `internal/framework/repository/`
4. **Move 39 controllers** from `internal/controllers/` to `internal/framework/controller/`
5. **Move 21 routes** from `internal/routes/` to `internal/framework/routes/`
6. **Merge utils** from `internal/utils/` to `internal/framework/utils/`
7. **Update all imports** to use new paths
8. **Verify build and tests** pass after each phase

## Technical Context

**Language/Version**: Go 1.21+ (per go.mod)
**Primary Dependencies**: GORM, Gin, slog, Redis (PooledRedisClient)
**Storage**: PostgreSQL via GORM, Redis for caching
**Testing**: Go testing, existing tests in `tests/unit/` and `tests/integration/`
**Target Platform**: Linux server (Docker)
**Project Type**: Server monolith with framework patterns
**Performance Goals**: Build time within 10% of baseline (SC-009)
**Constraints**: Zero build errors, zero test failures, no circular dependencies
**Scale/Scope**: ~200 files to reorganize (60 services + 39 repos + 39 controllers + 21 routes + utils)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ COMPLIANT | GenericRepository enforces tenant isolation; no changes to tenant logic |
| II. Security First | ✅ COMPLIANT | No security logic changes; refactoring only |
| III. Type Safety | ✅ COMPLIANT | Go's explicit typing preserved; no `interface{}` abuse |
| IV. Error Handling | ✅ COMPLIANT | Error wrapping patterns preserved from BaseService |
| V. Context Propagation | ✅ COMPLIANT | Context patterns preserved; no changes to context flow |
| VI. Consistency & Pattern Adherence | ✅ ENHANCING | This refactor improves pattern consistency |
| VII. Observability | ✅ COMPLIANT | Logging patterns preserved via BaseService |

**Gate Result**: ✅ PASS - No constitutional violations.

### Post-Design Check (Phase 1)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ VERIFIED | `auth_types.go` extraction does not affect tenant isolation |
| II. Security First | ✅ VERIFIED | Auth type extraction preserves validation rules |
| III. Type Safety | ✅ VERIFIED | Shared types ensure consistent typing across auth services |
| IV. Error Handling | ✅ VERIFIED | Error patterns unchanged in refactored code |
| V. Context Propagation | ✅ VERIFIED | Repository interfaces preserve context parameters |
| VI. Consistency & Pattern Adherence | ✅ ENHANCED | Single source of truth for auth types |
| VII. Observability | ✅ VERIFIED | No changes to logging or metrics |

**Post-Design Gate Result**: ✅ PASS - Design enhances Principle VI without violating other principles.

## Project Structure

### Documentation (this feature)

```text
specs/026-server-framework-consolidation/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A - no new data models)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Phase 2 output
```

### Source Code - Current Structure (BEFORE)

```text
server/internal/
├── adapters/            # Keep separate (per Q7)
├── app/
│   └── app.go           # Bootstrap - keep as-is
├── controllers/         # 39 files → MOVE to framework/controller/
├── framework/
│   ├── auth/
│   ├── cache/
│   ├── config/
│   ├── container/
│   ├── controller/      # 4 helper files (pagination, errors, auth_context, helpers)
│   ├── core/
│   ├── database/
│   ├── interfaces/
│   ├── middleware/
│   ├── repository/      # 4 base files (generic, errors, options, tenant_model)
│   ├── service/         # 3 base files (base, errors, transaction)
│   └── ...              # Other framework packages
├── migrations/          # Keep separate (per Q10)
├── mocks/               # Keep separate (per Q8)
├── models/              # Keep as shared package
├── repositories/        # 39 files → MOVE to framework/repository/
├── routes/              # 21 files → MOVE to framework/routes/
├── services/            # 60 files → MOVE to framework/service/
└── utils/               # 2 files → MERGE into framework/utils/
```

### Source Code - Target Structure (AFTER)

```text
server/internal/
├── adapters/            # Unchanged - external integrations
├── app/
│   └── app.go           # Bootstrap only
├── framework/
│   ├── auth/            # Unchanged
│   ├── cache/           # Unchanged
│   ├── config/          # Unchanged
│   ├── container/       # Unchanged
│   ├── controller/
│   │   ├── auth_context.go      # Existing helper
│   │   ├── errors.go            # Existing helper
│   │   ├── helpers.go           # Existing helper
│   │   ├── pagination.go        # Existing helper
│   │   ├── index.go             # NEW: exports (per Q5)
│   │   ├── achievement_controller.go  # MOVED from controllers/
│   │   ├── analytics_controller.go
│   │   └── ... (39 domain controllers)
│   ├── middleware/      # Unchanged
│   ├── repository/
│   │   ├── errors.go            # Existing base
│   │   ├── generic.go           # Existing base
│   │   ├── options.go           # Existing base
│   │   ├── tenant_model.go      # Existing base
│   │   ├── index.go             # NEW: exports (per Q5)
│   │   ├── achievement_repository.go  # MOVED from repositories/
│   │   └── ... (39 domain repositories)
│   ├── routes/
│   │   ├── index.go             # NEW: exports (per Q5)
│   │   ├── routes.go            # MOVED from routes/
│   │   ├── admin_routes.go
│   │   └── ... (21 route files)
│   ├── service/
│   │   ├── base.go              # Existing base
│   │   ├── errors.go            # Existing base
│   │   ├── transaction.go       # Existing base
│   │   ├── index.go             # NEW: exports (per Q5)
│   │   ├── auth_types.go        # NEW: extracted shared types (per Q4)
│   │   ├── achievement_service.go  # MOVED from services/
│   │   └── ... (57 domain services after auth consolidation)
│   └── utils/
│       ├── index.go             # NEW: exports (per Q5)
│       ├── response.go          # MOVED from utils/
│       └── validation.go        # MOVED from utils/
├── migrations/          # Unchanged
├── mocks/               # Unchanged
├── models/              # Unchanged
└── observability/       # Unchanged
```

### Directories to Delete (per Q6)

After consolidation, these empty directories will be removed:

- `internal/controllers/`
- `internal/repositories/`
- `internal/routes/`
- `internal/services/`
- `internal/utils/`

**Structure Decision**: Single framework directory with flat organization per package. Base patterns (e.g., `base.go`, `generic.go`) coexist with domain implementations in the same directory. Each package gets an `index.go` for exports (per Q5 - facade pattern).

## Complexity Tracking

> **No constitutional violations requiring justification.**

| Decision | Rationale | Alternative Rejected |
|----------|-----------|---------------------|
| Flat directory structure | Matches existing framework pattern; Go packages are flat by convention | Subdirectories (e.g., `service/auth/`) rejected - adds unnecessary nesting |
| `index.go` exports | Provides clean public API per Q5 clarification | Direct imports would work but facade provides better encapsulation |
| Tests in `tests/unit/` | Per Q9 clarification - user preference for centralized tests | Co-located tests are Go convention but user preferred separation |
