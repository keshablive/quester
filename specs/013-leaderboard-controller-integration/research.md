# Research: Leaderboard Controller Integration

**Feature**: 013-leaderboard-controller-integration  
**Date**: 2025-01-19  
**Status**: Complete

## Research Tasks

### R1: Existing LeaderboardService Methods Analysis

**Task**: Analyze LeaderboardService to understand available methods for controller integration.

**Findings**:
- **Location**: `server/internal/services/leaderboard_service.go` (424 lines)
- **Dependencies**: BaseService, LeaderboardRepository, UserRepository, Redis (go-redis/v9)

**Available Methods**:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `GetTopN` | `(ctx, tenantID, type, period, category, limit) → ([]LeaderboardEntry, error)` | Returns top N ranked users |
| `GetUserRank` | `(ctx, tenantID, userID, type, period, category) → (*UserLeaderboardPosition, error)` | Returns specific user's position |
| `UpdateRank` | `(ctx, tenantID, userID, type, category, metricValue) → error` | Updates user's score |
| `InvalidateCache` | `(ctx, tenantID, type, category) → error` | Deletes Redis keys |
| `SyncToDatabase` | `(ctx, tenantID, type, period, category) → error` | Syncs Redis to DB |
| `GetSocialLeaderboard` | `(ctx, tenantID, period, limit) → ([]LeaderboardEntry, error)` | Social XP specific |
| `GetUserSocialRank` | `(ctx, tenantID, userID, period) → (*UserLeaderboardPosition, error)` | Social rank specific |

**Decision**: Use `GetTopN` for `GetLeaderboard` endpoint, `GetUserRank` for `GetUserPosition` endpoint, `InvalidateCache` for admin endpoint.

**Rationale**: Direct 1:1 mapping between controller needs and service methods. No new service methods required.

---

### R2: Controller Refactoring Pattern

**Task**: Identify the correct struct-based controller pattern used in the codebase.

**Findings**:
- **QuestController pattern** (`controllers/quest_controller.go`):
  ```go
  type QuestController struct {
      questService *services.QuestService
  }
  
  func NewQuestController(questService *services.QuestService) *QuestController {
      return &QuestController{questService: questService}
  }
  
  func (qc *QuestController) RegisterRoutes(app *fiber.App) {
      // Route registration
  }
  ```

- **Current LeaderboardController** (`controllers/leaderboard_controller.go`):
  - Uses standalone functions (`GetLeaderboard`, `GetUserPosition`)
  - No struct, no DI injection
  - Mock responses with TODO comments

**Decision**: Refactor to struct pattern matching `QuestController`.

**Rationale**: Consistency with existing codebase patterns (Constitution Principle VI). Enables proper dependency injection and testability.

**Alternatives Considered**:
1. Keep standalone functions, pass service via closure → Rejected: Inconsistent with other controllers
2. Global service variable → Rejected: Violates DI pattern, hard to test

---

### R3: DI Container Registration Pattern

**Task**: Understand how to register LeaderboardService in the DI container.

**Findings**:
- **Container location**: `internal/framework/container/container.go`
- **Registration point**: `internal/app/app.go` in `registerServices()` function
- **Existing pattern** (from `socialGamificationService`):
  ```go
  if err := c.RegisterSingleton("leaderboardService", func(c *container.Container) (interface{}, error) {
      // Resolve dependencies
      leaderboardRepo, _ := c.Resolve("leaderboardRepository")
      userRepo, _ := c.Resolve("userRepository")
      // ... 
      return services.NewLeaderboardService(...), nil
  }); err != nil {
      log.Fatalf("Failed to register leaderboardService: %v", err)
  }
  ```

- **LeaderboardService constructor requires**:
  - `db *gorm.DB`
  - `logger *slog.Logger`
  - `redisClient *cache.PooledRedisClient`
  - `leaderboardRepo interfaces.LeaderboardRepository`
  - `leaderboardRepoImpl *repositories.LeaderboardRepository`
  - `userRepo *repositories.UserRepository`

**Decision**: Register `leaderboardService` in `app.go` after existing gamification services.

**Rationale**: Follows established pattern. LeaderboardRepository already registered at line 604.

---

### R4: Route Setup Pattern

**Task**: Understand how to wire leaderboard routes.

**Findings**:
- **Existing specialized route files**:
  - `social_gamification_routes.go` → `SetupSocialGamificationRoutes()`
  - `learning_gamification_routes.go` → `SetupLearningGamificationRoutes()`
  - `gamification_routes.go` → `SetupGamificationRoutes()` (badges, achievements, quests)

- **Current leaderboard routes**:
  - `/api/v1/leaderboards/social` → Social gamification controller
  - `/api/v1/leaderboards/learning` → Learning gamification controller
  - **Missing**: `/api/v1/leaderboards/{type}` (global/category generic endpoints)

- **Admin routes**:
  - Pattern in `admin_routes.go`: Uses `app.Group("/api/v1/admin")`

**Decision**: Create `leaderboard_routes.go` with `SetupLeaderboardRoutes()` for generic leaderboard endpoints. Mount under `/api/v1/leaderboards`.

**Rationale**: Keeps specialized leaderboards (social, learning) in their respective route files while providing generic global/category endpoints.

---

### R5: Error Handling for Redis Unavailability

**Task**: Determine how to handle Redis connection failures gracefully.

**Findings**:
- **Existing pattern** (BadgeController):
  ```go
  if ctrl.badgeService == nil {
      return responses.InternalError(c, "Badge service not available")
  }
  ```

- **Response framework** (`framework/responses/responses.go`):
  - `responses.InternalError(c, message)` → 500
  - `responses.ServiceUnavailable(c, message)` → 503 (if exists)

- **LeaderboardService behavior**:
  - Redis errors return `fmt.Errorf("failed to get top N from Redis: %w", err)`
  - No automatic fallback to DB

**Decision**: 
1. Check service availability at controller level
2. Return 503 Service Unavailable for Redis errors
3. Use existing `responses.ServiceUnavailable` or create if missing

**Rationale**: FR-010 requires graceful handling with 503 status. Consistent with specification edge case handling.

---

### R6: Pagination Handling

**Task**: Verify pagination utilities and limits.

**Findings**:
- **Framework helper**: `controller.ParsePagination(c)` in `framework/controller/helpers.go`
- **Returns**: `Pagination{Page, PageSize, Offset}`
- **Default**: 20, configurable via `?limit=N&page=N`

- **Current controller** already uses:
  ```go
  pagination := controller.ParsePagination(c)
  ```

- **Limit enforcement needed**: Max 100 per FR-008

**Decision**: Add limit validation in controller before calling service.
```go
if pagination.PageSize > 100 {
    pagination.PageSize = 100
}
```

**Rationale**: Service accepts any limit; controller should enforce API contract limits.

---

## Summary of Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Service methods | Use existing `GetTopN`, `GetUserRank`, `InvalidateCache` | Direct mapping to endpoints |
| Controller pattern | Refactor to struct with DI | Match `QuestController` pattern |
| DI registration | Add `leaderboardService` in `app.go` | Standard container registration |
| Route setup | Create `leaderboard_routes.go` | Separate from specialized leaderboards |
| Error handling | Return 503 for Redis failures | FR-010 compliance |
| Pagination | Enforce max 100 in controller | FR-008 compliance |

## Open Questions

None. All technical clarifications resolved through codebase analysis.
