# Data Model: Repository Interfaces

## Overview

This document defines the repository interfaces to be extracted for the DI refactoring. All interfaces follow the patterns documented in R2-repository-interface-design-pattern.md.

## Core Conventions

### Signature Pattern
```go
func MethodName(ctx context.Context, tenantID uuid.UUID, ...) (ReturnType, error)
```

### Error Handling
```go
// Use utility wrappers from internal/utils/errors.go
utils.WrapCreateError(err, "entity")
utils.WrapFindError(err, "entity", entityID)
utils.WrapNotFoundError("entity", entityID)
```

---

## Infrastructure Interfaces

### TransactionManager

```go
// TransactionManager provides database transaction handling
// Location: internal/framework/interfaces/transaction.go
type TransactionManager interface {
    // Begin starts a new transaction
    Begin(ctx context.Context) (Transaction, error)
    
    // WithTransaction executes fn within a transaction, handling commit/rollback
    WithTransaction(ctx context.Context, fn func(tx Transaction) error) error
}

// Transaction represents an active database transaction
type Transaction interface {
    // Commit commits the transaction
    Commit() error
    
    // Rollback aborts the transaction
    Rollback() error
    
    // DB returns the underlying *gorm.DB for query building
    DB() *gorm.DB
}
```

### CacheClient

```go
// CacheClient abstracts Redis cache operations
// Location: internal/framework/interfaces/cache.go
type CacheClient interface {
    // Get retrieves a value by key
    Get(ctx context.Context, key string) (string, error)
    
    // Set stores a value with optional TTL
    Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
    
    // Delete removes a key
    Delete(ctx context.Context, key string) error
    
    // Exists checks if a key exists
    Exists(ctx context.Context, key string) (bool, error)
    
    // SetNX sets a value only if key doesn't exist (for distributed locks)
    SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error)
}
```

---

## P1 Repository Interfaces

### PropertyRepository

```go
// PropertyRepository handles property data access
// Location: internal/framework/interfaces/property_repository.go
type PropertyRepository interface {
    // CRUD
    Create(ctx context.Context, property *models.Property) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Property, error)
    Update(ctx context.Context, property *models.Property) error
    Delete(ctx context.Context, tenantID, id uuid.UUID) error
    
    // Queries
    FindByOwner(ctx context.Context, tenantID, ownerID uuid.UUID, page, limit int) ([]*models.Property, int64, error)
    FindByType(ctx context.Context, tenantID uuid.UUID, propertyType string, page, limit int) ([]*models.Property, int64, error)
    Search(ctx context.Context, tenantID uuid.UUID, query string, filters map[string]interface{}) ([]*models.Property, error)
}
```

### QuestRepository (Existing - Verify)

```go
// QuestRepository handles quest data access
// Location: internal/framework/interfaces/quest_repository.go (existing)
type QuestRepository interface {
    // CRUD
    Create(ctx context.Context, quest *models.Quest) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Quest, error)
    Update(ctx context.Context, quest *models.Quest) error
    Delete(ctx context.Context, tenantID, id uuid.UUID) error
    
    // Queries
    FindActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error)
    FindByUser(ctx context.Context, tenantID, userID uuid.UUID) ([]models.Quest, error)
    FindDailyQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error)
}
```

### UserRepository

```go
// UserRepository handles user data access
// Location: internal/framework/interfaces/user_repository.go
type UserRepository interface {
    // CRUD
    Create(ctx context.Context, tenantID uuid.UUID, user *models.User) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.User, error)
    Update(ctx context.Context, user *models.User) error
    Delete(ctx context.Context, tenantID, id uuid.UUID) error
    
    // Authentication
    FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)
    FindByUsername(ctx context.Context, tenantID uuid.UUID, username string) (*models.User, error)
    
    // Gamification
    IncrementLoginStreak(ctx context.Context, userID uuid.UUID) error
    ResetLoginStreak(ctx context.Context, userID uuid.UUID) error
    UpdateXP(ctx context.Context, userID uuid.UUID, xpDelta int) error
    
    // Listing
    List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*models.User, int64, error)
}
```

### TransactionRepository

```go
// TransactionRepository handles financial transaction data access
// Location: internal/framework/interfaces/transaction_repository.go
type TransactionRepository interface {
    // CRUD
    Create(ctx context.Context, transaction *models.Transaction) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Transaction, error)
    Update(ctx context.Context, transaction *models.Transaction) error
    
    // Payment Queries
    FindByPaymentID(ctx context.Context, tenantID uuid.UUID, paymentID string) (*models.Transaction, error)
    GetByStatus(ctx context.Context, tenantID uuid.UUID, status string, limit int) ([]*models.Transaction, error)
    GetDisputedTransactions(ctx context.Context, tenantID uuid.UUID, page, pageSize int) ([]*models.Transaction, int64, error)
    
    // User Queries
    FindByUser(ctx context.Context, tenantID, userID uuid.UUID, page, limit int) ([]*models.Transaction, int64, error)
    GetUserBalance(ctx context.Context, tenantID, userID uuid.UUID) (int64, error)
}
```

