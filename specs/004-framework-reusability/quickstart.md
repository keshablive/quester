# Quickstart: Framework Reusability & Code Consolidation

**Feature**: 004-framework-reusability  
**Date**: 2025-11-25

This guide provides quick examples for using the new framework components.

---

## 1. Using GenericRepository[T]

### Define a Model with TenantModel Interface

```go
package models

import (
    "time"
    "github.com/google/uuid"
)

type Badge struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
    TenantID    uuid.UUID `gorm:"type:uuid;not null;index"`
    Name        string    `gorm:"type:varchar(100);not null"`
    Description string    `gorm:"type:text"`
    IconURL     string    `gorm:"type:varchar(255)"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

// TenantModel interface implementation
func (b *Badge) GetID() uuid.UUID         { return b.ID }
func (b *Badge) GetTenantID() uuid.UUID   { return b.TenantID }
func (b *Badge) SetTenantID(id uuid.UUID) { b.TenantID = id }
func (b *Badge) TableName() string        { return "badges" }
```

### Create a Repository

```go
package repositories

import (
    "github.com/keshablive/quester/internal/framework/repository"
    "github.com/keshablive/quester/internal/models"
    "gorm.io/gorm"
)

// BadgeRepository extends GenericRepository with domain-specific queries
type BadgeRepository struct {
    repository.GenericRepository[*models.Badge]
}

func NewBadgeRepository(db *gorm.DB) *BadgeRepository {
    return &BadgeRepository{
        GenericRepository: repository.NewGenericRepository[*models.Badge](db),
    }
}

// Add custom queries as needed
func (r *BadgeRepository) FindByName(ctx context.Context, name string) (*models.Badge, error) {
    return r.FindByCondition(ctx, "name = ?", name)
}
```

### Use in Service

```go
func (s *BadgeService) CreateBadge(ctx context.Context, input *CreateBadgeInput) (*models.Badge, error) {
    badge := &models.Badge{
        Name:        input.Name,
        Description: input.Description,
        IconURL:     input.IconURL,
    }
    
    // TenantID is automatically set from context
    if err := s.badgeRepo.Create(ctx, badge); err != nil {
        return nil, fmt.Errorf("failed to create badge: %w", err)
    }
    
    return badge, nil
}
```

---

## 2. Using Controller Helpers

### GetAuthContext

```go
func (ctrl *BadgeController) CreateBadge(c *fiber.Ctx) error {
    // Extract auth context (replaces 10+ lines of claims extraction)
    auth, err := controller.GetAuthContext(c)
    if err != nil {
        return responses.Unauthorized(c, err.Error())
    }
    
    // Create context with tenant ID
    ctx := context.WithValue(c.Context(), "tenant_id", auth.TenantID.String())
    ctx = context.WithValue(ctx, "user_id", auth.UserID.String())
    
    // Use auth.UserID, auth.TenantID, auth.Role as needed
    // ...
}
```

### ParseAndValidate

```go
type CreateBadgeRequest struct {
    Name        string `json:"name" validate:"required,min=1,max=100"`
    Description string `json:"description" validate:"max=500"`
    IconURL     string `json:"icon_url" validate:"omitempty,url"`
}

func (ctrl *BadgeController) CreateBadge(c *fiber.Ctx) error {
    // Parse and validate in one step (replaces 15+ lines)
    var req CreateBadgeRequest
    if err := controller.ParseAndValidate(c, &req); err != nil {
        return err // Response already sent
    }
    
    // Use req.Name, req.Description, etc.
    // ...
}
```

### ParsePagination

```go
func (ctrl *BadgeController) ListBadges(c *fiber.Ctx) error {
    // Parse pagination with defaults (replaces 10+ lines)
    pagination := controller.ParsePagination(c)
    
    // Query: GET /badges?page=2&limit=50
    // pagination.Page = 2
    // pagination.PageSize = 50 (capped at 100)
    // pagination.Offset = 50
    
    badges, total, err := s.badgeRepo.FindAll(ctx, 
        repository.WithPagination(pagination.Page, pagination.PageSize),
        repository.WithOrder("created_at", true),
    )
    if err != nil {
        return responses.InternalError(c, "Failed to list badges")
    }
    
    return responses.SuccessWithPagination(c, badges, total, pagination.Page, pagination.PageSize)
}
```

---

## 3. Using BaseService

### Define a Service

```go
package services

import (
    "github.com/keshablive/quester/internal/framework/service"
    "github.com/keshablive/quester/internal/repositories"
)

type BadgeService struct {
    service.BaseService // Embed for DB, Logger, Cache, TxManager
    
    badgeRepo *repositories.BadgeRepository
}

func NewBadgeService(base service.BaseService, badgeRepo *repositories.BadgeRepository) *BadgeService {
    return &BadgeService{
        BaseService: base,
        badgeRepo:   badgeRepo,
    }
}

