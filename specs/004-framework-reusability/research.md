# Research: Framework Reusability & Code Consolidation

**Feature**: 004-framework-reusability  
**Date**: 2025-11-25  
**Status**: Complete

---

## Research Tasks

This document resolves all NEEDS CLARIFICATION items and researches best practices for the technical decisions in this feature.

---

## R1: Go Generics for Repository Pattern

**Question**: How to implement type-safe generic repository with tenant enforcement in Go 1.18+?

### Decision: Type Constraint with TenantModel Interface

```go
// TenantModel interface defines required fields for all tenant-scoped models
type TenantModel interface {
    GetID() uuid.UUID
    GetTenantID() uuid.UUID
    SetTenantID(id uuid.UUID)
    TableName() string
}

// GenericRepository provides type-safe CRUD for any TenantModel
type GenericRepository[T TenantModel] struct {
    db *gorm.DB
}
```

### Rationale

- **Compile-time safety**: Type constraint ensures all models implement TenantID methods
- **GORM compatibility**: Works with GORM's query builder and hooks
- **Extendability**: Custom repositories embed GenericRepository and add domain-specific methods

### Alternatives Considered

1. **Reflection-based checking** - Rejected: Runtime overhead, no compile-time safety
2. **Code generation** - Rejected: Adds build complexity, harder to debug
3. **Interface{} with type assertions** - Rejected: No compile-time safety, verbose

---

## R2: Savepoint Implementation for Nested Transactions

**Question**: How to implement nested transactions with partial rollback capability?

### Decision: GORM SavePoint API

```go
type TransactionManager struct {
    db *gorm.DB
}

func (tm *TransactionManager) RunInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
    return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        return fn(tx)
    })
}

func (tm *TransactionManager) RunWithSavepoint(ctx context.Context, tx *gorm.DB, name string, fn func(tx *gorm.DB) error) error {
    tx.SavePoint(name)
    if err := fn(tx); err != nil {
        tx.RollbackTo(name)
        return err
    }
    return nil
}
```

### Rationale

- **GORM native support**: `SavePoint()` and `RollbackTo()` are built-in
- **PostgreSQL compatible**: PostgreSQL has native savepoint support
- **Composable**: Services can nest calls without transaction management knowledge

### Alternatives Considered

1. **Manual BEGIN/COMMIT/ROLLBACK** - Rejected: Error-prone, GORM handles better
2. **Separate transactions per service** - Rejected: No atomicity across service calls
3. **Two-phase commit** - Rejected: Overkill for single-database operations

---

## R3: Auth Context Extraction Pattern

**Question**: Best pattern for consistent auth context extraction from Fiber?

### Decision: Unified AuthContext Struct with Helper Function

```go
// AuthContext contains validated user identity from JWT claims
type AuthContext struct {
    UserID   uuid.UUID
    TenantID uuid.UUID
    Role     string
    Email    string
}

// GetAuthContext extracts and validates auth context from Fiber
func GetAuthContext(c *fiber.Ctx) (*AuthContext, error) {
    claims, ok := c.Locals("claims").(*core.Claims)
    if !ok || claims == nil {
        return nil, ErrUnauthorized
    }
    
    userID, err := uuid.Parse(claims.Subject)
    if err != nil {
        return nil, ErrInvalidUserID
    }
    
    tenantID, err := uuid.Parse(claims.TenantID)
    if err != nil {
        return nil, ErrInvalidTenantID
    }
    
    return &AuthContext{
        UserID:   userID,
        TenantID: tenantID,
        Role:     claims.Role,
        Email:    claims.Email,
    }, nil
}
```

### Rationale

- **Single extraction point**: One function replaces 100+ scattered extractions
- **Fail-fast validation**: Returns error immediately if claims invalid
- **Immutable struct**: AuthContext fields are parsed once, no re-parsing

### Alternatives Considered

1. **Middleware injection to context** - Rejected: Additional middleware overhead
2. **Direct claims access in controllers** - Rejected: Current state, causes duplication
3. **Claims interface with methods** - Rejected: Adds abstraction without benefit

---

## R4: Request ID in Error Responses

**Question**: How to propagate request_id through to error responses?

### Decision: Extract from Fiber RequestID Middleware

```go
// BadRequestWithID returns error with request ID for tracing
func BadRequestWithID(c *fiber.Ctx, message string) error {
    return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
        "success":    false,
        "error":      message,
        "code":       fiber.StatusBadRequest,
        "request_id": c.GetRespHeader("X-Request-ID"),
    })
}
```

