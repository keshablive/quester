# R2: Repository Interface Design Pattern

## Executive Summary

**Recommended Pattern**: Independent entity-specific interfaces without a base interface, using standardized method signatures and cross-cutting utilities. This pattern maximizes type safety, provides excellent mockability with testify/mock, and maintains flexibility for entity-specific operations. The existing codebase shows consistent patterns across 25+ repositories that can be formalized into interfaces with minimal disruption. Context-first signatures, standardized pagination, and tenant filtering through explicit parameters ensure clean, testable, and maintainable code.

## Existing Repository Analysis

### Surveyed Repositories
- `user_repository.go` (16 methods)
- `quest_repository.go` (11 methods)
- `transaction_repository.go` (13 methods)
- `notification_repository.go` (15 methods)
- `post_repository.go` (14 methods)
- `badge_repository.go` (12 methods)
- `message_repository.go` (13 methods)
- `leaderboard_repository.go` (10 methods)
- `course_repository.go` (5 methods)
- `achievement_repository.go` (18 methods)

### Common CRUD Patterns Found

- **GetByID / FindByID**: `func (r *XRepository) FindByID(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (*models.X, error)`
  - Pattern: Context first, tenant scoping via explicit parameter, returns pointer
  - Some repositories use string IDs (notification, message) vs uuid.UUID
  
- **List / FindAll**: `func (r *XRepository) FindAll(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.X, error)` or with pagination: `func (r *XRepository) List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*models.X, int64, error)`
  - Pattern: Returns slice + total count for pagination
  - Some use filters (map[string]interface{}), others use typed filter structs
  - Offset-based pagination: `offset := (page - 1) * limit`
  
- **Create**: `func (r *XRepository) Create(ctx context.Context, entity *models.X) error`
  - Pattern: Takes pointer to entity, sets TenantID internally or expects it set
  - Some methods include tenantID parameter: `CreateUser(ctx, tenantID, user)`
  
- **Update**: `func (r *XRepository) Update(ctx context.Context, entity *models.X) error` or `Update(ctx, entity, updates map[string]interface{}) error`
  - Pattern: Either full entity save or partial updates via map
  - Always checks RowsAffected to return not found error
  
- **Delete**: `func (r *XRepository) Delete(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) error`
  - Pattern: Soft delete (GORM DeletedAt field), tenant-scoped
  - Checks RowsAffected for not found error

### Query Methods Observed

**User-specific**:
- `FindByEmail(ctx, tenantID, email) (*User, error)`
- `IncrementLoginStreak(ctx, userID) error`
- `ResetLoginStreak(ctx, userID) error`

**Quest-specific**:
- `FindActiveQuests(ctx, tenantID) ([]Quest, error)`

**Transaction-specific**:
- `FindByPaymentID(ctx, tenantID, paymentID) (*Transaction, error)`
- `GetByStatus(ctx, tenantID, status, limit) ([]*Transaction, error)`
- `GetDisputedTransactions(ctx, tenantID, page, pageSize) ([]*Transaction, int64, error)`

**Notification-specific**:
- `BulkCreate(ctx, notifications []Notification) error`
- `FindByUser(ctx, tenantID, userID, unreadOnly, page, limit) ([]*Notification, int64, error)`
- `GetUnreadCount(ctx, tenantID, userID) (int64, error)`
- `MarkAllAsRead(ctx, tenantID, userID) (int64, error)`
- `DeleteOldReadNotifications(ctx, cutoffDate) (int64, error)`

**Post-specific**:
- `GetUserPosts(ctx, userID, tenantID, page, limit) ([]Post, int64, error)`
- `GetPublicPosts(ctx, tenantID, page, limit) ([]Post, int64, error)`
- `GetFollowingPosts(ctx, userID, tenantID, page, limit) ([]Post, int64, error)`
- `IncrementLikeCount(ctx, postID, tenantID) error`
- `DecrementLikeCount(ctx, postID, tenantID) error`