func (s *BadgeService) CreateBadge(ctx context.Context, input *CreateBadgeInput) (*models.Badge, error) {
    // Use embedded logger
    s.Logger.Info("creating badge", "name", input.Name)
    
    badge := &models.Badge{Name: input.Name}
    if err := s.badgeRepo.Create(ctx, badge); err != nil {
        s.Logger.Error("failed to create badge", "error", err)
        return nil, err
    }
    
    return badge, nil
}
```

---

## 4. Using TransactionManager

### Simple Transaction

```go
func (s *QuestService) CompleteQuest(ctx context.Context, questID, userID uuid.UUID) error {
    return s.TxManager.RunInTransaction(ctx, func(tx *gorm.DB) error {
        // Use transaction for all operations
        questRepo := s.questRepo.WithTransaction(tx)
        progressRepo := s.progressRepo.WithTransaction(tx)
        
        quest, err := questRepo.FindByID(ctx, questID)
        if err != nil {
            return err
        }
        
        progress := &models.QuestProgress{
            QuestID: questID,
            UserID:  userID,
            Status:  "completed",
        }
        if err := progressRepo.Create(ctx, progress); err != nil {
            return err
        }
        
        quest.CompletionCount++
        return questRepo.Update(ctx, quest)
    })
}
```

### Nested Transaction with Savepoint

```go
func (s *QuestService) CompleteQuestWithOptionalReward(ctx context.Context, questID, userID uuid.UUID) error {
    return s.TxManager.RunInTransaction(ctx, func(tx *gorm.DB) error {
        // Main operation - must succeed
        if err := s.completeQuest(ctx, tx, questID, userID); err != nil {
            return err // Rolls back entire transaction
        }
        
        // Optional reward - failure shouldn't abort main operation
        _ = s.TxManager.RunWithSavepoint(ctx, tx, "grant_reward", func(tx *gorm.DB) error {
            return s.grantReward(ctx, tx, userID, "quest_completion")
        })
        // Continues even if reward fails
        
        return nil
    })
}
```

---

## 5. Using Enhanced Response Helpers

### Error Response with Request ID

```go
func (ctrl *BadgeController) GetBadge(c *fiber.Ctx) error {
    badge, err := s.badgeService.GetBadge(ctx, badgeID)
    if err != nil {
        if errors.Is(err, repository.ErrRecordNotFound) {
            // Returns: {"success": false, "error": "Badge not found", "code": 404, "request_id": "uuid"}
            return responses.NotFound(c, "Badge not found")
        }
        return responses.InternalError(c, "Failed to get badge")
    }
    
    return responses.Success(c, badge)
}
```

### Paginated Response

```go
func (ctrl *BadgeController) ListBadges(c *fiber.Ctx) error {
    pagination := controller.ParsePagination(c)
    badges, total, _ := s.badgeRepo.FindAll(ctx, repository.WithPagination(pagination.Page, pagination.PageSize))
    
    // Returns:
    // {
    //   "success": true,
    //   "data": [...],
    //   "pagination": {"total": 100, "page": 1, "limit": 20, "total_pages": 5}
    // }
    return responses.SuccessWithPagination(c, badges, total, pagination.Page, pagination.PageSize)
}
```

---

## Migration Checklist

When migrating existing code to framework components:

### Repository Migration

- [ ] Model implements TenantModel interface (GetID, GetTenantID, SetTenantID, TableName)
- [ ] Repository embeds GenericRepository[*Model]
- [ ] Custom queries use FindByCondition or extend base
- [ ] Tests verify tenant isolation

### Controller Migration

- [ ] Replace claims extraction with GetAuthContext()
- [ ] Replace JSON parsing with ParseAndValidate()
- [ ] Replace pagination parsing with ParsePagination()
- [ ] Use responses.* helpers for all responses

### Service Migration

- [ ] Embed BaseService
- [ ] Use TxManager for transactions
- [ ] Use Logger for structured logging
- [ ] Handle repository errors consistently

---

## Common Patterns

### Creating Context with Tenant ID

```go
func createServiceContext(auth *controller.AuthContext, fiberCtx *fiber.Ctx) context.Context {
    ctx := fiberCtx.Context()
    ctx = context.WithValue(ctx, "tenant_id", auth.TenantID.String())
    ctx = context.WithValue(ctx, "user_id", auth.UserID.String())
    return ctx
}
```

### Error Handling Pattern

```go
badge, err := s.badgeService.GetBadge(ctx, badgeID)
if err != nil {
    switch {
    case errors.Is(err, repository.ErrRecordNotFound):
        return responses.NotFound(c, "Badge not found")
    case errors.Is(err, repository.ErrTenantIDMissing):
        return responses.Unauthorized(c, "Authentication required")
    default:
        return responses.InternalError(c, "An error occurred")
    }
}
```
