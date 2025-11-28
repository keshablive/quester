# R3: Service Layer Refactoring Strategy

## Executive Summary

The service layer requires refactoring to eliminate tight coupling to `*gorm.DB`, remove global state access (`database.DB`, `cache.Client`), and address constructor parameter explosion (up to 7 parameters). Out of 49 service files analyzed, 20 services accept `*gorm.DB` directly in constructors, 5 services access global `database.DB` singleton, and 2 services access global `cache.Client`. The recommended strategy is a phased approach: (1) extract repository interfaces for P1 services, (2) apply config struct pattern for services with 5+ parameters, (3) eliminate global state via dependency injection, and (4) use incremental migration with adapter pattern for backward compatibility. Estimated timeline: 6-8 weeks for full refactoring of all 49 services.

## Service Inventory

### Total Services Count
**49 service files** found in `internal/services/` (excluding test files and helper utilities)

### Services with *gorm.DB Dependency
**20 services** accept `*gorm.DB` in constructor:

1. `achievement_service.go` - `NewAchievementService(db *gorm.DB)`
2. `assessment_service.go` - `NewAssessmentService(db *gorm.DB)`
3. `certificate_generator.go` - `NewCertificateGenerator(db *gorm.DB, verificationURL, organizationName string)`
4. `certificate_service.go` - `NewCertificateService(db *gorm.DB)`
5. `classified_ad_service.go` - `NewClassifiedAdService(db *gorm.DB)`
6. `course_service.go` - `NewCourseService(db *gorm.DB)`
7. `cron_service.go` - `NewCronService(db *gorm.DB, propertyService, classifiedAdService, analyticsService)`
8. `enrollment_service.go` - `NewEnrollmentService(db *gorm.DB)`
9. `gamification_service.go` - `NewGamificationService(db *gorm.DB)`
10. `interaction_service.go` - `NewInteractionService(db *gorm.DB, moderationService)` + `NewRateLimiter(db *gorm.DB)`
11. `lesson_service.go` - `NewLessonService(db *gorm.DB)`
12. `messaging_service.go` - `NewMessagingService(db *gorm.DB)`
13. `moderation_service.go` - `NewModerationService(db *gorm.DB)`
14. `notification_service.go` - `NewNotificationService(db *gorm.DB)`
15. `property_service.go` - `NewPropertyService(db *gorm.DB, ocrService, aiService)`
16. `quest_service.go` - `NewQuestService(db *gorm.DB, badgeService, notificationService)`
17. `rtmp_service.go` - `NewVideoStreamingService(db *gorm.DB, redisClient *redis.Client)`
18. `search_service.go` - `NewSearchService(db *gorm.DB, redis *redis.Client)`
19. `user_service.go` - `NewUserService(userRepo, leaderboardService, db *gorm.DB)` **(hybrid - partial repository adoption)**
20. `video_stream_service.go` - `NewVideoStreamService(db *gorm.DB, config *StreamingConfig)`

### Services with Global database.DB Access
**5 services** access `database.DB` global singleton in methods:

1. **`audit_log_service.go`** - 6 occurrences
   - Lines 71, 76, 94, 114, 134, 158
   - Used for: Async audit log insertion, querying logs
   
2. **`auth_service.go`** - 11 occurrences
   - Lines 339-373 (multiple calls in test helpers)
   - Used for: Creating repositories in legacy initialization paths
   
3. **`kms_service.go`** - 4 occurrences
   - Lines 110, 165, 205, 220, 239
   - Used for: Encryption key management, key rotation
   
4. **`two_factor_service.go`** - 22 occurrences
   - Lines 70, 107, 134, 151, 167, 206, 217, 225, 230, 235, 246, 274, 289, 299, 313, 335, 375, 385, 395, 401, 414, 427, 449
   - Used for: 2FA CRUD operations, backup codes, trusted devices
   
5. **`user_service.go`** - 2 occurrences
   - Lines 99, 110
   - Used for: Legacy user lookup methods (should use userRepo)

### Services with Global cache.Client Access
**2 services** access `cache.Client` global singleton:

1. **`blacklist_service.go`** - 3 occurrences
   - Lines 60, 104, 146
   - Used for: Token blacklist storage/retrieval in Redis

2. **`auth_service.go`** - (indirectly via `NewBlacklistService()` initialization)

### Services with Constructor Parameter Explosion (>5 params)

| Service | Parameter Count | Parameters | Config Struct Candidate? |
|---------|----------------|------------|--------------------------|
| **SocialService** | **7** | likeRepo, commentRepo, postRepo, activityRepo, userRepo, followRepo, notifService | **Yes** |
| **TransactionService** | **6** | db, transactionRepo, marketplaceRepo, userRepo, paymentManager, notificationService | **Yes** |
| **MarketplaceService** | **5** | db, marketplaceRepo, userRepo, courseRepo, badgeRepo | **Yes** |
| **CronService** | **4** | db, propertyService, classifiedAdService, analyticsService | Optional |
| **QuestService** | **3** | db, badgeService, notificationService | No |
| **PropertyService** | **3** | db, ocrService, aiService | No |
| **BadgeService** | **3** | badgeRepo, redisClient, notificationService | No |
| **LeaderboardService** | **3** | leaderboardRepo, userRepo, redisClient | No |
| **UserService** | **3** | userRepo, leaderboardService, db | No |

**Note**: Services with 5+ parameters are strong candidates for config struct pattern.

## Dependency Graph

### High-Level Service-to-Repository Mapping

