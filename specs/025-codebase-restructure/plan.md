# Implementation Plan: Codebase Structure Refactoring

**Branch**: `025-codebase-restructure` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-codebase-restructure/spec.md`

## Summary

Refactor both the Go server (323 files) and React Native client (348 files) to establish clean architectural boundaries between framework and application code. Server work involves consolidating 3 duplicate directories and extracting ~15 service interfaces. Client work involves reorganizing `core/` into 8 clear subdirectories and renaming `pages/` to `features/`. All import paths will be updated to follow consistent patterns.

## Technical Context

**Language/Version**: Go 1.24 (server), TypeScript 5.x (client)  
**Primary Dependencies**: Fiber v2, GORM, PostgreSQL, Redis (server) | React Native, Expo Router, TanStack Query (client)  
**Storage**: PostgreSQL with GORM, Redis for caching  
**Testing**: `go test ./...` (server), `npm run typecheck` + tests (client)  
**Target Platform**: Linux server (Go API), iOS/Android/Web (React Native)
**Project Type**: Mobile + API (monorepo with `server/` and `client/` directories)  
**Performance Goals**: Build times must not increase by >10% after refactoring  
**Constraints**: Zero breaking changes to API contracts, all existing tests must pass  
**Scale/Scope**: 323 server files, 348 client files, ~671 total files affected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ PASS | No changes to tenant isolation; all TenantID patterns preserved |
| II. Security First | ✅ PASS | No security changes; import paths only |
| III. Type Safety | ✅ PASS | TypeScript strict mode maintained; Go types unchanged |
| IV. Error Handling | ✅ PASS | Error patterns preserved during moves |
| V. Context Propagation | ✅ PASS | Context patterns unchanged |
| VI. Consistency & Pattern Adherence | ✅ PASS | Establishing consistent patterns is the goal |
| VII. Observability | ✅ PASS | Logging/metrics paths updated but functionality preserved |

**GATE PASSED**: No constitution violations. This is a structural refactor with no functional changes.

## Project Structure

### Documentation (this feature)

```text
specs/025-codebase-restructure/
├── plan.md              # This file
├── research.md          # Phase 0 output - analysis of current violations
├── data-model.md        # Phase 1 output - file mapping tables
├── quickstart.md        # Phase 1 output - developer migration guide
├── contracts/           # Phase 1 output - interface definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
server/
├── cmd/                              # Entry points (unchanged)
├── internal/
│   ├── framework/                    # FRAMEWORK LAYER (no app imports)
│   │   ├── interfaces/
│   │   │   ├── repositories/         # Repository interfaces
│   │   │   └── services/             # Service interfaces (~15 critical)
│   │   ├── middleware/               # Consolidated from internal/middleware/
│   │   ├── websocket/                # Consolidated from internal/websocket/
│   │   ├── config/                   # Consolidated from internal/config/
│   │   └── [existing framework dirs] # auth, cache, database, etc.
│   ├── controllers/                  # HTTP handlers
│   ├── services/                     # Business logic (implements interfaces)
│   ├── repositories/                 # Data access
│   └── models/                       # GORM models
└── tests/

client/
├── app/                              # Expo Router (unchanged)
├── components/
│   ├── ui/                           # shadcn primitives (unchanged)
│   ├── shared/                       # Reusable business components
│   ├── features/                     # Renamed from pages/
│   ├── layout/                       # Layout components (unchanged)
│   └── auth/                         # Auth components
└── core/
    ├── api/                          # API client only
    ├── services/                     # Moved from api/services
    ├── hooks/
    │   ├── queries/                  # TanStack Query hooks
    │   ├── mutations/                # TanStack Mutation hooks
    │   └── utils/                    # Utility hooks
    ├── auth/                         # Auth contexts (unchanged)
    ├── query/                        # TanStack Query setup (unchanged)
    ├── routes/                       # Route utilities
    ├── config/                       # App configuration
    ├── constants/                    # Constants
    ├── types/                        # Shared types
    ├── utils/                        # Utility functions
    └── index.ts                      # Hierarchical barrel exports