**Badge-specific**:
- `FindEligible(ctx, tenantID, userID, userStats) ([]Badge, error)`
- `FindByUser(ctx, tenantID, userID, statusFilter) ([]UserBadge, error)`
- `CreateUserBadge(ctx, userBadge) error`

**Message-specific**:
- `FindDirectMessages(ctx, tenantID, userID, recipientID, page, limit) ([]*Message, int64, error)`
- `FindGroupMessages(ctx, tenantID, groupID, page, limit) ([]*Message, int64, error)`
- `GetUnreadCount(ctx, tenantID, userID) (int64, error)`

**Leaderboard-specific**:
- `BulkUpsert(ctx, leaderboards []Leaderboard) error`
- `FindByUserID(ctx, tenantID, userID) ([]Leaderboard, error)`
- `FindTopN(ctx, tenantID, leaderboardType, periodKey, category, limit) ([]Leaderboard, error)`

**Achievement-specific**:
- `FindByCategory(ctx, tenantID, category) ([]Achievement, error)`
- `CreateUserAchievement(ctx, userAchievement) error`
- `FindUserAchievement(ctx, tenantID, userID, achievementID) (*UserAchievement, error)`

### Context & Error Handling

- **Context usage**: ALL methods accept `context.Context` as the first parameter. Consistently used with `.WithContext(ctx)` in GORM queries.
  
- **Error wrapping**: Consistent use of utility functions from `internal/utils/errors.go`:
  - `utils.WrapCreateError(err, "entity")`
  - `utils.WrapFindError(err, "entity", entityID)`
  - `utils.WrapUpdateError(err, "entity")`
  - `utils.WrapDeleteError(err, "entity")`
  - `utils.WrapListError(err, "entities")`
  - `utils.WrapCountError(err, "entities")`
  - `utils.WrapNotFoundError("entity", entityID)`
  - Automatically converts `gorm.ErrRecordNotFound` to formatted errors
  - Uses `fmt.Errorf` with `%w` for error wrapping
  
- **Tenant filtering**: Multi-tenancy enforced via:
  - Explicit `tenantID uuid.UUID` parameter in method signatures
  - GORM queries: `.Where("tenant_id = ?", tenantID)`
  - Some repositories set `entity.TenantID` during Create
  - BaseRepository has `WithTenant()` and `WithTenantContext()` helpers (though not widely used)

### Inconsistencies Found

1. **ID Type Variance**: Most repositories use `uuid.UUID` for IDs, but `notification_repository.go` and `message_repository.go` use `string` for IDs
   
2. **Nil DB Check Pattern**: `user_repository.go` has constructor pattern: `if db == nil { db = database.DB }`, but most other repositories don't have this check
   
3. **Pagination Return Types**: Inconsistent between:
   - `([]Entity, int64, error)` - slice of values + total
   - `([]*Entity, int64, error)` - slice of pointers + total
   - `([]Entity, error)` - no pagination/count
   
4. **Filter Patterns**: Some use `filters map[string]interface{}`, others use typed filter structs (e.g., `BadgeFilters`)
   
5. **Update Signatures**: Mixed patterns:
   - `Update(ctx, entity)` - full save
   - `Update(ctx, entity, updates map[string]interface{})` - partial updates
   
6. **Create TenantID Handling**: 
   - Some methods accept `tenantID` parameter and set it: `CreateUser(ctx, tenantID, user)`
   - Others expect it already set on entity: `Create(ctx, entity)`

7. **Preloading Inconsistency**: Some FindByID methods preload associations, others don't

## Interface Hierarchy Decision

### Recommended Approach

**Independent entity-specific interfaces** without a base generic interface. Each repository defines its own interface contract matching its specific needs.

**Reasoning**:
- Go's lack of variance in generics makes `BaseRepository[T]` problematic for return types (can't return `[]*Entity` from `[]Entity`)
- Entity-specific methods dominate (60-70% of methods are custom queries)
- Different ID types (uuid.UUID vs string) would require generic constraints
- Interface composition adds complexity without sufficient benefit
- Mockery generates cleaner mocks from independent interfaces
- Easier to evolve individual repositories without breaking a base contract