```text
achievement_service.go:
  - Currently uses *gorm.DB directly
  - Needs: UserRepository, AchievementRepository

analytics_service.go:
  - AnalyticsRepository ✓ (already uses repository)

assessment_service.go:
  - Currently uses *gorm.DB directly
  - Needs: AssessmentRepository, QuestionRepository

audit_log_service.go:
  - Currently uses global database.DB
  - Needs: AuditLogRepository

auth_service.go:
  - UserRepository ✓ (uses interface)
  - RefreshTokenRepository ✓ (uses interface)
  - Accesses global database.DB in legacy paths

badge_service.go:
  - BadgeRepository ✓
  - Uses cache.PooledRedisClient ✓

blacklist_service.go:
  - Currently uses global cache.Client
  - Needs: CacheClient interface injection

certificate_service.go:
  - Currently uses *gorm.DB directly
  - Needs: CertificateRepository, CourseRepository, UserRepository

classified_ad_service.go:
  - Currently uses *gorm.DB directly
  - Needs: ClassifiedAdRepository

course_service.go:
  - Currently uses *gorm.DB directly
  - Needs: CourseRepository

cron_service.go:
  - Uses *gorm.DB + 3 service dependencies
  - Needs: Refactor to use repositories or service interfaces

dashboard_service.go:
  - DashboardRepository ✓
  - AnalyticsRepository ✓

enrollment_service.go:
  - Currently uses *gorm.DB directly
  - Needs: EnrollmentRepository, CourseRepository, UserRepository

gamification_service.go:
  - Currently uses *gorm.DB directly
  - Needs: QuestRepository, BadgeRepository, LeaderboardRepository

interaction_service.go:
  - Currently uses *gorm.DB directly
  - Needs: LikeRepository, CommentRepository, PostRepository, ModerationService

kms_service.go:
  - Currently uses global database.DB
  - Needs: EncryptionKeyRepository

leaderboard_service.go:
  - LeaderboardRepository ✓
  - UserRepository ✓
  - cache.PooledRedisClient ✓

lesson_service.go:
  - Currently uses *gorm.DB directly
  - Needs: LessonRepository, CourseRepository

marketplace_service.go:
  - MarketplaceListingRepository ✓
  - UserRepository ✓
  - CourseRepository ✓
  - BadgeRepository ✓
  - Still holds *gorm.DB reference (should remove)

messaging_service.go:
  - Currently uses *gorm.DB directly
  - Needs: MessageRepository, ConversationRepository

moderation_service.go:
  - Currently uses *gorm.DB directly
  - Needs: ModerationRepository

notification_service.go:
  - Currently uses *gorm.DB directly
  - Needs: NotificationRepository

property_service.go:
  - Currently uses *gorm.DB directly
  - Needs: PropertyRepository
  - Dependencies: OCRService, OpenAIService

quest_service.go:
  - QuestRepository ✓
  - UserRepository ✓
  - Dependencies: BadgeService, NotificationService

quest_progress_service.go:
  - Currently uses *gorm.DB directly
  - Needs: QuestProgressRepository, QuestRepository, UserRepository

report_service.go:
  - ReportRepository ✓
  - AnalyticsRepository ✓

search_service.go:
  - Currently uses *gorm.DB + *redis.Client directly
  - Needs: SearchRepository (or embed multiple repos)

social_service.go:
  - LikeRepository ✓
  - CommentRepository ✓
  - PostRepository ✓
  - ActivityRepository ✓
  - UserRepository ✓
  - FollowRepository ✓
  - Dependencies: NotificationService

transaction_service.go:
  - TransactionRepository ✓
  - MarketplaceListingRepository ✓
  - UserRepository ✓
  - Still holds *gorm.DB reference (for transactions - needs pattern)
  - Dependencies: PaymentManager, NotificationService

two_factor_service.go:
  - Currently uses global database.DB extensively
  - Needs: TwoFactorRepository, BackupCodeRepository, TrustedDeviceRepository

user_service.go:
  - UserRepository ✓
  - Still holds *gorm.DB reference (for XP transaction - needs pattern)
  - Dependencies: LeaderboardService

video_stream_service.go:
  - Currently uses *gorm.DB directly
  - Needs: VideoStreamRepository
```

### Tightly Coupled Services

Services with many repository dependencies (candidates for decomposition or config structs):

1. **SocialService** - 6 repositories + 1 service (highest complexity)
2. **TransactionService** - 3 repositories + *gorm.DB + 2 external dependencies
3. **MarketplaceService** - 4 repositories + *gorm.DB
4. **QuestService** - 2 repositories + 2 services
5. **TwoFactorService** - Needs 3 new repositories (currently 22 global DB calls)

### High-Priority Services (P1)

From spec 001-server-refactor/SPEC.md, P1 services to refactor first:

1. **PropertyService** - Core domain, OCR/AI integration
2. **QuestService** - Core gamification domain
3. **UserService** - Authentication critical path
4. **TransactionService** - Payment/escrow critical
5. **BadgeService** - Gamification rewards
6. **LeaderboardService** - Competitive features

## Refactoring Approach

### Phase 1: Repository Interface Extraction (P1 Services)

**Services to refactor first**: PropertyService, QuestService, UserService, TransactionService, BadgeService, LeaderboardService (6 services)

**Strategy**: 
1. Extract repository interfaces for missing repositories (PropertyRepository, etc.)
2. Update service constructor to accept interface instead of `*gorm.DB`
3. Update service initialization in `routes.go` to pass repository implementation
4. Generate mocks using `mockery` and write unit tests
5. Verify functionality with integration tests

**Example refactoring** (PropertyService):

```go
// BEFORE: property_service.go (Lines 17-22)
type PropertyService struct {
    db           *gorm.DB
    ocrService   *OCRService
    aiService    *OpenAIService
    cacheService interface{}
}

func NewPropertyService(db *gorm.DB, ocrService *OCRService, aiService *OpenAIService) *PropertyService {
    return &PropertyService{
        db:         db,
        ocrService: ocrService,
        aiService:  aiService,
    }
}

// Methods like CreateProperty() directly use s.db.WithContext(ctx).Create(property)


// AFTER: property_service.go
type PropertyService struct {
    propertyRepo repositories.PropertyRepository
    ocrService   *OCRService
    aiService    *OpenAIService
}

func NewPropertyService(
    propertyRepo repositories.PropertyRepository,
    ocrService *OCRService,
    aiService *OpenAIService,
) *PropertyService {
    return &PropertyService{
        propertyRepo: propertyRepo,
        ocrService:   ocrService,
        aiService:    aiService,
    }
}

// Methods now call s.propertyRepo.Create(ctx, property)
```