```

**Structure Decision**: Mobile + API monorepo structure. Server follows clean architecture with framework layer isolation. Client follows feature-based organization with type-based hooks.

## Complexity Tracking

> No constitution violations requiring justification.

---

## Phase 0: Research Tasks

### R1: Framework Import Violation Analysis

**Task**: Identify all files in `internal/framework/` that import from app layers

**Method**: Run `go list` or grep for import patterns:
```bash
grep -r "internal/controllers\|internal/services\|internal/repositories\|internal/models" server/internal/framework/
```

**Output**: List of violating files with specific imports to fix

### R2: Duplicate Directory Inventory

**Task**: Compare files in duplicate directories to identify conflicts

**Directories to analyze**:
- `internal/middleware/` vs `internal/framework/middleware/`
- `internal/websocket/` vs `internal/framework/websocket/`
- `internal/config/` vs `internal/framework/config/`

**Output**: Conflict resolution plan per directory

### R3: Client Current Structure Mapping

**Task**: Map current `core/` and `components/pages/` to target structure

**Method**: List all files with their current and target locations

**Output**: File migration table for client refactoring

### R4: Service Interface Extraction List

**Task**: Identify the ~15 critical path services for interface extraction

**Services to prioritize**: auth, user, payment, courses (per clarifications)

**Output**: List of service files with their public method signatures

---

## Phase 1: Design Artifacts

### D1: data-model.md

**Purpose**: Document file mappings and directory transformations

**Contents**:
- Server duplicate directory resolution table
- Server framework violation fixes
- Client core/ reorganization mapping
- Client components/pages/ → components/features/ mapping

### D2: contracts/

**Purpose**: Define service interfaces for framework layer

**Files to create**:
- `contracts/services/auth_service.go` - AuthService interface
- `contracts/services/user_service.go` - UserService interface
- `contracts/services/payment_service.go` - PaymentService interface
- `contracts/services/course_service.go` - CourseService interface
- (Additional ~11 critical services TBD in research)

### D3: quickstart.md

**Purpose**: Developer guide for the transition

**Contents**:
- Import path changes cheat sheet
- IDE cache clearing instructions
- Verification commands
- Rollback procedures

---

## Phase 2: Implementation Phases

### Server Phase (Execute First)

**Phase S1: Framework Violation Fixes** (P1)
- Extract interfaces for any framework code importing app code
- Move implementations to app layer
- Verify: `go build ./internal/framework/...`

**Phase S2: Directory Consolidation** (P1)
- Consolidate `internal/middleware/` → `internal/framework/middleware/`
- Consolidate `internal/websocket/` → `internal/framework/websocket/`
- Consolidate `internal/config/` → `internal/framework/config/`
- Update all imports after each move
- Atomic commit per directory
- Verify: `go build ./...` after each

**Phase S3: Service Interface Definitions** (P2)
- Create `internal/framework/interfaces/services/` directory
- Define interfaces for ~15 critical services
- Update DI container registrations
- Verify: `go build ./...` and `go test ./...`

### Client Phase (Execute Second)

**Phase C1: Core Reorganization** (P2)
- Create target directory structure
- Move services from `api/services/` to `core/services/`
- Reorganize hooks into `hooks/queries/`, `hooks/mutations/`, `hooks/utils/`
- Create hierarchical barrel files
- Update all imports
- Verify: `npm run typecheck`

**Phase C2: Component Reorganization** (P2)
- Rename `components/pages/` to `components/features/`
- Apply usage count rule for shared/ vs features/
- Update all imports
- Verify: `npm run typecheck`

**Phase C3: Import Consistency** (P1)
- Ensure all imports use `@/` alias
- Remove relative parent imports (`../../..`)
- Verify: lint pass

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Circular dependencies after moves | Validate import graph after each directory move |
| Broken builds during transition | Atomic commits + validation after each move |
| Missed import updates | IDE refactoring + grep verification scripts |
| Test failures | Run full test suite after each phase |
| IDE caching issues | Document cache clear steps in quickstart.md |

---

## Verification Commands

**Server**:
```bash
# Framework independence
go build ./internal/framework/...

# Full build
go build ./...

# Tests
go test ./...
```

**Client**:
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Tests (if available)
npm test
```

---

## Estimated Effort

| Phase | Files Affected | Estimated Time |
|-------|----------------|----------------|
| S1: Framework Violations | ~10-20 | 2-4 hours |
| S2: Directory Consolidation | ~30-50 | 3-5 hours |
| S3: Service Interfaces | ~15-20 | 2-3 hours |
| C1: Core Reorganization | ~50-80 | 4-6 hours |
| C2: Component Reorganization | ~100-150 | 4-6 hours |
| C3: Import Consistency | All client | 2-3 hours |
| **Total** | ~300-400 | **17-27 hours** |

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
