# R4: Global State Elimination Inventory

## Executive Summary

**Total Global State Access Points**: 54 occurrences across 6 service files  
**database.DB**: 49 references in 5 service files  
**cache.Client**: 4 references in 1 service file  
**Repository nil-check patterns**: 1 repository with fallback  

**High-Level Strategy**: Systematic elimination through repository interface injection for database access, cache interface injection for Redis operations, and removal of optional nil-check fallbacks. Global logger access (via `gofiber/log`) is acceptable as a cross-cutting concern and does NOT require injection. Migration will proceed in 3 phases: (1) Repository interface extraction, (2) Service refactoring with dependency injection, (3) Validation and testing.

## database.DB Access Inventory

### Total Occurrences
**Count**: 49 references across 5 files

### Detailed File Listing

| File | Line(s) | Usage Context | Replacement Strategy |
|------|---------|---------------|----------------------|
| internal/services/audit_log_service.go | 16, 71, 76, 94, 114, 134, 158 | Direct Create/query operations for audit logs | Inject AuditLogRepository with Create/Query methods |
| internal/services/auth_service.go | 339, 340, 347, 348, 350, 356, 357, 364, 365, 372, 373 | Passing database.DB to repository constructors and services | Replace with injected repositories (already using repository pattern, just need to stop passing global DB) |
| internal/services/kms_service.go | 110, 165, 205, 220, 239, 248 | CRUD operations on EncryptionKey model (KMS key management) | Inject EncryptionKeyRepository for key versioning and rotation |
| internal/services/two_factor_service.go | 70, 107, 134, 151, 167, 206, 217, 225, 230, 235, 246, 274, 289, 299, 313, 335, 375, 385, 395, 401, 414, 427, 449 | CRUD operations on User2FA, BackupCode, TrustedDevice, User2FALog models | Inject TwoFactorRepository with methods for 2FA setup, verification, device management |
| internal/services/user_service.go | 99, 110 | Direct queries for GetUserByID and GetUserByEmail | Already has UserRepository available in some code paths - consolidate to always use repository |

### Usage Categories

- **Direct CRUD operations**: 35 occurrences (Create, Save, Delete)
- **Query operations (Where/First)**: 28 occurrences
- **Aggregate queries (Count, Select)**: 3 occurrences
- **Transaction management**: 0 occurrences (no explicit Begin/Commit found)

**Note**: Some lines have multiple operations (e.g., `database.DB.Where().First()` counts as 2 operations).

### High-Risk Access Points

**High Risk**:
1. **two_factor_service.go** (23 references): Complex 2FA logic with backup codes, trusted devices, and encryption. Failure could lock users out of accounts.
2. **kms_service.go** (6 references): Manages encryption keys. Errors could cause data encryption failures or key rotation issues.

**Medium Risk**:
3. **audit_log_service.go** (7 references): Logs security violations. Already uses async logging (goroutine), so failures are non-blocking. Low impact if tests validate behavior.

**Low Risk**:
4. **auth_service.go** (11 references): Only passes database.DB to constructors. Simple refactoring - no direct DB access in service logic.
5. **user_service.go** (2 references): Simple queries. Already has UserRepository available in codebase.

## cache.Client Access Inventory

### Total Occurrences
**Count**: 4 references in 1 file

### Detailed File Listing

| File | Line(s) | Usage Context | Replacement Strategy |
|------|---------|---------------|----------------------|
| internal/services/blacklist_service.go | 17 (comment), 60, 104, 146 | Token blacklist management (Set, Exists, Del) | Inject cache.Client interface (define CacheClient interface) |

### Usage Categories

- **Set operations**: 1 occurrence (Set with TTL for blacklist entry)
- **Exists operations**: 1 occurrence (Check if token is blacklisted)
- **Delete operations**: 1 occurrence (Remove from blacklist)
- **Other (comments)**: 1 occurrence

### High-Risk Access Points

