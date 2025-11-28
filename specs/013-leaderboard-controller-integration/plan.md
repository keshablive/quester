# Implementation Plan: Leaderboard Controller Integration

**Branch**: `013-leaderboard-controller-integration` | **Date**: 2025-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-leaderboard-controller-integration/spec.md`

## Summary

Wire the existing `LeaderboardController` endpoints to `LeaderboardService` via dependency injection. The controller currently has 6 TODO comments returning mock/empty data. The service already implements Redis sorted sets for real-time rankings. This feature resolves the integration gap by:

1. Registering `LeaderboardService` in the DI container
2. Refactoring `LeaderboardController` to struct-based pattern (like `QuestController`)
3. Injecting service into controller and wiring endpoint handlers
4. Setting up routes via `SetupLeaderboardRoutes()` pattern

## Technical Context

**Language/Version**: Go 1.21+  
**Primary Dependencies**: Fiber v2, GORM, Redis (go-redis/v9), DI container (internal/framework/container)  
**Storage**: PostgreSQL (via GORM), Redis sorted sets (primary for real-time rankings)  
**Testing**: Go testing, testify (unit + integration)  
**Target Platform**: Linux server (Docker)  
**Project Type**: Web API (backend only - server/)  
**Performance Goals**: <500ms p95 latency, 1000 concurrent users  
**Constraints**: Must maintain existing API contract (same request/response shapes)  
**Scale/Scope**: Affects 3 controller endpoints, 1 service registration, 1 route file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Multi-Tenancy** | ✅ PASS | Service methods accept `tenantID` as required parameter; controller extracts from JWT |
| **II. Security First** | ✅ PASS | Auth middleware on protected routes; admin-only cache invalidation |
| **III. Type Safety** | ✅ PASS | Go explicit types; models.LeaderboardType, models.LeaderboardPeriod enums |
| **IV. Error Handling** | ✅ PASS | Service returns errors; controller wraps with appropriate HTTP responses |
| **V. Context Propagation** | ✅ PASS | `context.Context` passed through controller→service→repository chain |
| **VI. Consistency & Pattern Adherence** | ✅ PASS | Following QuestController struct pattern; DI container registration pattern |
| **VII. Observability** | ✅ PASS | Slog structured logging in service; HTTP cache headers for debugging |

**Gate Result**: ✅ All constitutional principles satisfied. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-leaderboard-controller-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI)
│   └── leaderboard-api.yaml
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
server/
├── internal/
│   ├── app/
│   │   └── app.go                    # [MODIFY] Register LeaderboardService in DI container
│   ├── controllers/
│   │   └── leaderboard_controller.go # [MODIFY] Refactor to struct pattern with DI
│   ├── routes/
│   │   ├── routes.go                 # [MODIFY] Wire SetupLeaderboardRoutes
│   │   └── leaderboard_routes.go     # [CREATE] New route setup file
│   └── services/
│       └── leaderboard_service.go    # [EXISTS] No changes needed
└── tests/
    ├── integration/
    │   └── leaderboard_test.go       # [CREATE] Integration tests
    └── unit/
        └── services/
            └── leaderboard_service_test.go # [EXISTS] May need updates
```

**Structure Decision**: Backend-only changes following existing patterns. Controller refactored to match `QuestController` struct pattern. Service already exists and is fully implemented.

## Complexity Tracking

> No constitutional violations to justify. Feature follows established patterns.

---

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| **I. Multi-Tenancy** | ✅ CONFIRMED | OpenAPI contract shows `tenantID` extracted from JWT in all endpoints |
| **II. Security First** | ✅ CONFIRMED | Admin endpoint requires admin role; all routes use `FiberAuthMiddleware()` |
| **III. Type Safety** | ✅ CONFIRMED | OpenAPI schema defines strict enum values; Go models use typed enums |
| **IV. Error Handling** | ✅ CONFIRMED | 503 response defined for Redis failures; validation errors return 400 |
| **V. Context Propagation** | ✅ CONFIRMED | Research confirms `c.Context()` passed to all service calls |
| **VI. Consistency** | ✅ CONFIRMED | Research confirms `QuestController` pattern; DI registration matches existing services |
| **VII. Observability** | ✅ CONFIRMED | Cache-Control headers defined in OpenAPI for debugging cache behavior |

**Post-Design Gate Result**: ✅ All principles satisfied. Ready for Phase 2 task generation.