### Rationale

1. **Type Safety**: Entity-specific interfaces ensure compile-time safety for model types. No type assertions or generic constraints needed.

2. **Flexibility**: Each repository can define methods that make sense for its domain without conforming to a rigid base interface that may not fit all cases.

3. **Mockability**: Mockery generates one mock per interface. Independent interfaces mean services only depend on what they need, making tests cleaner.

4. **Testability**: Services can be tested with focused mocks. A service using 3 methods doesn't need to mock 20 base CRUD methods.

5. **Migration Strategy**: Can extract interfaces gradually. No need to refactor all 25+ repositories at once.

6. **Go Idioms**: Aligns with Go's preference for small, focused interfaces and composition over inheritance.

### Sample Interface Definitions

#### Entity-Specific Interface Example 1: UserRepository

```go
// internal/repositories/interfaces/user_repository.go
package interfaces

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
)

// UserRepository defines the contract for user data access operations
type UserRepository interface {
	// CRUD operations
	CreateUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error
	FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
	FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	
	// User-specific operations
	IncrementLoginStreak(ctx context.Context, userID uuid.UUID) error
	ResetLoginStreak(ctx context.Context, userID uuid.UUID) error
}
```

#### Entity-Specific Interface Example 2: QuestRepository

```go
// internal/repositories/interfaces/quest_repository.go
package interfaces

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
)

// QuestRepository defines the contract for quest data access operations
type QuestRepository interface {
	// CRUD operations
	Create(ctx context.Context, quest *models.Quest) error
	FindByID(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) (*models.Quest, error)
	FindAll(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.Quest, error)
	Update(ctx context.Context, quest *models.Quest) error
	Delete(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) error
	
	// Quest-specific queries
	FindActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error)
}
```

#### Entity-Specific Interface Example 3: TransactionRepository

```go
// internal/repositories/interfaces/transaction_repository.go
package interfaces

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
)

// TransactionRepository defines the contract for transaction data access operations
type TransactionRepository interface {
	// CRUD operations
	Create(ctx context.Context, transaction *models.Transaction) error
	FindByID(ctx context.Context, tenantID, transactionID uuid.UUID) (*models.Transaction, error)
	Update(ctx context.Context, transaction *models.Transaction, updates map[string]interface{}) error
	Delete(ctx context.Context, transaction *models.Transaction) error
	
	// Transaction-specific queries
	FindByPaymentID(ctx context.Context, tenantID uuid.UUID, paymentID string) (*models.Transaction, error)
	GetByStatus(ctx context.Context, tenantID uuid.UUID, status models.TransactionStatus, limit int) ([]*models.Transaction, error)
	GetDisputedTransactions(ctx context.Context, tenantID uuid.UUID, page int, pageSize int) ([]*models.Transaction, int64, error)
}
```

#### Entity-Specific Interface Example 4: NotificationRepository

```go
// internal/repositories/interfaces/notification_repository.go
package interfaces

import (
	"context"
	"time"

	"github.com/keshablive/quester/internal/models"
)

// NotificationRepository defines the contract for notification data access operations
type NotificationRepository interface {
	// CRUD operations
	Create(ctx context.Context, notification *models.Notification) error
	BulkCreate(ctx context.Context, notifications []models.Notification) error
	FindByID(ctx context.Context, tenantID, id string) (*models.Notification, error)
	Update(ctx context.Context, notification *models.Notification) error
	Delete(ctx context.Context, tenantID, id string) error
	
	// Notification-specific queries
	FindByUser(ctx context.Context, tenantID, userID string, unreadOnly bool, page, limit int) ([]*models.Notification, int64, error)
	GetUnreadCount(ctx context.Context, tenantID, userID string) (int64, error)
	GetTotalCount(ctx context.Context, tenantID, userID string) (int64, error)
	MarkAllAsRead(ctx context.Context, tenantID, userID string) (int64, error)
	DeleteOldReadNotifications(ctx context.Context, cutoffDate time.Time) (int64, error)
	FindByType(ctx context.Context, tenantID, userID, notifType string, page, limit int) ([]*models.Notification, int64, error)
}
```

