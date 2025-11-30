# Research: Server Service Layer DI Completion

## Executive Summary

This document consolidates research findings from R2 (Repository Interface Design Pattern) and R3 (Service Layer Refactoring Strategy) with additional analysis specific to the DI completion effort.

## Current State Analysis

### Services Inventory

**Total Services**: 49 files in `internal/services/`

**Breakdown by Dependency Pattern**:

| Pattern | Count | Services |
|---------|-------|----------|
| Direct `*gorm.DB` injection | 20 | See R3 Section 2.1 |
| Global `database.DB` access | 5 | audit_log, auth, kms, two_factor, user |
| Global `cache.Client` access | 2 | blacklist, auth (indirect) |
| Repository injection ✓ | 15 | analytics, badge, dashboard, leaderboard, etc. |
| Pure logic (no DB) | 7 | ocr, openai, ffmpeg, transcoding, etc. |

### Global State Access Details

#### database.DB Access (45 total calls)

```
audit_log_service.go:    6 calls (lines 71, 76, 94, 114, 134, 158)
auth_service.go:        11 calls (lines 339-373, legacy init paths)
kms_service.go:          4 calls (lines 110, 165, 205, 220)
two_factor_service.go:  22 calls (lines 70-449, CRUD + backup codes)
user_service.go:         2 calls (lines 99, 110, legacy lookups)
```

#### cache.Client Access (3 total calls)

```
blacklist_service.go:    3 calls (lines 60, 104, 146 - token storage)
```

### Constructor Parameter Analysis

| Service | Params | Dependencies |
|---------|--------|--------------|
| SocialService | 7 | likeRepo, commentRepo, postRepo, activityRepo, userRepo, followRepo, notifService |
| TransactionService | 6 | db, transactionRepo, marketplaceRepo, userRepo, paymentManager, notificationService |
| MarketplaceService | 5 | db, marketplaceRepo, userRepo, courseRepo, badgeRepo |
| QuestService | 4 | db, logger, redisClient, questRepo, userRepo, badgeService, notificationService |
| CronService | 4 | db, propertyService, classifiedAdService, analyticsService |

---

## Repository Interface Patterns

### Recommended Signature Conventions

Based on R2 analysis of 25+ repositories:

1. **Context First**: All methods accept `context.Context` as first parameter
2. **Tenant Scoping**: Explicit `tenantID uuid.UUID` parameter for tenant isolation
3. **Pointer Returns**: Single entities return `*Model`, lists return `[]*Model` or `[]Model`
4. **Error Wrapping**: Use `utils.WrapXxxError()` utilities

### ID Type Variance

Most repositories use `uuid.UUID`, but two use `string`:
- `notification_repository.go` - string IDs
- `message_repository.go` - string IDs

**Recommendation**: Keep existing ID types to avoid breaking changes. Interface definitions should match current implementations.

### Pagination Patterns

Two patterns exist:

```go
// Pattern A: Returns slice + total count
func List(ctx, tenantID, page, limit int) ([]*Entity, int64, error)

// Pattern B: Returns slice only (no pagination)
func FindAll(ctx, tenantID) ([]Entity, error)
```

**Recommendation**: Standardize on Pattern A for paginated queries, Pattern B for bounded lists.

---

## Transaction Handling Analysis

### Current Patterns

Services that need database transactions currently hold `*gorm.DB` for:

1. **TransactionService**: Payment processing with rollback
2. **UserService**: XP updates with consistency
3. **MarketplaceService**: Purchase flow with inventory updates

### Proposed TransactionManager Interface

```go
type TransactionManager interface {
    WithTransaction(ctx context.Context, fn func(tx Transaction) error) error
}
```

**Usage Pattern**:

```go
// Before (tight coupling)
func (s *TransactionService) ProcessPayment(ctx context.Context, ...) error {
    tx := s.db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()
    // ... operations
    return tx.Commit().Error
}

// After (interface injection)
func (s *TransactionService) ProcessPayment(ctx context.Context, ...) error {
    return s.txManager.WithTransaction(ctx, func(tx interfaces.Transaction) error {
        // ... operations using tx.DB()
        return nil
    })
}
```

---

## DI Container Analysis

### Current Container Capabilities

From `internal/framework/container/container.go`:

- `RegisterSingleton(name, factory)` - One instance per app lifetime
- `RegisterTransient(name, factory)` - New instance per resolution
- `Resolve(name)` - Get instance by name
- `MustResolve(name)` - Get instance or panic
- `SetUseMocks(bool)` - Enable mock injection