### BadgeRepository

```go
// BadgeRepository handles badge data access
// Location: internal/framework/interfaces/badge_repository.go
type BadgeRepository interface {
    // CRUD
    Create(ctx context.Context, badge *models.Badge) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Badge, error)
    Update(ctx context.Context, badge *models.Badge) error
    Delete(ctx context.Context, tenantID, id uuid.UUID) error
    
    // Badge Discovery
    FindAll(ctx context.Context, tenantID uuid.UUID) ([]models.Badge, error)
    FindEligible(ctx context.Context, tenantID, userID uuid.UUID, userStats map[string]int) ([]models.Badge, error)
    
    // User Badges
    FindByUser(ctx context.Context, tenantID, userID uuid.UUID, statusFilter string) ([]models.UserBadge, error)
    CreateUserBadge(ctx context.Context, userBadge *models.UserBadge) error
    HasBadge(ctx context.Context, tenantID, userID, badgeID uuid.UUID) (bool, error)
}
```

### NotificationRepository

```go
// NotificationRepository handles notification data access
// Location: internal/framework/interfaces/notification_repository.go
type NotificationRepository interface {
    // CRUD
    Create(ctx context.Context, notification *models.Notification) error
    FindByID(ctx context.Context, tenantID uuid.UUID, id string) (*models.Notification, error)
    Delete(ctx context.Context, tenantID uuid.UUID, id string) error
    
    // Bulk Operations
    BulkCreate(ctx context.Context, notifications []models.Notification) error
    
    // User Queries
    FindByUser(ctx context.Context, tenantID, userID uuid.UUID, unreadOnly bool, page, limit int) ([]*models.Notification, int64, error)
    GetUnreadCount(ctx context.Context, tenantID, userID uuid.UUID) (int64, error)
    
    // Status Updates
    MarkAsRead(ctx context.Context, tenantID uuid.UUID, id string) error
    MarkAllAsRead(ctx context.Context, tenantID, userID uuid.UUID) (int64, error)
    
    // Cleanup
    DeleteOldReadNotifications(ctx context.Context, cutoffDate time.Time) (int64, error)
}
```

---

## Supporting Repository Interfaces

### AuditLogRepository

```go
// AuditLogRepository handles audit log data access
// Location: internal/framework/interfaces/audit_log_repository.go
type AuditLogRepository interface {
    // Create
    Create(ctx context.Context, log *models.AuditLog) error
    
    // Async Create (fire-and-forget)
    CreateAsync(ctx context.Context, log *models.AuditLog)
    
    // Queries
    FindByUser(ctx context.Context, tenantID, userID uuid.UUID, page, limit int) ([]*models.AuditLog, int64, error)
    FindByAction(ctx context.Context, tenantID uuid.UUID, action string, page, limit int) ([]*models.AuditLog, int64, error)
    FindByDateRange(ctx context.Context, tenantID uuid.UUID, start, end time.Time, page, limit int) ([]*models.AuditLog, int64, error)
}
```

### TwoFactorRepository

```go
// TwoFactorRepository handles 2FA secret data access
// Location: internal/framework/interfaces/two_factor_repository.go
type TwoFactorRepository interface {
    // CRUD
    Create(ctx context.Context, twoFactor *models.TwoFactor) error
    FindByUserID(ctx context.Context, tenantID, userID uuid.UUID) (*models.TwoFactor, error)
    Update(ctx context.Context, twoFactor *models.TwoFactor) error
    Delete(ctx context.Context, tenantID, userID uuid.UUID) error
    
    // Status
    IsEnabled(ctx context.Context, tenantID, userID uuid.UUID) (bool, error)
    Enable(ctx context.Context, tenantID, userID uuid.UUID) error
    Disable(ctx context.Context, tenantID, userID uuid.UUID) error
}
```

### BackupCodeRepository

```go
// BackupCodeRepository handles 2FA backup codes
// Location: internal/framework/interfaces/backup_code_repository.go
type BackupCodeRepository interface {
    // CRUD
    Create(ctx context.Context, codes []models.BackupCode) error
    FindByUserID(ctx context.Context, tenantID, userID uuid.UUID) ([]models.BackupCode, error)
    DeleteByUserID(ctx context.Context, tenantID, userID uuid.UUID) error
    
    // Usage
    MarkUsed(ctx context.Context, tenantID, userID uuid.UUID, codeHash string) error
    GetUnusedCount(ctx context.Context, tenantID, userID uuid.UUID) (int, error)
}
```

### TrustedDeviceRepository

