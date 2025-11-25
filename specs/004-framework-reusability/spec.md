# Feature Specification: Framework Reusability & Code Consolidation

**Feature Branch**: `004-framework-reusability`  
**Created**: 2025-11-25  
**Status**: Draft  
**Input**: User description: "trim repeated codes of server and use or generate framework codes to expand reusability of codes, better framework structure will be the base task of this specification, finally memory to store the structure of server and increase codes reusability of the framework for other codes of server"

---

## Problem Statement

The Quester server codebase contains significant code duplication across services, controllers, and repositories. Analysis reveals:

- **~200 lines** of exact duplicate code in middleware (rate_limit.go)
- **100+ occurrences** of inconsistent auth context extraction patterns
- **128+ CRUD operations** repeated across 32 repositories
- **50+ request parsing blocks** with identical boilerplate
- **3-4 different patterns** for the same operations (error responses, pagination, etc.)

This duplication leads to:
1. Maintenance burden (fixes must be applied in multiple places)
2. Inconsistent behavior across features
3. Onboarding friction for new developers
4. Higher bug risk from copy-paste errors

---

## Clarifications

### Session 2025-11-25

- Q: How should GenericRepository[T] handle models that lack a TenantID field? → A: Require all models to have TenantID; reject models without it at compile/runtime
- Q: What should be the default and maximum page sizes for ParsePagination()? → A: Default 20, Max 100 (balanced limits for general-purpose APIs)
- Q: How should nested transactions behave when a service calls another service with transactions? → A: Use savepoints for nested calls, allowing partial rollback
- Q: What fields should the standard error response include? → A: Include request_id: `{"success": false, "error": "message", "code": 400, "request_id": "uuid"}`
- Q: How should migration of existing repositories to GenericRepository be approached? → A: Phased by domain - start with low-risk (badges, quests), then high-risk (users, transactions)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Adds New CRUD Entity (Priority: P1)

A developer needs to add a new entity (e.g., "Achievement") with standard CRUD operations. Instead of copying 200+ lines from an existing repository and controller, they use framework base classes that provide all standard operations out of the box.

**Why this priority**: This is the most common development task and highest-impact consolidation. Every new feature requires CRUD operations.

**Independent Test**: Create a new "TestEntity" using only framework base classes. Verify all CRUD operations work without writing custom repository code.

**Acceptance Scenarios**:

1. **Given** a new model struct with standard fields (ID, TenantID, timestamps), **When** developer creates a repository using GenericRepository[Model], **Then** Create, FindByID, FindAll, Update, and Delete operations work automatically
2. **Given** a generic repository, **When** developer needs custom queries, **Then** they can extend the base without rewriting standard operations
3. **Given** 32 existing repositories, **When** framework generic repository is available, **Then** at least 20 repositories can be simplified to use base class with minimal custom code
4. **Given** a model struct without TenantID field, **When** developer attempts to use GenericRepository, **Then** system rejects the model at compile or runtime with clear error message

---

### User Story 2 - Developer Creates New Controller Endpoint (Priority: P1)

A developer adds a new API endpoint. Instead of writing boilerplate for request parsing, auth context extraction, pagination, and error responses, they use framework helpers that handle all common patterns consistently.

**Why this priority**: Controller boilerplate is the second-largest source of duplication. Consistent request handling improves API reliability.

**Independent Test**: Create a test endpoint using only framework helpers for parsing, auth, and responses. Verify it handles all edge cases (invalid JSON, missing auth, pagination limits) correctly.

**Acceptance Scenarios**:

1. **Given** a controller needs request body parsing, **When** developer uses ParseAndValidate[T](), **Then** JSON parsing, validation errors, and error responses are handled automatically
2. **Given** a controller needs user/tenant context, **When** developer uses GetAuthContext(), **Then** UserID, TenantID, and Role are extracted consistently using one pattern
3. **Given** a controller returns paginated data, **When** developer uses ParsePagination(), **Then** page/limit parsing returns default 20, max 100 with bounds checking
4. **Given** page size exceeds 100, **When** ParsePagination() is called, **Then** page size is capped at 100 (not rejected)

---

### User Story 3 - Developer Implements Service Business Logic (Priority: P2)

A developer writes service layer code. Framework provides consistent error handling, transaction management, and common dependency injection patterns so they can focus on business logic.

**Why this priority**: Services contain business logic which varies most between features. Base patterns reduce boilerplate while preserving flexibility.

**Independent Test**: Create a test service that performs a transaction with multiple entity updates. Verify transaction rollback works correctly on failure.

**Acceptance Scenarios**:

1. **Given** a service needs database transaction, **When** developer uses TransactionManager.RunInTransaction(), **Then** automatic commit on success and rollback on error
2. **Given** a repository returns gorm.ErrRecordNotFound, **When** service handles error, **Then** framework converts to user-friendly "not found" error automatically
3. **Given** multiple services need same dependencies (DB, Logger, Cache), **When** they embed BaseService, **Then** common dependencies are available without repetitive constructor code
4. **Given** a service calls another service that starts a transaction inside an existing transaction, **When** inner transaction fails, **Then** savepoint allows partial rollback without failing entire outer transaction

---

### User Story 4 - Remove Duplicate Middleware Code (Priority: P2)

The codebase has exact duplicate rate limiting code in two locations. This should be consolidated to a single framework implementation.

**Why this priority**: Duplicate code creates maintenance risk. This is a quick win with immediate measurable impact.

**Independent Test**: Delete internal/middleware/rate_limit.go, verify all existing rate limiting still works using framework middleware only.

