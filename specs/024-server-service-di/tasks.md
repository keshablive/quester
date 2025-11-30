# Tasks: Server Service Layer DI Completion

## Overview

- **Total Tasks**: 78
- **Phases**: 6 (Phase 0-5)
- **Estimated Duration**: 12 working days

---

## ⚠️ Phase 0: Codebase Restoration (T001-T007) - PREREQUISITE

The active server codebase is severely incomplete. Full codebase must be restored from backup before DI refactoring can proceed.

### Restoration Tasks

- [ ] T001 [B] Backup current `server/internal/` state (commit or stash any changes)
- [ ] T002 [B] Restore `internal/services/` (56 files from `settings/backups/server/internal/services/`)
- [ ] T003 [B] Restore `internal/controllers/` (35 files from `settings/backups/server/internal/controllers/`)
- [ ] T004 [B] Restore `internal/repositories/` (25 files from `settings/backups/server/internal/repositories/`)
- [ ] T005 [B] Restore `internal/models/` from backup
- [ ] T006 [B] Restore missing `internal/framework/` subdirectories (14 folders: auth, cache, config, core, database, middleware, interfaces, metrics, pagination, push, responses, sentry, streaming, utils)
- [ ] T007 [B][R] Verify server compiles: `go build ./cmd/server/...`

---

## Phase 1: Repository Interface Extraction (T008-T025)

### Setup & Foundation

- [ ] T008 [B] Create `internal/framework/interfaces/repositories.go` with common repository types
- [ ] T009 [P] Define `TransactionManager` interface for database transactions
- [ ] T010 [P] Define `CacheClient` interface abstracting Redis operations

### P1 Repository Interfaces

- [ ] T011 [P] Extract `PropertyRepository` interface (CRUD + tenant-scoped queries)
- [ ] T012 [P] Extract `QuestRepository` interface (existing interface, verify completeness)
- [ ] T013 [P] Extract `UserRepository` interface (CRUD + FindByEmail, IncrementLoginStreak)
- [ ] T014 [P] Extract `TransactionRepository` interface (CRUD + FindByPaymentID, GetByStatus)
- [ ] T015 [P] Extract `BadgeRepository` interface (CRUD + FindEligible, FindByUser)
- [ ] T016 [P] Extract `NotificationRepository` interface (CRUD + BulkCreate, FindByUser)

### Supporting Repository Interfaces

- [ ] T017 [P] Extract `AuditLogRepository` interface (Create, Query, LogTenantViolation)
- [ ] T018 [P] Extract `TwoFactorRepository` interface (CRUD + backup codes, trusted devices)
- [ ] T019 [P] Extract `BackupCodeRepository` interface (CRUD + MarkUsed)
- [ ] T020 [P] Extract `TrustedDeviceRepository` interface (CRUD + FindByUser)
- [ ] T021 [P] Extract `EncryptionKeyRepository` interface (CRUD + GetActive, Rotate)
- [ ] T022 [P] Extract `RefreshTokenRepository` interface (CRUD + Revoke, RevokeAll)

### Verification

- [ ] T023 [B] Verify all interfaces compile independently (`go build ./internal/framework/interfaces/...`)
- [ ] T024 [B] Verify existing repositories satisfy new interfaces (compile-time check)
- [ ] T025 [R] Document interface contracts in `docs/REPOSITORY_PATTERNS.md`

---

## Phase 2: P1 Service DI Refactoring (T026-T043)

### PropertyService Refactoring

- [ ] T026 [B] Update `PropertyService` struct to use `interfaces.PropertyRepository`
- [ ] T027 [P] Create `NewPropertyServiceV2(repo, ocrService, aiService)` constructor
- [ ] T028 [P] Deprecate old `NewPropertyService(db, ...)` with migration comment
- [ ] T029 [P] Register `PropertyService` in DI container `registerServices()`

### QuestService Refactoring

- [ ] T030 [B] Update `QuestService` struct to remove `*gorm.DB` field
- [ ] T031 [P] Create `NewQuestServiceV2(questRepo, userRepo, badgeService, notifService)` constructor
- [ ] T032 [P] Deprecate old `NewQuestService(db, ...)` with migration comment
- [ ] T033 [P] Update `QuestService` registration in DI container

### UserService Refactoring

- [ ] T034 [B] Update `UserService` struct to remove `*gorm.DB` field
- [ ] T035 [P] Inject `TransactionManager` for XP transaction handling
- [ ] T036 [P] Create `NewUserServiceV2(userRepo, leaderboardService, txManager)` constructor
- [ ] T037 [P] Deprecate old `NewUserService(...)` with migration comment

### TransactionService Refactoring

- [ ] T038 [B] Define `TransactionServiceConfig` struct with all dependencies
- [ ] T039 [P] Update `TransactionService` struct to use config pattern
- [ ] T040 [P] Create `NewTransactionServiceWithConfig(cfg TransactionServiceConfig)` constructor
- [ ] T041 [P] Inject `TransactionManager` for payment processing

