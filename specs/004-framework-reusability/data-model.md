# Data Model: Framework Reusability & Code Consolidation

**Feature**: 004-framework-reusability  
**Date**: 2025-11-25  
**Status**: Complete

---

## Entity Definitions

This document defines the core entities, interfaces, and relationships for the framework reusability feature.

---

## Core Interfaces

### TenantModel Interface

The foundation constraint for all tenant-scoped models.

```go
// TenantModel defines the required interface for all models used with GenericRepository.
// This interface is a TYPE CONSTRAINT, not a runtime interface.
// Models MUST implement these methods to be used with the generic repository.
type TenantModel interface {
    // GetID returns the primary key as UUID
    GetID() uuid.UUID
    
    // GetTenantID returns the tenant scope identifier
    GetTenantID() uuid.UUID
    
    // SetTenantID sets the tenant scope identifier (used during Create)
    SetTenantID(id uuid.UUID)
    
    // TableName returns the database table name (GORM convention)
    TableName() string
}
```

**Validation Rules**:
- All models MUST have a TenantID field
- TenantID MUST be set before any database operation
- Models without TenantID are rejected at compile time (type constraint) or runtime (reflection fallback)

---

### GenericRepository[T TenantModel]

Type-safe generic repository for CRUD operations.

```go
// GenericRepository provides tenant-scoped CRUD operations for any TenantModel.
// CONSTITUTION: Multi-Tenancy - All queries MUST filter by TenantID
type GenericRepository[T TenantModel] struct {
    db *gorm.DB
}

// Interface methods:
// - Create(ctx context.Context, entity *T) error
// - FindByID(ctx context.Context, id uuid.UUID) (*T, error)
// - FindAll(ctx context.Context, opts ...QueryOption) ([]T, int64, error)
// - Update(ctx context.Context, entity *T) error
// - Delete(ctx context.Context, id uuid.UUID) error
// - FindByCondition(ctx context.Context, condition interface{}, args ...interface{}) ([]T, error)
// - Count(ctx context.Context) (int64, error)
// - Exists(ctx context.Context, id uuid.UUID) (bool, error)
```

**Relationships**:
- Uses `*gorm.DB` for database operations
- Extracts TenantID from `context.Context`
- Returns wrapped errors from `framework/repository/errors.go`

---

## Controller Entities

### AuthContext

Unified struct for authenticated user identity.

```go
// AuthContext contains validated user identity extracted from JWT claims.
// This struct is immutable after creation - all fields are set during parsing.
type AuthContext struct {
    // UserID is the authenticated user's primary key
    UserID uuid.UUID
    
    // TenantID is the user's tenant scope
    TenantID uuid.UUID
    
    // Role is the user's permission level (Admin, Moderator, Instructor, Player, Partner)
    Role string
    
    // Email is the user's email address (from JWT claims)
    Email string
}
```

**Validation Rules**:
- UserID and TenantID MUST be valid UUIDs
- Role MUST be one of: Admin, Moderator, Instructor, Player, Partner
- All fields are required (no nil/empty values)

---

### PaginationParams

Validated pagination parameters with computed offset.

```go
// PaginationParams holds validated pagination parameters.
// PageSize is capped at MaxPageSize (100), never exceeds.
type PaginationParams struct {
    // Page is the current page number (1-based)
    Page int
    
    // PageSize is the number of items per page (default: 20, max: 100)
    PageSize int
    
    // Offset is the computed offset for database queries: (Page - 1) * PageSize
    Offset int
}

// Constants
const (
    DefaultPageSize = 20
    MaxPageSize     = 100
)
```

**Validation Rules**:
- Page defaults to 1 if < 1
- PageSize defaults to 20 if < 1
- PageSize capped at 100 if > 100 (not rejected)
- Offset computed automatically

---

## Service Entities

### BaseService

Embedded struct providing common service dependencies.

```go
// BaseService provides common dependencies for all services.
// Services embed this struct to avoid repetitive constructor code.
type BaseService struct {
    // DB is the GORM database connection
    DB *gorm.DB
    
    // Logger is the structured logger instance
    Logger *slog.Logger
    
    // Cache is the Redis cache client (optional)
    Cache *redis.Client
    
    // TxManager is the transaction manager for database operations
    TxManager *TransactionManager
}
```

**Relationships**:
- Injected via dependency injection container
- All fields are optional except DB (required)
- Logger defaults to slog.Default() if nil

---

### TransactionManager

Manages database transactions with savepoint support.

```go
// TransactionManager provides transaction management with savepoint support.
// Supports nested transactions via PostgreSQL savepoints.
type TransactionManager struct {
    db *gorm.DB
}

// Interface methods:
// - RunInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error
// - RunWithSavepoint(ctx context.Context, tx *gorm.DB, name string, fn func(tx *gorm.DB) error) error
```

**State Transitions**:
```
                 ┌─────────────┐
                 │   BEGIN     │
                 └──────┬──────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Transaction    │
              │   (Active)      │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ SAVEPOINT│  │  COMMIT  │  │ ROLLBACK │
   │  (Nested)│  │ (Success)│  │  (Error) │
   └────┬─────┘  └──────────┘  └──────────┘
        │
        ▼
  ┌───────────────┐
  │ ROLLBACK TO   │
  │ SAVEPOINT     │
  │ (Partial)     │
  └───────────────┘
```

