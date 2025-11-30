# Server Service Layer DI Completion

## Feature Overview

Complete the dependency injection (DI) refactoring for the server's service layer to eliminate tight coupling to `*gorm.DB`, remove global state access (`database.DB`, `cache.Client`), and standardize constructor patterns. This enables proper unit testing with mocks, improves code maintainability, and follows clean architecture principles.

## ⚠️ Prerequisite: Codebase Restoration

**CRITICAL**: The active server codebase (`server/internal/`) is severely incomplete:
- Only 3 of 56 services exist
- Only 1 of 35 controllers exist
- Repositories folder is missing entirely
- Framework is missing 14 of 16 subdirectories
- **The codebase cannot compile in its current state**

The full codebase exists in `settings/backups/server/internal/` and must be restored before proceeding.

## Problem Statement

The full server codebase (in backup) has ~25 services that accept `*gorm.DB` directly in constructors, ~10 services that access the global `database.DB` singleton in methods, and 3 services with constructor parameter explosion (5+ parameters). This tight coupling:

1. **Prevents effective unit testing** - Cannot mock database interactions without integration tests
2. **Creates hidden dependencies** - Global state access makes dependency graph unclear
3. **Violates clean architecture** - Services should depend on abstractions, not implementations
4. **Increases refactoring risk** - Changes to database layer ripple through service layer

## User Stories

### US0: Codebase Restoration (PREREQUISITE)
**As a** backend developer  
**I want** the full server codebase restored from backup  
**So that** I have a compilable codebase to refactor

**Acceptance Criteria:**
- [ ] All 56 services restored to `internal/services/`
- [ ] All 35 controllers restored to `internal/controllers/`
- [ ] All 25 repositories restored to `internal/repositories/`
- [ ] All 16 framework subdirectories restored
- [ ] Server compiles successfully (`go build ./...`)
- [ ] Existing tests pass

### US1: Repository Interface Extraction
**As a** backend developer  
**I want** repository interfaces defined in the framework layer  
**So that** I can mock repositories for unit testing and swap implementations

**Acceptance Criteria:**
- [ ] 15 repository interfaces extracted to `internal/framework/interfaces/`
- [ ] All interfaces follow context-first signature pattern
- [ ] Existing repository implementations satisfy new interfaces
- [ ] Interfaces are mockable with testify/mock

### US2: P1 Service DI Refactoring
**As a** backend developer  
**I want** P1 services (Property, Quest, User, Transaction, Badge, Notification) refactored to use repository interfaces  
**So that** critical business logic can be unit tested in isolation

**Acceptance Criteria:**
- [ ] 6 P1 services accept repository interfaces instead of `*gorm.DB`
- [ ] Old constructors deprecated with clear migration path
- [ ] All P1 services registered in DI container
- [ ] Unit tests created using mock repositories

### US3: Global State Elimination
**As a** backend developer  
**I want** global `database.DB` and `cache.Client` access removed from services  
**So that** all dependencies are explicitly injected and testable

**Acceptance Criteria:**
- [ ] `audit_log_service.go` - 6 global DB calls eliminated
- [ ] `auth_service.go` - 11 global DB calls eliminated
- [ ] `kms_service.go` - 4 global DB calls eliminated
- [ ] `two_factor_service.go` - 22 global DB calls eliminated
- [ ] `user_service.go` - 2 global DB calls eliminated
- [ ] `blacklist_service.go` - 3 global cache calls eliminated

### US4: Config Struct Pattern
**As a** backend developer  
**I want** services with 5+ constructor parameters to use config structs  
**So that** constructors are readable and extensible

**Acceptance Criteria:**
- [ ] `SocialService` (7 params) uses `SocialServiceConfig` struct
- [ ] `TransactionService` (6 params) uses `TransactionServiceConfig` struct
- [ ] `MarketplaceService` (5 params) uses `MarketplaceServiceConfig` struct
- [ ] Config structs include validation and sensible defaults

### US5: Mock Generation & Unit Tests
**As a** backend developer  
**I want** mocks generated for all repository interfaces  
**So that** I can write comprehensive unit tests for services

**Acceptance Criteria:**
- [ ] Mockery configuration added for all 15 interfaces
- [ ] Mocks generated in `internal/mocks/`
- [ ] Unit tests added for 6 P1 services
- [ ] Test coverage reports available

## Functional Requirements

### FR1: Repository Interface Design
- Interfaces MUST follow context-first parameter signature: `func Method(ctx context.Context, ...)`
- Interfaces MUST include tenant-scoped methods where applicable
- Interfaces MUST NOT import from application layer (models, services)
- Each interface MUST have corresponding mock implementation

### FR2: Service Constructor Changes
- New constructors MUST accept interfaces, not concrete types
- Old constructors MUST be marked deprecated with `// Deprecated: use NewXServiceWithConfig` comment
- Services MUST NOT hold `*gorm.DB` reference after refactoring
- Transaction handling MUST use `TransactionManager` interface

### FR3: DI Container Registration
- All refactored services MUST be registered in `app.go` `registerServices()`
- Registration MUST use singleton lifecycle for services
- Registration MUST resolve dependencies from container, not globals
- Registration MUST log success/failure for each service

### FR4: Global State Removal
- Services MUST NOT access `database.DB` global after refactoring
- Services MUST NOT access `cache.Client` global after refactoring
- All database/cache access MUST go through injected dependencies
- Audit trail MUST be maintained for security-critical services

## Non-Functional Requirements

### NFR1: Backward Compatibility
- Existing API contracts MUST NOT change
- Existing integration tests MUST pass without modification
- Deprecation warnings MUST be clear and actionable

### NFR2: Performance
- DI container resolution MUST NOT add measurable latency (<1ms)
- Singleton services MUST be created once at startup
- No runtime reflection in hot paths

### NFR3: Testability
- All P1 services MUST be unit testable with mocks
- Test execution time MUST be <5 seconds for unit test suite
- Coverage target: 80% for refactored services

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Services with direct DB access | 0 (down from 20) | Code analysis |
| Global state accesses | 0 (down from 45) | grep for `database.DB`, `cache.Client` |
| P1 service test coverage | ≥80% | go test -cover |
| Unit test execution time | <5 seconds | go test benchmark |
| DI container resolution | <1ms per service | Startup timing logs |
| Backward compatibility | 100% API tests pass | Integration test suite |

## Out of Scope

- Refactoring P2 services (14 remaining) - separate follow-up spec
- Database schema changes
- API endpoint changes
- Client-side changes
- New business features

## Dependencies

- R2: Repository Interface Design Pattern (research complete)
- R3: Service Layer Refactoring Strategy (research complete)
- Existing DI container in `internal/framework/container/`
- Mockery tool for mock generation

## Assumptions

1. Go 1.24 generics can be used for type-safe container resolution
2. Existing `GenericRepository[T]` pattern continues to work alongside interfaces
3. Team is familiar with testify/mock patterns
4. CI/CD pipeline supports go test -cover reporting

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing functionality | Medium | High | Comprehensive integration tests before/after |
| Performance regression | Low | Medium | Benchmark critical paths |
| Incomplete mock coverage | Medium | Medium | Code review checklist for mock completeness |
| Complex dependency cycles | Low | High | Analyze dependency graph before refactoring |

## Timeline Estimate

- **Phase 1**: Repository interfaces (2 days)
- **Phase 2**: P1 services (3 days)
- **Phase 3**: Global state elimination (2 days)
- **Phase 4**: Config structs (1 day)
- **Phase 5**: Mock generation & tests (2 days)

**Total: 10 working days**
