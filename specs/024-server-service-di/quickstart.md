# Quickstart: Server Service Layer DI Completion

## Overview

This guide helps developers quickly understand and work with the DI refactoring patterns introduced in this spec.

## Prerequisites

- Go 1.24+
- Understanding of Go interfaces
- Familiarity with testify/mock

## Key Concepts

### 1. Repository Interfaces

All data access is abstracted through interfaces in `internal/framework/interfaces/`:

```go
// Location: internal/framework/interfaces/user_repository.go
type UserRepository interface {
    Create(ctx context.Context, tenantID uuid.UUID, user *models.User) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.User, error)
    FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)
    // ... more methods
}
```

### 2. Service Constructor Pattern

Services now accept interfaces, not concrete types:

```go
// OLD (deprecated)
func NewUserService(userRepo *repositories.UserRepository, leaderboardService *LeaderboardService, db *gorm.DB) *UserService

// NEW (recommended)
func NewUserServiceV2(
    userRepo interfaces.UserRepository,
    leaderboardService interfaces.LeaderboardService,
    txManager interfaces.TransactionManager,
) *UserService
```

### 3. Config Struct Pattern

For services with many dependencies:

```go
type SocialServiceConfig struct {
    LikeRepo     interfaces.LikeRepository
    CommentRepo  interfaces.CommentRepository
    PostRepo     interfaces.PostRepository
    // ... more fields
}

func NewSocialServiceWithConfig(cfg SocialServiceConfig) (*SocialService, error) {
    if err := cfg.Validate(); err != nil {
        return nil, err
    }
    return &SocialService{
        likeRepo:    cfg.LikeRepo,
        commentRepo: cfg.CommentRepo,
        // ...
    }, nil
}
```

## Common Tasks

### Adding a New Repository Interface

1. Create file in `internal/framework/interfaces/`:

```go
// internal/framework/interfaces/my_repository.go
package interfaces

import (
    "context"
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/models"
)

type MyRepository interface {
    Create(ctx context.Context, entity *models.MyEntity) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.MyEntity, error)
    // Add tenant-scoped queries as needed
}
```

2. Verify implementation satisfies interface:

```go
// internal/repositories/my_repository.go
var _ interfaces.MyRepository = (*MyRepository)(nil) // Compile-time check
```

3. Generate mock:

```bash
mockery --name=MyRepository --dir=internal/framework/interfaces --output=internal/mocks
```

### Refactoring a Service

1. **Identify dependencies** - List all `*gorm.DB` usages in service methods
2. **Create/use interfaces** - Map DB calls to repository methods
3. **Update constructor** - Accept interfaces instead of `*gorm.DB`
4. **Register in container** - Update `app.go` `registerServices()`

Example:

```go
// BEFORE
type MyService struct {
    db *gorm.DB
}

func (s *MyService) GetItem(ctx context.Context, id uuid.UUID) (*models.Item, error) {
    var item models.Item
    if err := s.db.WithContext(ctx).First(&item, id).Error; err != nil {
        return nil, err
    }
    return &item, nil
}

// AFTER
type MyService struct {
    itemRepo interfaces.ItemRepository
}

func (s *MyService) GetItem(ctx context.Context, tenantID, id uuid.UUID) (*models.Item, error) {
    return s.itemRepo.FindByID(ctx, tenantID, id)
}
```

### Writing Unit Tests with Mocks

```go
func TestMyService_GetItem(t *testing.T) {
    // Setup
    mockRepo := mocks.NewMockItemRepository(t)
    svc := NewMyServiceV2(mockRepo)
    
    // Configure mock
    expectedItem := &models.Item{ID: testID, Name: "Test"}
    mockRepo.EXPECT().
        FindByID(mock.Anything, tenantID, testID).
        Return(expectedItem, nil)
    
    // Execute
    result, err := svc.GetItem(context.Background(), tenantID, testID)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, expectedItem, result)
}
```

### Using TransactionManager

```go
func (s *PaymentService) ProcessPayment(ctx context.Context, payment *models.Payment) error {
    return s.txManager.WithTransaction(ctx, func(tx interfaces.Transaction) error {
        // All operations in this block are in a single transaction
        if err := s.paymentRepo.Create(ctx, payment); err != nil {
            return err // Auto-rollback
        }
        
        if err := s.userRepo.UpdateBalance(ctx, payment.UserID, -payment.Amount); err != nil {
            return err // Auto-rollback
        }
        
        return nil // Auto-commit
    })
}
```

## Directory Structure

```
internal/
├── framework/
│   └── interfaces/           # Repository & infrastructure interfaces
│       ├── cache.go          # CacheClient interface
│       ├── transaction.go    # TransactionManager interface
│       ├── user_repository.go
│       ├── quest_repository.go
│       └── ...
├── repositories/             # Interface implementations
│   ├── user_repository.go    # Implements interfaces.UserRepository
│   └── ...
├── services/                 # Business logic
│   ├── user_service.go       # Uses interfaces.UserRepository
│   └── ...
├── mocks/                    # Generated mocks
│   ├── mock_user_repository.go
│   └── ...
└── app/
    └── app.go                # DI container setup
```

## Validation Checklist

Before submitting changes:

- [ ] New interfaces follow context-first signature pattern
- [ ] Existing implementations satisfy new interfaces (compile check)
- [ ] Old constructors marked deprecated with migration comment
- [ ] New constructors registered in DI container
- [ ] Unit tests use mocks, not real database
- [ ] No global `database.DB` or `cache.Client` access in refactored code
- [ ] Integration tests pass

## Common Errors

### "interface not satisfied"

```
cannot use &UserRepository{} as interfaces.UserRepository
```

**Fix**: Ensure all interface methods are implemented with exact signatures.

### "nil pointer in service"

```
panic: runtime error: invalid memory address
```

**Fix**: Check DI registration resolves dependencies correctly:

```go
userRepo, err := c.Resolve("userRepository")
if err != nil {
    return nil, fmt.Errorf("failed to resolve userRepository: %w", err)
}
```

### "mock expectation not met"

```
mock: expected call was not made
```

**Fix**: Ensure test calls the exact method with expected arguments, or use `mock.Anything` for flexible matching.

## References

- [data-model.md](./data-model.md) - Interface definitions
- [research.md](./research.md) - Background analysis
- [R2: Repository Interface Design Pattern](../../docs/research/R2-repository-interface-design-pattern.md)
- [R3: Service Layer Refactoring Strategy](../../docs/research/R3-service-layer-refactoring-strategy.md)
