# Quester Platform - AI Agent Memory

> **Cumulative Project Knowledge & Learned Patterns**  
> This document serves as the persistent memory for AI agents working on the Quester platform.  
> Last Updated: 2025-11-23 | Constitution: v1.0.0

---

## 🎯 Quick Start for AI Agents

**Before any task, read in order:**
1. **This file (AGENT.md)** - Project memory, learned patterns, common pitfalls
2. **Quester.md** - Project overview, architecture, feature inventory
3. **Quester-AI-Rules.md** - Coding standards, rules, anti-patterns
4. **Quester-AI-Workflows.md** - Step-by-step workflows for implementation
5. **.specify/memory/constitution.md** - Constitutional principles (v1.0.0)

**Mandatory Workflow:**
1. Analyze request → 2. Research codebase → 3. Plan with todo list → 4. Implement → 5. Verify → 6. Test → 7. Document learnings

---

## 📋 Project Constitution Summary

**Version:** 1.0.0 | **Ratified:** 2025-11-23

### Non-Negotiable Principles

**I. Multi-Tenancy (CRITICAL)**
- Every database query MUST filter by `TenantID` - no exceptions
- All models include `TenantID uuid.UUID` field with index
- All repository methods accept `tenantID` as required parameter
- Controllers extract `tenantID` from JWT claims
- Violation = Security incident

**II. Security First (CRITICAL)**
- Never log: passwords, tokens, API keys, credit cards, PII
- Always validate inputs with `go-playground/validator/v10`
- Always use HTTPS in production
- Hash passwords with bcrypt (cost ≥12)
- JWT tokens: Access (15min), Refresh (7 days)

**III. Type Safety (MANDATORY)**
- TypeScript: NO `any` type, use explicit types
- Go: NO untyped parameters (`interface{}`), use concrete types
- Always define explicit return types

**IV. Error Handling (MANDATORY)**
- Go: Always return errors, never panic for expected errors
- TypeScript: Always try-catch async operations
- Wrap errors with context: `fmt.Errorf("context: %w", err)`

**V. Context Propagation**
- Go: Always pass `context.Context` as first parameter
- Use for cancellation, timeouts, request-scoped values

**VI. Consistency & Pattern Adherence**
- Search for similar implementations before coding
- Follow existing patterns, match naming conventions
- Repository → Service → Controller layering

**VII. Observability**
- Structured logging (exclude sensitive data)
- Prometheus metrics for key operations
- Sentry for error tracking

---

## 🏗️ Architecture Patterns

### Backend Structure (Go)

```
server/
├── cmd/                    # Entry points (main.go)
│   ├── server/            # Main API server
│   ├── migrate/           # Database migrations
│   └── tools/             # Utility commands
├── internal/              # Private application code
│   ├── models/           # GORM models (all have TenantID)
│   ├── repositories/     # Database access layer
│   ├── services/         # Business logic layer
│   ├── controllers/      # HTTP handlers (Fiber)
│   ├── middleware/       # Auth, CORS, rate limiting
│   ├── routes/           # Route registration
│   └── utils/            # Helper functions
└── migrations/           # SQL migration files
```

**Layering Pattern:**
```
Controller (HTTP) → Service (Business Logic) → Repository (Database)
```

**Key Conventions:**
- File naming: `snake_case` (e.g., `user_service.go`, `auth_controller.go`)
- Exported identifiers: `PascalCase` (e.g., `UserService`, `CreateUser`)
- Unexported: `camelCase` (e.g., `userRepository`, `validateInput`)
- Interfaces: Noun or Noun+er (e.g., `UserRepository`, `Hasher`)

### Frontend Structure (TypeScript/React Native)

```
client/
├── app/                   # File-based routing (Expo Router)
│   ├── _layout.tsx       # Root layout
│   ├── index.tsx         # Home page
│   └── [feature].tsx     # Feature pages
├── components/
│   ├── ui/               # Reusable UI primitives
│   ├── shared/           # Shared components
│   ├── pages/            # Page-specific components
│   ├── layout/           # Layout components
│   └── auth/             # Auth-specific components
├── core/
│   ├── api/              # API client and services
│   ├── auth/             # Auth context and hooks
│   ├── types/            # TypeScript types
│   ├── hooks/            # Custom hooks
│   └── utils/            # Helper functions
└── assets/               # Images, fonts
```

