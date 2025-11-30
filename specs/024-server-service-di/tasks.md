# Tasks: Server Service Layer DI Completion

## Overview

- **Total Tasks**: 62
- **Phases**: 5
- **Estimated Duration**: 10 working days

## Phase 1: Repository Interface Extraction (T001-T018)

### Setup & Foundation
- [ ] T001 Create `internal/framework/interfaces/repositories.go` with common repository types
- [ ] T002 Define `TransactionManager` interface for database transactions
- [ ] T003 Define `CacheClient` interface abstracting Redis operations

### P1 Repository Interfaces
- [ ] T004 Extract `PropertyRepository` interface (CRUD + tenant-scoped queries)
- [ ] T005 Extract `QuestRepository` interface (existing interface, verify completeness)
- [ ] T006 Extract `UserRepository` interface (CRUD + FindByEmail, IncrementLoginStreak)
- [ ] T007 Extract `TransactionRepository` interface (CRUD + FindByPaymentID, GetByStatus)
- [ ] T008 Extract `BadgeRepository` interface (CRUD + FindEligible, FindByUser)
- [ ] T009 Extract `NotificationRepository` interface (CRUD + BulkCreate, FindByUser)

### Supporting Repository Interfaces
- [ ] T010 Extract `AuditLogRepository` interface (Create, Query, LogTenantViolation)
- [ ] T011 Extract `TwoFactorRepository` interface (CRUD + backup codes, trusted devices)
- [ ] T012 Extract `BackupCodeRepository` interface (CRUD + MarkUsed)
- [ ] T013 Extract `TrustedDeviceRepository` interface (CRUD + FindByUser)
- [ ] T014 Extract `EncryptionKeyRepository` interface (CRUD + GetActive, Rotate)
- [ ] T015 Extract `RefreshTokenRepository` interface (CRUD + Revoke, RevokeAll)

### Verification
- [ ] T016 Verify all interfaces compile independently (`go build ./internal/framework/interfaces/...`)
- [ ] T017 Verify existing repositories satisfy new interfaces (compile-time check)
- [ ] T018 Document interface contracts in `docs/REPOSITORY_PATTERNS.md`

---

## Phase 2: P1 Service DI Refactoring (T019-T036)

### PropertyService Refactoring
- [ ] T019 Update `PropertyService` struct to use `interfaces.PropertyRepository`
- [ ] T020 Create `NewPropertyServiceV2(repo, ocrService, aiService)` constructor
- [ ] T021 Deprecate old `NewPropertyService(db, ...)` with migration comment
- [ ] T022 Register `PropertyService` in DI container `registerServices()`

### QuestService Refactoring
- [ ] T023 Update `QuestService` struct to remove `*gorm.DB` field
- [ ] T024 Create `NewQuestServiceV2(questRepo, userRepo, badgeService, notifService)` constructor
- [ ] T025 Deprecate old `NewQuestService(db, ...)` with migration comment
- [ ] T026 Update `QuestService` registration in DI container

### UserService Refactoring
- [ ] T027 Update `UserService` struct to remove `*gorm.DB` field
- [ ] T028 Inject `TransactionManager` for XP transaction handling
- [ ] T029 Create `NewUserServiceV2(userRepo, leaderboardService, txManager)` constructor
- [ ] T030 Deprecate old `NewUserService(...)` with migration comment

### TransactionService Refactoring
- [ ] T031 Define `TransactionServiceConfig` struct with all dependencies
- [ ] T032 Update `TransactionService` struct to use config pattern
- [ ] T033 Create `NewTransactionServiceWithConfig(cfg TransactionServiceConfig)` constructor
- [ ] T034 Inject `TransactionManager` for payment processing

### BadgeService & NotificationService
- [ ] T035 Verify `BadgeService` already uses repository (confirm DI pattern)
- [ ] T036 Update `NotificationService` to use `interfaces.NotificationRepository`

---

## Phase 3: Global State Elimination (T037-T052)

### AuditLogService (6 calls)
- [ ] T037 Inject `AuditLogRepository` via constructor
- [ ] T038 Replace `database.DB` calls in `LogAction()` method
- [ ] T039 Replace `database.DB` calls in `LogTenantViolation()` method
- [ ] T040 Replace `database.DB` calls in `QueryLogs()` method

### AuthService (11 calls)
- [ ] T041 Identify all `database.DB` access points in `auth_service.go`
- [ ] T042 Inject required repositories via constructor
- [ ] T043 Replace legacy initialization paths with injected dependencies
- [ ] T044 Update `routes.go` to pass injected AuthService

