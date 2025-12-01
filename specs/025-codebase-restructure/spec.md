# Feature Specification: Codebase Structure Refactoring

**Feature Branch**: `025-codebase-restructure`  
**Created**: 2025-12-01  
**Status**: Draft  
**Input**: User description: "Refactor client and server folder structure into clean framework architecture with proper module organization and fix all import paths"

## Overview

The Quester codebase has grown organically, resulting in inconsistent folder structures, duplicated organizational patterns, and unclear boundaries between framework code and application code. This refactoring will reorganize both the Go server and React Native client into clean, maintainable architectures with clear separation of concerns.

### Current State Analysis

**Server (Go) - 323 files:**
- `internal/framework/` (96 files) - Infrastructure utilities mixed with business interfaces
- `internal/services/` (61 files) - Business logic with no interface definitions
- `internal/controllers/` (39 files) - HTTP handlers with inconsistent patterns
- `internal/repositories/` (39 files) - Data access with partial DI adoption
- `internal/middleware/` - Duplicates `framework/middleware/`
- `internal/websocket/` - Duplicates `framework/websocket/`
- `internal/config/` - Duplicates `framework/config/`

**Client (TypeScript) - 348 files:**
- `core/` (129 files) - Framework utilities, hooks, API, auth
- `components/` (195 files) - UI, pages, shared, layout
- `app/` (18 files) - Expo Router routes
- Multiple barrel files with inconsistent exports

### Target State

A clean architecture where:
1. Framework code is truly reusable and application-agnostic
2. Application code is clearly separated by domain
3. Import paths are consistent and predictable
4. No duplication between directories
5. Each module has a single responsibility

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Server Framework Independence (Priority: P1)

**As a** backend developer,  
**I want** the server framework layer to be completely independent from application code,  
**So that** I can test, build, and potentially reuse framework components without application dependencies.

**Why P1**: Framework independence is the foundation for all other refactoring. If the framework imports application code, the entire architecture is compromised. This must be fixed first to enable clean separation.

**Independent Test**: Run `go build ./internal/framework/...` successfully with zero imports from `internal/controllers`, `internal/services`, `internal/repositories`, or `internal/models`.

**Acceptance Scenarios**:

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Framework builds independently | Server codebase | `go build ./internal/framework/...` is run | Build succeeds with no application imports |
| Interfaces defined in framework | A service needs a repository | Developer checks framework/interfaces | Interface exists for cross-layer contracts |
| No circular dependencies | Framework and app layers exist | Import graph is analyzed | No cycles between framework and app |

---

### User Story 2 - Server Directory Consolidation (Priority: P1)

**As a** backend developer,  
**I want** duplicate directories consolidated into single locations,  
**So that** I know exactly where to find and add code without confusion.

**Why P1**: Duplicate directories (`middleware/`, `websocket/`, `config/`) cause confusion about where code belongs and lead to inconsistent patterns. Developers waste time searching for code.

**Independent Test**: After refactoring, there should be exactly ONE location for middleware, websocket, and config code.

**Acceptance Scenarios**:

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Single middleware location | Duplicate middleware directories exist | Consolidation is complete | Only `internal/framework/middleware/` exists |
| Single websocket location | Duplicate websocket directories exist | Consolidation is complete | Only `internal/framework/websocket/` exists |
| Single config location | Duplicate config directories exist | Consolidation is complete | Only `internal/framework/config/` exists |
| All imports updated | Code references old locations | Files are moved | All imports point to new locations |

---

### User Story 3 - Server Service Interface Definitions (Priority: P2)

**As a** backend developer,  
**I want** all services to implement interfaces defined in the framework layer,  
**So that** I can mock services for testing and swap implementations without changing consumers.

**Why P2**: Without interfaces, services are tightly coupled. This blocks unit testing with mocks and makes the DI container less useful.

**Independent Test**: Every service in `internal/services/` implements an interface from `internal/framework/interfaces/`.