**Key Conventions:**
- Component files: `PascalCase` (e.g., `UserProfile.tsx`, `QuestCard.tsx`)
- Utility files: `camelCase` (e.g., `formatters.ts`, `validators.ts`)
- Types: Interfaces for data structures, explicit return types
- API services: One file per feature (e.g., `quest.service.ts`)

---

## 🔒 Multi-Tenancy Implementation

### Model Definition Pattern

```go
type MyModel struct {
    ID       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
    TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_tenant_id" json:"tenant_id"` // REQUIRED
    // ... other fields
    CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
    UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

func (MyModel) TableName() string {
    return "my_models"
}
```

### Repository Pattern

**Core Principles:**
- Always pass `context.Context` as first parameter
- All queries MUST filter by `tenant_id` (except documented exceptions)
- Wrap errors with `fmt.Errorf` for context
- Distinguish `gorm.ErrRecordNotFound` from other errors
- Use `WithContext(ctx)` on all queries

**Standard Structure:**
```go
type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
    if db == nil {
        db = database.DB
    }
    return &Repository{db: db}
}
```

**CRUD Operations:**

```go
// Create - Set tenant_id before insertion
func (r *Repository) Create(ctx context.Context, tenantID uuid.UUID, model *Model) error {
    model.TenantID = tenantID
    if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
        return fmt.Errorf("failed to create model: %w", err)
    }
    return nil
}

// FindByID - Tenant-scoped retrieval
func (r *repository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*Model, error) {
    var model Model
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&model).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, fmt.Errorf("model not found: %s", id)
        }
        return nil, fmt.Errorf("failed to find model: %w", err)
    }
    
    return &model, err
}

// List - Paginated tenant-scoped listing
func (r *repository) List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Model, error) {
    var models []*Model
    err := r.db.WithContext(ctx).
        Where("tenant_id = ?", tenantID).
        Limit(limit).Offset(offset).
        Order("created_at DESC").
        Find(&models).Error
    
    if err != nil {
        return nil, fmt.Errorf("failed to list models: %w", err)
    }
    
    return models, err
}

// Update - Verify tenant ownership
func (r *Repository) Update(ctx context.Context, model *Model) error {
    result := r.db.WithContext(ctx).
        Where("tenant_id = ?", model.TenantID).
        Save(model)
    
    if result.Error != nil {
        return fmt.Errorf("failed to update model: %w", result.Error)
    }
    
    if result.RowsAffected == 0 {
        return fmt.Errorf("model not found: %s", model.ID)
    }
    
    return nil
}

// Delete - Soft delete with tenant verification
func (r *Repository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
    result := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        Delete(&Model{})
    
    if result.Error != nil {
        return fmt.Errorf("failed to delete model: %w", result.Error)
    }
    
    if result.RowsAffected == 0 {
        return fmt.Errorf("model not found: %s", id)
    }
    
    return nil
}
```

**Query Optimization:**

```go
// 1. Eager Loading (N+1 Prevention)
func (r *QuestRepository) FindWithBadge(ctx context.Context, tenantID, id uuid.UUID) (*models.Quest, error) {
    var quest models.Quest
    err := r.db.WithContext(ctx).
        Preload("Badge").
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&quest).Error
    return &quest, err
}

// 2. Batch Operations
func (r *Repository) CreateBatch(ctx context.Context, tenantID uuid.UUID, models []*Model) error {
    for _, model := range models {
        model.TenantID = tenantID
    }
    return r.db.WithContext(ctx).CreateInBatches(models, 100).Error
}