**Medium Risk**:
- **blacklist_service.go**: Token blacklist failures could allow revoked tokens to authenticate. However, service already implements retry logic (3 attempts with exponential backoff), so it's resilient. Injection enables better unit testing with mock cache.

## Repository Nil-Check Patterns

### Total Occurrences
**Count**: 1 repository with nil-check fallback

### Repositories with Nil-Check Pattern

| Repository | Line(s) | Pattern | Why It Exists |
|------------|---------|---------|---------------|
| user_repository.go | 22-24 | `if db == nil { db = database.DB }` | Optional constructor parameter fallback for backwards compatibility |

### Pattern Analysis

**Why this pattern exists**: 
The UserRepository constructor accepts an optional `*gorm.DB` parameter. If `nil` is passed, it falls back to the global `database.DB`. This was likely added to allow gradual migration from global database access to dependency injection, providing backwards compatibility during refactoring.

**Problems with this pattern**:
- **Hides dependency on global state**: Callers can pass `nil` and get silent fallback behavior
- **Makes unit testing difficult**: Can't fully inject a mock DB without ensuring no `nil` is passed
- **Violates fail-fast principle**: Silent fallback instead of explicit error
- **Bypasses dependency injection**: Defeats the purpose of having a constructor parameter
- **Inconsistent behavior**: Other repositories (e.g., RefreshTokenRepository, AchievementRepository) require non-nil DB and fail with nil pointer panic

**Elimination strategy**:
1. Remove `if db == nil { db = database.DB }` check entirely
2. Add explicit nil check with panic: `if db == nil { panic("UserRepository: db cannot be nil") }`
3. Audit all callers of `NewUserRepository()` to ensure non-nil `*gorm.DB` is passed
4. Update service constructors to always receive and pass valid DB instance
5. Update tests to always provide mock DB (never rely on global database.DB)

## Other Global Singletons

### Logger Access

| File | Usage | Replacement |
|------|-------|-------------|
| cron_service.go | `log.Info()`, `log.Warn()`, `log.Error()` from `github.com/gofiber/fiber/v2/log` | **NO CHANGE NEEDED** - Global logger is acceptable |
| property_service.go | `log.Info()`, `log.Warn()` | **NO CHANGE NEEDED** |
| ocr_service.go | `log.Warn()`, `log.Info()` | **NO CHANGE NEEDED** |
| openai_service.go | `log.Warn()`, `log.Info()` | **NO CHANGE NEEDED** |
| transcoding_service.go | `log.Info()`, `log.Debug()`, `log.Error()` | **NO CHANGE NEEDED** |
| lesson_service.go | `log.Warn()` | **NO CHANGE NEEDED** |
| blacklist_service.go | `log.Warn()`, `log.Error()`, `log.Info()` | **NO CHANGE NEEDED** |

**Assessment**: Logger uses the Fiber framework's global `log` package. This is a standard Go pattern for logging and is **acceptable as a global singleton**. Logging is a cross-cutting concern that doesn't benefit from injection for unit tests (structured logging already provides testability via log level configuration). **Risk: LOW**

### Config Access

| File | Usage | Replacement |
|------|-------|-------------|
| two_factor_service.go | `config.LoadKMSConfig()`, accepts `*fwconfig.Config` in constructor | Already injected via constructor - **GOOD PATTERN** |
| video_stream_service.go | Accepts config struct in constructor | Already injected - **GOOD PATTERN** |
| retry_service.go | Accepts config struct in constructor | Already injected - **GOOD PATTERN** |

**Assessment**: Config is already being injected via service constructors. No global config access found (e.g., `viper.Get()` or global config variables). **Risk: NONE**

### Metrics/Observability

No global Prometheus, Sentry, or OpenTelemetry clients found in services layer. Observability code is in `internal/observability/` but not accessed directly by services.

**Assessment**: No global metrics clients to refactor. **Risk: NONE**

### Overall Assessment

**Are these global singletons acceptable?**: 