**New repository interface** (repositories/property_repository.go):

```go
package repositories

import (
    "context"
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/models"
)

// PropertyRepository defines the interface for property data access
type PropertyRepository interface {
    Create(ctx context.Context, property *models.Property) error
    FindByID(ctx context.Context, tenantID, propertyID uuid.UUID) (*models.Property, error)
    FindAll(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.Property, error)
    Update(ctx context.Context, property *models.Property) error
    Delete(ctx context.Context, tenantID, propertyID uuid.UUID) error
    SearchNearby(ctx context.Context, params PropertySearchParams) ([]PropertyWithDistance, error)
}

// PropertyRepositoryImpl implements PropertyRepository using GORM
type PropertyRepositoryImpl struct {
    db *gorm.DB
}

func NewPropertyRepository(db *gorm.DB) PropertyRepository {
    return &PropertyRepositoryImpl{db: db}
}

// Implement all interface methods...
```

**Updated initialization** (routes.go):

```go
// BEFORE
propertyService := services.NewPropertyService(db, ocrService, openAIService)

// AFTER
propertyRepo := repositories.NewPropertyRepository(db)
propertyService := services.NewPropertyService(propertyRepo, ocrService, openAIService)
```

### Phase 2: Config Struct Pattern (Constructor Explosion)

**Services requiring config structs**: SocialService (7 params), TransactionService (6 params), MarketplaceService (5 params)

**Config struct example** (SocialService):

```go
// BEFORE: social_service.go (Lines 16-41)
type SocialService struct {
    likeRepo     *repositories.LikeRepository
    commentRepo  *repositories.CommentRepository
    postRepo     *repositories.PostRepository
    activityRepo *repositories.ActivityRepository
    userRepo     *repositories.UserRepository
    followRepo   *repositories.FollowRepository
    notifService *NotificationService
}

func NewSocialService(
    likeRepo *repositories.LikeRepository,
    commentRepo *repositories.CommentRepository,
    postRepo *repositories.PostRepository,
    activityRepo *repositories.ActivityRepository,
    userRepo *repositories.UserRepository,
    followRepo *repositories.FollowRepository,
    notifService *NotificationService,
) *SocialService {
    return &SocialService{
        likeRepo:     likeRepo,
        commentRepo:  commentRepo,
        postRepo:     postRepo,
        activityRepo: activityRepo,
        userRepo:     userRepo,
        followRepo:   followRepo,
        notifService: notifService,
    }
}


// AFTER: social_service.go
type SocialServiceConfig struct {
    LikeRepo     repositories.LikeRepository
    CommentRepo  repositories.CommentRepository
    PostRepo     repositories.PostRepository
    ActivityRepo repositories.ActivityRepository
    UserRepo     repositories.UserRepository
    FollowRepo   repositories.FollowRepository
    NotifService *NotificationService // Optional - can be nil
}

// Validate ensures all required dependencies are provided
func (cfg *SocialServiceConfig) Validate() error {
    if cfg.LikeRepo == nil {
        return fmt.Errorf("LikeRepo is required")
    }
    if cfg.CommentRepo == nil {
        return fmt.Errorf("CommentRepo is required")
    }
    if cfg.PostRepo == nil {
        return fmt.Errorf("PostRepo is required")
    }
    if cfg.ActivityRepo == nil {
        return fmt.Errorf("ActivityRepo is required")
    }
    if cfg.UserRepo == nil {
        return fmt.Errorf("UserRepo is required")
    }
    if cfg.FollowRepo == nil {
        return fmt.Errorf("FollowRepo is required")
    }
    // NotifService is optional - no validation
    return nil
}

type SocialService struct {
    cfg SocialServiceConfig
}

func NewSocialService(cfg SocialServiceConfig) (*SocialService, error) {
    if err := cfg.Validate(); err != nil {
        return nil, fmt.Errorf("invalid config: %w", err)
    }
    return &SocialService{cfg: cfg}, nil
}

// Methods access dependencies via s.cfg.LikeRepo, etc.
```

**Updated initialization** (routes.go):

```go
// BEFORE
socialService := services.NewSocialService(
    likeRepo,
    commentRepo,
    postRepo,
    activityRepo,
    userRepo,
    followRepo,
    notificationService,
)

// AFTER
socialService, err := services.NewSocialService(services.SocialServiceConfig{
    LikeRepo:     likeRepo,
    CommentRepo:  commentRepo,
    PostRepo:     postRepo,
    ActivityRepo: activityRepo,
    UserRepo:     userRepo,
    FollowRepo:   followRepo,
    NotifService: notificationService,
})
if err != nil {
    log.Fatalf("Failed to initialize SocialService: %v", err)
}
```

**Benefits**:
- Clear documentation of required vs optional dependencies
- Validation at construction time
- Easier to add new dependencies without breaking signature
- Better testability (mock entire config)

### Phase 3: Global State Elimination

**Global database.DB access points**:
- `audit_log_service.go` - 6 calls (async logging, queries)
- `auth_service.go` - 11 calls (legacy test helpers)
- `kms_service.go` - 5 calls (encryption key management)
- `two_factor_service.go` - 22 calls (2FA CRUD operations)
- `user_service.go` - 2 calls (legacy lookup methods)

**Global cache.Client access points**:
- `blacklist_service.go` - 3 calls (token blacklist Redis operations)

**Replacement strategy**:

1. **For database.DB → Repository pattern**:
   - Create repository interfaces: `AuditLogRepository`, `TwoFactorRepository`, etc.
   - Inject repositories into service constructors
   - Replace `database.DB.Create()` → `s.auditLogRepo.Create()`

2. **For cache.Client → Interface injection**:
   - Define `CacheClient` interface (or use existing `cache.PooledRedisClient`)
   - Inject cache client into service constructor
   - Replace `cache.Client.Set()` → `s.cache.Set()`

**Example** (AuditLogService):

```go
// BEFORE: audit_log_service.go (Lines 13-22)
type AuditLogService struct {
    // Uses global database.DB
}

func NewAuditLogService() *AuditLogService {
    return &AuditLogService{}
}

// Line 76: database.DB.WithContext(asyncCtx).Create(auditLog).Error
// Line 94: database.DB.WithContext(ctx).Where(...).Find(&logs)


// AFTER: audit_log_service.go
type AuditLogService struct {
    auditLogRepo repositories.AuditLogRepository
}

func NewAuditLogService(auditLogRepo repositories.AuditLogRepository) *AuditLogService {
    return &AuditLogService{
        auditLogRepo: auditLogRepo,
    }
}

// Replace direct database calls with repository methods:
// s.auditLogRepo.Create(asyncCtx, auditLog)
// s.auditLogRepo.FindByUser(ctx, userID, filters)
```

**Example** (BlacklistService):

```go
// BEFORE: blacklist_service.go (Lines 14-28)
type BlacklistService struct {
    // Uses global cache.Client
    maxRetries     int
    baseRetryDelay time.Duration
}

func NewBlacklistService() *BlacklistService {
    return &BlacklistService{
        maxRetries:     3,
        baseRetryDelay: 100 * time.Millisecond,
    }
}

// Line 60: cache.Client.Set(ctx, key, "1", ttl).Err()
// Line 104: cache.Client.Exists(ctx, key).Result()


// AFTER: blacklist_service.go
type BlacklistService struct {
    cache          cache.Client // Inject cache interface
    maxRetries     int
    baseRetryDelay time.Duration
}

func NewBlacklistService(cacheClient cache.Client) *BlacklistService {
    return &BlacklistService{
        cache:          cacheClient,
        maxRetries:     3,
        baseRetryDelay: 100 * time.Millisecond,
    }
}

// Replace global cache access:
// s.cache.Set(ctx, key, "1", ttl).Err()
// s.cache.Exists(ctx, key).Result()
```

**Example** (TwoFactorService - most complex, 22 global DB calls):

```go
// BEFORE: two_factor_service.go
type TwoFactorService struct {
    kmsService *KMSService
}

func NewTwoFactorService(cfg *fwconfig.Config) *TwoFactorService {
    return &TwoFactorService{
        kmsService: NewKMSService(cfg.KMS),
    }
}

// 22 direct database.DB calls scattered throughout methods


// AFTER: two_factor_service.go
type TwoFactorServiceConfig struct {
    TwoFactorRepo     repositories.TwoFactorRepository
    BackupCodeRepo    repositories.BackupCodeRepository
    TrustedDeviceRepo repositories.TrustedDeviceRepository
    TwoFALogRepo      repositories.TwoFALogRepository
    UserRepo          repositories.UserRepository // For tenant lookup
    KMSService        *KMSService
}

func (cfg *TwoFactorServiceConfig) Validate() error {
    if cfg.TwoFactorRepo == nil {
        return fmt.Errorf("TwoFactorRepo is required")
    }
    if cfg.BackupCodeRepo == nil {
        return fmt.Errorf("BackupCodeRepo is required")
    }
    if cfg.TrustedDeviceRepo == nil {
        return fmt.Errorf("TrustedDeviceRepo is required")
    }
    if cfg.KMSService == nil {
        return fmt.Errorf("KMSService is required")
    }
    return nil
}

type TwoFactorService struct {
    cfg TwoFactorServiceConfig
}

func NewTwoFactorService(cfg TwoFactorServiceConfig) (*TwoFactorService, error) {
    if err := cfg.Validate(); err != nil {
        return nil, err
    }
    return &TwoFactorService{cfg: cfg}, nil
}

// Replace all 22 database.DB calls with repository method calls
```

**Priority order for global state elimination**:
1. **TwoFactorService** (22 calls - highest impact)
2. **AuthService** (11 calls - critical path, but many in test helpers)
3. **AuditLogService** (6 calls - security logging)
4. **KMSService** (5 calls - encryption keys)
5. **BlacklistService** (3 calls - token security)
6. **UserService** (2 calls - should use existing userRepo)

## Backward Compatibility Strategy

### Approach

**Recommended: Adapter Pattern + Incremental Migration**

This approach allows old and new patterns to coexist during migration without breaking existing functionality.

### Rationale

1. **Minimal disruption**: Services can be migrated one-by-one without coordinating changes across entire codebase
2. **Testable**: Each service can be validated independently before migrating the next
3. **Reversible**: Easy to rollback individual service changes if issues arise
4. **Gradual**: Team can migrate services over 6-8 weeks without pressure
5. **No feature flags needed**: Adapter pattern is transparent to consumers

### Migration Steps

**Step 1: Create repository interfaces (if missing)**

For services still using `*gorm.DB` directly, extract repository interface:

```go
// repositories/property_repository.go
type PropertyRepository interface {
    Create(ctx context.Context, property *models.Property) error
    FindByID(ctx context.Context, tenantID, propertyID uuid.UUID) (*models.Property, error)
    // ... other methods
}

type PropertyRepositoryImpl struct {
    db *gorm.DB
}

func NewPropertyRepository(db *gorm.DB) PropertyRepository {
    return &PropertyRepositoryImpl{db: db}
}
```

**Step 2: Refactor service constructor**

Update service to accept repository interface:

```go
// BEFORE
func NewPropertyService(db *gorm.DB, ocrService *OCRService, aiService *OpenAIService) *PropertyService

// AFTER
func NewPropertyService(
    propertyRepo repositories.PropertyRepository,
    ocrService *OCRService,
    aiService *OpenAIService,
) *PropertyService
```

**Step 3: Update routes.go initialization**

Update service initialization to pass repository implementation:

```go
// routes.go
propertyRepo := repositories.NewPropertyRepository(db)
propertyService := services.NewPropertyService(propertyRepo, ocrService, openAIService)
```

**Step 4: Replace direct DB calls in service methods**

```go
// BEFORE
func (s *PropertyService) CreateProperty(ctx context.Context, property *models.Property) error {
    if err := s.db.WithContext(ctx).Create(property).Error; err != nil {
        return fmt.Errorf("failed to create property: %w", err)
    }
    return nil
}

// AFTER
func (s *PropertyService) CreateProperty(ctx context.Context, property *models.Property) error {
    if err := s.propertyRepo.Create(ctx, property); err != nil {
        return fmt.Errorf("failed to create property: %w", err)
    }
    return nil
}
```

**Step 5: Generate mocks and write unit tests**

```bash
# Install mockery if not already installed
go install github.com/vektra/mockery/v2@latest

# Generate mock for PropertyRepository
mockery --name=PropertyRepository --dir=internal/repositories --output=internal/repositories/mocks --outpkg=mocks

# Write unit tests using mocks
```

**Step 6: Verify with integration tests**

Run existing integration tests to ensure service behavior unchanged:

```bash
go test ./internal/services/... -v
go test ./internal/controllers/... -v -run TestProperty
```

**Step 7: Repeat for next service**

Migrate one service per day/week until all 49 services refactored.

### Rollback Plan

If migration causes issues:

1. **Revert service file**: Git revert the service constructor and method changes
2. **Revert routes.go**: Restore old initialization code (pass `db` instead of repository)
3. **Keep repository interface**: No harm in leaving repository interface/implementation (not used until service is re-migrated)
4. **Run tests**: Verify rollback restored functionality

### Coexistence Example

During migration, `routes.go` will have mix of old and new patterns:

```go
// routes.go (mid-migration state)

// OLD PATTERN - Not yet migrated
notificationService := services.NewNotificationService(db)
courseService := services.NewCourseService(db)

// NEW PATTERN - Already migrated
propertyRepo := repositories.NewPropertyRepository(db)
propertyService := services.NewPropertyService(propertyRepo, ocrService, aiService)

questRepo := repositories.NewQuestRepository(db)
questService := services.NewQuestService(questRepo, badgeService, notificationService)

// Both patterns work side-by-side until all services migrated
```

## Test Coverage Analysis

### Services with Existing Tests

Only **3 services** have test files:

1. `lesson_service_test.go` - Unit tests for LessonService
2. `cron_service_test.go` - Unit tests for CronService
3. `bandwidth_estimator_test.go` - Unit tests for bandwidth estimation

**Note**: Some services have integration tests in `controllers/*_test.go`:
- `transaction_controller_webhook_test.go` - Tests TransactionService webhook handling
- `video_streaming_controller_dvr_extend_test.go` - Tests DVRService integration

### Services Lacking Unit Tests

**46 out of 49 services** lack dedicated unit tests. High-priority services without tests:

**P1 Services (Critical)**:
- PropertyService - No unit tests (complex geospatial logic)
- QuestService - No unit tests (core gamification)
- UserService - No unit tests (XP system, leaderboards)
- TransactionService - Only webhook integration test
- BadgeService - No unit tests (award logic)
- LeaderboardService - No unit tests (Redis ranking)

**P2 Services (Important)**:
- SocialService - No unit tests (7 repository dependencies)
- MarketplaceService - No unit tests (listing management)
- AnalyticsService - No unit tests (data aggregation)
- DashboardService - No unit tests (widget queries)
- ReportService - No unit tests (report generation)

**P3 Services (Lower Priority)**:
- 31 remaining services without tests

### Testing Effort Estimate

**Mock generation**: 
- **Effort**: 1-2 hours (automated via mockery)
- **Command**: `mockery --all --dir=internal/repositories --output=internal/repositories/mocks`
- **Output**: ~30-40 mock files (one per repository interface)

**Unit test writing**: 
- **Per-service estimate**: 2-4 hours (depends on complexity)
  - Simple services (1 repo, few methods): 2 hours
  - Medium services (2-3 repos, moderate logic): 3 hours
  - Complex services (5+ repos, business logic): 4-6 hours
- **Total services**: 46 services
- **Average**: 3 hours per service × 46 = **138 hours** ≈ **3.5 weeks** (1 developer, full-time)
- **With 2 developers**: ~**2 weeks** of parallel work

**Integration test updates**: 
- **Estimate**: 1-2 hours per service with existing integration tests
- **Services to update**: ~10 services (controllers with integration tests)
- **Total**: **10-20 hours** ≈ **2-3 days**

**Total testing effort**: 
- **Mock generation**: 2 hours
- **Unit tests**: 138 hours (3.5 weeks @ 1 dev, or 2 weeks @ 2 devs)
- **Integration test updates**: 15 hours (2 days)
- **Grand total**: **155 hours** ≈ **4 weeks** (1 developer) or **2.5 weeks** (2 developers)

## Refactoring Priority Order

### Priority 1 (Week 1-2): Core Services

**Target**: 6 services, estimated 12-16 hours refactoring + 18-24 hours testing

1. **PropertyService** 
   - **Reason**: P1, core real estate domain, OCR/AI integration
   - **Complexity**: Medium (geospatial queries, file uploads)
   - **Dependencies**: 3 (db → propertyRepo, ocrService, aiService)
   - **Estimate**: 3 hours refactor + 4 hours tests

2. **QuestService** 
   - **Reason**: P1, core gamification domain
   - **Complexity**: Low (already uses QuestRepository, UserRepository)
   - **Dependencies**: 2 repos + 2 services (BadgeService, NotificationService)
   - **Estimate**: 2 hours refactor + 3 hours tests