// 3. Transactions
func (r *Repository) CreateWithRelations(ctx context.Context, tenantID uuid.UUID, parent *Model, children []*ChildModel) error {
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        parent.TenantID = tenantID
        if err := tx.Create(parent).Error; err != nil {
            return err
        }
        
        for _, child := range children {
            child.TenantID = tenantID
            child.ParentID = parent.ID
            if err := tx.Create(child).Error; err != nil {
                return err
            }
        }
        
        return nil
    })
}
```

**Exceptions to Tenant Filtering:**
- Token validation (FindByID in RefreshTokenRepository) - needs cross-tenant lookup
- Always document exceptions with clear reasoning in comments

**See:** `server/docs/REPOSITORY_PATTERNS.md` for complete guide
```

### Controller Pattern - Extract TenantID

```go
func (c *Controller) GetByID(ctx *fiber.Ctx) error {
    // Extract tenantID from JWT claims
    claims := ctx.Locals("claims").(*jwt.Claims)
    tenantID := claims.TenantID // Always validate this exists
    
    // Parse request parameter
    id, err := uuid.Parse(ctx.Params("id"))
    if err != nil {
        return responses.BadRequest(ctx, "Invalid ID")
    }
    
    // Call service with tenantID
    result, err := c.service.GetByID(ctx.Context(), tenantID, id)
    if err != nil {
        return responses.Error(ctx, err)
    }
    
    return responses.Success(ctx, result)
}
```

---

## 🔧 Framework Reusability Layer

### Package Structure

```
internal/framework/
├── controller/              # Controller helpers
│   ├── auth_context.go     # GetAuthContext - extract user/tenant info
│   ├── pagination.go       # ParsePagination - standardize page params
│   └── helpers.go          # ParseAndValidate[T] - generic request parsing
├── repository/             # Repository patterns
│   ├── generic.go          # GenericRepository[T] - type-safe CRUD
│   ├── tenant_model.go     # TenantModel interface
│   ├── options.go          # QueryOption functions
│   └── errors.go           # Repository-specific errors
├── responses/              # Response helpers
│   └── helpers.go          # BadRequest, Success, NotFound, etc.
├── service/                # Service patterns
│   ├── base.go             # BaseService with logging/cache/tx
│   ├── transaction.go      # TransactionManager
│   └── errors.go           # Service-specific errors
└── cache/                  # Redis cache wrapper
```

### GenericRepository[T] Usage

**Purpose:** Reduce repository boilerplate from ~200 lines to ~50 lines with type-safe CRUD operations.

```go
// Step 1: Model implements TenantModel interface
func (b *Badge) GetID() uuid.UUID       { return b.ID }
func (b *Badge) GetTenantID() uuid.UUID { return b.TenantID }
func (b *Badge) SetTenantID(id uuid.UUID) { b.TenantID = id }

// Step 2: Repository embeds GenericRepository
type BadgeRepository struct {
    *repository.GenericRepository[*models.Badge]
    db *gorm.DB
}

func NewBadgeRepository(db *gorm.DB) *BadgeRepository {
    return &BadgeRepository{
        GenericRepository: repository.NewGenericRepository[*models.Badge](db),
        db:                db,
    }
}

// Step 3: Delegate CRUD operations
func (r *BadgeRepository) Create(ctx context.Context, badge *models.Badge) error {
    return r.GenericRepository.Create(r.WithTenantContext(ctx, badge.TenantID), badge)
}
```

### Controller Helpers

**GetAuthContext** - Extract authenticated user info:
```go
auth, err := controller.GetAuthContext(c)
if err != nil {
    return responses.Unauthorized(c, err.Error())
}
// auth.UserID, auth.TenantID, auth.Email, auth.Role
```

**ParsePagination** - Standardized pagination:
```go
pagination := controller.ParsePagination(c)
// pagination.Page (default: 1), pagination.PageSize (max: 100), pagination.Offset
```

**ParseAndValidate[T]** - Generic request parsing:
```go
req, err := controller.ParseAndValidate[CreateBadgeRequest](c)
if err != nil {
    return err // Auto returns 400 with validation errors
}
```

### BaseService Pattern

**Embed for consistent logging, caching, and transactions:**