#### Entity-Specific Interface Example 5: PostRepository

```go
// internal/repositories/interfaces/post_repository.go
package interfaces

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
)

// PostRepository defines the contract for post data access operations
type PostRepository interface {
	// CRUD operations
	Create(ctx context.Context, post *models.Post) error
	FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Post, error)
	Update(ctx context.Context, post *models.Post) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	
	// Post-specific queries
	GetUserPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error)
	GetPublicPosts(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error)
	GetFollowingPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error)
	
	// Post metrics
	IncrementLikeCount(ctx context.Context, postID, tenantID uuid.UUID) error
	DecrementLikeCount(ctx context.Context, postID, tenantID uuid.UUID) error
}
```

#### Entity-Specific Interface Example 6: BadgeRepository

```go
// internal/repositories/interfaces/badge_repository.go
package interfaces

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// BadgeRepository defines the contract for badge data access operations
type BadgeRepository interface {
	// CRUD operations
	Create(ctx context.Context, badge *models.Badge) error
	FindByID(ctx context.Context, tenantID, badgeID uuid.UUID) (*models.Badge, error)
	FindAll(ctx context.Context, tenantID uuid.UUID, filters repositories.BadgeFilters) ([]models.Badge, int64, error)
	
	// Badge-specific queries
	FindEligible(ctx context.Context, tenantID, userID uuid.UUID, userStats repositories.UserStats) ([]models.Badge, error)
	FindByUser(ctx context.Context, tenantID, userID uuid.UUID, statusFilter string) ([]models.UserBadge, error)
	CreateUserBadge(ctx context.Context, userBadge *models.UserBadge) error
}
```

#### Entity-Specific Interface Example 7: MessageRepository

```go
// internal/repositories/interfaces/message_repository.go
package interfaces

import (
	"context"

	"github.com/keshablive/quester/internal/models"
)

// MessageRepository defines the contract for message data access operations
type MessageRepository interface {
	// CRUD operations
	Create(ctx context.Context, message *models.Message) error
	FindByID(ctx context.Context, tenantID, id string) (*models.Message, error)
	Update(ctx context.Context, tenantID string, message *models.Message) error
	Delete(ctx context.Context, tenantID, id string) error
	
	// Message-specific queries
	FindDirectMessages(ctx context.Context, tenantID, userID, recipientID string, page, limit int) ([]*models.Message, int64, error)
	FindGroupMessages(ctx context.Context, tenantID, groupID string, page, limit int) ([]*models.Message, int64, error)
	GetUnreadCount(ctx context.Context, tenantID, userID string) (int64, error)
}
```

#### Entity-Specific Interface Example 8: LeaderboardRepository

```go
// internal/repositories/interfaces/leaderboard_repository.go
package interfaces

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
)

// LeaderboardRepository defines the contract for leaderboard data access operations
type LeaderboardRepository interface {
	// CRUD operations
	Create(ctx context.Context, leaderboard *models.Leaderboard) error
	BulkUpsert(ctx context.Context, leaderboards []models.Leaderboard) error
	
	// Leaderboard-specific queries
	FindByUserID(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) ([]models.Leaderboard, error)
	FindTopN(ctx context.Context, tenantID uuid.UUID, leaderboardType models.LeaderboardType, periodKey string, category string, limit int) ([]models.Leaderboard, error)
}
```

## Common Method Patterns

### Context Handling

**Pattern**: All methods accept `context.Context` as the first parameter (100% compliance observed)

**Rationale**: 
- Enables request cancellation and timeout propagation
- Supports distributed tracing (OpenTelemetry spans)
- Passes tenant_id and user metadata (though explicit parameters are preferred)
- Standard Go practice for database operations