**Acceptance Scenarios**:

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Service has interface | A service like `UserService` exists | Developer checks interfaces | `UserServiceInterface` exists in framework |
| Mock can be created | Interface exists for service | Developer creates mock | Mock implements same interface |
| DI resolves by interface | Service registered in container | Container resolves dependency | Returns instance implementing interface |

---

### User Story 4 - Client Core Module Organization (Priority: P2)

**As a** frontend developer,  
**I want** the client `core/` directory organized by responsibility,  
**So that** I can quickly find utilities, hooks, and services without hunting through nested folders.

**Why P2**: The `core/` directory mixes API services, hooks, auth, and utilities. Finding code requires knowing the historical organization rather than logical grouping.

**Independent Test**: A new developer can find any utility, hook, or service by its category within 10 seconds using the folder structure.

**Acceptance Scenarios**:

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Hooks in one place | Hooks scattered across core | Refactoring complete | All hooks in `core/hooks/` with clear subfolders |
| API client isolated | API mixed with services | Refactoring complete | `core/api/` contains only client and types |
| Services grouped | Services in api/services | Refactoring complete | Services moved to `core/services/` |
| Clear barrel exports | Multiple barrel files | Refactoring complete | Single `core/index.ts` with categorized exports |

---

### User Story 5 - Client Component Organization (Priority: P2)

**As a** frontend developer,  
**I want** components organized by their role (UI primitives, shared, domain),  
**So that** I can quickly find and create components in the right location.

**Why P2**: Current structure mixes domain pages, shared components, and UI primitives. Component location is not predictable.

**Independent Test**: Any component can be categorized into exactly one of: `ui/`, `shared/`, or `features/` based on clear rules.

**Acceptance Scenarios**:

| Scenario | Given | When | Then |
|----------|-------|------|------|
| UI primitives isolated | shadcn components exist | Refactoring complete | All in `components/ui/` with no business logic |
| Shared components clear | Reusable components exist | Refactoring complete | All in `components/shared/` with no domain knowledge |
| Feature components grouped | Page components exist | Refactoring complete | Grouped by feature in `components/features/` |
| Import paths updated | Components moved | All files checked | No broken imports |

---

### User Story 6 - Import Path Consistency (Priority: P1)

**As a** developer (frontend or backend),  
**I want** all import paths to follow a consistent pattern,  
**So that** I can write imports without guessing and refactoring doesn't break everything.

**Why P1**: Inconsistent imports make refactoring risky and slow. Auto-import tools struggle with inconsistent patterns. This is critical for both codebases.

**Independent Test**: All imports in the codebase pass linting with consistent alias patterns (`@/` for client, full paths for server).

**Acceptance Scenarios**:

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Client uses @/ alias | Client imports exist | Linting runs | All imports use `@/` prefix consistently |
| Server uses full paths | Server imports exist | Linting runs | All imports use `github.com/keshablive/quester/internal/...` |
| No relative parent imports | Deep nesting exists | Imports checked | No `../../..` patterns except in same module |
| Barrel files work | Barrel exports defined | Imports resolve | All barrel imports resolve correctly |

---

### Edge Cases

- **Circular Dependencies**: Moving code may create new circular dependencies. Each move must be validated.
- **Build Failures**: Intermediate states during refactoring may not compile. Use feature flags or parallel structures.
- **Runtime Errors**: Import path changes may cause runtime failures if not all references updated.
- **Test Failures**: Tests may import internal paths that change. All tests must pass post-refactor.
- **IDE Caching**: IDEs may cache old import paths. Document cache clearing steps.

---

## Requirements *(mandatory)*

### Functional Requirements - Server

- **FR-001**: Server framework (`internal/framework/`) MUST NOT import from `internal/controllers`, `internal/services`, `internal/repositories`, or `internal/models`
- **FR-002**: Server MUST have a single `internal/framework/interfaces/` directory containing all cross-layer interface definitions
- **FR-003**: Server MUST consolidate duplicate directories:
  - `internal/middleware/` → `internal/framework/middleware/`
  - `internal/websocket/` → `internal/framework/websocket/`
  - `internal/config/` → `internal/framework/config/`