```go
type BadgeService struct {
    service.BaseService
    badgeRepo interfaces.BadgeRepository
}

func NewBadgeService(db *gorm.DB, logger *slog.Logger, cache *cache.PooledRedisClient, ...) *BadgeService {
    return &BadgeService{
        BaseService: service.NewBaseService(db, logger, cache, nil),
        badgeRepo:   badgeRepo,
    }
}

// Usage
s.LogInfo("Badge awarded", "user_id", userID)
s.GetCache().Del(ctx, cacheKey)
s.GetTxManager().RunInTransaction(ctx, func(tx *gorm.DB) error { ... })
```

### Response Helpers

**All responses include request_id for tracing:**

```go
// Error responses
responses.BadRequest(c, "Invalid input")
responses.Unauthorized(c, "Token expired")
responses.Forbidden(c, "Admin required")
responses.NotFound(c, "Not found")
responses.InternalError(c, "Database error")

// Success responses
responses.Success(c, data)
responses.Created(c, resource)
```

**See:** `server/docs/FRAMEWORK_PATTERNS.md` for complete guide

---

## 🛠️ Common Implementation Patterns

### 1. Create New Feature (Full Stack)

**Backend Steps:**
1. Create model in `internal/models/[feature].go` with TenantID
2. Create migration file in `migrations/XXX_create_[feature]_table.up.sql`
3. Create repository in `internal/repositories/[feature]_repository.go`
4. Create service in `internal/services/[feature]_service.go`
5. Create controller in `internal/controllers/[feature]_controller.go`
6. Register routes in `internal/routes/routes.go`

**Frontend Steps:**
1. Create types in `client/core/types/[feature].ts`
2. Create API service in `client/core/api/services/[feature].service.ts`
3. Create page component in `client/app/[feature].tsx`
4. Create page-specific components in `client/components/pages/[feature]/`

### 2. Authentication Flow

**JWT Claims Structure:**
```go
type Claims struct {
    UserID   uuid.UUID `json:"user_id"`
    TenantID uuid.UUID `json:"tenant_id"`
    Email    string    `json:"email"`
    Role     string    `json:"role"`
    jwt.RegisteredClaims
}
```

**Middleware Extracts Claims:**
```go
// In middleware/auth.go
func AuthMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Extract and validate JWT
        // Parse claims
        // Store in c.Locals("claims")
        return c.Next()
    }
}
```

### 3. Error Response Pattern

**Backend (Go):**
```go
// Standard error responses
return responses.Success(ctx, data)           // 200
return responses.Created(ctx, data)           // 201
return responses.BadRequest(ctx, "message")   // 400
return responses.Unauthorized(ctx, "message") // 401
return responses.Forbidden(ctx, "message")    // 403
return responses.NotFound(ctx, "message")     // 404
return responses.Error(ctx, err)              // 500
```

**Frontend (TypeScript):**
```typescript
try {
    const result = await apiService.create(input);
    return result;
} catch (error) {
    // Log full error for debugging
    console.error('[FeatureName] Create failed:', error);
    
    // Show user-friendly message
    if (error.response?.status === 400) {
        throw new Error('Invalid input. Please check your data.');
    } else if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.');
    } else {
        throw new Error('An unexpected error occurred. Please try again.');
    }
}
```

---

## 🗄️ Database Patterns

### Migration File Naming
```
XXX_create_[feature]_table.up.sql
XXX_create_[feature]_table.down.sql
```
Where XXX is zero-padded sequence (001, 002, etc.)

### Migration Template

**UP Migration:**
```sql
-- XXX_create_[feature]_table.up.sql
CREATE TABLE IF NOT EXISTS [feature]s (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    -- feature-specific fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP, -- For soft deletes
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Composite index for tenant isolation + performance
CREATE INDEX IF NOT EXISTS idx_[feature]s_tenant_id ON [feature]s(tenant_id);
CREATE INDEX IF NOT EXISTS idx_[feature]s_tenant_created ON [feature]s(tenant_id, created_at DESC);
```

**DOWN Migration:**
```sql
-- XXX_create_[feature]_table.down.sql
DROP TABLE IF EXISTS [feature]s;
```

---

## 🧪 Testing Patterns