- **Logger (gofiber/log)**: ✅ YES - Global logger is a standard Go practice for cross-cutting concerns
- **Config**: ✅ ALREADY INJECTED - No global config access exists
- **Metrics/Observability**: ✅ NOT APPLICABLE - No global access in services
- **database.DB**: ❌ NO - Must be injected via repositories (FR-007, SC-005)
- **cache.Client**: ❌ NO - Must be injected via interface (FR-008, SC-006)

## Replacement Patterns

### Pattern 1: Repository Interface Injection
**For**: database.DB access in services

**Before** (two_factor_service.go:217-221):
```go
func (s *TwoFactorService) Disable(userID uuid.UUID) error {
	var user2FA models.User2FA
	if err := database.DB.Where("user_id = ? AND enabled = ?", userID, true).First(&user2FA).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTwoFactorNotEnabled
		}
		return err
	}
	
	if err := database.DB.Delete(&user2FA).Error; err != nil {
		return err
	}
	
	if err := database.DB.Where("user_id = ?", userID).Delete(&models.BackupCode{}).Error; err != nil {
		return err
	}
	
	if err := database.DB.Where("user_id = ?", userID).Delete(&models.TrustedDevice{}).Error; err != nil {
		return err
	}
	
	return nil
}
```

**After**:
```go
// 1. Define repository interface in internal/framework/interfaces/two_factor_repository.go
type TwoFactorRepository interface {
	GetEnabledByUserID(ctx context.Context, userID uuid.UUID) (*models.User2FA, error)
	Create(ctx context.Context, user2FA *models.User2FA) error
	Save(ctx context.Context, user2FA *models.User2FA) error
	Delete(ctx context.Context, user2FA *models.User2FA) error
	DeleteBackupCodesByUserID(ctx context.Context, userID uuid.UUID) error
	DeleteTrustedDevicesByUserID(ctx context.Context, userID uuid.UUID) error
	// ... other methods
}

// 2. Update TwoFactorService struct
type TwoFactorService struct {
	kmsService   *KMSService
	cfg          *fwconfig.Config
	twoFactorRepo TwoFactorRepository  // NEW
}

// 3. Update constructor
func NewTwoFactorService(cfg *fwconfig.Config, repo TwoFactorRepository) *TwoFactorService {
	// ... KMS initialization
	return &TwoFactorService{
		kmsService:   kmsService,
		cfg:          cfg,
		twoFactorRepo: repo,
	}
}

// 4. Refactored method
func (s *TwoFactorService) Disable(ctx context.Context, userID uuid.UUID) error {
	user2FA, err := s.twoFactorRepo.GetEnabledByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTwoFactorNotEnabled
		}
		return err
	}
	
	if err := s.twoFactorRepo.Delete(ctx, user2FA); err != nil {
		return err
	}
	
	if err := s.twoFactorRepo.DeleteBackupCodesByUserID(ctx, userID); err != nil {
		return err
	}
	
	if err := s.twoFactorRepo.DeleteTrustedDevicesByUserID(ctx, userID); err != nil {
		return err
	}
	
	return nil
}
```

**Migration steps**:
1. Create `TwoFactorRepository` interface in `internal/framework/interfaces/`
2. Implement interface in `internal/repositories/two_factor_repository.go` (new file)
3. Extract methods from service into repository (GetEnabledByUserID, Create, Save, Delete, etc.)
4. Update `TwoFactorService` constructor to accept `TwoFactorRepository`
5. Replace all `database.DB.Where()...` calls with `s.twoFactorRepo.MethodName()`
6. Update service initialization in `routes.go` to pass repository instance
7. Generate mockery mock: `mockery --name=TwoFactorRepository --output=internal/mocks`
8. Write unit tests with mocked repository

### Pattern 2: Cache Interface Injection
**For**: cache.Client access in services

**Before** (blacklist_service.go:56-62):
```go
func (s *BlacklistService) AddToBlacklist(tokenHash string, ttl time.Duration) error {
	if tokenHash == "" {
		return fmt.Errorf("token hash cannot be empty")
	}

	key := fmt.Sprintf("blacklist:%s", tokenHash)
	ctx := context.Background()

	// ... retry logic
	err := cache.Client.Set(ctx, key, "1", ttl).Err()
	if err == nil {
		return nil
	}
	// ...
}
```