- **FR-004**: Server MUST define interfaces for critical path services (~15 core: auth, user, payment, courses) in `internal/framework/interfaces/services/`; remaining services deferred to future phases
- **FR-005**: Server MUST update all import paths after file moves
- **FR-006**: Server MUST maintain backward compatibility with existing API contracts
- **FR-007**: Server `go build ./...` MUST succeed after all changes
- **FR-008**: Server `go test ./...` MUST pass after all changes

### Functional Requirements - Client

- **FR-010**: Client MUST reorganize `core/` with clear subdirectories:
  - `core/api/` - API client, types, interceptors
  - `core/services/` - Domain services (moved from api/services)
  - `core/hooks/` - All React hooks (queries, mutations, utilities)
  - `core/auth/` - Authentication (unchanged)
  - `core/query/` - TanStack Query infrastructure (unchanged)
  - `core/utils/` - Utility functions
  - `core/types/` - Shared TypeScript types
  - `core/constants/` - Application constants
- **FR-011**: Client MUST reorganize `components/` with clear subdirectories:
  - `components/ui/` - UI primitives (shadcn, unchanged)
  - `components/shared/` - Reusable business components
  - `components/features/` - Feature-specific components (renamed from pages)
  - `components/layout/` - Layout components (unchanged)
- **FR-012**: Client MUST use `@/` alias for all imports outside the same directory
- **FR-013**: Client MUST update all import paths after file moves
- **FR-014**: Client `npm run typecheck` MUST pass after all changes
- **FR-015**: Client MUST have a single `core/index.ts` barrel file with categorized exports

### Key Entities

- **Framework Module**: Reusable infrastructure code with no application dependencies
- **Application Module**: Business logic that depends on framework modules
- **Interface Contract**: TypeScript interface or Go interface defining cross-layer communication
- **Barrel File**: Index file that re-exports module contents for cleaner imports
- **Import Alias**: Path alias (like `@/`) that simplifies import statements

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Server framework builds independently (`go build ./internal/framework/...` succeeds with 0 application imports)
- **SC-002**: Server has 0 duplicate directories (only one location for middleware, websocket, config)
- **SC-003**: Server has interface definitions for critical path services (~15 interfaces for auth, user, payment, courses)
- **SC-004**: Client `core/` has exactly 8 top-level subdirectories with clear purposes
- **SC-005**: Client `components/` has exactly 4 top-level subdirectories (ui, shared, features, layout)
- **SC-006**: 0 import errors after refactoring (both `go build` and `npm run typecheck` pass)
- **SC-007**: 0 test failures after refactoring (both `go test ./...` and `npm test` pass)
- **SC-008**: All imports follow consistent patterns (verifiable by linting)
- **SC-009**: New developer can locate any file in under 30 seconds using folder structure alone
- **SC-010**: Build times do not increase by more than 10% after refactoring

---

## Assumptions

1. The existing test suites adequately cover the codebase (no hidden functionality)
2. All current imports are necessary (no dead code to remove first)
3. The @/ alias is already configured in the client's tsconfig.json
4. The server's go.mod module path is `github.com/keshablive/quester`
5. No external systems depend on internal import paths
6. IDE auto-import will assist developers during transition

---

## Clarifications

### Session 2025-12-01

- Q: File conflict resolution strategy when consolidating duplicate directories? → A: Prefer framework version; merge unique app-specific code into framework
- Q: Execution order - server first, client first, parallel, or by layer? → A: Server first, then client (establishes patterns before applying to client)
- Q: Service interface scope - all at once or phased? → A: Critical path first (~15 core services: auth, user, payment, courses), defer remaining to subsequent phases
- Q: Rollback strategy if issues arise mid-refactor? → A: Git checkpoints with atomic commits per logical unit; each directory consolidation = 1 commit for easy revert