### Repository Tests
```go
// Always test multi-tenant isolation
func TestRepository_MultiTenantIsolation(t *testing.T) {
    tenant1 := uuid.New()
    tenant2 := uuid.New()
    
    // Create item for tenant1
    item1, _ := repo.Create(ctx, tenant1, data)
    
    // Ensure tenant2 cannot access tenant1's data
    result, err := repo.FindByID(ctx, tenant2, item1.ID)
    assert.Error(t, err)
    assert.Nil(t, result)
}
```

### Service Tests
```go
// Test business logic and validation
func TestService_Create_ValidatesInput(t *testing.T) {
    invalidInput := &CreateInput{} // Missing required fields
    
    result, err := service.Create(ctx, tenantID, invalidInput)
    assert.Error(t, err)
    assert.Nil(t, result)
}
```

---

## ⚠️ Common Pitfalls & Solutions

### Pitfall 1: Forgetting TenantID Filter
**Problem:** Query doesn't filter by tenant_id
**Solution:** Always include tenant_id in WHERE clause
```go
// ❌ WRONG
db.Where("id = ?", id).First(&model)

// ✅ CORRECT
db.Where("tenant_id = ? AND id = ?", tenantID, id).First(&model)
```

### Pitfall 2: Logging Sensitive Data
**Problem:** Passwords, tokens in logs
**Solution:** Never log sensitive fields
```go
// ❌ WRONG
log.Printf("User login: %+v", loginRequest) // Contains password

// ✅ CORRECT
log.Printf("User login attempt: email=%s", loginRequest.Email)
```

### Pitfall 3: Using `any` in TypeScript
**Problem:** Type safety lost
**Solution:** Define explicit types
```typescript
// ❌ WRONG
async function fetchData(id: any): Promise<any> { }

// ✅ CORRECT
async function fetchData(id: string): Promise<User> { }
```

### Pitfall 4: Ignoring Errors
**Problem:** Silent failures
**Solution:** Always check and handle errors
```go
// ❌ WRONG
result, _ := service.Create(ctx, input) // Ignoring error

// ✅ CORRECT
result, err := service.Create(ctx, input)
if err != nil {
    return fmt.Errorf("create failed: %w", err)
}
```

### Pitfall 5: Missing Context Propagation
**Problem:** Timeouts and cancellation don't work
**Solution:** Pass context.Context through call chain
```go
// ❌ WRONG
func (s *Service) DoWork(input *Input) error {
    return s.repo.Save(input)
}

// ✅ CORRECT
func (s *Service) DoWork(ctx context.Context, input *Input) error {
    return s.repo.Save(ctx, input)
}
```

---

## 📦 Key Dependencies & Usage

### Backend (Go)

| Package | Purpose | Usage Pattern |
|---------|---------|---------------|
| `github.com/gofiber/fiber/v2` | Web framework | Route handlers, middleware |
| `gorm.io/gorm` | ORM | Database access, migrations |
| `github.com/golang-jwt/jwt/v5` | JWT auth | Token generation, validation |
| `github.com/go-playground/validator/v10` | Validation | Input validation |
| `github.com/redis/go-redis/v9` | Redis client | Token blacklist, caching |
| `github.com/getsentry/sentry-go` | Error tracking | Production error monitoring |
| `github.com/prometheus/client_golang` | Metrics | Performance monitoring |

### Frontend (TypeScript)

| Package | Purpose | Usage Pattern |
|---------|---------|---------------|
| `expo` | React Native framework | App infrastructure |
| `expo-router` | File-based routing | Navigation |
| `nativewind` | Tailwind CSS | Styling |
| `@react-navigation/native` | Navigation | Stack, tabs navigation |
| `@rn-primitives/*` | UI components | Reusable UI primitives |

---

## 🎓 Learned Patterns & Best Practices

### Pattern: Repository Constructor
```go
type MyRepository struct {
    db *gorm.DB
}

func NewMyRepository(db *gorm.DB) *MyRepository {
    return &MyRepository{db: db}
}
```

### Pattern: Service Constructor with Dependencies
```go
type MyService struct {
    repo MyRepository
    // other dependencies
}

func NewMyService(repo MyRepository) *MyService {
    return &MyService{repo: repo}
}
```