3. **UserService** 
   - **Reason**: P1, authentication critical path, XP system
   - **Complexity**: Medium (XP transactions, level calculation)
   - **Dependencies**: UserRepository ✓, LeaderboardService, *gorm.DB (for transaction)
   - **Estimate**: 3 hours refactor + 4 hours tests
   - **Note**: Needs transaction pattern (Unit of Work or TransactionManager)

4. **TransactionService** 
   - **Reason**: P1, payment/escrow critical, financial integrity
   - **Complexity**: High (escrow state machine, payment gateway integration)
   - **Dependencies**: 6 params (3 repos, *gorm.DB, PaymentManager, NotificationService)
   - **Estimate**: 4 hours refactor + 5 hours tests
   - **Note**: Apply config struct pattern

5. **BadgeService** 
   - **Reason**: P1, gamification rewards
   - **Complexity**: Low (already uses BadgeRepository)
   - **Dependencies**: 3 (BadgeRepository ✓, cache.PooledRedisClient ✓, NotificationService)
   - **Estimate**: 2 hours refactor + 3 hours tests

6. **LeaderboardService** 
   - **Reason**: P1, competitive features, Redis-backed
   - **Complexity**: Medium (Redis sorted sets, DB sync)
   - **Dependencies**: 3 (LeaderboardRepository ✓, UserRepository ✓, cache.PooledRedisClient ✓)
   - **Estimate**: 2 hours refactor + 3 hours tests

**Week 1-2 Total**: 16 hours refactor + 22 hours tests = **38 hours** ≈ **1 week** (1 developer)

### Priority 2 (Week 3-4): Supporting Services

**Target**: 10 services, estimated 24-30 hours refactoring + 30-40 hours testing

7. **SocialService** 
   - **Complexity**: High (7 params - config struct pattern)
   - **Estimate**: 4 hours refactor + 5 hours tests

8. **MarketplaceService** 
   - **Complexity**: Medium (5 params - config struct pattern)
   - **Estimate**: 3 hours refactor + 4 hours tests

9. **AnalyticsService** 
   - **Complexity**: Low (already uses AnalyticsRepository ✓)
   - **Estimate**: 1 hour refactor + 2 hours tests

10. **DashboardService** 
    - **Complexity**: Low (already uses 2 repos ✓)
    - **Estimate**: 1 hour refactor + 2 hours tests

11. **ReportService** 
    - **Complexity**: Low (already uses 2 repos ✓)
    - **Estimate**: 1 hour refactor + 2 hours tests

12. **NotificationService** 
    - **Complexity**: Medium (db → NotificationRepository)
    - **Estimate**: 3 hours refactor + 3 hours tests

13. **MessagingService** 
    - **Complexity**: Medium (db → MessageRepository, ConversationRepository)
    - **Estimate**: 3 hours refactor + 4 hours tests

14. **AuditLogService** 
    - **Complexity**: Low (global database.DB → AuditLogRepository)
    - **Estimate**: 2 hours refactor + 3 hours tests

15. **TwoFactorService** 
    - **Complexity**: High (22 global DB calls → 4 repositories, config struct)
    - **Estimate**: 6 hours refactor + 6 hours tests

16. **BlacklistService** 
    - **Complexity**: Low (global cache.Client → inject cache interface)
    - **Estimate**: 1 hour refactor + 2 hours tests

**Week 3-4 Total**: 25 hours refactor + 33 hours tests = **58 hours** ≈ **1.5 weeks** (1 developer)

### Priority 3 (Week 5-6): Remaining Services

**Target**: 33 services, estimated 60-75 hours refactoring + 90-120 hours testing

**Batch 1: LMS Services (8 services)**
17. CourseService
18. LessonService
19. EnrollmentService
20. AssessmentService
21. CertificateService
22. CertificateGenerator
23. AchievementService
24. GamificationService

**Batch 2: Content/Moderation Services (6 services)**
25. ModerationService
26. InteractionService
27. SearchService
28. ClassifiedAdService
29. QuestProgressService
30. OCRService

**Batch 3: Video Streaming Services (5 services)**
31. VideoStreamService
32. VideoStreamingService (RTMP)
33. DVRService
34. TranscodingService
35. FFmpegService

**Batch 4: Infrastructure Services (8 services)**
36. CronService
37. AuthService (legacy test helpers)
38. KMSService
39. QueueService
40. RetryService
41. TokenCleanupService
42. FCMService
43. OpenAIService

**Batch 5: Utilities/Helpers (6 services)**
44. BandwidthEstimator
45. NotificationBatcher
46. ModerationClient
47. KMSClient
48. AnalyticsService (already clean)
49. DashboardService (already clean)

**Estimate**: 2-3 hours per service × 33 services = **66-99 hours refactor** + **99-132 hours tests**

**Week 5-6 Total**: 80 hours refactor + 115 hours tests = **195 hours** ≈ **5 weeks** (1 developer) or **2.5 weeks** (2 developers)

### Summary Timeline

| Phase | Services | Refactor Time | Test Time | Total Time | Duration (1 dev) | Duration (2 devs) |
|-------|----------|---------------|-----------|------------|------------------|-------------------|
| **P1** | 6 | 16 hrs | 22 hrs | 38 hrs | 1 week | 0.5 weeks |
| **P2** | 10 | 25 hrs | 33 hrs | 58 hrs | 1.5 weeks | 0.75 weeks |
| **P3** | 33 | 80 hrs | 115 hrs | 195 hrs | 5 weeks | 2.5 weeks |
| **Total** | **49** | **121 hrs** | **170 hrs** | **291 hrs** | **7.5 weeks** | **3.75 weeks** |

**Adjusted for parallel work** (2 developers, overlapping phases):
- **Realistic timeline**: **6-8 weeks** (accounting for PR reviews, testing, bug fixes)