---

## Out of Scope

1. Adding new features or functionality
2. Changing API contracts or endpoints
3. Database schema changes
4. Performance optimizations beyond build time
5. Adding new tests (only fixing existing test paths)
6. Upgrading dependencies
7. Changing the DI container implementation
8. Refactoring individual service internals

---

## Proposed Directory Structures

### Server Target Structure

```
server/
├── cmd/                              # Entry points (unchanged)
├── internal/
│   ├── framework/                    # ✅ FRAMEWORK LAYER (no app imports)
│   │   ├── auth/                     # JWT, password hashing, 2FA
│   │   ├── cache/                    # Redis client, pooling
│   │   ├── config/                   # Config loading (consolidated)
│   │   ├── container/                # DI container
│   │   ├── controller/               # Controller helpers
│   │   ├── core/                     # Base types, validation
│   │   ├── database/                 # GORM, migrations
│   │   ├── interfaces/               # ⬆️ EXPANDED: All cross-layer interfaces
│   │   │   ├── repositories/         # Repository interfaces
│   │   │   └── services/             # Service interfaces
│   │   ├── middleware/               # HTTP middleware (consolidated)
│   │   ├── metrics/                  # Prometheus metrics
│   │   ├── pagination/               # Pagination utilities
│   │   ├── payment/                  # Payment providers
│   │   ├── push/                     # FCM, notifications
│   │   ├── repository/               # Generic repository patterns
│   │   ├── responses/                # HTTP response helpers
│   │   ├── sentry/                   # Error tracking
│   │   ├── service/                  # Base service patterns
│   │   ├── storage/                  # S3, file storage
│   │   ├── streaming/                # RTMP, HLS
│   │   ├── utils/                    # Generic utilities
│   │   └── websocket/                # WebSocket manager (consolidated)
│   │
│   ├── app/                          # Application bootstrap
│   ├── controllers/                  # HTTP handlers
│   ├── models/                       # GORM models
│   ├── repositories/                 # Data access implementations
│   ├── routes/                       # Route definitions
│   ├── services/                     # Business logic implementations
│   ├── adapters/                     # Interface adapters
│   ├── mocks/                        # Test mocks
│   └── migrations/                   # DB migrations
│
├── tests/                            # Integration/unit tests
└── docs/                             # Documentation
```

### Client Target Structure

```
client/
├── app/                              # Expo Router (unchanged)
├── assets/                           # Static assets (unchanged)
├── components/
│   ├── ui/                           # UI primitives (shadcn)
│   ├── shared/                       # Reusable business components
│   ├── features/                     # ⬆️ RENAMED from pages/
│   │   ├── achievements/
│   │   ├── badges/
│   │   ├── dashboard/
│   │   ├── learning/
│   │   ├── marketplace/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── quests/
│   │   ├── settings/
│   │   └── transactions/
│   ├── layout/                       # Layout components
│   └── auth/                         # Auth-specific components
│
├── core/
│   ├── api/                          # API client only
│   │   ├── client.ts
│   │   └── types.ts
│   ├── services/                     # ⬆️ MOVED from api/services
│   │   ├── auth.service.ts
│   │   ├── courses.service.ts
│   │   └── ...
│   ├── hooks/                        # All hooks
│   │   ├── queries/                  # TanStack Query hooks
│   │   ├── mutations/                # TanStack Mutation hooks
│   │   └── utils/                    # Utility hooks (useDebounce, etc)
│   ├── auth/                         # Auth contexts, providers
│   ├── query/                        # TanStack Query setup
│   ├── routes/                       # Route utilities
│   ├── config/                       # App configuration
│   ├── constants/                    # Constants
│   ├── types/                        # Shared types
│   ├── utils/                        # Utility functions
│   └── index.ts                      # Barrel exports
│
└── templates/                        # Code templates
```