### Pattern: Controller Constructor
```go
type MyController struct {
    service *MyService
}

func NewMyController(service *MyService) *MyController {
    return &MyController{service: service}
}
```

### Pattern: Route Registration
```go
func SetupRoutes(app *fiber.App, db *gorm.DB) {
    // Initialize layers
    repo := repositories.NewMyRepository(db)
    service := services.NewMyService(repo)
    controller := controllers.NewMyController(service)
    
    // Protected routes
    api := app.Group("/api/v1", middleware.Auth())
    api.Post("/items", controller.Create)
    api.Get("/items/:id", controller.GetByID)
    api.Get("/items", controller.List)
}
```

---

## 🚀 Development Workflow

### For New Features
1. **Plan**: Create todo list with `manage_todo_list`
2. **Backend**: Model → Migration → Repository → Service → Controller → Routes
3. **Frontend**: Types → API Service → Components → Page
4. **Test**: Run `get_errors`, test endpoints, verify UI
5. **Document**: Update this file with new patterns

### For Bug Fixes
1. **Reproduce**: Understand the issue, check logs
2. **Locate**: Find the problematic code
3. **Fix**: Apply fix following existing patterns
4. **Verify**: Test the fix, check for side effects
5. **Document**: Add to pitfalls section if common

### For Refactoring
1. **Understand**: Read existing code thoroughly
2. **Plan**: Identify what to change and why
3. **Test First**: Ensure tests exist or create them
4. **Refactor**: Make changes incrementally
5. **Verify**: All tests pass, no regressions

---

## 📚 Reference Document Index

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **AGENT.md** (this file) | Project memory, patterns | Always first |
| **Quester.md** | Project overview | Initial onboarding |
| **Quester-AI-Rules.md** | Coding standards | Before implementing |
| **Quester-AI-Workflows.md** | Step-by-step procedures | During implementation |
| **.specify/memory/constitution.md** | Constitutional principles | For governance questions |
| **server/docs/API.md** | API documentation | When working on APIs |
| **server/docs/ARCHITECTURE.md** | Architecture details | For design decisions |

---

## ⚡ Query Optimization Patterns Learned

### 1. Pagination Query Consolidation

**Problem**: Building the same query twice (once for count, once for fetch)

```go
// ❌ BAD: Query duplication
query := db.Where("tenant_id = ?", tenantID)
query.Count(&total)  // First query build
db.Where("tenant_id = ?", tenantID).Find(&results)  // Duplicate build
```

**Solution**: Build base query once, reuse for both count and fetch

```go
// ✅ GOOD: Query reuse
baseQuery := db.Where("tenant_id = ?", tenantID)
baseQuery.Count(&total)  // Uses base query
baseQuery.Preload("User").Find(&results)  // Reuses base query
```

**Impact**: Reduces code duplication, easier to maintain, consistent filtering  
**Applied to**: `post_repository.go` (GetUserPosts, GetPublicPosts)

### 2. Database-Side Filtering

**Problem**: Fetching all records then filtering in-memory

```go
// ❌ BAD: In-memory filtering
db.Find(&badges)
for _, badge := range badges {
    if badge.PointsThreshold <= userXP { eligible = append(...) }
}
```

**Solution**: Move filtering to SQL WHERE clause when possible

```go
// ✅ GOOD: Database filtering
db.Where("points_threshold <= ?", userXP).Find(&badges)
// Only fetch eligible records, reduce memory usage
```

**Impact**: Reduces data transfer, faster queries, less memory usage  
**Applied to**: `badge_repository.go` (FindEligible)

### 3. Batch Operations

**Problem**: Creating records one-by-one in loops (N database calls)

```go
// ❌ BAD: Individual creates
for _, notification := range notifications {
    db.Create(notification)  // N queries
}
```

**Solution**: Use batch create operations

```go
// ✅ GOOD: Batch create
db.CreateInBatches(notifications, 100)  // 1 query per 100 records
```

