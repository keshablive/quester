# Plan: Server Service Layer DI Completion

## Implementation Phases

### Phase 1: Repository Interface Extraction
**Duration**: 2 days  
**Tasks**: T001-T018  
**Risk**: Low

Extract repository interfaces to `internal/framework/interfaces/`. This is a non-breaking change - existing code continues to work while interfaces are added.

**Key Deliverables**:
- 15 repository interfaces
- TransactionManager interface
- CacheClient interface
- Documentation updates

### Phase 2: P1 Service DI Refactoring
**Duration**: 3 days  
**Tasks**: T019-T036  
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
**Tasks**: T037-T054  
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
**Tasks**: T055-T060  
**Risk**: Low

Apply config struct pattern to services with parameter explosion (5+ params).

**Services**:
1. SocialService (7 → 1 param)
2. MarketplaceService (5 → 1 param)

### Phase 5: Mock Generation & Unit Tests
**Duration**: 2 days  
**Tasks**: T061-T072  
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
| 1 | 1 | T001-T009 | Core interfaces |
| 2 | 1 | T010-T018 | Supporting interfaces, verification |
| 3 | 2 | T019-T026 | Property, Quest services |
| 4 | 2 | T027-T034 | User, Transaction services |
| 5 | 2 | T035-T036 | Badge, Notification services |
| 6 | 3 | T037-T044 | AuditLog, Auth services |
| 7 | 3 | T045-T054 | TwoFactor, KMS, Blacklist |
| 8 | 4 | T055-T060 | Config structs |
| 9 | 5 | T061-T066 | Mocks, tests (1-3) |
| 10 | 5 | T067-T072 | Tests (4-6), verification |

### Parallel Work Opportunities

```
Phase 1: T004-T015 (interfaces) can all run in parallel
Phase 2: T019-T022 || T031-T034 (different services)
Phase 3: T050-T052 || T053-T054 (KMS || Blacklist)
Phase 5: T064-T069 (all test files) can run in parallel
```

### Critical Path

```
T001 (foundation) → T006 (UserRepo) → T027 (UserService) → T041 (AuthService) → T070 (tests)
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
