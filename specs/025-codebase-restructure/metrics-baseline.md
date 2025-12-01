# Metrics Baseline: Codebase Structure Refactoring

**Feature**: 025-codebase-restructure  
**Date**: 2025-12-01  
**Status**: Pre-refactor baseline

## Pre-Refactor State

### Server (Go)

| Metric | Value | Notes |
|--------|-------|-------|
| Total Files | 323 | As stated in spec |
| Build Errors | Multiple | Duplicate declarations in services (login_service.go, signup_service.go, refresh_token_service.go conflict with auth_service.go) |
| Framework Violations | TBD | Need to scan for app imports in framework |

**Known Issues (Pre-existing)**:
- `internal/services/login_service.go` - redeclares types from `auth_service.go`
- `internal/services/signup_service.go` - redeclares types from `auth_service.go`
- `internal/services/refresh_token_service.go` - redeclares types from `auth_service.go`
- `internal/framework/middleware/helpers.go` - undefined `FiberTenantIDKey`

### Client (TypeScript)

| Metric | Value | Notes |
|--------|-------|-------|
| Total Files | 348 | As stated in spec |
| TypeScript Errors | 131 | Pre-existing type mismatches |
| Import Patterns | TBD | Mix of relative and alias imports |

**Known Issues (Pre-existing)**:
- Type mismatches between service types and query types (Quest, Group, Certificate, Course, Property)
- Missing properties in various model types
- Route type constraints causing assignment errors

## Directory Structure Counts

### Server Directories to Consolidate

| Directory | Status | Notes |
|-----------|--------|-------|
| `internal/middleware/` | Exists | To be consolidated into framework |
| `internal/websocket/` | TBD | Check if exists |
| `internal/config/` | TBD | Check if exists |
| `internal/framework/middleware/` | Exists | Target location |
| `internal/framework/websocket/` | TBD | Check if exists |
| `internal/framework/config/` | TBD | Check if exists |

### Client Directories to Reorganize

| Directory | Current | Target |
|-----------|---------|--------|
| `components/pages/` | Exists | → `components/features/` |
| `core/api/services/` | TBD | → `core/services/` |
| `core/hooks/` | Exists | → Reorganize into queries/, mutations/, utils/ |

## Import Pattern Baseline

### Server Import Patterns

```bash
# Count framework violations (imports from app layers)
grep -rn "internal/controllers\|internal/services\|internal/repositories\|internal/models" server/internal/framework/ --include="*.go" | wc -l
```

### Client Import Patterns

```bash
# Count relative parent imports
grep -rn "from '\.\." client/ --include="*.ts" --include="*.tsx" | wc -l

# Count @/ alias imports
grep -rn "from '@/" client/ --include="*.ts" --include="*.tsx" | wc -l
```

## Notes

- Pre-existing build/type errors must be addressed before or during refactoring
- Server services have duplicate type declarations that need consolidation
- Client has type drift between service models and query types
- These issues may be addressed as part of this refactor or flagged for separate work