**Impact**: Dramatically reduces database round-trips, improves performance  
**Implemented in**: `notification_repository.go` (BulkCreate), `leaderboard_repository.go` (BulkUpsert)

### 4. Preload for N+1 Prevention

**Status**: Already implemented correctly across repositories

```go
// ✅ GOOD: Eager loading relationships
db.Preload("User").Preload("Badge").Find(&posts)
// Loads all relationships in 3 queries instead of N+1
```

**Verified in**: All repositories using relationships (quest, badge, achievement, transaction, etc.)

---

## 🎯 Service Layer Error Handling Standards

### Common Patterns Found

#### 1. Business Validation Errors

Use `fmt.Errorf` for validation failures with clear context:

```go
// ✅ GOOD: Clear validation error
if amount <= 0 {
    return fmt.Errorf("amount must be positive, got: %d", amount)
}

if listing.SellerID == buyerID {
    return fmt.Errorf("cannot purchase own listing: %s", listingID)
}
```

#### 2. Not Found Errors

Use `errors.New` for simple "not found" messages, `fmt.Errorf` when ID context helps debugging:

```go
// ✅ GOOD: Simple not found
if errors.Is(err, gorm.ErrRecordNotFound) {
    return nil, errors.New("quest not found")
}

// ✅ GOOD: Not found with context for debugging
if err != nil {
    return nil, fmt.Errorf("listing not found: %s", listingID)
}
```

#### 3. Wrapped Repository Errors

Always wrap repository errors with service-level context:

```go
// ✅ GOOD: Wrapped with context
if err := s.questRepo.Create(ctx, quest); err != nil {
    return nil, fmt.Errorf("failed to create quest: %w", err)
}
```

#### 4. Logging vs Error Propagation

**ISSUE**: Using `fmt.Printf` throughout services (21+ occurrences)

```go
// ❌ BAD: Using fmt.Printf (no log levels, lost in production)
fmt.Printf("Warning: Failed to update leaderboard: %v\n", err)
fmt.Printf("Failed to send notification: %v\n", err)
```

**SOLUTION**: Use proper logger with levels (implement structured logging)

```go
// ✅ GOOD: Structured logging (to be implemented)
log.Warn("Failed to update leaderboard", "userID", userID, "error", err)
log.Error("Failed to send notification", "userID", userID, "error", err)
```

#### 5. Sentinel Errors

Define package-level sentinel errors for common cases:

```go
// ✅ GOOD: Reusable sentinel errors (two_factor_service.go pattern)
var (
    ErrTwoFactorNotEnabled     = errors.New("two-factor authentication is not enabled")
    ErrInvalidTwoFactorCode    = errors.New("invalid two-factor authentication code")
    ErrBackupCodeAlreadyUsed   = errors.New("backup code has already been used")
)
```

#### 6. Transaction Error Handling

In GORM transactions, always return errors to trigger rollback:

```go
// ✅ GOOD: Transaction with proper error handling
return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&record).Error; err != nil {
        return fmt.Errorf("failed to create record: %w", err) // Triggers rollback
    }
    return nil // Commits transaction
})
```

### Service Layer Action Items

1. **Implement Structured Logging**: Replace all `fmt.Printf` with proper logger
2. **Error Classification**: Define sentinel errors for common business rule violations
3. **Consistent Wrapping**: All repository calls should wrap errors with service context
4. **Transaction Safety**: Verify all GORM transactions properly propagate errors

---

## 🌐 Controller Layer Standards

### HTTP Status Code Usage

**Standard Responses:**

```go
// ✅ GOOD: Consistent status codes
200 OK              - Successful GET
201 Created         - Successful POST creating resource
204 No Content      - Successful DELETE
400 Bad Request     - Validation failure, malformed input
401 Unauthorized    - Missing/invalid authentication
403 Forbidden       - Authenticated but insufficient permissions
404 Not Found       - Resource doesn't exist
409 Conflict        - Duplicate resource, business rule violation
422 Unprocessable   - Valid syntax but semantic errors
429 Too Many Reqs   - Rate limit exceeded
500 Internal Error  - Unexpected server error
```

### Error Response Format