**Convention**: `func (r *XRepository) Method(ctx context.Context, ...) error`

### Pagination

**Standard approach**: Offset-based pagination with separate count

**Pagination calculation pattern**:
```go
offset := (page - 1) * limit
query.Offset(offset).Limit(limit)
```

**Return signature for paginated methods**:
```go
func (r *XRepository) List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*Entity, int64, error)
// Returns: entities slice, total count, error
```

**Optimization pattern** (observed in multiple repositories):
```go
// Build base query once
baseQuery := r.db.WithContext(ctx).Model(&models.Entity{}).Where("tenant_id = ?", tenantID)

// Get total count
var total int64
baseQuery.Count(&total)

// Get paginated results (reusing base query conditions)
offset := (page - 1) * limit
baseQuery.Offset(offset).Limit(limit).Find(&entities)
```

### Error Handling

**Wrapping convention**: Use utility functions from `internal/utils/errors.go`

**Standard patterns**:
```go
// Create operations
if err := db.Create(entity).Error; err != nil {
    return utils.WrapCreateError(err, "entity")
}

// Find operations (auto-converts gorm.ErrRecordNotFound)
if err := db.First(&entity).Error; err != nil {
    return utils.WrapFindError(err, "entity", entityID)
}

// Update operations
if result.Error != nil {
    return utils.WrapUpdateError(result.Error, "entity")
}
if result.RowsAffected == 0 {
    return utils.WrapNotFoundError("entity", entityID)
}

// Delete operations
if result.Error != nil {
    return utils.WrapDeleteError(result.Error, "entity")
}
if result.RowsAffected == 0 {
    return utils.WrapNotFoundError("entity", entityID)
}

// List operations
if err := query.Find(&entities).Error; err != nil {
    return utils.WrapListError(err, "entities")
}

// Count operations
if err := query.Count(&total).Error; err != nil {
    return utils.WrapCountError(err, "entities")
}
```

**Custom errors**: `utils/errors.go` defines:
- `ErrNotFound` - entity not found
- `ErrAccessDenied` - tenant access denied
- `ErrInvalidInput` - validation errors
- `ErrAlreadyExists` - uniqueness violations
- Service-level errors (unauthorized, forbidden, rate limit, etc.)

### Tenant Filtering

**Multi-tenancy approach**: Explicit `tenantID` parameters in method signatures + GORM WHERE clauses

**Pattern**:
```go
func (r *XRepository) FindByID(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (*models.Entity, error) {
    var entity models.Entity
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&entity).Error
    // ...
}
```

**Create operations**:
```go
func (r *XRepository) Create(ctx context.Context, tenantID uuid.UUID, entity *models.Entity) error {
    entity.TenantID = tenantID // Set explicitly
    return r.db.WithContext(ctx).Create(entity).Error
}
```

**Alternative pattern** (from BaseRepository, not widely adopted):
```go
// BaseRepository helper (exists but not commonly used)
func (r *BaseRepository) WithTenant(tenantID string) *gorm.DB {
    return r.DB.Where("tenant_id = ?", tenantID)
}

func (r *BaseRepository) WithTenantContext(ctx context.Context) *gorm.DB {
    tenantID := GetTenantIDFromContext(ctx)
    return r.DB.WithContext(ctx).Where("tenant_id = ?", tenantID)
}
```

### Soft Deletes

**Pattern**: GORM's `DeletedAt` field convention (models inherit `gorm.Model` or define `DeletedAt *time.Time`)

**Standard deletion**:
```go
func (r *XRepository) Delete(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) error {
    result := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        Delete(&models.Entity{})
    
    if result.Error != nil {
        return utils.WrapDeleteError(result.Error, "entity")
    }
    if result.RowsAffected == 0 {
        return utils.WrapNotFoundError("entity", id.String())
    }
    return nil
}
```