### TwoFactorService (22 calls) - Highest Priority
- [ ] T045 Inject `TwoFactorRepository`, `BackupCodeRepository`, `TrustedDeviceRepository`
- [ ] T046 Replace `database.DB` calls in 2FA CRUD operations (lines 70-170)
- [ ] T047 Replace `database.DB` calls in backup code operations (lines 200-300)
- [ ] T048 Replace `database.DB` calls in trusted device operations (lines 375-450)
- [ ] T049 Verify KMS integration still works after refactoring

### KMSService (4 calls)
- [ ] T050 Inject `EncryptionKeyRepository` via constructor
- [ ] T051 Replace `database.DB` calls in key management methods
- [ ] T052 Test key rotation flow after refactoring

### BlacklistService (3 calls)
- [ ] T053 Inject `CacheClient` interface via constructor
- [ ] T054 Replace `cache.Client` calls with injected dependency

---

## Phase 4: Config Struct Pattern (T055-T060)

### SocialService (7 params → 1 config)
- [ ] T055 Define `SocialServiceConfig` struct with all 7 dependencies
- [ ] T056 Add validation method `SocialServiceConfig.Validate() error`
- [ ] T057 Create `NewSocialServiceWithConfig(cfg SocialServiceConfig)` constructor
- [ ] T058 Update `routes.go` to use config-based constructor

### MarketplaceService (5 params → 1 config)
- [ ] T059 Define `MarketplaceServiceConfig` struct
- [ ] T060 Create `NewMarketplaceServiceWithConfig(cfg MarketplaceServiceConfig)` constructor

---

## Phase 5: Mock Generation & Unit Tests (T061-T072)

### Mock Generation
- [ ] T061 Create `.mockery.yaml` configuration for all 15 interfaces
- [ ] T062 Run `mockery --all` to generate mocks in `internal/mocks/`
- [ ] T063 Verify mocks compile and match interface signatures

### Unit Tests for P1 Services
- [ ] T064 Create `property_service_test.go` with mock repository tests
- [ ] T065 Create `quest_service_test.go` with mock repository tests
- [ ] T066 Create `user_service_test.go` with mock repository tests
- [ ] T067 Create `transaction_service_test.go` with mock repository tests
- [ ] T068 Create `notification_service_test.go` with mock repository tests
- [ ] T069 Create `badge_service_test.go` with mock repository tests

### Verification & Documentation
- [ ] T070 Run `go test ./internal/services/... -cover` and verify ≥80% coverage
- [ ] T071 Run integration tests to verify no regressions
- [ ] T072 Update `docs/ARCHITECTURE.md` with DI patterns

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Interfaces) 
    ↓
Phase 2 (P1 Services) ←→ Phase 3 (Global State)
    ↓                         ↓
         Phase 4 (Config Structs)
                  ↓
         Phase 5 (Mocks & Tests)
```

### Task Dependencies Within Phases

```
Phase 1:
T001 → T002, T003 (foundation first)
T004-T015 can run in parallel
T016-T018 after all interfaces

Phase 2:
T019-T022 (PropertyService) → T023-T026 (QuestService) → T027-T030 (UserService)
T031-T034 (TransactionService) can parallel with above
T035-T036 can parallel

Phase 3:
T037-T040 (AuditLog) → T041-T044 (Auth) → T045-T049 (TwoFactor)
T050-T052 (KMS) can parallel with TwoFactor
T053-T054 (Blacklist) can parallel

Phase 5:
T061-T063 first (mock generation)
T064-T069 in parallel (unit tests)
T070-T072 last (verification)
```

---

## Task Legend

- `[P]` = Parallelizable with other `[P]` tasks in same phase
- `[B]` = Blocking - must complete before next task
- `[R]` = Requires review before proceeding

---

## Quick Reference: Services to Refactor

| Service | Current State | Target State | Phase |
|---------|--------------|--------------|-------|
| PropertyService | `*gorm.DB` | Interface injection | 2 |
| QuestService | `*gorm.DB` + repos | Interface only | 2 |
| UserService | `*gorm.DB` + repo | Interface only | 2 |
| TransactionService | `*gorm.DB` + repos | Config struct | 2, 4 |
| BadgeService | Repository ✓ | Verify | 2 |
| NotificationService | `*gorm.DB` | Interface injection | 2 |
| AuditLogService | `database.DB` global | Interface injection | 3 |
| AuthService | `database.DB` global | Interface injection | 3 |
| TwoFactorService | `database.DB` global (22x) | Interface injection | 3 |
| KMSService | `database.DB` global | Interface injection | 3 |
| BlacklistService | `cache.Client` global | Interface injection | 3 |
| SocialService | 7 params | Config struct | 4 |
| MarketplaceService | 5 params | Config struct | 4 |
