# Plan: Server Service Layer DI Completion

## Implementation Phases

### ⚠️ Phase 0: Codebase Restoration (PREREQUISITE)
**Duration**: 0.5 days  
**Tasks**: T001-T007  
**Risk**: High (blocking)

**Critical Discovery**: The active server codebase (`server/internal/`) is severely incomplete with only 3 services and 1 controller. The full codebase exists in `settings/backups/server/internal/`.

**Restoration Steps**:
1. Backup any uncommitted changes
2. Restore 56 services from backup
3. Restore 35 controllers from backup
4. Restore 25 repositories from backup
5. Restore missing framework directories
6. Verify compilation

**Key Deliverables**:
- Complete server codebase restored
- `go build ./cmd/server/...` passes

---

### Phase 1: Repository Interface Extraction
**Duration**: 2 days  
**Tasks**: T008-T025  
**Risk**: Low

Extract repository interfaces to `internal/framework/interfaces/`. This is a non-breaking change - existing code continues to work while interfaces are added.

**Key Deliverables**:
- 15 repository interfaces
- TransactionManager interface
- CacheClient interface
- Documentation updates

### Phase 2: P1 Service DI Refactoring
**Duration**: 3 days  
**Tasks**: T026-T043  
**Risk**: Medium

Refactor the 6 highest-priority services to use repository interfaces. Create V2 constructors while keeping old ones for backward compatibility.

**Services**:

1. PropertyService
2. QuestService
3. UserService
4. TransactionService
5. BadgeService (verify existing pattern)
6. NotificationService

### Phase 3: Global State Elimination
**Duration**: 2 days  
**Tasks**: T044-T061  
**Risk**: High (especially TwoFactorService)

Remove all `database.DB` and `cache.Client` global access from services. This is the most critical phase due to security implications (2FA, auth).

**Services**:

1. AuditLogService (6 calls)
2. AuthService (11 calls)
3. TwoFactorService (22 calls) ⚠️
4. KMSService (4 calls)
5. BlacklistService (3 calls)

### Phase 4: Config Struct Pattern
**Duration**: 1 day  
**Tasks**: T062-T067  
**Risk**: Low

Apply config struct pattern to services with parameter explosion (5+ params).

**Services**:

1. SocialService (7 → 1 param)
2. MarketplaceService (5 → 1 param)

### Phase 5: Mock Generation & Unit Tests
**Duration**: 2 days  
**Tasks**: T068-T078  
**Risk**: Low

Generate mocks and create unit tests for all P1 services.

**Deliverables**:

- Mockery configuration
- 15 mock implementations
- 6 service test files
- ≥80% coverage

---

## Execution Strategy

### Daily Breakdown

| Day | Phase | Tasks | Focus |
|-----|-------|-------|-------|
| 0.5 | 0 | T001-T007 | **Codebase restoration from backup** |
| 1 | 1 | T008-T016 | Core interfaces |
| 2 | 1 | T017-T025 | Supporting interfaces, verification |
| 3 | 2 | T026-T033 | Property, Quest services |
| 4 | 2 | T034-T041 | User, Transaction services |
| 5 | 2 | T042-T043 | Badge, Notification services |
| 6 | 3 | T044-T051 | AuditLog, Auth services |
| 7 | 3 | T052-T061 | TwoFactor, KMS, Blacklist |
| 8 | 4 | T062-T067 | Config structs |
| 9 | 5 | T068-T074 | Mocks, tests (1-4) |
| 10 | 5 | T075-T078 | Tests (5-6), verification |

### Parallel Work Opportunities

```text
Phase 0: T002-T006 (restore dirs) can run in parallel after T001
Phase 1: T011-T022 (interfaces) can all run in parallel
Phase 2: T026-T029 || T038-T041 (different services)
Phase 3: T057-T059 || T060-T061 (KMS || Blacklist)
Phase 5: T071-T076 (all test files) can run in parallel
```

### Critical Path

```text
T001-T007 (restore) → T008 (foundation) → T013 (UserRepo) → T034 (UserService) → T048 (AuthService) → T077 (tests)
```

This path touches the authentication critical path and should be prioritized.

---

## Risk Mitigation

### TwoFactorService (Highest Risk)

**Risk**: 22 global DB calls in security-critical 2FA flow

**Mitigation**:
1. Create comprehensive integration tests BEFORE refactoring
2. Refactor one method at a time
3. Test each method after refactoring
4. Feature flag for rollback capability
5. Security review before merge

### Transaction Handling

**Risk**: Payment processing requires ACID transactions

**Mitigation**:
1. TransactionManager pattern proven in other services
2. Unit tests verify commit/rollback behavior
3. Integration tests with real transactions
4. Staged rollout to non-production first

### Breaking Changes

**Risk**: External callers depend on old constructors

**Mitigation**:
1. Deprecate, don't remove old constructors
2. Clear migration documentation
3. Removal in separate future spec

---

## Validation Gates

### After Phase 0 (Codebase Restoration)

- [ ] `server/internal/services/` has 56+ files
- [ ] `server/internal/controllers/` has 35+ files
- [ ] `server/internal/repositories/` has 25+ files
- [ ] `go build ./cmd/server/...` succeeds

### After Phase 1

- [ ] `go build ./internal/framework/interfaces/...` succeeds
- [ ] Existing repositories satisfy interfaces (compile check)

### After Phase 2

- [ ] `go build ./internal/services/...` succeeds
- [ ] DI container registers all P1 services
- [ ] Server starts without errors

### After Phase 3
- [ ] `grep -r "database\.DB" ./internal/services/` returns 0 matches
- [ ] `grep -r "cache\.Client" ./internal/services/` returns 0 matches
- [ ] Integration tests pass

### After Phase 4
- [ ] Config struct validation works
- [ ] Services with config structs initialize correctly

### After Phase 5
- [ ] `go test ./internal/services/... -cover` shows ≥80%
- [ ] All unit tests pass
- [ ] All integration tests pass

---

## Rollback Plan

### If Issues in Production

1. **Immediate**: Revert to previous deployment
2. **Short-term**: Feature flag to use old constructors
3. **Investigation**: Compare behavior with/without new DI

### Per-Phase Rollback

- **Phase 1**: No rollback needed (additive only)
- **Phase 2**: Keep old constructors, revert DI registration
- **Phase 3**: Revert individual service files
- **Phase 4**: Revert to multiple-param constructors
- **Phase 5**: No rollback needed (tests only)

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Services with `*gorm.DB` | 20 | 0 | 0 |
| Global DB accesses | 45 | 0 | 0 |
| Global cache accesses | 3 | 0 | 0 |
| Services in DI container | 3 | 9+ | All P1 |
| P1 service test coverage | ~20% | ≥80% | ≥80% |
| Unit test execution | N/A | <5s | <5s |