**Hard delete** (when needed):
```go
db.Unscoped().Delete(&entity) // Bypasses soft delete
```

**Querying deleted records**:
```go
db.Unscoped().Where("deleted_at IS NOT NULL").Find(&entities)
```

## Mockability Assessment

### Mockery Compatibility

**Verdict**: Excellent compatibility with [mockery](https://github.com/vektra/mockery)

Mockery can generate mocks from independent interfaces with command:
```bash
mockery --name=UserRepository --dir=internal/repositories/interfaces --output=internal/repositories/mocks
```

Or using `.mockery.yaml` config:
```yaml
with-expecter: true
dir: "internal/repositories/interfaces"
output: "internal/repositories/mocks"
outpkg: "mocks"
all: true
```

**Generated mock example**:
```go
// mocks/UserRepository.go (auto-generated)
type UserRepository struct {
    mock.Mock
}

func (m *UserRepository) FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
    ret := m.Called(ctx, userID)
    return ret.Get(0).(*models.User), ret.Error(1)
}

// ... other methods
```

### Interface Size

**Assessment**: Interfaces are appropriately sized (5-15 methods per repository)

- **Small interfaces** (5-7 methods): CourseRepository, RefreshTokenRepository
- **Medium interfaces** (8-12 methods): UserRepository, QuestRepository, TransactionRepository, BadgeRepository
- **Larger interfaces** (13-18 methods): NotificationRepository, PostRepository, MessageRepository, AchievementRepository

**Rationale**:
- Not too granular (avoids interface explosion)
- Not too large (easy to mock what you need)
- Services typically use 3-5 methods from a repository
- Tests can mock only the methods they call (mockery supports partial mocking)

### Testing Example

```go
// services/user_service_test.go
package services_test

import (
    "context"
    "testing"

    "github.com/google/uuid"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "github.com/keshablive/quester/internal/models"
    "github.com/keshablive/quester/internal/repositories/mocks"
    "github.com/keshablive/quester/internal/services"
)

func TestUserService_GetUserByID(t *testing.T) {
    // Arrange
    ctx := context.Background()
    userID := uuid.New()
    expectedUser := &models.User{
        ID:       userID,
        Email:    "test@example.com",
        Username: "testuser",
    }

    mockRepo := mocks.NewUserRepository(t)
    mockRepo.On("FindByID", ctx, userID).
        Return(expectedUser, nil).
        Once()

    service := services.NewUserService(mockRepo)

    // Act
    user, err := service.GetUserByID(ctx, userID)

    // Assert
    assert.NoError(t, err)
    assert.Equal(t, expectedUser, user)
    mockRepo.AssertExpectations(t)
}

func TestUserService_CreateUser(t *testing.T) {
    // Arrange
    ctx := context.Background()
    tenantID := uuid.New()
    user := &models.User{
        Email:    "newuser@example.com",
        Username: "newuser",
    }

    mockRepo := mocks.NewUserRepository(t)
    mockRepo.On("CreateUser", ctx, tenantID, mock.AnythingOfType("*models.User")).
        Return(nil).
        Once()

    service := services.NewUserService(mockRepo)

    // Act
    err := service.CreateUser(ctx, tenantID, user)

    // Assert
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}

func TestUserService_IncrementLoginStreak(t *testing.T) {
    // Arrange
    ctx := context.Background()
    userID := uuid.New()

    mockRepo := mocks.NewUserRepository(t)
    mockRepo.On("IncrementLoginStreak", ctx, userID).
        Return(nil).
        Once()

    service := services.NewUserService(mockRepo)

    // Act
    err := service.IncrementLoginStreak(ctx, userID)

    // Assert
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}
```

**Key testing benefits**:
- Mock only the repository methods the service actually calls
- Use `mock.AnythingOfType()` for entity pointers when exact match isn't needed
- Use `Once()`, `Times(n)`, or `Maybe()` for call expectations
- `AssertExpectations()` verifies all expected calls were made
- Clean, readable test setup with testify's fluent API

## Interface Composition

### Cross-Cutting Concerns

**Recommendation**: Handle cross-cutting concerns through **utilities** and **middleware** rather than interface composition.

**Rationale**:
- Existing codebase uses utility functions (`utils.WrapXError`) for standardized error handling
- Middleware handles observability (logging, tracing, metrics) at HTTP/gRPC layer
- Auditing can be implemented via GORM hooks or service-layer decorators
- Caching should be at service layer (repository stays focused on data access)

**Anti-pattern to avoid**:
```go
// DON'T: Interface pollution
type AuditableRepository interface {
    GetAuditLog(ctx context.Context, entityID uuid.UUID) ([]*AuditEntry, error)
}

type CacheableRepository interface {
    InvalidateCache(ctx context.Context, entityID uuid.UUID) error
}

// This forces all repositories to implement auditing/caching even if not needed
```

**Recommended patterns**:

#### 1. Error Handling via Utilities (Already in use)
```go
// internal/utils/errors.go
func WrapCreateError(err error, entityType string) error { ... }
func WrapFindError(err error, entityType, entityID string) error { ... }
// ... etc
```

#### 2. Observability via Middleware
```go
// internal/middleware/logging.go
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Log request
        next.ServeHTTP(w, r)
        // Log response
    })
}
```

#### 3. Auditing via Service-Layer Decorator (Optional)
```go
// internal/services/audit_decorator.go
type AuditedUserService struct {
    base      UserService
    auditRepo AuditRepository
}

func (s *AuditedUserService) CreateUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error {
    err := s.base.CreateUser(ctx, tenantID, user)
    if err == nil {
        s.auditRepo.Log(ctx, "user.created", user.ID)
    }
    return err
}
```

#### 4. Caching via Service Layer (Not repository)
```go
// internal/services/cached_user_service.go
type CachedUserService struct {
    repo  UserRepository
    cache Cache
}

func (s *CachedUserService) FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
    // Check cache first
    if cached, ok := s.cache.Get(userID); ok {
        return cached.(*models.User), nil
    }
    
    // Cache miss, fetch from repo
    user, err := s.repo.FindByID(ctx, userID)
    if err == nil {
        s.cache.Set(userID, user, 5*time.Minute)
    }
    return user, err
}
```

### Composition Pattern

**Not recommended** for this codebase. Interface composition adds complexity without sufficient benefit.

If composition were needed (e.g., shared behavior across many repositories), consider:

```go
// internal/repositories/interfaces/common.go
type Auditable interface {
    // Only if MANY repositories need this
    RecordAction(ctx context.Context, action string, entityID uuid.UUID) error
}

// Repository can optionally implement
type UserRepository interface {
    // Core methods
    FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
    // ... other methods
}

// If a specific repository needs auditing, service layer handles it
type AuditableUserRepository interface {
    UserRepository
    Auditable
}
```

**Conclusion**: Keep interfaces focused on data access. Handle cross-cutting concerns at service/middleware layers.

## Final Recommendation

### Interface Pattern

**Independent entity-specific interfaces** (one per repository, no base interface)

### Rationale

This pattern is best for 25+ repositories because:

1. **Type Safety**: Each interface is strongly typed to its entity (no generics or type assertions)
2. **Flexibility**: Repositories can define entity-specific methods without base interface constraints
3. **Mockability**: Mockery generates clean, focused mocks. Services depend only on what they need
4. **Testability**: Tests mock 3-5 methods per service, not 20+ base CRUD methods
5. **Maintainability**: Can evolve interfaces independently. No cascading changes across all repositories
6. **Go Idioms**: Aligns with Go's preference for small interfaces and composition
7. **Migration Path**: Extract interfaces gradually, one repository at a time

### Key Decisions

- **Base interface**: No. Independent interfaces per repository
- **Entity-specific methods**: Defined directly in each repository interface (e.g., `FindByEmail`, `GetActiveQuests`)
- **Context**: Always first parameter in every method
- **Pagination**: Standardized offset-based with `(page, limit int)` returning `(entities, total int64, error)`
- **Error handling**: Use `utils.WrapXError()` utilities for consistent error wrapping
- **Tenant filtering**: Explicit `tenantID uuid.UUID` parameter in method signatures + GORM WHERE clauses

### Sample Repository Count

**All 26 repositories requiring interfaces**:

1. `UserRepository` ✓ (example provided)
2. `QuestRepository` ✓ (example provided)
3. `TransactionRepository` ✓ (example provided)
4. `NotificationRepository` ✓ (example provided)
5. `PostRepository` ✓ (example provided)
6. `BadgeRepository` ✓ (example provided)
7. `MessageRepository` ✓ (example provided)
8. `LeaderboardRepository` ✓ (example provided)
9. `AchievementRepository`
10. `CourseRepository`
11. `RefreshTokenRepository`
12. `ReportRepository`
13. `NotificationSettingsRepository`
14. `MarketplaceListingRepository`
15. `LikeRepository`
16. `GroupRepository`
17. `GroupMemberRepository`
18. `FollowRepository`
19. `FCMTokenRepository`
20. `CommentRepository`
21. `QuestProgressRepository`
22. `ActivityRepository`
23. `AnalyticsRepository`
24. `DashboardRepository`
25. `BaseRepository` (may not need interface, it's a utility)

**Plus any additional repositories**: Check `internal/repositories/*.go` for complete list

### Migration Strategy

**Phase 1: Create interfaces package**
```bash
mkdir -p server/internal/repositories/interfaces
```

**Phase 2: Extract interfaces incrementally (2-3 repositories per PR)**

1. Create interface file: `internal/repositories/interfaces/user_repository.go`
2. Define interface matching existing implementation
3. Update service constructors to accept interface instead of `*gorm.DB`
4. Run tests to verify no breakage
5. Generate mocks: `mockery --name=UserRepository`
6. Write unit tests using mocks

**Example PR sequence**:
- PR 1: UserRepository, AuthService tests
- PR 2: QuestRepository, QuestService tests
- PR 3: TransactionRepository, PaymentService tests
- ...continue for remaining 23 repositories

**Phase 3: Update service constructors**

**Before**:
```go
// services/user_service.go
type UserService struct {
    db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
    return &UserService{db: db}
}

func (s *UserService) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
    repo := repositories.NewUserRepository(s.db)
    return repo.FindByID(ctx, userID)
}
```

**After**:
```go
// services/user_service.go
type UserService struct {
    userRepo interfaces.UserRepository
}

func NewUserService(userRepo interfaces.UserRepository) *UserService {
    return &UserService{userRepo: userRepo}
}

func (s *UserService) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
    return s.userRepo.FindByID(ctx, userID)
}
```

**Phase 4: Wire dependencies (main.go or DI container)**

**Before**:
```go
// cmd/server/main.go
userService := services.NewUserService(database.DB)
```

**After**:
```go
// cmd/server/main.go
userRepo := repositories.NewUserRepository(database.DB)
userService := services.NewUserService(userRepo)
```

**Phase 5: Generate mocks and write tests**

```bash
# Install mockery
go install github.com/vektra/mockery/v2@latest

# Generate mocks for all interfaces
mockery --all --dir=internal/repositories/interfaces --output=internal/repositories/mocks --outpkg=mocks
```

**Phase 6: Update existing integration tests**

- Keep integration tests that use real DB (rename to `*_integration_test.go`)
- Add unit tests with mocks (use `*_test.go`)
- Use build tags to separate: `// +build integration`

**Timeline estimate**:
- 26 repositories ÷ 3 per PR = ~9 PRs
- 1-2 days per PR (interface extraction + tests) = 2-3 weeks total

**Benefits of gradual migration**:
- No "big bang" refactor
- Can merge PRs incrementally
- Reduces risk of breaking changes
- Team can review smaller changesets
- Can pause migration if priorities shift