**Acceptance Scenarios**:

1. **Given** duplicate rate_limit.go in both internal/middleware/ and internal/framework/middleware/, **When** app-level duplicate is removed, **Then** all rate limiting works from framework version
2. **Given** framework rate limiter, **When** endpoints need different rate limits, **Then** configurable limits per route still work

---

### User Story 5 - Consistent Error Responses Across API (Priority: P3)

All API endpoints return errors in a consistent format using framework response helpers, improving client integration and debugging.

**Why this priority**: API consistency is important but lower priority than reducing code duplication. Can be done incrementally.

**Independent Test**: Call 10 different endpoints with invalid requests. Verify all return the same error response structure.

**Acceptance Scenarios**:

1. **Given** any controller returns an error, **When** using framework responses.BadRequest(), **Then** response format is `{"success": false, "error": "message", "code": 400, "request_id": "uuid"}`
2. **Given** controllers currently use 4+ different error patterns, **When** migrated to framework helpers, **Then** all errors follow single consistent pattern with request_id for tracing

---

### Edge Cases

- What happens when generic repository is used with a model that lacks TenantID field? → **Rejected at compile/runtime with clear error**
- How does auth context extraction handle missing claims gracefully? → Return error with appropriate 401 response
- What happens when pagination limit exceeds maximum allowed? → **Capped at 100, not rejected**
- How does transaction manager handle nested transactions? → **Uses savepoints for partial rollback capability**

---

## Requirements *(mandatory)*

### Functional Requirements

#### Generic Repository (FR-01x)

- **FR-011**: System MUST provide a generic repository base that implements Create, FindByID, FindAll, Update, Delete operations
- **FR-012**: System MUST enforce tenant-scoped queries; all models MUST have TenantID field (rejected otherwise)
- **FR-013**: System MUST support pagination with default page size of 20 and maximum of 100
- **FR-014**: System MUST allow extending generic repository with custom queries while inheriting base operations
- **FR-015**: System MUST provide consistent error wrapping for all database operations

#### Controller Helpers (FR-02x)

- **FR-021**: System MUST provide request body parsing with automatic validation and error responses
- **FR-022**: System MUST provide single consistent method to extract auth context (UserID, TenantID, Role)
- **FR-023**: System MUST provide pagination parameter parsing with default 20, max 100, capping excessive values
- **FR-024**: System MUST standardize all error responses to format: `{"success": false, "error": "message", "code": N, "request_id": "uuid"}`

#### Service Patterns (FR-03x)

- **FR-031**: System MUST provide transaction manager with savepoint support for nested transactions
- **FR-032**: System MUST provide base service struct with common dependencies (DB, Logger, Cache)
- **FR-033**: System MUST convert common database errors (not found, duplicate key) to service-level errors

#### Middleware Consolidation (FR-04x)

- **FR-041**: System MUST remove duplicate middleware code and use single framework implementation
- **FR-042**: System MUST maintain all existing rate limiting functionality from framework location

#### Code Memory/Structure (FR-05x)

- **FR-051**: System MUST document framework structure and usage patterns for AI/developer reference
- **FR-052**: System MUST maintain a framework architecture document showing component relationships

#### Migration Strategy (FR-06x)

- **FR-061**: Migration MUST proceed in phases: low-risk domains first (badges, quests, leaderboards)
- **FR-062**: High-risk domains (users, transactions, auth) MUST be migrated only after low-risk validation
- **FR-063**: Each migration phase MUST include test coverage verification before proceeding

---

### Key Entities

- **GenericRepository[T]**: Base repository providing CRUD operations for any entity type T with mandatory TenantID
- **AuthContext**: Unified struct containing UserID, TenantID, Role extracted from request context
- **PaginationParams**: Struct for validated pagination parameters (Page, PageSize=20, MaxSize=100)
- **BaseService**: Embedded struct providing common service dependencies
- **TransactionManager**: Interface for managing database transactions with savepoint support for nesting
- **ErrorResponse**: Standard error response struct with success, error, code, request_id fields

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Reduce duplicate code by at least 2,000 lines across repositories, controllers, and services
- **SC-002**: New entity CRUD implementation requires less than 50 lines of custom code (down from 200+)
- **SC-003**: New controller endpoint requires less than 20 lines of boilerplate (down from 50+)
- **SC-004**: 100% of API error responses follow single consistent format with request_id after migration
- **SC-005**: Zero duplicate middleware files exist (consolidate to framework only)
- **SC-006**: At least 20 of 32 repositories use generic base class
- **SC-007**: All controllers use single auth context extraction pattern
- **SC-008**: Framework documentation exists with clear usage examples for each pattern

---

## Assumptions

1. Existing framework code in internal/framework/ is the authoritative location for shared utilities
2. All entities have ID (uuid.UUID), TenantID (uuid.UUID), CreatedAt, UpdatedAt fields - **enforced**
3. Go generics (1.18+) can be used for type-safe generic repositories
4. Fiber is the web framework and patterns should optimize for Fiber's context model
5. GORM is the ORM and patterns should work with GORM's query builder
6. The responses package helpers (BadRequest, NotFound, etc.) are the target standard

---

## Out of Scope

- Changing API response contracts (only internal implementation patterns)
- Adding new features or endpoints (only consolidating existing code)
- Modifying database schema or migrations
- Changing authentication mechanisms (only standardizing context extraction)
- Client-side changes

---

## Dependencies

- Completed 003-framework-consolidation (provides base framework structure)
- Go 1.18+ for generics support (already in use)
- Existing framework packages: responses, utils, core