```go
// TrustedDeviceRepository handles trusted device management
// Location: internal/framework/interfaces/trusted_device_repository.go
type TrustedDeviceRepository interface {
    // CRUD
    Create(ctx context.Context, device *models.TrustedDevice) error
    FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.TrustedDevice, error)
    Delete(ctx context.Context, tenantID, id uuid.UUID) error
    
    // User Queries
    FindByUserID(ctx context.Context, tenantID, userID uuid.UUID) ([]models.TrustedDevice, error)
    FindByToken(ctx context.Context, tenantID uuid.UUID, token string) (*models.TrustedDevice, error)
    
    // Cleanup
    DeleteExpired(ctx context.Context) (int64, error)
}
```

### EncryptionKeyRepository

```go
// EncryptionKeyRepository handles encryption key management
// Location: internal/framework/interfaces/encryption_key_repository.go
type EncryptionKeyRepository interface {
    // CRUD
    Create(ctx context.Context, key *models.EncryptionKey) error
    FindByID(ctx context.Context, id uuid.UUID) (*models.EncryptionKey, error)
    
    // Active Key
    GetActiveKey(ctx context.Context, tenantID uuid.UUID) (*models.EncryptionKey, error)
    SetActiveKey(ctx context.Context, tenantID, keyID uuid.UUID) error
    
    // Rotation
    GetKeysForRotation(ctx context.Context, olderThan time.Time) ([]models.EncryptionKey, error)
    MarkRotated(ctx context.Context, keyID uuid.UUID) error
}
```

---

## Config Structs

### SocialServiceConfig

```go
// SocialServiceConfig holds dependencies for SocialService
// Location: internal/services/social_service.go
type SocialServiceConfig struct {
    LikeRepo         interfaces.LikeRepository
    CommentRepo      interfaces.CommentRepository
    PostRepo         interfaces.PostRepository
    ActivityRepo     interfaces.ActivityRepository
    UserRepo         interfaces.UserRepository
    FollowRepo       interfaces.FollowRepository
    NotifService     *NotificationService
}

func (c SocialServiceConfig) Validate() error {
    if c.LikeRepo == nil {
        return errors.New("LikeRepo is required")
    }
    // ... validate all required fields
    return nil
}
```

### TransactionServiceConfig

```go
// TransactionServiceConfig holds dependencies for TransactionService
// Location: internal/services/transaction_service.go
type TransactionServiceConfig struct {
    TransactionRepo  interfaces.TransactionRepository
    MarketplaceRepo  interfaces.MarketplaceListingRepository
    UserRepo         interfaces.UserRepository
    PaymentManager   *payment.Manager
    NotifService     *NotificationService
    TxManager        interfaces.TransactionManager
}

func (c TransactionServiceConfig) Validate() error {
    if c.TransactionRepo == nil {
        return errors.New("TransactionRepo is required")
    }
    // ... validate all required fields
    return nil
}
```

### MarketplaceServiceConfig

```go
// MarketplaceServiceConfig holds dependencies for MarketplaceService
// Location: internal/services/marketplace_service.go
type MarketplaceServiceConfig struct {
    MarketplaceRepo  interfaces.MarketplaceListingRepository
    UserRepo         interfaces.UserRepository
    CourseRepo       interfaces.CourseRepository
    BadgeRepo        interfaces.BadgeRepository
    TxManager        interfaces.TransactionManager
}

func (c MarketplaceServiceConfig) Validate() error {
    if c.MarketplaceRepo == nil {
        return errors.New("MarketplaceRepo is required")
    }
    // ... validate all required fields
    return nil
}
```

---

## File Locations Summary

| Interface | Location |
|-----------|----------|
| `TransactionManager` | `internal/framework/interfaces/transaction.go` |
| `CacheClient` | `internal/framework/interfaces/cache.go` |
| `PropertyRepository` | `internal/framework/interfaces/property_repository.go` |
| `QuestRepository` | `internal/framework/interfaces/quest_repository.go` (existing) |
| `UserRepository` | `internal/framework/interfaces/user_repository.go` |
| `TransactionRepository` | `internal/framework/interfaces/transaction_repository.go` |
| `BadgeRepository` | `internal/framework/interfaces/badge_repository.go` |
| `NotificationRepository` | `internal/framework/interfaces/notification_repository.go` |
| `AuditLogRepository` | `internal/framework/interfaces/audit_log_repository.go` |
| `TwoFactorRepository` | `internal/framework/interfaces/two_factor_repository.go` |
| `BackupCodeRepository` | `internal/framework/interfaces/backup_code_repository.go` |
| `TrustedDeviceRepository` | `internal/framework/interfaces/trusted_device_repository.go` |
| `EncryptionKeyRepository` | `internal/framework/interfaces/encryption_key_repository.go` |
