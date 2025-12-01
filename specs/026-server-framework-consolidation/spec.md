# Feature Specification: Server Framework Consolidation

**Feature Branch**: `026-server-framework-consolidation`  
**Created**: December 1, 2025  
**Status**: Draft  
**Input**: User description: "refactor server folder structure and reorganise all codes in framework, also fix all paths and imports afterwards"

## Overview

This specification defines the consolidation of the server codebase into a clean framework architecture. Currently, the server has:
- Duplicate code declarations across `auth_service.go`, `login_service.go`, `signup_service.go`, and `refresh_token_service.go`
- Controllers, services, repositories, routes, and models scattered outside the framework
- No clear separation between reusable framework components and application-specific implementations

The goal is to reorganize all server code into a cohesive framework structure where:
1. `internal/framework/` contains all reusable components (services, controllers, repositories, routes, middleware, utils)
2. `internal/app/` contains only bootstrap/initialization code (`app.go`)
3. `internal/models/` remains as a shared independent package
4. All imports are updated to reflect the new structure
5. Build errors are resolved

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolve Duplicate Declarations (Priority: P1)

As a developer, I want the server to build without duplicate declaration errors so that I can compile and run the application.

**Why this priority**: The server currently fails to build due to duplicate declarations in the services layer. This blocks all other development work.

**Independent Test**: Run `go build ./...` from the server directory and verify zero build errors.

**Acceptance Scenarios**:

1. **Given** the server codebase, **When** I run `go build ./...`, **Then** the build succeeds with no errors
2. **Given** duplicate declarations in `auth_service.go`, `login_service.go`, `signup_service.go`, and `refresh_token_service.go`, **When** the code is refactored, **Then** each type and function is declared exactly once
3. **Given** shared types like `LoginRequest`, `SignupRequest`, `RefreshResponse`, **When** consolidated, **Then** they reside in a single `auth_types.go` file and are imported by the separate service files (`login_service.go`, `signup_service.go`, `refresh_token_service.go`)

---

### User Story 2 - Consolidate Services into Framework (Priority: P2)

As a developer, I want all services organized under `internal/framework/` with clear patterns so that I can easily find and extend service implementations.

**Why this priority**: Services are the core business logic layer. Organizing them provides a foundation for maintainability.

**Independent Test**: Verify all service files are under `internal/framework/service/` or `internal/app/services/` with consistent import paths.

**Acceptance Scenarios**:

1. **Given** 60 service files in `internal/services/`, **When** reorganized, **Then** all services are moved to `internal/framework/service/` alongside framework base patterns
2. **Given** service files with inconsistent patterns, **When** consolidated, **Then** all services follow the `BaseService` embedding pattern
3. **Given** service dependencies, **When** imports are updated, **Then** all imports use `internal/framework/service/` path

---

### User Story 3 - Consolidate Repositories into Framework (Priority: P2)

As a developer, I want all repositories organized under `internal/framework/` with consistent patterns so that data access is standardized.

**Why this priority**: Repositories provide data access. Organizing them ensures consistent multi-tenant patterns.

**Independent Test**: Verify all repository files use `GenericRepository` pattern and are properly organized.

**Acceptance Scenarios**:

1. **Given** 39 repository files in `internal/repositories/`, **When** reorganized, **Then** they are moved to `internal/framework/repository/` and follow the `GenericRepository` embedding pattern
2. **Given** repository imports, **When** updated, **Then** all imports point to `internal/framework/repository/`
3. **Given** tenant-scoped queries, **When** reviewed, **Then** all repositories enforce tenant isolation

---

### User Story 4 - Consolidate Controllers into Framework (Priority: P2)

As a developer, I want all controllers organized under a consistent structure so that HTTP handlers follow uniform patterns.

**Why this priority**: Controllers are the API entry points. Consistent organization improves discoverability.

**Independent Test**: Verify all controller files are properly organized with consistent patterns.

**Acceptance Scenarios**:

1. **Given** 39 controller files in `internal/controllers/`, **When** reorganized, **Then** they are moved to `internal/framework/controller/` alongside framework helpers
2. **Given** controller dependencies, **When** imports are updated, **Then** all controllers use `internal/framework/controller/` path for pagination and error handling
3. **Given** controller tests, **When** imports are updated, **Then** all tests pass

---

### User Story 5 - Consolidate Routes (Priority: P3)

As a developer, I want all route definitions organized consistently so that API endpoints are discoverable.

**Why this priority**: Routes define the API surface. Consistent organization improves maintainability.

**Independent Test**: Verify all route files are organized and register correctly.

**Acceptance Scenarios**:

1. **Given** 21 route files in `internal/routes/`, **When** organized, **Then** routes are moved to `internal/framework/routes/` with clear groupings
2. **Given** route middleware, **When** imports are updated, **Then** all routes use `internal/framework/middleware/` correctly

---

### User Story 6 - Consolidate Models (Priority: P3)

As a developer, I want all models organized with consistent patterns so that data structures are standardized.

**Why this priority**: Models define data structures. Consistent patterns ensure proper GORM mappings.

**Independent Test**: Verify all models implement `TenantModel` interface where appropriate.

**Acceptance Scenarios**:

1. **Given** 47 model files in `internal/models/`, **When** reviewed, **Then** models remain at `internal/models/` as a shared independent package
2. **Given** tenant-scoped models, **When** reviewed, **Then** they implement `TenantModel` interface
3. **Given** model imports, **When** updated, **Then** all imports are consistent across framework and app packages

---

### User Story 7 - Update All Imports (Priority: P1)

As a developer, I want all import paths updated correctly so that the codebase compiles after reorganization.

**Why this priority**: Incorrect imports will break the build. This is critical for the refactor to succeed.

**Independent Test**: Run `go build ./...` and `go test ./...` with zero errors.

**Acceptance Scenarios**:

1. **Given** files moved to new locations, **When** imports are updated, **Then** `go build ./...` succeeds
2. **Given** test files with imports, **When** updated, **Then** `go test ./...` succeeds
3. **Given** internal packages, **When** imports are updated, **Then** no circular dependencies exist

---

### Edge Cases

- What happens when a service file has both framework-level and app-level code?
  - Split into separate files with clear responsibilities
- How to handle shared utility functions across services?
  - Create a shared utilities package in `internal/framework/utils/`
- What happens to `internal/utils/` (response.go, validation.go)?
  - Merge into `internal/framework/utils/` to maintain single utils location
- What happens to backup files in `.backup/`?
  - Keep for reference during refactoring, remove after verification
- What is the rollback strategy if build fails mid-refactor?
  - Use git tags at phase boundaries (`pre-phase-1`, `post-phase-1`, etc.) to enable precise rollback to last working state

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST build successfully with `go build ./...` after all changes
- **FR-002**: System MUST pass all existing tests with `go test ./...` after changes
- **FR-003**: Each type (struct, interface) MUST be declared exactly once across the codebase
- **FR-004**: Services MUST follow `BaseService` embedding pattern
- **FR-005**: Repositories MUST follow `GenericRepository` embedding pattern
- **FR-006**: Controllers MUST use framework error handling and pagination helpers
- **FR-007**: All tenant-scoped operations MUST enforce tenant isolation
- **FR-008**: Import paths MUST use the module path `github.com/keshablive/quester`
- **FR-009**: Framework packages MUST NOT import from app packages (dependency inversion)
- **FR-010**: Circular dependencies MUST NOT exist between packages

### Key Entities

- **BaseService**: Framework struct providing logging, caching, and transaction support for all services
- **GenericRepository**: Framework struct providing tenant-scoped CRUD operations for all repositories
- **Controller Helpers**: Framework utilities for pagination, error handling, and auth context
- **Middleware**: Framework HTTP middleware for authentication, rate limiting, etc.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `go build ./...` completes with zero errors
- **SC-002**: `go test ./...` passes all existing tests
- **SC-003**: Zero duplicate type declarations across the codebase
- **SC-004**: Framework directory (`internal/framework/`) contains all services, controllers, repositories, routes
- **SC-005**: App directory (`internal/app/`) contains only bootstrap/initialization code
- **SC-006**: All services (60 files) follow consistent `BaseService` pattern
- **SC-007**: All repositories (39 files) follow consistent `GenericRepository` pattern
- **SC-008**: All imports updated and verified (0 broken imports)
- **SC-009**: Build time remains within 10% of baseline

## Clarifications

### Session 2025-12-01 (Reset)

- Q1: Service layer pattern - relationship between BaseService and domain services? → A: Keep base patterns separate (`base.go`, `errors.go`, `transaction.go`) + domain services embed `BaseService`
- Q2: Repository layer pattern - relationship between GenericRepository and domain repos? → A: Keep base patterns separate (`generic.go`, `errors.go`, `options.go`) + domain repos embed `GenericRepository`
- Q3: Controller layer pattern - relationship between helpers and domain controllers? → A: Keep helpers separate (`pagination.go`, `errors.go`, `auth.go`) + controllers import helpers directly (no embedding)
- Q4: Duplicate type resolution strategy for auth services? → A: Extract shared types to `auth_types.go`, keep separate service files (`login_service.go`, `signup_service.go`, `refresh_token_service.go`) that import types
- Q5: Framework package export strategy? → A: Single `index.go` per package that exports all public types/functions (facade pattern)
- Q6: Directory cleanup strategy after moving files? → A: Delete empty directories immediately after moving files
- Q7: Adapters directory handling? → A: Keep `internal/adapters/` as separate package (not part of framework)
- Q8: Mocks directory handling? → A: Keep `internal/mocks/` as dedicated top-level package for all mocks
- Q9: Test file location strategy? → A: Centralize all tests in `tests/unit/` directory with mirrored structure. **Scope note**: This applies to new tests; existing tests remain in `tests/unit/` and `tests/integration/` with import paths updated during refactor.
- Q10: Migrations directory handling? → A: Keep `internal/migrations/` as separate top-level package (not part of framework)

## Assumptions

- The existing `internal/framework/` structure represents the target architecture patterns
- Services can be split into framework base classes and app implementations
- The duplicate declarations in auth services are from incremental development and should be consolidated
- Tests should continue to pass without behavioral changes (refactoring only)
- The module path `github.com/keshablive/quester` remains unchanged

## Out of Scope

- Adding new features or functionality
- Changing business logic or behavior
- Database migrations or schema changes
- Adding new tests (existing tests should continue to pass)
- Client-side changes