### Rationale

- **Fiber middleware already generates**: RequestID middleware is standard
- **Correlation with logs**: Same ID appears in structured logs
- **Client debugging**: Clients can report request_id for support tickets

### Alternatives Considered

1. **Generate new UUID per response** - Rejected: Doesn't correlate with logs
2. **Use trace ID from OpenTelemetry** - Rejected: Adds dependency, request_id is simpler
3. **No request_id** - Rejected: Spec requirement (FR-024)

---

## R5: Pagination Parameter Handling

**Question**: Best approach for pagination with default 20, max 100?

### Decision: PaginationParams Struct with Validation

```go
// PaginationParams holds validated pagination parameters
type PaginationParams struct {
    Page     int
    PageSize int
    Offset   int
}

const (
    DefaultPageSize = 20
    MaxPageSize     = 100
)

// ParsePagination extracts and validates pagination from request
func ParsePagination(c *fiber.Ctx) PaginationParams {
    page := c.QueryInt("page", 1)
    if page < 1 {
        page = 1
    }
    
    pageSize := c.QueryInt("limit", DefaultPageSize)
    if pageSize < 1 {
        pageSize = DefaultPageSize
    }
    if pageSize > MaxPageSize {
        pageSize = MaxPageSize // Cap, don't reject
    }
    
    return PaginationParams{
        Page:     page,
        PageSize: pageSize,
        Offset:   (page - 1) * pageSize,
    }
}
```

### Rationale

- **Struct provides all computed values**: Offset calculated once
- **Capping over rejection**: Better UX, clients get results (clarification decision)
- **Constants for configuration**: Easy to adjust defaults

### Alternatives Considered

1. **Return error on invalid pagination** - Rejected: Clarification specified capping
2. **Cursor-based pagination** - Rejected: Breaking change to existing API
3. **Unlimited page size** - Rejected: Resource exhaustion risk

---

## R6: Migration Strategy - Domain Risk Assessment

**Question**: Which repositories should migrate first vs. last?

### Decision: Three-Phase Migration

| Phase | Domains | Risk Level | Repositories |
|-------|---------|------------|--------------|
| 1 | Badges, Quests, Leaderboards | Low | badge_repository, quest_repository, quest_progress_repository, leaderboard_repository, achievement_repository |
| 2 | Content, Social | Medium | course_repository, post_repository, comment_repository, like_repository, follow_repository, message_repository |
| 3 | Users, Auth, Transactions | High | user_repository, auth_audit_log_repository, transaction_repository, refresh_token_repository, two_factor_repository |

### Rationale

- **Low-risk first**: Gamification has good test coverage, simple models
- **Learn from early phases**: Refine patterns before high-risk migration
- **High-risk last**: Auth/payment repositories need extra verification

### Alternatives Considered

1. **Big bang migration** - Rejected: Too risky, hard to debug issues
2. **Random order** - Rejected: No risk management
3. **Alphabetical order** - Rejected: Doesn't account for domain risk

---

## R7: Error Response Backward Compatibility

**Question**: How to add request_id without breaking existing clients?

### Decision: Additive Change Only

The new error response format adds `code` and `request_id` fields:

```json
// Before
{"success": false, "error": "message"}

// After (additive)
{"success": false, "error": "message", "code": 400, "request_id": "uuid"}
```

### Rationale

- **Additive fields**: Existing clients ignore unknown fields (JSON standard)
- **No removal**: `success` and `error` fields remain unchanged
- **Gradual adoption**: Clients can start using request_id when ready

### Alternatives Considered

1. **Version the API** - Rejected: Overkill for additive change
2. **Separate error response types** - Rejected: Increases complexity
3. **Feature flag** - Rejected: Unnecessary complexity

---

## Summary of Decisions

| Research Item | Decision | Key Benefit |
|---------------|----------|-------------|
| R1: Generics | TenantModel type constraint | Compile-time tenant enforcement |
| R2: Transactions | GORM SavePoint API | Native nesting support |
| R3: Auth Context | Unified AuthContext struct | Single extraction pattern |
| R4: Request ID | Fiber X-Request-ID header | Log correlation |
| R5: Pagination | PaginationParams with capping | Consistent behavior |
| R6: Migration | Three-phase by risk | Controlled rollout |
| R7: Compatibility | Additive fields only | No breaking changes |

All NEEDS CLARIFICATION items resolved. Ready for Phase 1 design.