### Current Registrations (app.go)

**Infrastructure**:
- `database` - `*gorm.DB` singleton
- `cache` - `*cache.PooledRedisClient` singleton
- `config` - `*config.Config` singleton

**Repositories** (9 registered):
- propertyRepository, questRepository, userRepository
- transactionRepository, badgeRepository, leaderboardRepository
- socialXPRepository, dailyChallengeRepository, contentMilestoneRepository

**Services** (3 registered):
- socialGamificationService
- learningGamificationService
- leaderboardService

### Registration Pattern

```go
if err := c.RegisterSingleton("serviceName", func(c *container.Container) (interface{}, error) {
    // Resolve dependencies
    repo, _ := c.Resolve("repositoryName")
    
    // Create service
    return services.NewService(repo.(*repositories.Repository)), nil
}); err != nil {
    log.Fatalf("Failed to register serviceName: %v", err)
}
```

---

## Mock Generation Strategy

### Mockery Configuration

Create `.mockery.yaml` at project root:

```yaml
with-expecter: true
packages:
  github.com/keshablive/quester/internal/framework/interfaces:
    interfaces:
      PropertyRepository:
      QuestRepository:
      UserRepository:
      TransactionRepository:
      BadgeRepository:
      NotificationRepository:
      AuditLogRepository:
      TwoFactorRepository:
      BackupCodeRepository:
      TrustedDeviceRepository:
      EncryptionKeyRepository:
      TransactionManager:
      CacheClient:
```

### Mock Usage Pattern

```go
func TestQuestService_StartQuest(t *testing.T) {
    // Arrange
    mockQuestRepo := mocks.NewMockQuestRepository(t)
    mockUserRepo := mocks.NewMockUserRepository(t)
    
    mockQuestRepo.EXPECT().
        FindByID(mock.Anything, tenantID, questID).
        Return(&models.Quest{ID: questID, Status: "available"}, nil)
    
    svc := services.NewQuestServiceV2(mockQuestRepo, mockUserRepo, nil, nil)
    
    // Act
    err := svc.StartQuest(ctx, tenantID, userID, questID)
    
    // Assert
    assert.NoError(t, err)
    mockQuestRepo.AssertExpectations(t)
}
```

---

## Migration Strategy

### Phase 1: Interface Extraction (Non-Breaking)

1. Create interface files in `internal/framework/interfaces/`
2. Verify existing implementations satisfy interfaces (compile-time check)
3. No changes to service constructors yet

### Phase 2: Service Refactoring (Backward Compatible)

1. Create new `NewServiceV2()` constructors accepting interfaces
2. Mark old constructors as `// Deprecated`
3. Update DI container to use new constructors
4. Old constructors remain for external callers

### Phase 3: Global State Elimination

1. Inject repositories where global DB is accessed
2. Test each service after refactoring
3. Remove global access one service at a time

### Phase 4: Config Structs

1. Create config struct types
2. Create `NewServiceWithConfig()` constructors
3. Update DI registrations

### Phase 5: Cleanup (Future Spec)

1. Remove deprecated constructors
2. Remove `*gorm.DB` fields from service structs
3. Update documentation

---

## Risk Analysis

### High Risk: TwoFactorService (22 global calls)

**Concern**: Security-critical service with most global state access

**Mitigation**:
1. Comprehensive unit tests before refactoring
2. Integration tests for 2FA flow
3. Staged rollout with feature flag

### Medium Risk: Transaction Handling

**Concern**: Payment processing requires atomic transactions

**Mitigation**:
1. TransactionManager interface with proven pattern
2. Test with mock that verifies commit/rollback calls
3. Integration test with real transactions

### Low Risk: Performance

**Concern**: DI resolution adds latency

**Mitigation**:
1. Singleton services created once at startup
2. No runtime reflection in hot paths
3. Benchmark before/after

---

## References

- [R2: Repository Interface Design Pattern](../docs/research/R2-repository-interface-design-pattern.md)
- [R3: Service Layer Refactoring Strategy](../docs/research/R3-service-layer-refactoring-strategy.md)
- [ARCHITECTURE.md](../server/docs/ARCHITECTURE.md)
- [FRAMEWORK_PATTERNS.md](../server/docs/FRAMEWORK_PATTERNS.md)