## Success Metrics

### Code Quality Metrics

**Before refactoring**:
- Services with `*gorm.DB` coupling: **20 / 49** (41%)
- Services with global `database.DB` access: **5 / 49** (10%)
- Services with global `cache.Client` access: **2 / 49** (4%)
- Services importing `gorm.io/gorm`: **20 / 49** (41%)
- Constructor parameter explosion (>5 params): **3 / 49** (6%)

**After refactoring**:
- Services with `*gorm.DB` coupling: **0 / 49** (0%) ✓
- Services with global state access: **0 / 49** (0%) ✓
- Services importing `gorm.io/gorm`: **0 / 49** (0%) ✓
- Constructor parameter explosion (>5 params): **0 / 49** (0%) ✓

**Target**: 100% services decoupled from GORM and global state

### Test Metrics

**Before refactoring**:
- Services with unit tests: **3 / 49** (6%)
- Test coverage: ~10-15% (estimated, mostly integration tests)
- Mock repositories: **0** (no mocks exist)

**After refactoring**:
- Services with unit tests: **49 / 49** (100%) ✓
- Test coverage: **>80%** (target per spec)
- Mock repositories: **~35 mocks** (one per repository interface)
- Test execution time: **80% reduction** (mocked repositories vs real DB)

**Measurement**:
```bash
# Before (integration tests only)
go test ./internal/services/... -v
# ~10-30 seconds (slow DB queries)

# After (unit tests with mocks)
go test ./internal/services/... -v
# ~2-5 seconds (in-memory mocks)
```

### Maintainability Metrics

**Before refactoring**:
- `routes.go` line count: **600+ lines** (manual service initialization)
- Average service constructor parameters: **2.8 params** (range: 0-7)
- Services violating SRP (many responsibilities): **~8 services**
- Global state access points: **37 total** (database.DB: 34, cache.Client: 3)

**After refactoring**:
- `routes.go` line count: **<200 lines** (with DI container in Phase 3)
- Average service constructor parameters: **1.5 params** (repository interface or config struct)
- Max constructor parameters: **1 param** (single config struct or repository)
- Services violating SRP: **0** (decomposed or refactored)
- Global state access points: **0** ✓

**Code churn metrics**:
- Files modified: **~65 files** (49 services + 16 repository interfaces + routes.go)
- Lines changed: **~8,000-10,000 lines** (estimated)
- Net lines removed: **~1,000 lines** (reduced boilerplate via config structs)

## Risk Assessment

### High-Risk Refactorings

**Critical Path Services** (highest risk if broken):

1. **TransactionService** 
   - **Risk**: Payment/escrow logic errors → financial loss
   - **Mitigation**: Extensive unit tests, integration tests with test payment gateway, manual QA on staging

2. **UserService** 
   - **Risk**: XP transaction bugs → data corruption, leaderboard inconsistencies
   - **Mitigation**: Database transaction testing, rollback scenarios, XP audit log

3. **AuthService** 
   - **Risk**: Authentication bypass, token management bugs → security breach
   - **Mitigation**: Security review, penetration testing, refresh token blacklist validation

4. **TwoFactorService** 
   - **Risk**: 2FA bypass, trusted device issues → account takeover
   - **Mitigation**: Security audit, 2FA flow testing (TOTP, backup codes, trusted devices)

5. **PropertyService** 
   - **Risk**: Geospatial query bugs → incorrect property search results
   - **Mitigation**: PostGIS integration tests, distance calculation validation

**Complex Services** (high refactoring complexity):

1. **SocialService** - 7 dependencies, many interactions
2. **TwoFactorService** - 22 global DB calls to refactor
3. **TransactionService** - Escrow state machine complexity
4. **CronService** - Scheduled tasks, dependency on other services

### Mitigation Strategies

**1. Incremental Migration**
- Migrate one service per day/week
- Run full test suite after each service migration
- Deploy to staging after each batch (P1, P2, P3)

**2. Feature Flags** (Optional)
- Enable repository-based services via feature flag in routes.go
- Fallback to old `*gorm.DB` pattern if issues detected
- Gradual rollout: 10% → 50% → 100% of services

```go
// routes.go (with feature flag)
if config.UseRepositoryPattern {
    propertyRepo := repositories.NewPropertyRepository(db)
    propertyService = services.NewPropertyService(propertyRepo, ocrService, aiService)
} else {
    // Legacy fallback
    propertyService = services.NewPropertyService(db, ocrService, aiService)
}
```

**3. Canary Deployments**
- Deploy refactored services to 5% of users first
- Monitor error rates, latency, functional correctness
- Roll back if errors increase by >5%
- Full rollout after 24 hours of stable canary

**4. Extensive Testing**
- Unit tests for all services (100% coverage target)
- Integration tests for critical paths (auth, transactions, payments)
- End-to-end tests for user flows (signup → quest → badge → leaderboard)
- Load tests to ensure no performance regression

**5. Monitoring & Alerts**
- Add APM tracing to repository method calls
- Alert on increased error rates in refactored services
- Dashboard for repository performance (latency, error rate)
- Slack notifications for critical service errors

**6. Rollback Plan**
- Git branch per service migration (`refactor/property-service`)
- Keep old service code in `deprecated/` folder for 1 sprint
- Database migrations are reversible (down migrations)
- Automated rollback script: `./scripts/rollback-service.sh property_service`

**7. Pair Programming**
- High-risk services (TransactionService, AuthService) reviewed by 2 developers
- Pull requests require 2 approvals for critical services
- Manual QA testing for payment/auth flows before production

### Estimated Timeline

**Total Effort**: 291 hours (refactoring + testing)

**Developer Capacity**: 
- **Option A**: 1 senior developer, full-time = **7.5 weeks**
- **Option B**: 2 developers, full-time = **4 weeks**
- **Option C**: 2 developers, part-time (50%) = **8 weeks**