### BadgeService & NotificationService

- [ ] T042 [P] Verify `BadgeService` already uses repository (confirm DI pattern)
- [ ] T043 [P] Update `NotificationService` to use `interfaces.NotificationRepository`

---

## Phase 3: Global State Elimination (T044-T061)

### AuditLogService (6 calls)

- [ ] T044 [B] Inject `AuditLogRepository` via constructor
- [ ] T045 [P] Replace `database.DB` calls in `LogAction()` method
- [ ] T046 [P] Replace `database.DB` calls in `LogTenantViolation()` method
- [ ] T047 [P] Replace `database.DB` calls in `QueryLogs()` method

### AuthService (11 calls)

- [ ] T048 [B] Identify all `database.DB` access points in `auth_service.go`
- [ ] T049 [P] Inject required repositories via constructor
- [ ] T050 [P] Replace legacy initialization paths with injected dependencies
- [ ] T051 [P] Update `routes.go` to pass injected AuthService

### TwoFactorService (22 calls) - Highest Priority

- [ ] T052 [B] Inject `TwoFactorRepository`, `BackupCodeRepository`, `TrustedDeviceRepository`
- [ ] T053 [P] Replace `database.DB` calls in 2FA CRUD operations (lines 70-170)
- [ ] T054 [P] Replace `database.DB` calls in backup code operations (lines 200-300)
- [ ] T055 [P] Replace `database.DB` calls in trusted device operations (lines 375-450)
- [ ] T056 [P] Verify KMS integration still works after refactoring

### KMSService (4 calls)

- [ ] T057 [B] Inject `EncryptionKeyRepository` via constructor
- [ ] T058 [P] Replace `database.DB` calls in key management methods
- [ ] T059 [P] Test key rotation flow after refactoring

### BlacklistService (3 calls)

- [ ] T060 [P] Inject `CacheClient` interface via constructor
- [ ] T061 [P] Replace `cache.Client` calls with injected dependency

---

## Phase 4: Config Struct Pattern (T062-T067)

### SocialService (7 params → 1 config)

- [ ] T062 [B] Define `SocialServiceConfig` struct with all 7 dependencies
- [ ] T063 [P] Add validation method `SocialServiceConfig.Validate() error`
- [ ] T064 [P] Create `NewSocialServiceWithConfig(cfg SocialServiceConfig)` constructor
- [ ] T065 [P] Update `routes.go` to use config-based constructor

### MarketplaceService (5 params → 1 config)

- [ ] T066 [B] Define `MarketplaceServiceConfig` struct
- [ ] T067 [P] Create `NewMarketplaceServiceWithConfig(cfg MarketplaceServiceConfig)` constructor

---

## Phase 5: Mock Generation & Unit Tests (T068-T078)

### Mock Generation

- [ ] T068 [B] Create `.mockery.yaml` configuration for all 15 interfaces
- [ ] T069 [B] Run `mockery --all` to generate mocks in `internal/mocks/`
- [ ] T070 [B] Verify mocks compile and match interface signatures

### Unit Tests for P1 Services

- [ ] T071 [P] Create `property_service_test.go` with mock repository tests
- [ ] T072 [P] Create `quest_service_test.go` with mock repository tests
- [ ] T073 [P] Create `user_service_test.go` with mock repository tests
- [ ] T074 [P] Create `transaction_service_test.go` with mock repository tests
- [ ] T075 [P] Create `notification_service_test.go` with mock repository tests
- [ ] T076 [P] Create `badge_service_test.go` with mock repository tests

### Verification & Documentation

- [ ] T077 [B] Run `go test ./internal/services/... -cover` and verify ≥80% coverage
- [ ] T078 [R] Run integration tests and update `docs/ARCHITECTURE.md` with DI patterns

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 0 (Restoration) - MUST COMPLETE FIRST
    ↓
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
Phase 0:
T001 → T002-T006 (backup first, then restore in any order)
T007 after all restoration (compilation gate)

Phase 1:
T008 → T009-T022 (foundation first)
T009-T022 can run in parallel
T023-T025 after all interfaces

Phase 2:
T026-T029 (PropertyService) → T030-T033 (QuestService) → T034-T037 (UserService)
T038-T041 (TransactionService) can parallel with above
T042-T043 can parallel

Phase 3:
T044-T047 (AuditLog) → T048-T051 (Auth) → T052-T056 (TwoFactor)
T057-T059 (KMS) can parallel with TwoFactor
T060-T061 (Blacklist) can parallel

Phase 4:
T062-T065 (SocialService) → T066-T067 (MarketplaceService)

Phase 5:
T068-T070 first (mock generation)
T071-T076 in parallel (unit tests)
T077-T078 last (verification)
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