**Consistent Structure (auth_controller.go pattern):**

```go
// ✅ GOOD: Structured error response
type ErrorResponse struct {
    Error   string `json:"error"`    // Machine-readable error code
    Message string `json:"message"`  // Human-readable message
    Code    int    `json:"code"`     // HTTP status code
}

return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
    Error:   "missing_tenant_id",
    Message: "X-Tenant-ID header is required",
    Code:    fiber.StatusBadRequest,
})
```

**Simple Format (quest_controller.go pattern):**

```go
// ✅ ACCEPTABLE: Simple error response
return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
    "error": "failed to retrieve quests",
})
```

### Input Validation

**Validate early with clear errors:**

```go
// ✅ GOOD: Early validation
tenantID, ok := middleware.GetTenantIDFromFiberContext(c)
if !ok {
    return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
        "error": "tenant context not found",
    })
}

// Parse and validate UUID
questID, err := uuid.Parse(c.Params("quest_id"))
if err != nil {
    return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
        "error": "invalid quest ID format",
    })
}
```

### Rate Limiting Pattern

**Redis-based rate limiting (auth_controller.go):**

```go
// ✅ GOOD: Rate limiting with graceful degradation
rateLimitKey := fmt.Sprintf("signup:ratelimit:%s", clientIP)
currentCount, err := cache.Increment(c.Context(), rateLimitKey)
if err == nil {
    if currentCount == 1 {
        cache.Client.Expire(c.Context(), rateLimitKey, 1*time.Hour)
    }
    if currentCount > 5 {
        return c.Status(fiber.StatusTooManyRequests).JSON(ErrorResponse{
            Error:   "rate_limit_exceeded",
            Message: "Maximum 5 signup attempts per hour",
            Code:    fiber.StatusTooManyRequests,
        })
    }
}
// Fail open if Redis unavailable
```

### Service Dependency Injection

**Initialize with proper error handling:**

```go
// ✅ GOOD: Graceful service initialization (badge_controller.go)
redisClient, err := cache.NewPooledRedisClient(redisConfig)
if err != nil {
    log.Printf("Warning: Badge service Redis unavailable: %v", err)
    return &BadgeController{badgeService: nil}
}
```

### Controller Action Items

1. **Standardize Error Responses**: Adopt `ErrorResponse` struct across all controllers
2. **Consistent Status Codes**: Review and standardize HTTP status code usage
3. **Validation Middleware**: Consider extracting common validation patterns
4. **Rate Limiting**: Implement rate limiting for write endpoints

---

## 🔄 Update Log

| Date | Change | Impact |
|------|--------|--------|
| 2025-11-23 | Initial constitution (v1.0.0) created | Established governance framework |
| 2025-11-23 | Knowledge graph populated | 20 entities, 25 relations memorized |
| 2025-11-23 | AGENT.md comprehensive memory created | Complete project reference for AI agents |
| 2025-11-23 | Server optimization and refactoring completed | 11 tasks: repositories, services, controllers optimized |
| 2025-11-23 | Query optimization patterns documented | Post/badge repositories optimized, batch operations added |
| 2025-11-23 | Service layer error handling standards documented | Structured logging patterns, sentinel errors, transaction safety |
| 2025-11-23 | Controller layer standards documented | HTTP status codes, error responses, rate limiting patterns |
| 2025-11-23 | Repository test template created | Multi-tenant isolation test framework established |

---

## 💡 Tips for AI Agents

1. **Always Read First**: Don't assume patterns, verify by reading existing code
2. **Use Todo Lists**: For multi-step tasks, create and maintain todo list
3. **Mark Progress**: Update todo status: not-started → in-progress → completed
4. **Verify Compilation**: Run `get_errors` after code generation
5. **Follow Constitution**: All principles are mandatory, violations are bugs
6. **Document Learnings**: Add new patterns to this file after completing features
7. **Ask Questions**: If requirements unclear, ask before implementing
8. **Test Multi-Tenancy**: Always verify tenant isolation in database queries

---

**Remember**: Quester is production software handling real user data, payments, and education. Quality, security, and reliability are non-negotiable.