**After**:
```go
// 1. Define cache interface in internal/framework/interfaces/cache_client.go
type CacheClient interface {
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd
	Get(ctx context.Context, key string) *redis.StringCmd
	Exists(ctx context.Context, keys ...string) *redis.IntCmd
	Del(ctx context.Context, keys ...string) *redis.IntCmd
}

// 2. Implement interface wrapper in internal/framework/cache/client.go
// (The existing redis.Client already implements these methods, so just type-cast or wrap)

// 3. Update BlacklistService struct
type BlacklistService struct {
	cache          CacheClient  // NEW
	maxRetries     int
	baseRetryDelay time.Duration
}

// 4. Update constructor
func NewBlacklistService(cache CacheClient) *BlacklistService {
	return &BlacklistService{
		cache:          cache,
		maxRetries:     3,
		baseRetryDelay: 100 * time.Millisecond,
	}
}

// 5. Replace cache.Client with s.cache
func (s *BlacklistService) AddToBlacklist(tokenHash string, ttl time.Duration) error {
	if tokenHash == "" {
		return fmt.Errorf("token hash cannot be empty")
	}

	key := fmt.Sprintf("blacklist:%s", tokenHash)
	ctx := context.Background()

	// ... retry logic
	err := s.cache.Set(ctx, key, "1", ttl).Err()  // Changed: cache.Client -> s.cache
	if err == nil {
		return nil
	}
	// ...
}
```

**Migration steps**:
1. Define `CacheClient` interface in `internal/framework/interfaces/cache_client.go`
2. Ensure `redis.Client` satisfies interface (it already does - no wrapper needed)
3. Update `BlacklistService` constructor to accept `CacheClient`
4. Replace `cache.Client` with `s.cache` in all methods
5. Update service initialization in `routes.go` to pass `cache.Client` (cast to interface)
6. Generate mockery mock: `mockery --name=CacheClient --output=internal/mocks`
7. Write unit tests with mocked cache

**Why not use context values for cache/DB**: Context values should be for request-scoped metadata (user ID, trace ID), not behavior/dependencies. Storing DB/cache in context makes dependencies invisible and hard to test.

### Pattern 3: Required Constructor Parameters
**For**: Repository nil-check elimination

**Before** (user_repository.go:19-25):
```go
// NewUserRepository creates a new user repository instance
// Pass nil to use the global database.DB instance
func NewUserRepository(db *gorm.DB) *UserRepository {
	if db == nil {
		db = database.DB
	}
	return &UserRepository{db: db}
}
```

**After**:
```go
// NewUserRepository creates a new user repository instance
// Panics if db is nil (fail-fast on invalid dependency)
func NewUserRepository(db *gorm.DB) *UserRepository {
	if db == nil {
		panic("UserRepository: db cannot be nil (invalid dependency)")
	}
	return &UserRepository{db: db}
}
```

**Alternative** (return error instead of panic):
```go
func NewUserRepository(db *gorm.DB) (*UserRepository, error) {
	if db == nil {
		return nil, errors.New("UserRepository: db cannot be nil")
	}
	return &UserRepository{db: db}, nil
}
```

**Migration steps**:
1. Remove `if db == nil { db = database.DB }` fallback from `user_repository.go`
2. Add `if db == nil { panic("...") }` fail-fast check
3. Audit all callers of `NewUserRepository()`:
   - `routes.go:36` already passes valid `db` ✅
   - `auth_service.go:339, 347, 356, 364, 372` all pass `database.DB` ❌ (need to inject)
4. Update `AuthService` to accept repositories in constructor instead of creating them internally
5. Update tests to always provide mock DB

**Recommendation**: Use **panic** for constructor nil-checks. Repositories are initialized at startup, so panic is appropriate (fail-fast). Errors from constructors complicate initialization code unnecessarily.