**Recommended**: Option B (2 developers, full-time) = **6-8 weeks** (including PR reviews, bug fixes, integration testing)

**Completion Target**: 
- **Start date**: Week of Dec 1, 2025
- **P1 completion**: Dec 15, 2025 (2 weeks)
- **P2 completion**: Dec 29, 2025 (4 weeks)
- **P3 completion**: Jan 26, 2026 (8 weeks)
- **Final review & deployment**: Feb 2, 2026

**Milestones**:
- **Week 2**: P1 services (6) refactored, tested, deployed to staging
- **Week 4**: P2 services (10) refactored, tested, deployed to staging
- **Week 6**: P3 Batch 1-2 (14 services) refactored, tested
- **Week 8**: P3 Batch 3-5 (19 services) refactored, tested, full production deployment

## Final Recommendation

### Refactoring Strategy

Adopt a **phased incremental migration approach** using the **adapter pattern** to decouple services from `*gorm.DB` and eliminate global state access. Refactor services in three priority waves (P1: 6 services, P2: 10 services, P3: 33 services) over 6-8 weeks. Apply **config struct pattern** to services with 5+ constructor parameters (SocialService, TransactionService, MarketplaceService, TwoFactorService). Generate mocks using `mockery` and write unit tests for all 49 services to achieve >80% test coverage. Use incremental migration with backward compatibility to enable safe rollback and minimize disruption.

### Key Decisions

1. **Start with P1 services** (PropertyService, QuestService, UserService, TransactionService, BadgeService, LeaderboardService)
   - These are critical domain services with existing repository adoption or straightforward refactoring
   - Estimated 1 week with 2 developers

2. **Use config structs for services with 5+ parameters**
   - SocialService (7 params), TransactionService (6 params), MarketplaceService (5 params), TwoFactorService (5+ repos)
   - Improves readability, validation, and future extensibility

3. **Eliminate global state access via repository injection**
   - Priority: TwoFactorService (22 calls), AuthService (11 calls), AuditLogService (6 calls), KMSService (5 calls), BlacklistService (3 calls)
   - Create repository interfaces for all data access operations

4. **Use adapter pattern for incremental migration**
   - Old and new patterns coexist in routes.go during migration
   - No feature flags needed - transparent to service consumers
   - Easy rollback per service if issues arise

5. **Generate mocks and write unit tests for all refactored services**
   - Use `mockery --all --dir=internal/repositories` to auto-generate mocks
   - Target: >80% test coverage (per spec)
   - Estimated test execution time: 2-5 seconds (down from 10-30 seconds)

6. **Deploy incrementally with extensive testing**
   - Staging deployment after each priority wave (P1, P2, P3)
   - Integration tests, end-to-end tests, manual QA for critical paths
   - Monitoring and alerting for error rates and performance regressions

### Confidence Level

**High** - Refactoring strategy is well-defined with clear phases, concrete examples, and proven patterns (repository, config struct, adapter). Risks are identified and mitigated with incremental rollout, extensive testing, and rollback plan.

### Risk Level

**Medium** - While the refactoring approach is sound, the sheer scope (49 services, ~300 hours) introduces risk. Critical services (TransactionService, AuthService, UserService) require extra scrutiny. Mitigation strategies (pair programming, canary deployments, monitoring) reduce risk to acceptable level. Main risks: payment bugs, authentication issues, data corruption in XP/leaderboard updates.

### Success Criteria

**Refactoring is successful if**:
1. All 49 services decoupled from `*gorm.DB` (0 GORM imports in services)
2. All global state access eliminated (0 `database.DB` or `cache.Client` references)
3. All services have unit tests with >80% coverage
4. Test execution time reduced by >80% (mocks vs real DB)
5. No production incidents caused by refactoring
6. `routes.go` reduced from 600+ lines to <200 lines (future Phase 3 with DI container)
7. All critical flows validated: auth, payments, XP, leaderboards, social interactions

---

## Appendix: Service Classification Matrix

| Service | Current State | P1/P2/P3 | Complexity | Repositories Needed | Estimated Effort |
|---------|---------------|----------|------------|---------------------|------------------|
| PropertyService | *gorm.DB | P1 | Medium | PropertyRepository | 3h refactor + 4h test |
| QuestService | *gorm.DB | P1 | Low | ✓ (already has QuestRepo, UserRepo) | 2h refactor + 3h test |
| UserService | Hybrid | P1 | Medium | ✓ (has UserRepo, needs transaction pattern) | 3h refactor + 4h test |
| TransactionService | *gorm.DB + Repos | P1 | High | ✓ (has 3 repos, config struct needed) | 4h refactor + 5h test |
| BadgeService | Repos ✓ | P1 | Low | ✓ (BadgeRepo, cache) | 2h refactor + 3h test |
| LeaderboardService | Repos ✓ | P1 | Medium | ✓ (LeaderboardRepo, UserRepo, cache) | 2h refactor + 3h test |
| SocialService | Repos ✓ | P2 | High | ✓ (6 repos, config struct needed) | 4h refactor + 5h test |
| MarketplaceService | *gorm.DB + Repos | P2 | Medium | ✓ (4 repos, config struct needed) | 3h refactor + 4h test |
| AnalyticsService | Repos ✓ | P2 | Low | ✓ (AnalyticsRepo) | 1h refactor + 2h test |
| TwoFactorService | Global DB | P2 | High | Need 4 new repos | 6h refactor + 6h test |
| ... | ... | ... | ... | ... | ... |

---

**Document Status**: Research Complete  
**Author**: GitHub Copilot (Claude Sonnet 4.5)  
**Date**: November 24, 2025  
**Related Specs**: 001-server-refactor/SPEC.md, 002-server-refactor/SPEC.md  
**Next Steps**: Review findings → Approve Phase 1 → Begin PropertyService refactoring
