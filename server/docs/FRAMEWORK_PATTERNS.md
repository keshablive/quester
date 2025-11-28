# Framework Patterns Guide

## Overview

The Quester framework layer (`internal/framework/`) provides reusable patterns that reduce boilerplate code and ensure consistency across the codebase. This guide covers usage patterns for each framework component.

## Table of Contents

1. [GenericRepository Pattern](#genericrepository-pattern)
2. [Controller Helpers](#controller-helpers)
3. [BaseService Pattern](#baseservice-pattern)
4. [Response Helpers](#response-helpers)
5. [Transaction Management](#transaction-management)
6. [Migration Guide](#migration-guide)

---

## GenericRepository Pattern

### Purpose

GenericRepository[T] provides type-safe CRUD operations with automatic tenant isolation, reducing repository boilerplate from ~200 lines to ~50 lines.

### Requirements

Your model must implement the `TenantModel` interface:

```go
type TenantModel interface {
    GetID() uuid.UUID
    GetTenantID() uuid.UUID
    SetTenantID(tenantID uuid.UUID)
    TableName() string
}

// Example implementation on Badge model
func (b *Badge) GetID() uuid.UUID       { return b.ID }
func (b *Badge) GetTenantID() uuid.UUID { return b.TenantID }
func (b *Badge) SetTenantID(id uuid.UUID) { b.TenantID = id }
```

### Basic Usage

```go
package repositories

import (
    "context"
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/framework/repository"
    "github.com/keshablive/quester/internal/models"
    "gorm.io/gorm"
)

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

// Helper to inject tenant_id into context
func (r *BadgeRepository) WithTenantContext(ctx context.Context, tenantID uuid.UUID) context.Context {
    return context.WithValue(ctx, repository.TenantIDKey{}, tenantID)
}

// Delegate to GenericRepository
func (r *BadgeRepository) Create(ctx context.Context, badge *models.Badge) error {
    return r.GenericRepository.Create(r.WithTenantContext(ctx, badge.TenantID), badge)
}

func (r *BadgeRepository) Update(ctx context.Context, badge *models.Badge) error {
    return r.GenericRepository.Update(r.WithTenantContext(ctx, badge.TenantID), badge)
}

func (r *BadgeRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
    return r.GenericRepository.Delete(r.WithTenantContext(ctx, tenantID), id)
}
```

### QueryOptions

Use QueryOptions for flexible queries:

```go
// Pagination
results, err := repo.FindAll(ctx, 
    repository.WithPagination(page, pageSize),
    repository.WithOrder("created_at DESC"),
)

// Filtering
results, err := repo.FindByCondition(ctx,
    repository.WithWhere("status = ?", "active"),
    repository.WithWhere("category = ?", category),
)

// Preloading relations
results, err := repo.FindAll(ctx,
    repository.WithPreload("Tasks"),
    repository.WithPreload("Creator"),
)
```

---

## Controller Helpers

### GetAuthContext

Extracts authenticated user information from Fiber context:

```go
import (
    "github.com/keshablive/quester/internal/framework/controller"
    "github.com/keshablive/quester/internal/framework/responses"
)

func (ctrl *BadgeController) GetMyBadges(c *fiber.Ctx) error {
    auth, err := controller.GetAuthContext(c)
    if err != nil {
        return responses.Unauthorized(c, err.Error())
    }
    
    // auth contains:
    // - UserID    uuid.UUID
    // - TenantID  uuid.UUID
    // - Email     string
    // - Role      string
    
    badges, err := ctrl.service.GetUserBadges(c.Context(), auth.TenantID, auth.UserID)
    // ...
}
```

### ParsePagination

Extracts and validates pagination parameters:

```go
func (ctrl *BadgeController) GetBadges(c *fiber.Ctx) error {
    pagination := controller.ParsePagination(c)
    
    // pagination contains:
    // - Page     int (default: 1, min: 1)
    // - PageSize int (default: 20, max: 100)
    // - Offset   int (calculated: (Page-1) * PageSize)
    
    badges, total, err := ctrl.service.GetBadges(
        c.Context(), 
        pagination.Page, 
        pagination.PageSize,
    )
    
    return responses.Success(c, fiber.Map{
        "data": badges,
        "pagination": fiber.Map{
            "page":        pagination.Page,
            "limit":       pagination.PageSize,
            "total":       total,
            "total_pages": (total + int64(pagination.PageSize) - 1) / int64(pagination.PageSize),
        },
    })
}
```

### ParseAndValidate[T]

Generic request parsing with validation:

```go
type CreateBadgeRequest struct {
    Name        string `json:"name" validate:"required,min=1,max=100"`
    Description string `json:"description" validate:"max=500"`
    Category    string `json:"category" validate:"required,oneof=achievement quest milestone"`
}

func (ctrl *BadgeController) CreateBadge(c *fiber.Ctx) error {
    req, err := controller.ParseAndValidate[CreateBadgeRequest](c)
    if err != nil {
        // Automatically returns 400 with validation errors
        return err
    }
    
    // req is now validated and ready to use
    badge := &models.Badge{
        Name:        req.Name,
        Description: req.Description,
        Category:    models.BadgeCategory(req.Category),
    }
    // ...
}
```

---

## BaseService Pattern

### Purpose

BaseService provides common dependencies (DB, logger, cache, transactions) with consistent patterns.

### Embedding BaseService

```go
package services

import (
    "log/slog"
    "github.com/keshablive/quester/internal/framework/cache"
    "github.com/keshablive/quester/internal/framework/service"
    "gorm.io/gorm"
)

type BadgeService struct {
    service.BaseService
    badgeRepo interfaces.BadgeRepository
}

func NewBadgeService(
    db *gorm.DB, 
    logger *slog.Logger, 
    redisClient *cache.PooledRedisClient,
    badgeRepo interfaces.BadgeRepository,
) *BadgeService {
    return &BadgeService{
        BaseService: service.NewBaseService(db, logger, redisClient, nil),
        badgeRepo:   badgeRepo,
    }
}
```

### Using BaseService Methods

```go
func (s *BadgeService) AwardBadge(ctx context.Context, userID, badgeID uuid.UUID) error {
    // Logging
    s.LogInfo("Awarding badge", "user_id", userID, "badge_id", badgeID)
    
    // Caching
    if s.HasCache() {
        cacheKey := fmt.Sprintf("badge:eligible:%s", userID)
        s.GetCache().Del(ctx, cacheKey)
    }
    
    // Database operations
    if err := s.badgeRepo.Create(ctx, badge); err != nil {
        s.LogError("Failed to create badge", "error", err)
        return err
    }
    
    return nil
}
```

---

## Response Helpers

### Error Responses

All error responses include `request_id` for tracing:

```go
import "github.com/keshablive/quester/internal/framework/responses"

// 400 Bad Request
return responses.BadRequest(c, "Invalid badge ID format")

// 401 Unauthorized
return responses.Unauthorized(c, "Token expired")

// 403 Forbidden
return responses.Forbidden(c, "Admin access required")

// 404 Not Found
return responses.NotFound(c, "Badge not found")

// 409 Conflict
return responses.Conflict(c, "Badge already exists")

// 429 Too Many Requests
return responses.TooManyRequests(c, "Rate limit exceeded")

// 500 Internal Server Error
return responses.InternalError(c, "Database connection failed")
```

### Success Responses

```go
// 200 OK with data
return responses.Success(c, fiber.Map{
    "badge": badge,
    "message": "Badge retrieved successfully",
})

// 201 Created
return responses.Created(c, fiber.Map{
    "badge": newBadge,
    "message": "Badge created successfully",
})
```

### Response Format

```json
{
    "success": false,
    "error": "bad_request",
    "message": "Invalid badge ID format",
    "request_id": "req_abc123xyz"
}
```

---

## Transaction Management

### Basic Transaction

```go
func (s *BadgeService) TransferBadge(ctx context.Context, fromUser, toUser, badgeID uuid.UUID) error {
    return s.GetTxManager().RunInTransaction(ctx, func(tx *gorm.DB) error {
        // Remove from source user
        if err := s.badgeRepo.RemoveUserBadge(ctx, fromUser, badgeID); err != nil {
            return err // Transaction will rollback
        }
        
        // Add to target user
        if err := s.badgeRepo.AddUserBadge(ctx, toUser, badgeID); err != nil {
            return err // Transaction will rollback
        }
        
        return nil // Transaction will commit
    })
}
```

### Savepoints (Nested Transactions)

```go
func (s *BadgeService) BatchAwardBadges(ctx context.Context, userID uuid.UUID, badgeIDs []uuid.UUID) error {
    return s.GetTxManager().RunInTransaction(ctx, func(tx *gorm.DB) error {
        for i, badgeID := range badgeIDs {
            // Each badge award in a savepoint
            err := s.GetTxManager().RunWithSavepoint(ctx, tx, fmt.Sprintf("badge_%d", i), func(tx *gorm.DB) error {
                return s.awardSingleBadge(ctx, tx, userID, badgeID)
            })
            if err != nil {
                s.LogWarn("Failed to award badge, skipping", "badge_id", badgeID, "error", err)
                // Savepoint rolled back, but transaction continues
            }
        }
        return nil
    })
}
```

---

## Migration Guide

### Step 1: Update Model to Implement TenantModel

```go
// Add to your model
func (m *MyModel) GetID() uuid.UUID       { return m.ID }
func (m *MyModel) GetTenantID() uuid.UUID { return m.TenantID }
func (m *MyModel) SetTenantID(id uuid.UUID) { m.TenantID = id }
```

### Step 2: Refactor Repository

```go
type MyRepository struct {
    *repository.GenericRepository[*models.MyModel]
    db *gorm.DB
}

func NewMyRepository(db *gorm.DB) *MyRepository {
    return &MyRepository{
        GenericRepository: repository.NewGenericRepository[*models.MyModel](db),
        db:                db,
    }
}

func (r *MyRepository) WithTenantContext(ctx context.Context, tenantID uuid.UUID) context.Context {
    return context.WithValue(ctx, repository.TenantIDKey{}, tenantID)
}
```

### Step 3: Refactor Service

```go
type MyService struct {
    service.BaseService
    myRepo interfaces.MyRepository
}

func NewMyService(db *gorm.DB, logger *slog.Logger, cache *cache.PooledRedisClient, myRepo interfaces.MyRepository) *MyService {
    return &MyService{
        BaseService: service.NewBaseService(db, logger, cache, nil),
        myRepo:      myRepo,
    }
}
```

### Step 4: Refactor Controller

Replace:
```go
// OLD
tenantID := c.Locals("tenant_id").(uuid.UUID)
userID := c.Locals("user_id").(uuid.UUID)
return c.Status(400).JSON(fiber.Map{"error": "bad request"})
```

With:
```go
// NEW
auth, err := controller.GetAuthContext(c)
if err != nil {
    return responses.Unauthorized(c, err.Error())
}
return responses.BadRequest(c, "Invalid request")
```

---

## Reference

| Package | Key Types | Purpose |
|---------|-----------|---------|
| `framework/repository` | `GenericRepository[T]`, `TenantModel`, `QueryOption` | Type-safe CRUD with tenant isolation |
| `framework/controller` | `AuthContext`, `PaginationParams` | Request parsing helpers |
| `framework/service` | `BaseService`, `TransactionManager` | Service layer patterns |
| `framework/responses` | Helper functions | Standardized API responses |

For implementation examples, see:
- `internal/repositories/badge_repository.go`
- `internal/controllers/badge_controller.go`
- `internal/services/badge_service.go`