### Pattern 4: Context Values (NOT RECOMMENDED)
**For**: Cross-cutting concerns (request ID, tenant ID)

**Why not recommended for DB/Cache**:
- Context values should be **data** (metadata), not **behavior** (dependencies)
- Makes dependencies invisible (can't see from function signature what it depends on)
- Hard to test (must mock context instead of simple dependency injection)
- Violates explicit dependency principle

**Where acceptable**:
- ✅ Request-scoped metadata: request ID, trace ID, user ID, tenant ID
- ✅ Timeouts and cancellation signals
- ❌ Database connections, cache clients, repositories, services

**Example of acceptable context usage** (already in codebase):
```go
func (r *UserRepository) CreateUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error {
	// Use ctx for request cancellation and metadata (e.g., trace ID)
	// But NOT for passing database connection
	return r.db.WithContext(ctx).Create(user).Error
}
```

## Risk Assessment

### High-Risk Replacements

**Services where global state elimination could cause bugs**:

1. **TwoFactorService** (23 database.DB references)
   - **Risk**: 2FA setup/verification/disable logic is complex with multiple DB operations
   - **Impact**: Users could be locked out of accounts if 2FA state becomes inconsistent
   - **Mitigation**:
     - Thorough unit tests with mocked TwoFactorRepository (test all code paths)
     - Integration tests with real database (test transaction consistency)
     - Manual QA: Test 2FA setup, verification, backup codes, trusted devices, disable
     - Feature flag: Roll out gradually (10% -> 50% -> 100% of users)

2. **KMSService** (6 database.DB references)
   - **Risk**: Manages encryption keys for data protection
   - **Impact**: Key rotation failures could prevent data encryption/decryption
   - **Mitigation**:
     - Unit tests for key generation, caching, rotation
     - Integration tests for DEK persistence and retrieval
     - Encrypt/decrypt round-trip tests with real KMS
     - Canary deployment: Test in staging before production

3. **AuditLogService** (7 database.DB references)
   - **Risk**: Security violation logging - LOW (already async, non-blocking)
   - **Impact**: Failed audit logs don't block requests (already uses goroutine)
   - **Mitigation**:
     - Unit tests with mocked AuditLogRepository
     - Verify async behavior (no blocking on DB errors)
     - Monitor audit log insert failures via metrics

### Testing Strategy

#### Unit Tests (with mocks)
```go
// Example: TwoFactorService unit test with mocked repository
func TestTwoFactorService_Disable(t *testing.T) {
	// Arrange
	mockRepo := mocks.NewTwoFactorRepository(t)
	userID := uuid.New()
	user2FA := &models.User2FA{UserID: userID, Enabled: true}
	
	mockRepo.On("GetEnabledByUserID", mock.Anything, userID).Return(user2FA, nil)
	mockRepo.On("Delete", mock.Anything, user2FA).Return(nil)
	mockRepo.On("DeleteBackupCodesByUserID", mock.Anything, userID).Return(nil)
	mockRepo.On("DeleteTrustedDevicesByUserID", mock.Anything, userID).Return(nil)
	
	service := services.NewTwoFactorService(nil, mockRepo)
	
	// Act
	err := service.Disable(context.Background(), userID)
	
	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
```

**Generate mocks**:
```bash
# Install mockery
go install github.com/vektra/mockery/v2@latest

# Generate mocks for repository interfaces
mockery --name=TwoFactorRepository --dir=internal/framework/interfaces --output=internal/mocks
mockery --name=AuditLogRepository --dir=internal/framework/interfaces --output=internal/mocks
mockery --name=CacheClient --dir=internal/framework/interfaces --output=internal/mocks
```

#### Integration Tests (with real dependencies)
```go
// Example: TwoFactorRepository integration test with test database
func TestTwoFactorRepository_Create_Integration(t *testing.T) {
	// Setup test database
	db := setupTestDB(t)
	defer teardownTestDB(t, db)
	
	repo := repositories.NewTwoFactorRepository(db)
	userID := uuid.New()
	
	user2FA := &models.User2FA{
		UserID:  userID,
		Enabled: false,
		// ... other fields
	}
	
	// Test create
	err := repo.Create(context.Background(), user2FA)
	assert.NoError(t, err)
	
	// Test retrieve
	retrieved, err := repo.GetByUserID(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, userID, retrieved.UserID)
}
```

#### Migration Validation Tests

**Before/after comparison tests** - Ensure refactored code produces identical results:

```go
// Test that new repository-based code produces same result as old global DB code
func TestMigration_TwoFactorService_DisableBehaviorUnchanged(t *testing.T) {
	// This test would be written during migration
	// Compare behavior of old service (with database.DB) vs new service (with repository)
	// Use same test inputs, assert identical outputs and database state
}
```

**Strategy**:
1. Write integration tests BEFORE refactoring (test current behavior)
2. Refactor service to use repository
3. Run same integration tests (should still pass)
4. If tests fail, behavior has changed - investigate and fix

## Elimination Timeline

### Week 1: Repository Interface Extraction
**Deliverables**:
- Define 4 repository interfaces:
  - `TwoFactorRepository` (for 2FA operations)
  - `AuditLogRepository` (for audit logging)
  - `EncryptionKeyRepository` (for KMS key management)
  - `CacheClient` interface (for cache operations)
- Implement repository classes in `internal/repositories/`
- Update existing `UserRepository` to fail-fast on nil (remove nil-check fallback)
- Generate mockery mocks for all interfaces

**Validation**:
```bash
# Verify interfaces exist
ls internal/framework/interfaces/ | grep -E "(two_factor|audit_log|encryption_key|cache_client)"

# Verify implementations exist
ls internal/repositories/ | grep -E "(two_factor|audit_log|encryption_key)"

# Verify mocks generated
ls internal/mocks/ | grep -E "(TwoFactor|AuditLog|EncryptionKey|CacheClient)"
```

### Week 2-3: Service Refactoring (High-Risk Services)
**Deliverables**:
- Refactor 3 high-risk services:
  - `TwoFactorService` (inject TwoFactorRepository)
  - `KMSService` (inject EncryptionKeyRepository)
  - `BlacklistService` (inject CacheClient)
- Update service constructors
- Replace all `database.DB` calls with repository methods
- Replace all `cache.Client` calls with `s.cache` methods
- Write unit tests with mocked dependencies (80%+ coverage)

**Validation**:
```bash
# Verify no global database.DB in these services
grep "database\.DB" internal/services/two_factor_service.go internal/services/kms_service.go
# Expected: No output

# Verify no global cache.Client
grep "cache\.Client" internal/services/blacklist_service.go
# Expected: No output

# Run unit tests
go test -v ./internal/services -run "TwoFactor|KMS|Blacklist"
```

### Week 4-5: Service Refactoring (Remaining Services)
**Deliverables**:
- Refactor remaining services:
  - `AuditLogService` (inject AuditLogRepository)
  - `AuthService` (accept injected repositories instead of creating them with database.DB)
  - `UserService` (consolidate to always use UserRepository)
- Update `routes.go` to initialize services with injected dependencies
- Expand unit test coverage to 90%+

**Validation**:
```bash
# Verify ZERO global database.DB access in services/
grep -r "database\.DB" internal/services/ | wc -l
# Expected: 0

# Run all service unit tests
go test -v ./internal/services/... -cover
```

### Week 6: Validation and Testing
**Deliverables**:
- Integration tests for all refactored services
- End-to-end tests for critical flows (auth, 2FA, payments)
- Canary deployment to staging environment
- Load testing to validate performance unchanged

**Validation**:
```bash
# Final verification commands (see Success Metrics section)
grep -r "database\.DB" internal/services/ | wc -l     # Expected: 0
grep -r "cache\.Client" internal/services/ | wc -l    # Expected: 0
grep -r "if.*== nil.*database\.DB" internal/repositories/ | wc -l  # Expected: 0

# Run full test suite
go test ./... -cover -coverprofile=coverage.out
go tool cover -func=coverage.out | grep total
# Expected: (statements) >= 80%
```

## Success Metrics

### Before State
- **database.DB references in services/**: 49 occurrences (5 files)
- **cache.Client references in services/**: 4 occurrences (1 file)
- **Repository nil-check patterns**: 1 repository (user_repository.go)
- **Services with unit tests**: ~10% (estimated - most services lack unit tests with mocked dependencies)

### After State (Target)
- **database.DB references in services/**: 0 (FR-007, SC-005) ✅
- **cache.Client references in services/**: 0 (FR-008, SC-006) ✅
- **Repository nil-check patterns**: 0 (FR-005, SC-008) ✅
- **Services with unit tests**: 80%+ coverage (FR-014, SC-002) ✅

### Validation Commands

```bash
# ============================================================================
# COMMAND 1: Verify no global database.DB access in services
# ============================================================================
grep -r "database\.DB" server/internal/services/ | wc -l
# Expected: 0
# Current: 49

# ============================================================================
# COMMAND 2: Verify no global cache.Client access in services
# ============================================================================
grep -r "cache\.Client" server/internal/services/ | wc -l
# Expected: 0
# Current: 4

# ============================================================================
# COMMAND 3: Verify no nil-check fallbacks in repositories
# ============================================================================
grep -r "if.*== nil.*database\.DB" server/internal/repositories/ | wc -l
# Expected: 0
# Current: 1

# ============================================================================
# COMMAND 4: Verify repository interfaces exist
# ============================================================================
ls server/internal/framework/interfaces/ | grep -c "_repository.go"
# Expected: >= 4 (TwoFactorRepository, AuditLogRepository, EncryptionKeyRepository, CacheClient)

# ============================================================================
# COMMAND 5: Verify mocks exist for all interfaces
# ============================================================================
ls server/internal/mocks/ | grep -c "^Mock.*Repository"
# Expected: >= 3 (MockTwoFactorRepository, MockAuditLogRepository, MockEncryptionKeyRepository)

# ============================================================================
# COMMAND 6: Run unit tests and measure coverage
# ============================================================================
go test ./server/internal/services/... -cover -coverprofile=coverage.out
go tool cover -func=coverage.out | grep total | awk '{print $3}'
# Expected: >= 80%

# ============================================================================
# COMMAND 7: Verify all services have constructors with dependency injection
# ============================================================================
# (Manual inspection - check that no service creates repositories internally)
grep -r "repositories\.New" server/internal/services/ | grep -v "import"
# Expected: No output (services should not create repositories, only receive them)
```

## Final Recommendation

### Elimination Strategy

**Systematic 6-week phased migration** to eliminate all global state access while maintaining system stability:

1. **Phase 1 (Week 1)**: Extract repository interfaces and create implementations. This establishes the foundation for dependency injection without changing service behavior. Low risk.

2. **Phase 2 (Weeks 2-3)**: Refactor high-risk services (TwoFactorService, KMSService, BlacklistService) with comprehensive unit tests using mocked dependencies. These services handle critical security operations, so extensive testing is required before proceeding.

3. **Phase 3 (Weeks 4-5)**: Refactor remaining services (AuditLogService, AuthService, UserService) and update initialization in routes.go. These services are lower risk and can leverage patterns established in Phase 2.

4. **Phase 4 (Week 6)**: Comprehensive validation with integration tests, end-to-end tests, and canary deployment. Final verification that zero global state access remains.

**Key technical decisions**:
- Use **repository interface injection** for database.DB replacement (enables mockery-based unit testing)
- Use **cache.Client interface injection** for Redis operations (not context values - explicit dependencies)
- Use **fail-fast panic** for nil dependencies in repository constructors (appropriate for startup-time validation)
- **Do NOT inject logger** - global logger (gofiber/log) is acceptable as cross-cutting concern
- **Already have config injection** - no changes needed for config access

### Key Decisions

1. **Use repository interface injection for database.DB replacement**
   - Rationale: Enables mockery-based unit testing, explicit dependencies, single responsibility
   - Alternative considered: Context values (rejected - makes dependencies invisible)

2. **Use cache.Client interface injection (not context values)**
   - Rationale: Same as database - explicit dependencies, testability
   - Alternative considered: Global cache.Client (rejected - violates FR-008)

3. **Fail-fast on nil dependencies in repository constructors**
   - Rationale: Repositories are initialized at startup, so panic is appropriate
   - Alternative considered: Return error (rejected - complicates initialization unnecessarily)

4. **Do NOT inject logger (keep global log)**
   - Rationale: Logging is cross-cutting concern, global logger is standard Go practice
   - Alternative considered: Inject logger (rejected - unnecessary complexity for low-value benefit)

5. **Phased migration over 6 weeks with high-risk services first**
   - Rationale: Reduces risk by validating migration pattern on critical services before proceeding
   - Alternative considered: Big-bang migration (rejected - too risky with 49 database.DB references)

### Risk Level
**Medium** - Complex 2FA and KMS logic requires careful refactoring, but phased approach with comprehensive testing mitigates risk.

### Confidence
**High** - Clear inventory of all global state access, well-defined replacement patterns, and proven migration strategy (repository pattern is standard in Go).

---

## Appendix: Complete File-by-File Breakdown

### Services with database.DB Access

1. **audit_log_service.go** (7 references)
   - L16: Comment documenting global usage
   - L71: Nil check for database.DB (graceful degradation in tests)
   - L76: Create audit log entry (async)
   - L94: Query violations by user
   - L114: Query violations by tenant
   - L134: Query violations by resource
   - L158: Delete old audit logs

2. **auth_service.go** (11 references)
   - L339-340, L347-348, L356-357, L364-365, L372-373: Passing database.DB to repository constructors
   - L350: Passing database.DB to AchievementService constructor
   - All references are in service initialization code (not business logic)

3. **kms_service.go** (6 references)
   - L110: Count encryption keys by version (validation)
   - L165: Get active encryption key
   - L205: Get max key version (for versioning)
   - L220: Create new encryption key
   - L239: Get current active key for rotation
   - L248: Save rotated key status

4. **two_factor_service.go** (23 references)
   - L70: Check if 2FA already enabled
   - L107: Get user's tenant_id
   - L134: Create User2FA record
   - L151: Create backup code (loop - 10 codes)
   - L167: Get User2FA by userID
   - L206: Save User2FA (update)
   - L217, L246, L313: Get enabled 2FA by userID
   - L225: Delete User2FA
   - L230: Delete backup codes
   - L235: Delete trusted devices
   - L274: Save User2FA (without error check - WARNING)
   - L289: Find unused backup codes
   - L299: Save backup code (mark as used)
   - L335: Get valid trusted devices
   - L375: Create trusted device
   - L385: Get trusted device by token
   - L395: Delete expired device (without error check)
   - L401: Update device last_used timestamp (without error check)
   - L414: Get trusted device by ID
   - L427: Delete trusted device
   - L449: Create 2FA log entry

5. **user_service.go** (2 references)
   - L99: GetUserByID query
   - L110: GetUserByEmail query

### Services with cache.Client Access

1. **blacklist_service.go** (4 references)
   - L17: Comment documenting global usage
   - L60: Set blacklist entry with TTL
   - L104: Check if token exists in blacklist
   - L146: Delete token from blacklist

### Repositories with Nil-Check Fallback

1. **user_repository.go** (1 occurrence)
   - L22-24: `if db == nil { db = database.DB }` fallback pattern

---

**Document Version**: 1.0  
**Created**: 2025-11-24  
**Last Updated**: 2025-11-24  
**Author**: GitHub Copilot (Claude Sonnet 4.5)  
**Status**: Complete - Ready for Implementation