---

## Response Entities

### ErrorResponse

Standard error response format.

```go
// ErrorResponse is the standard error response format for all API endpoints.
// CONSTITUTION: Error Handling - Consistent error responses required.
type ErrorResponse struct {
    // Success is always false for error responses
    Success bool `json:"success"`
    
    // Error is the human-readable error message
    Error string `json:"error"`
    
    // Code is the HTTP status code
    Code int `json:"code"`
    
    // RequestID is the unique request identifier for tracing
    RequestID string `json:"request_id"`
}
```

**JSON Format**:
```json
{
    "success": false,
    "error": "User not found",
    "code": 404,
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Error Types

### Repository Errors

```go
// Repository-level errors for consistent error handling
var (
    ErrRecordNotFound   = errors.New("record not found")
    ErrDuplicateKey     = errors.New("duplicate key violation")
    ErrForeignKey       = errors.New("foreign key violation")
    ErrTenantIDMissing  = errors.New("tenant_id not found in context")
    ErrInvalidModel     = errors.New("model does not implement TenantModel")
)
```

### Controller Errors

```go
// Controller-level errors for auth and parsing
var (
    ErrUnauthorized     = errors.New("unauthorized: missing or invalid claims")
    ErrInvalidUserID    = errors.New("invalid user ID in claims")
    ErrInvalidTenantID  = errors.New("invalid tenant ID in claims")
    ErrInvalidRequest   = errors.New("invalid request body")
    ErrValidationFailed = errors.New("validation failed")
)
```

### Service Errors

```go
// Service-level errors with domain context
var (
    ErrNotFound         = errors.New("resource not found")
    ErrConflict         = errors.New("resource conflict")
    ErrForbidden        = errors.New("access forbidden")
    ErrTransactionFailed = errors.New("transaction failed")
)
```

---

## Entity Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRAMEWORK LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐      ┌──────────────────┐      ┌───────────────┐  │
│  │ GenericRepository│      │   BaseService    │      │ TransactionMgr│  │
│  │ [T TenantModel]  │◄────►│                  │◄────►│               │  │
│  └────────┬─────────┘      └────────┬─────────┘      └───────────────┘  │
│           │                         │                                    │
│           │ extends                 │ embeds                            │
│           ▼                         ▼                                    │
│  ┌──────────────────┐      ┌──────────────────┐                         │
│  │ BadgeRepository  │      │  BadgeService    │                         │
│  │ QuestRepository  │      │  QuestService    │                         │
│  │ UserRepository   │      │  UserService     │                         │
│  └──────────────────┘      └──────────────────┘                         │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                          CONTROLLER LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐      ┌──────────────────┐      ┌───────────────┐  │
│  │  GetAuthContext  │      │ ParseAndValidate │      │ ParsePagination│ │
│  │                  │      │ [T any]          │      │               │  │
│  └────────┬─────────┘      └────────┬─────────┘      └───────┬───────┘  │
│           │                         │                         │          │
│           ▼                         ▼                         ▼          │
│  ┌──────────────────┐      ┌──────────────────┐      ┌───────────────┐  │
│  │   AuthContext    │      │  Request DTO     │      │PaginationParams│ │
│  └──────────────────┘      └──────────────────┘      └───────────────┘  │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                          RESPONSE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐      ┌──────────────────┐      ┌───────────────┐  │
│  │    Success()     │      │   BadRequest()   │      │  NotFound()   │  │
│  │   Created()      │      │  Unauthorized()  │      │InternalError()│  │
│  │SuccessWithMeta() │      │  Forbidden()     │      │ValidationError│  │
│  └──────────────────┘      └──────────────────┘      └───────────────┘  │
│                                     │                                    │
│                                     ▼                                    │
│                            ┌──────────────────┐                         │
│                            │  ErrorResponse   │                         │
│                            │ {success, error, │                         │
│                            │  code, request_id}│                         │
│                            └──────────────────┘                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Mapping

### Phase 1: Low-Risk Repositories

| Current Repository | Target Pattern | Notes |
|-------------------|----------------|-------|
| badge_repository.go | GenericRepository[Badge] | Simple CRUD |
| quest_repository.go | GenericRepository[Quest] + custom queries | Has pagination |
| quest_progress_repository.go | GenericRepository[QuestProgress] | User-specific queries |
| leaderboard_repository.go | GenericRepository[Leaderboard] | Tenant-scoped ranking |
| achievement_repository.go | GenericRepository[Achievement] | Simple CRUD |

### Phase 2: Medium-Risk Repositories

| Current Repository | Target Pattern | Notes |
|-------------------|----------------|-------|
| course_repository.go | GenericRepository[Course] + enrollment queries | Complex relations |
| post_repository.go | GenericRepository[Post] + feed queries | Social features |
| comment_repository.go | GenericRepository[Comment] | Nested comments |
| message_repository.go | GenericRepository[Message] | Thread queries |

### Phase 3: High-Risk Repositories

| Current Repository | Target Pattern | Notes |
|-------------------|----------------|-------|
| user_repository.go | GenericRepository[User] + auth queries | Critical path |
| transaction_repository.go | GenericRepository[Transaction] | Financial data |
| refresh_token_repository.go | GenericRepository[RefreshToken] | Security critical |
